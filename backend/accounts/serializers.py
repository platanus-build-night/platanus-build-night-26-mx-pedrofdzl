from django.contrib.auth import get_user_model
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class EmailTokenObtainSerializer(TokenObtainPairSerializer):
    otp = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        otp = attrs.pop("otp", "") or ""
        data = super().validate(attrs)
        device = TOTPDevice.objects.filter(user=self.user, confirmed=True).first()
        if device:
            if not otp:
                raise serializers.ValidationError({"otp": "2FA code required."})
            if not device.verify_token(otp):
                raise serializers.ValidationError({"otp": "Invalid 2FA code."})
        return data


class OTPSerializer(serializers.Serializer):
    otp = serializers.CharField()


class TwoFactorSetupSerializer(serializers.Serializer):
    otpauth_url = serializers.CharField()
    qr = serializers.CharField()


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    two_factor_enabled = serializers.BooleanField()


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email")
