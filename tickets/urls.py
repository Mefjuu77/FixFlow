from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TicketViewSet, CommentListCreateView, TicketAttachmentView, CommentAttachmentView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'tickets', TicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tickets/<int:ticket_id>/comments/', CommentListCreateView.as_view(), name='ticket-comments'),
    path('tickets/<int:ticket_id>/attachments/', TicketAttachmentView.as_view(), name='ticket-attachments'),
    path('tickets/<int:ticket_id>/comments/<int:comment_id>/attachments/', CommentAttachmentView.as_view(), name='comment-attachments'),
]
