"""
ASGI config for Project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from server import routing as server_routing
from ecomeets import routing as ecomeets_routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        URLRouter(
            server_routing.websocket_urlpatterns + 
            ecomeets_routing.websocket_urlpatterns
        )
    ),
})