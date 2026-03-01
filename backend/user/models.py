"""Custom User model and Manager"""

import os
import uuid
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
import random
from django.templatetags.static import static


default_images = [
    "defaults/default1.jpg",
    "defaults/default2.jpg",
    "defaults/default3.jpg",
]


def user_random_default_image_path():
    """Pick random default images"""
    return random.choice(default_images)


def user_image_file_path(instance, filename):
    """Set uploaded image path in media"""
    ext = os.path.splitext(filename)[1]
    filename = f"{uuid.uuid4()}{ext}"

    return os.path.join("uploads", "profile", f"{instance.username}", filename)


class UserManager(BaseUserManager):

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("Email required")
        if not username:
            raise ValueError("Username required")

        user = self.model(
            email=self.normalize_email(email), username=username, **extra_fields
        )
        user.set_password(password)
        user.save(using=self.db)
        return user

    def create_superuser(self, email, username, password=None):
        if not email:
            raise ValueError("Email required")
        if not username:
            raise ValueError("Username required")

        user = self.create_user(
            email=self.normalize_email(email),
            username=username,
            password=password,
        )

        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True

        user.save(using=self.db)
        return user


class User(AbstractBaseUser, PermissionsMixin):

    email = models.EmailField(unique=True, max_length=255)
    name = models.CharField(max_length=255, default="First Last Name")

    username = models.CharField(unique=True, max_length=30)
    bio = models.CharField(
        max_length=300, null=True, default="Hello i am using collabus"
    )

    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)

    last_visit = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    private_account = models.BooleanField(default=False)

    prof_image = models.ImageField(
        null=True, upload_to=user_image_file_path, blank=True
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def get_profile_image_url(self):
        """Return the profile image URL or a random static default"""
        if self.prof_image:
            return self.prof_image.url
        else:
            return static(user_random_default_image_path())

    def __str__(self):
        return self.username
