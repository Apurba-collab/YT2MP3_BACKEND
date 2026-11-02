from django.contrib import admin
from django.urls import include, path
from api.views import debug_admin_user

urlpatterns = [path("admin/", admin.site.urls), path("api/", include("api.urls")),path("debug-admin-user/", debug_admin_user)]
