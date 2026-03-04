from django.urls import path
from server.consumers import ServerConsumer, SenderConsumer, ReceiverConsumer

websocket_urlpatterns=[
    path('ws/<str:connection>/' , ServerConsumer.as_asgi()),
    path('ws/sender/<str:transfer_id>' , SenderConsumer.as_asgi()),
    path('ws/receiver/<str:transfer_id>' , ReceiverConsumer.as_asgi()),
]