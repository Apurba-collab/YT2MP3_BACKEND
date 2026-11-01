from django.urls import path
from . import views
urlpatterns = [
    path("auth/register/", views.Register.as_view()),
    path("auth/login/", views.Login.as_view()),
    path("auth/refresh/", views.Refresh.as_view()),
    path("jobs/", views.JobCreate.as_view()),
    path("jobs/<uuid:pk>/", views.JobDetail.as_view()),
    path("download/<str:token>/", views.Download.as_view(), name="download"),
]
