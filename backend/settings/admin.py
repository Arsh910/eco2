from django.contrib import admin
from .models import BackgroundSetting
from .models import Feedback

# Register your models here.
admin.site.register(BackgroundSetting)
admin.site.register(Feedback)
