from rest_framework import serializers
from .models import AdConfig

class AdConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdConfig
        fields = ['id', 'title', 'script_content', 'is_active']
