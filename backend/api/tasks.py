import logging
import os
import shutil
from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
import yt_dlp
from .models import Job

log = logging.getLogger(__name__)

COOKIES_SRC = "/etc/secrets/cookies.txt"   # Render secret file
COOKIES_TMP = "/tmp/cookies.txt"           # yt-dlp needs a writable copy

def friendly_error(e):
    m = str(e).lower()
    if "not a bot" in m or "sign in" in m or "cookies" in m:
        return "The service is busy right now. Please try again later."
    if "too long" in m or "duration" in m:
        return "This video is too long."
    if "private" in m:
        return "This video is private."
    if "age" in m and "restrict" in m:
        return "This video is age-restricted and can't be processed."
    if "unavailable" in m or "removed" in m or "not available" in m:
        return "This video is unavailable."
    return "Couldn't process this video. Try another link."

@shared_task(soft_time_limit=600)
def fetch_audio(job_id):
    job = Job.objects.get(pk=job_id)
    job.status = Job.Status.PROCESSING; job.save(update_fields=["status"])
    settings.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    opts = {
        "format": "bestaudio/best", "noplaylist": True, "quiet": True, "no_warnings": True,
        "outtmpl": str(settings.MEDIA_ROOT / f"{job.id}.%(ext)s"),
        "match_filter": yt_dlp.utils.match_filter_func(f"duration < {settings.MAX_DURATION_SECONDS}"),
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}],
    }
    has_cookies = os.path.exists(COOKIES_SRC)
    if has_cookies:
        shutil.copy(COOKIES_SRC, COOKIES_TMP)
        opts["cookiefile"] = COOKIES_TMP
    if os.environ.get("YT_PROXY"):
        opts["proxy"] = os.environ["YT_PROXY"]
    print("YTDLP cookies:", has_cookies, "| deno:", shutil.which("deno"),
          "| yt-dlp:", yt_dlp.version.__version__, flush=True)
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(job.url, download=True)
        name = f"{job.id}.mp3"
        if not (settings.MEDIA_ROOT / name).exists():
            raise RuntimeError("Video is too long or unavailable")
        job.title = (info.get("title") or "audio")[:200]
        job.thumbnail = info.get("thumbnail") or ""
        job.filename, job.status = name, Job.Status.DONE
    except Exception as e:
        log.exception("yt-dlp failed for job %s", job.id)  # full details stay in server logs
        job.status, job.error = Job.Status.FAILED, friendly_error(e)
    job.save()

@shared_task
def cleanup_old_files(hours=24):
    cutoff = timezone.now() - timedelta(hours=hours)
    for job in Job.objects.filter(created__lt=cutoff).exclude(filename=""):
        (settings.MEDIA_ROOT / job.filename).unlink(missing_ok=True)
        job.filename = ""; job.save(update_fields=["filename"])
