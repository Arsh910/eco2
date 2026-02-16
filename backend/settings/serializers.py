from rest_framework import serializers
from .models import BackgroundSetting

class BackgroundSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackgroundSetting
        fields = ['type', 'value', 'color']
