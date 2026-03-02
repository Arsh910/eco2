from django.db import models

class AdConfig(models.Model):
    title = models.CharField(max_length=100)
    script_content = models.TextField(help_text="The script/html code for the ad")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
