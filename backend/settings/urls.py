from django.urls import path
from .views import BackgroundSettingView

urlpatterns = [
    path('background/', BackgroundSettingView.as_view(), name='background-settings'),
]
