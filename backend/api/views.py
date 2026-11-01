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
