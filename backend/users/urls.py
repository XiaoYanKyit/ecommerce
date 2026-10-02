from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CustomerAdminViewSet, LoginView, LogoutView, MeView, RegisterView

router = SimpleRouter()
router.register("admin/customers", CustomerAdminViewSet, basename="admin-customer")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    *router.urls,
]
