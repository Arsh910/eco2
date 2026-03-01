"""Test user api"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

SIGNUP_URL = reverse("user:signup")
LOGIN_URL = reverse("user:login")
REFRESH_URL = reverse("user:refresh")
MANAGE_URL = reverse("user:manageuser")
FORGOT_URL = reverse("user:forgotpassword")


def create_user(**params):
    return get_user_model().objects.create_user(**params)


class PublicUserApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_user_signup_api(self):
        payload = {
            "email": "test@example.com",
            "password": "testpass123",
            "username": "testuser",
        }
        res = self.client.post(SIGNUP_URL, payload)

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email=payload["email"])
        self.assertTrue(user.check_password(payload["password"]))
        self.assertNotIn("password", res.data)

    def test_user_login_api(self):
        paylaod = {
            "email": "test@example.com",
            "password": "testpass123",
            "username": "testuser",
        }

        create_user(**paylaod)
        res = self.client.post(LOGIN_URL, paylaod)

        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("id", res.data)

    @patch("user.utils.send_email")
    def test_send_email_api(self, patched_send_email):
        payload = {
            "email": "test@example.com",
            "password": "testpass123",
            "username": "testuser",
        }
        create_user(**payload)
        payload = {"email": "test@example.com"}

        patched_send_email.return_value = True

        res = self.client.post(FORGOT_URL, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class PrivateApiTest(TestCase):

    def setUp(self):
        paylaod = {
            "email": "test@example.com",
            "password": "testpass123",
            "username": "testuser",
            "name": "Test Name",
        }
        self.user = create_user(**paylaod)
        self.client = APIClient()

        res = self.client.post(LOGIN_URL, paylaod)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')

    def test_user_update_api_get(self):
        res = self.client.get(MANAGE_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_update_api(self):
        payload = {
            "name": "Test Update",
            "password": "testpass123",
        }
        res = self.client.patch(MANAGE_URL, payload)
        self.user.refresh_from_db()

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.name, payload["name"])
        self.assertTrue(self.user.check_password(payload["password"]))
