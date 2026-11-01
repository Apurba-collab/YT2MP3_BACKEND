import uuid
from django.conf import settings
from django.db import models

class Job(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued"; PROCESSING = "processing"; DONE = "done"; FAILED = "failed"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jobs")
    url = models.URLField(max_length=500)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.QUEUED)
    title = models.CharField(max_length=200, blank=True)
    thumbnail = models.URLField(max_length=500, blank=True)
    filename = models.CharField(max_length=100, blank=True)
    error = models.CharField(max_length=300, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["-created"]
