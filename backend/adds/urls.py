from django.urls import path
from .views import ActiveAdListView, VastAdListView

urlpatterns = [
    path('', VastAdListView.as_view(), name='vast-ads'),
    path('active/', ActiveAdListView.as_view(), name='active-ads'),
]
