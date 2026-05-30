from django.contrib.auth import get_user_model
from django.urls import reverse
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

EMAIL = "user@bank.com"
PASSWORD = "supersecret123"


def current_token(device):
    return str(totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits)).zfill(
        device.digits
    )


class AuthFlowTests(APITestCase):
    def register(self):
        return self.client.post(reverse("register"), {"email": EMAIL, "password": PASSWORD})

    def login(self, **extra):
        return self.client.post(
            reverse("token_obtain_pair"), {"email": EMAIL, "password": PASSWORD, **extra}
        )

    def authenticate(self):
        self.register()
        access = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return User.objects.get(email=EMAIL)

    def test_register_creates_user(self):
        res = self.register()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=EMAIL).exists())

    def test_login_returns_tokens(self):
        self.register()
        res = self.login()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_wrong_password_rejected(self):
        self.register()
        res = self.client.post(reverse("token_obtain_pair"), {"email": EMAIL, "password": "nope"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_2fa_setup_then_verify_enables_device(self):
        self.authenticate()
        setup = self.client.post(reverse("2fa_setup"))
        self.assertEqual(setup.status_code, status.HTTP_200_OK)
        self.assertIn("otpauth_url", setup.data)

        device = TOTPDevice.objects.get(user__email=EMAIL)
        res = self.client.post(reverse("2fa_verify"), {"otp": current_token(device)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        device.refresh_from_db()
        self.assertTrue(device.confirmed)

    def test_login_requires_otp_once_2fa_enabled(self):
        user = self.authenticate()
        device = TOTPDevice.objects.create(user=user, name="default", confirmed=True)
        self.client.credentials()

        self.assertEqual(self.login().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.login(otp=current_token(device)).status_code, status.HTTP_200_OK)
