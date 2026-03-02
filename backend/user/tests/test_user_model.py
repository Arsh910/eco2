"""Test for user models"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from user.models import default_images


class ModelTest(TestCase):

    def test_create_user_without_image(self):
        """Test to check if user is created with deafult images"""

        email = "test@example.com"
        username = "testusername"
        password = "testpass123"

        user = get_user_model().objects.create_user(
            email=email, username=username, password=password
        )

        default_im = [f'/static/{x}' for x in default_images]

        self.assertEqual(user.email, email)
        self.assertEqual(user.username, username)
        self.assertIn(user.get_profile_image_url(), default_im)
        self.assertTrue(user.check_password(password))

    def test_create_user_with_image(self):
        """Test to check if user is created with deafult images"""

        email = "test@example.com"
        username = "testusername"
        password = "testpass123"
        image = "testimage.jpeg"

        user = get_user_model().objects.create_user(
            email=email, username=username, password=password, prof_image=image
        )

        self.assertEqual(user.email, email)
        self.assertEqual(user.username, username)
        self.assertEqual(user.get_profile_image_url(), f'/media/{image}')
        self.assertTrue(user.check_password(password))
