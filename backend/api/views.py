from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import Job
from .serializers import JobSerializer, RegisterSerializer
from .tasks import fetch_audio
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.db import connection

def debug_admin_user(request):
    User = get_user_model()

    user = User.objects.filter(username="Apurba").first()

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT current_database(), current_user, current_schema()"
        )
        db_info = cursor.fetchone()

    return JsonResponse({
        "database": connection.vendor,
        "db_name": db_info[0],
        "db_user": db_info[1],
        "db_schema": db_info[2],
        "user_exists": user is not None,
        "is_staff": user.is_staff if user else None,
        "is_superuser": user.is_superuser if user else None,
        "is_active": user.is_active if user else None,
    })

class Register(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth"

class Login(TokenObtainPairView):
    throttle_scope = "auth"

class Refresh(TokenRefreshView):
    throttle_scope = "auth"

class JobCreate(generics.CreateAPIView):
    serializer_class = JobSerializer
    throttle_scope = "jobs"
    def perform_create(self, s):
        job = s.save(user=self.request.user)
        fetch_audio.delay(str(job.id))

class JobDetail(generics.RetrieveAPIView):
    serializer_class = JobSerializer
    def get_queryset(self):
        return Job.objects.filter(user=self.request.user)

class Download(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []
    def get(self, request, token):
        try:
            data = signing.loads(token, salt="dl", max_age=600)
            job = Job.objects.get(pk=data["job"])
        except (signing.BadSignature, Job.DoesNotExist):
            raise Http404
        path = settings.MEDIA_ROOT / job.filename
        if not job.filename or not path.exists():
            raise Http404
        safe = "".join(c for c in job.title if c.isalnum() or c in " -_") or "audio"
        return FileResponse(open(path, "rb"), as_attachment=True, filename=f"{safe}.mp3")
