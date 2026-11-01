from urllib.parse import urlparse
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.urls import reverse
from rest_framework import serializers
from .models import Job

User = get_user_model()
YT_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User; fields = ["username", "password"]
        extra_kwargs = {"password": {"write_only": True}}
    def validate_password(self, v):
        validate_password(v); return v
    def create(self, data):
        return User.objects.create_user(**data)

class JobSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    class Meta:
        model = Job; fields = ["id", "url", "status", "title", "thumbnail", "error", "download_url"]
        read_only_fields = ["status", "title", "thumbnail", "error"]
    def validate_url(self, v):
        if urlparse(v).hostname not in YT_HOSTS:
            raise serializers.ValidationError("Enter a valid YouTube link.")
        return v
    def get_download_url(self, job):
        if job.status != Job.Status.DONE or not job.filename:
            return None
        token = signing.dumps({"job": str(job.id)}, salt="dl")  # short-lived, no auth header needed
        return self.context["request"].build_absolute_uri(reverse("download", args=[token]))
