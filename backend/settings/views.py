from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import BackgroundSetting
from .serializers import BackgroundSettingSerializer

class BackgroundSettingView(generics.RetrieveUpdateAPIView):
    serializer_class = BackgroundSettingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        setting, created = BackgroundSetting.objects.get_or_create(user=self.request.user)
        return setting
