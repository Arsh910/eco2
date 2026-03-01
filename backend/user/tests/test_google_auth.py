from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()

class GoogleLoginViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('user:google_login')

    @patch('user.utils.requests.get')
    def test_google_login_success(self, mock_get):
        # Mock Google response
        mock_response = MagicMock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'email': 'test@example.com',
            'name': 'Test User',
            'picture': 'http://example.com/pic.jpg'
        }
        mock_get.return_value = mock_response

        data = {'token': 'valid_token'}
        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('email', response.data)
        
        # Verify user created
        user = User.objects.get(email='test@example.com')
        self.assertEqual(user.username, 'test')
        self.assertEqual(user.name, 'Test User')

    @patch('user.utils.requests.get')
    def test_google_login_invalid_token(self, mock_get):
        # Mock Google response failure
        mock_response = MagicMock()
        mock_response.ok = False
        mock_get.return_value = mock_response

        data = {'token': 'invalid_token'}
        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
