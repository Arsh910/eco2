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

def feedback_upload_path(instance, filename):
    # Determine folder based on feedback type
    folder = 'bugs' if instance.type == 'bug' else 'feedback'
    return f'{folder}/{filename}'

class Feedback(models.Model):
    FEEDBACK_TYPES = [
        ('bug', 'Bug Report'),
        ('idea', 'App Idea'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks'
    )
    type = models.CharField(max_length=10, choices=FEEDBACK_TYPES, default='bug')
    description = models.TextField()
    image = models.ImageField(upload_to=feedback_upload_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.user.username if self.user else 'Guest'} - {self.created_at.strftime('%Y-%m-%d')}"
