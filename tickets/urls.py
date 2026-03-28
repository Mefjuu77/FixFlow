from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'tickets', TicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
