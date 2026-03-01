from django.urls import path
from server.consumers import ServerConsumer

websocket_urlpatterns=[
    path('ws/<str:connection>/' , ServerConsumer.as_asgi()),
]