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

from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackCreateView(generics.CreateAPIView):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.AllowAny] # Allow guests to define report bugs too? Or restrict? Plan says IsAuthenticated usually but let's stick to user if possible, but allow guests for now since we have guest mode. Validating plan: "user (ForeignKey, nullable)".

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
