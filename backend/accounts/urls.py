from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    EmailTokenObtainPairView,
    MeView,
    RegisterView,
    TwoFactorSetupView,
    TwoFactorVerifyView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("2fa/setup/", TwoFactorSetupView.as_view(), name="2fa_setup"),
    path("2fa/verify/", TwoFactorVerifyView.as_view(), name="2fa_verify"),
    path("me/", MeView.as_view(), name="me"),
]
