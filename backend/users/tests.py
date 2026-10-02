from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class AuthTests(APITestCase):
    register_url = "/api/auth/register/"
    login_url = "/api/auth/login/"
    logout_url = "/api/auth/logout/"
    me_url = "/api/auth/me/"

    payload = {"email": "Jane@Example.com", "password": "S3cure-pass-123", "first_name": "Jane", "last_name": "Doe"}

    def test_register_returns_token_and_lowercases_email(self):
        r = self.client.post(self.register_url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", r.data)
        self.assertEqual(r.data["user"]["email"], "jane@example.com")
        self.assertNotIn("password", r.data["user"])

    def test_register_rejects_duplicate_email_and_weak_password(self):
        self.client.post(self.register_url, self.payload, format="json")
        dup = self.client.post(self.register_url, {**self.payload, "email": "jane@example.com"}, format="json")
        self.assertEqual(dup.status_code, 400)
        weak = self.client.post(self.register_url, {**self.payload, "email": "x@example.com", "password": "123"}, format="json")
        self.assertEqual(weak.status_code, 400)

    def test_login_logout_cycle(self):
        User.objects.create_user(email="a@example.com", password="S3cure-pass-123")
        bad = self.client.post(self.login_url, {"email": "a@example.com", "password": "nope"}, format="json")
        self.assertEqual(bad.status_code, 400)

        ok = self.client.post(self.login_url, {"email": "A@example.com", "password": "S3cure-pass-123"}, format="json")
        self.assertEqual(ok.status_code, 200)
        token = ok.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(self.client.get(self.me_url).status_code, 200)
        self.assertEqual(self.client.post(self.logout_url).status_code, 204)
        # The old token no longer works.
        self.assertEqual(self.client.get(self.me_url).status_code, 401)

    def test_profile_update_cannot_change_email_or_staff_flag(self):
        user = User.objects.create_user(email="a@example.com", password="S3cure-pass-123")
        self.client.force_authenticate(user)
        r = self.client.patch(self.me_url, {"city": "Miami", "email": "evil@example.com", "is_staff": True}, format="json")
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.city, "Miami")
        self.assertEqual(user.email, "a@example.com")
        self.assertFalse(user.is_staff)

    def test_customer_admin_endpoint_is_staff_only(self):
        user = User.objects.create_user(email="a@example.com", password="S3cure-pass-123")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get("/api/admin/customers/").status_code, 403)
        staff = User.objects.create_user(email="s@example.com", password="S3cure-pass-123", is_staff=True)
        self.client.force_authenticate(staff)
        r = self.client.get("/api/admin/customers/")
        self.assertEqual(r.status_code, 200)
        emails = [c["email"] for c in r.data["results"]]
        self.assertIn("a@example.com", emails)
        self.assertNotIn("s@example.com", emails)
