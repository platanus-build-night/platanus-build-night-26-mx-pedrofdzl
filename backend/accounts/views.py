import base64
from io import BytesIO

import qrcode
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    DetailSerializer,
    EmailTokenObtainSerializer,
    MeSerializer,
    OTPSerializer,
    RegisterSerializer,
    TwoFactorSetupSerializer,
)


def _qr_data_uri(text):
    buf = BytesIO()
    qrcode.make(text).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer


@extend_schema(request=None, responses=TwoFactorSetupSerializer)
class TwoFactorSetupView(APIView):
    def post(self, request):
        if TOTPDevice.objects.filter(user=request.user, confirmed=True).exists():
            return Response({"detail": "2FA already enabled."}, status=status.HTTP_400_BAD_REQUEST)
        device, _ = TOTPDevice.objects.get_or_create(
            user=request.user, name="default", defaults={"confirmed": False}
        )
        return Response({"otpauth_url": device.config_url, "qr": _qr_data_uri(device.config_url)})


@extend_schema(request=OTPSerializer, responses=DetailSerializer)
class TwoFactorVerifyView(APIView):
    def post(self, request):
        serializer = OTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device = TOTPDevice.objects.filter(user=request.user, confirmed=False).first()
        if device is None:
            return Response({"detail": "No pending 2FA setup."}, status=status.HTTP_400_BAD_REQUEST)
        if not device.verify_token(serializer.validated_data["otp"]):
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)
        device.confirmed = True
        device.save()
        return Response({"detail": "2FA enabled."})


@extend_schema(responses=MeSerializer)
class MeView(APIView):
    def get(self, request):
        return Response(
            {
                "id": request.user.id,
                "email": request.user.email,
                "two_factor_enabled": TOTPDevice.objects.filter(
                    user=request.user, confirmed=True
                ).exists(),
            }
        )
