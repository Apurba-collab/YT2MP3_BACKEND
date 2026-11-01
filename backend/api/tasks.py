from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
import yt_dlp
from .models import Job

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
        job.status, job.error = Job.Status.FAILED, str(e)[:300]
    job.save()

@shared_task
def cleanup_old_files(hours=24):
    cutoff = timezone.now() - timedelta(hours=hours)
    for job in Job.objects.filter(created__lt=cutoff).exclude(filename=""):
        (settings.MEDIA_ROOT / job.filename).unlink(missing_ok=True)
        job.filename = ""; job.save(update_fields=["filename"])
