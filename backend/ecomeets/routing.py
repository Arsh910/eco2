from django.urls import path
from ecomeets.consumers import EcoMeetsConsumer

websocket_urlpatterns=[
    path('ws/ecomeets/random/' , EcoMeetsConsumer.as_asgi()),
]
