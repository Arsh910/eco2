from django.urls import path
from .views import ActiveAdListView

urlpatterns = [
    path('active/', ActiveAdListView.as_view(), name='active-ads'),
]
