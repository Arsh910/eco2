from django.db import models
from django.conf import settings

class BackgroundSetting(models.Model):
    BACKGROUND_TYPES = [
        ('model', '3D Model'),
        ('image', 'Image'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='background_settings'
    )
    type = models.CharField(max_length=10, choices=BACKGROUND_TYPES, default='model')
    value = models.CharField(max_length=500, default='globe')
    color = models.CharField(max_length=20, default='#3b82f6')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}"
