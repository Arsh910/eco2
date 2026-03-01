from django.urls import path
from .views import BackgroundSettingView, FeedbackCreateView

urlpatterns = [
    path('background/', BackgroundSettingView.as_view(), name='background-settings'),
    path('feedback/', FeedbackCreateView.as_view(), name='feedback-create'),
]
