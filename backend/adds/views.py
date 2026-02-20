from rest_framework import generics
from .models import AdConfig
from .serializers import AdConfigSerializer
from rest_framework.permissions import AllowAny

class ActiveAdListView(generics.ListAPIView):
    serializer_class = AdConfigSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return AdConfig.objects.filter(is_active=True)
