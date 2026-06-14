from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MakeupHistoryViewSet

router = DefaultRouter()
router.register(r'history', MakeupHistoryViewSet, basename='makeup-history')

urlpatterns = [
    path('', include(router.urls)),
]
