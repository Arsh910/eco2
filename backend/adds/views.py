from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import AdConfig
from .serializers import AdConfigSerializer
from .services.vastResolver import resolve_vast

class ActiveAdListView(generics.ListAPIView):
    serializer_class = AdConfigSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return AdConfig.objects.filter(is_active=True)

class VastAdListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # In a real app, you might fetch GAM tag URLs from the database (AdConfig).
        # We will use public testing GAM VAST tags here, and static fallbacks for missing ones.
        vast_tags = {
            "ad_screen_01": "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast"
        }
        
        static_fallbacks = {
            "ad_screen_01": { "videoUrl": "/ads/ad1.mp4", "clickUrl": "https://example.com/1" },
            "ad_screen_02": { "videoUrl": "/ads/ad2.mp4", "clickUrl": "https://example.com/2" },
            "ad_screen_03": { "videoUrl": "/ads/ad3.mp4", "clickUrl": "https://example.com/3" },
            "ad_screen_04": { "videoUrl": "/ads/ad4.mp4", "clickUrl": "https://example.com/4" },
            "ad_screen_05": { "videoUrl": "/ads/ad5.mp4", "clickUrl": "https://example.com/5" },
            "ad_screen_06": { "videoUrl": "/ads/ad6.mp4", "clickUrl": "https://example.com/6" }
        }

        screens = ["ad_screen_01", "ad_screen_02", "ad_screen_03", "ad_screen_04", "ad_screen_05", "ad_screen_06"]
        assignments = []

        for screen in screens:
            ad_data = None
            if screen in vast_tags:
                ad_data = resolve_vast(vast_tags[screen])
                
            if not ad_data:
                ad_data = static_fallbacks.get(screen)

            assignments.append({
                "screen": screen,
                "videoUrl": ad_data["videoUrl"] if ad_data else "",
                "clickUrl": ad_data["clickUrl"] if ad_data else ""
            })

        return Response(assignments)
