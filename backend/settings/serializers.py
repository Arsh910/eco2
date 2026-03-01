from rest_framework import serializers
from .models import BackgroundSetting

class BackgroundSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackgroundSetting
        fields = ['type', 'value', 'color']

from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'user', 'type', 'description', 'image', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
