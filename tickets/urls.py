from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TicketViewSet, CommentListCreateView, TicketAttachmentView, CommentAttachmentView, TicketLogListView, GlobalActivityLogView, WorkLogListCreateView, WorkLogDetailView, AttachmentDeleteView, TicketResolutionActionView
from .reports import ReportExportView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'tickets', TicketViewSet)

urlpatterns = [
    path('reports/export/', ReportExportView.as_view(), name='report-export'),
    path('tickets/resolve/<str:token>/<str:action>/', TicketResolutionActionView.as_view(), name='ticket-resolution-action'),
    path('tickets/activity-feed/', GlobalActivityLogView.as_view(), name='global-activity'),
    path('', include(router.urls)),
    path('tickets/<int:ticket_id>/comments/', CommentListCreateView.as_view(), name='ticket-comments'),
    path('tickets/<int:ticket_id>/attachments/', TicketAttachmentView.as_view(), name='ticket-attachments'),
    path('tickets/<int:ticket_id>/attachments/<int:attachment_id>/', AttachmentDeleteView.as_view(), name='attachment-delete'),
    path('tickets/<int:ticket_id>/comments/<int:comment_id>/attachments/', CommentAttachmentView.as_view(), name='comment-attachments'),
    path('tickets/<int:ticket_id>/logs/', TicketLogListView.as_view(), name='ticket-logs'),
    path('tickets/<int:ticket_id>/work-logs/', WorkLogListCreateView.as_view(), name='ticket-work-logs'),
    path('tickets/<int:ticket_id>/work-logs/<int:wl_id>/', WorkLogDetailView.as_view(), name='ticket-work-log-detail'),
]
