import os
from datetime import timedelta

from django.conf import settings as django_settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count
from .models import Category, Ticket, Comment, Attachment, TicketLog, WorkLog, Notification, ReplyTemplate
from .serializers import CategorySerializer, TicketSerializer, CommentSerializer, AttachmentSerializer, TicketLogSerializer, WorkLogSerializer, NotificationSerializer, ReplyTemplateSerializer
from .pagination import OptInPageNumberPagination
from . import notifications as notify
from .email import send_ticket_created_notification, send_comment_notification, TicketEmailAccumulator, send_reopened_notification


def _create_attachments(ticket, files, request_user, comment=None):
    """Wspólna logika tworzenia załączników (DRY dla ticket i comment attachments)."""
    created = []
    for f in files:
        attachment = Attachment.objects.create(
            ticket=ticket,
            comment=comment,
            file=f,
            filename=f.name,
            uploaded_by=request_user,
        )
        created.append(attachment)

    # Log: dodanie załączników (jeden zbiorczy wpis)
    log_value = created[0].filename if len(created) == 1 else f'{len(created)} załączników'
    TicketLog.objects.create(
        ticket=ticket,
        user=request_user,
        action=TicketLog.ActionType.ATTACHMENT_ADDED,
        new_value=log_value,
    )
    return created


# === Uprawnienia ===

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'ADMIN'


class IsTicketOwnerOrStaff(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role in ('ADMIN', 'TECHNICIAN'):
            return True
        return obj.creator == request.user

# === Stałe i helpery do walidacji uploadów ===
MAX_FILE_SIZE = 5 * 1024 * 1024          # 5 MB
MAX_TOTAL_SIZE = 15 * 1024 * 1024        # 15 MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'}


def validate_uploaded_files(files):
    """
    Waliduje listę przesłanych plików pod kątem rozmiaru i rozszerzenia.
    Zwraca (None) jeśli OK, lub Response z błędem.
    """
    total_size = sum(f.size for f in files)
    if total_size > MAX_TOTAL_SIZE:
        return Response(
            {'detail': 'Łączny rozmiar plików przekracza maksymalny limit operacji (15 MB).'},
            status=status.HTTP_400_BAD_REQUEST
        )
    for f in files:
        if f.size > MAX_FILE_SIZE:
            return Response(
                {'detail': f'Plik {f.name} przekracza maksymalny rozmiar 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'detail': f'Plik {f.name} posiada niedozwolony format ({ext}).'},
                status=status.HTTP_400_BAD_REQUEST
            )
    return None

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated, IsTicketOwnerOrStaff]
    pagination_class = OptInPageNumberPagination

    # Pola dozwolone do sortowania (mapowanie nazwa z API -> wyrażenie ORM)
    ORDERING_FIELDS = {
        'id': 'id',
        'title': 'title',
        'category_name': 'category__name',
        'priority': 'priority',
        'creator': 'creator__first_name',
        'technician': 'technician__first_name',
        'status': 'status',
        'created_at': 'created_at',
    }

    def get_serializer_class(self):
        """Lekki serializer na liście (bez description/attachments), pełny na detail."""
        if self.action == 'list':
            from .serializers import TicketListSerializer
            return TicketListSerializer
        return TicketSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            'creator', 'technician', 'category'
        )
        # Prefetch załączników tylko na detail view (nie na liście)
        if self.action == 'retrieve':
            qs = qs.prefetch_related('attachments')
        if user.role == 'EMPLOYEE':
            qs = qs.filter(creator=user)

        # Filtrowanie / wyszukiwanie / sortowanie po stronie serwera (tylko lista)
        if self.action == 'list':
            qs = self._apply_filters(qs)
            qs = self._apply_ordering(qs)
        return qs

    def _apply_filters(self, qs):
        """Filtruje queryset na podstawie parametrów zapytania (server-side)."""
        params = self.request.query_params
        user = self.request.user

        status_param = params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        # Tylko aktywne (nie rozwiązane/zamknięte)
        if params.get('active_only') == 'true':
            qs = qs.exclude(status__in=['ROZWIAZANE', 'ZAMKNIETE'])

        priority_param = params.get('priority')
        if priority_param and priority_param != 'all':
            qs = qs.filter(priority=priority_param)

        category_param = params.get('category')
        if category_param and category_param != 'all':
            # Akceptuje zarówno ID kategorii, jak i nazwę
            if category_param.isdigit():
                qs = qs.filter(category_id=int(category_param))
            else:
                qs = qs.filter(category__name=category_param)

        # Zakres dat (po dacie utworzenia)
        date_from = params.get('dateFrom')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = params.get('dateTo')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # Przypisanie — tylko dla technika/admina (pracownik widzi wyłącznie swoje)
        assignment = params.get('assignment')
        if assignment and assignment != 'all' and user.role in ('ADMIN', 'TECHNICIAN'):
            if assignment == 'unassigned':
                qs = qs.filter(technician__isnull=True)
            elif assignment == 'assigned_to_me':
                qs = qs.filter(technician=user)
            elif assignment.isdigit():
                qs = qs.filter(technician_id=int(assignment))

        # Wyszukiwanie po tytule, ID, imieniu/nazwisku zgłaszającego lub technika
        search = (params.get('search') or '').strip()
        if search:
            from django.db.models import Q, Value
            from django.db.models.functions import Concat
            q = (
                Q(title__icontains=search)
                | Q(creator__first_name__icontains=search)
                | Q(creator__last_name__icontains=search)
                | Q(technician__first_name__icontains=search)
                | Q(technician__last_name__icontains=search)
            )
            if search.isdigit():
                q |= Q(id=int(search))
            qs = qs.annotate(
                creator_full=Concat('creator__first_name', Value(' '), 'creator__last_name'),
                technician_full=Concat('technician__first_name', Value(' '), 'technician__last_name'),
            ).filter(
                q
                | Q(creator_full__icontains=search)
                | Q(technician_full__icontains=search)
            )

        return qs

    def _apply_ordering(self, qs):
        """Sortuje queryset na podstawie parametru `ordering` (np. '-created_at')."""
        ordering = (self.request.query_params.get('ordering') or '-created_at').strip()
        desc = ordering.startswith('-')
        key = ordering[1:] if desc else ordering
        field = self.ORDERING_FIELDS.get(key, 'created_at')
        return qs.order_by(f'-{field}' if desc else field)

    def list(self, request, *args, **kwargs):
        # Tryb `ids_only=1` — zwraca wyłącznie listę ID pasujących do filtrów
        # (używane przez "zaznacz wszystkie" przy paginacji serwerowej).
        if request.query_params.get('ids_only') == '1':
            ids = list(self.get_queryset().values_list('id', flat=True))
            return Response({'ids': ids})
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='status-counts')
    def status_counts(self, request):
        """
        Zwraca liczbę zgłoszeń w rozbiciu na statusy, z uwzględnieniem zakresu
        roli (pracownik widzi tylko swoje). Używane do etykiet w filtrze statusu,
        aby liczniki były poprawne także przy paginacji serwerowej.
        """
        user = request.user
        qs = Ticket.objects.all()
        if user.role == 'EMPLOYEE':
            qs = qs.filter(creator=user)

        counts = {row['status']: row['c'] for row in qs.values('status').annotate(c=Count('id'))}
        return Response({
            'all': qs.count(),
            'NOWE': counts.get('NOWE', 0),
            'W_TOKU': counts.get('W_TOKU', 0),
            'ROZWIAZANE': counts.get('ROZWIAZANE', 0),
            'ZAMKNIETE': counts.get('ZAMKNIETE', 0),
        })

    def perform_create(self, serializer):
        # Automatycznie przypisuje aktualnie zalogowanego użytkownika jako twórcę zgłoszenia
        ticket = serializer.save(creator=self.request.user)
        send_ticket_created_notification(ticket)
        notify.notify_ticket_created(ticket)

        # Log: utworzenie zgłoszenia
        TicketLog.objects.create(
            ticket=ticket,
            user=self.request.user,
            action=TicketLog.ActionType.CREATED,
            new_value=ticket.title,
        )

    def perform_update(self, serializer):
        old_ticket = self.get_object()
        old_status = old_ticket.status
        old_technician = old_ticket.technician
        old_priority = old_ticket.priority
        old_category = old_ticket.category
        old_creator = old_ticket.creator
        old_title = old_ticket.title
        old_description = old_ticket.description
        
        # Wyciągnij transition_comment zanim save() go usunie
        transition_comment = self.request.data.get('transition_comment', '').strip()
        transition_comment_type = self.request.data.get('transition_comment_type', 'REPLY')

        ticket = serializer.save()
        user = self.request.user

        # Akumulator e-mail — zbiera wszystkie zmiany i wysyła 1 mail
        accumulator = TicketEmailAccumulator(ticket, actor=user)

        # Log: zmiana statusu
        if old_status != ticket.status:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.STATUS_CHANGED,
                old_value=old_status,
                new_value=ticket.status,
            )
            accumulator.add_status_change(old_status, ticket.status)
            notify.notify_status_change(ticket, ticket.status, actor=user)

            # SLA: pierwsza reakcja technika/admina — wyjście ze statusu NOWE
            if (old_status == Ticket.Status.NEW
                    and ticket.first_response_at is None
                    and user.role in ('TECHNICIAN', 'ADMIN')):
                ticket.first_response_at = timezone.now()
                ticket.save(update_fields=['first_response_at'])

            # Ustawienie resolved_at i tokenu przy przejściu na ROZWIAZANE
            if ticket.status == Ticket.Status.RESOLVED:
                ticket.generate_resolution_token()
                ticket.save(update_fields=['resolved_at', 'resolution_token'])
            # Wyczyszczenie resolved_at przy wyjściu ze statusu ROZWIAZANE
            elif old_status == Ticket.Status.RESOLVED:
                ticket.clear_resolution()
                ticket.save(update_fields=['resolved_at', 'resolution_token'])

        # Log: zmiana technika
        if old_technician != ticket.technician:
            if ticket.technician is not None:
                TicketLog.objects.create(
                    ticket=ticket,
                    user=user,
                    action=TicketLog.ActionType.TECHNICIAN_ASSIGNED,
                    old_value=f"{old_technician.first_name} {old_technician.last_name}" if old_technician else '',
                    new_value=f"{ticket.technician.first_name} {ticket.technician.last_name}",
                )
                notify.notify_assignment(ticket, ticket.technician, actor=user)
            else:
                TicketLog.objects.create(
                    ticket=ticket,
                    user=user,
                    action=TicketLog.ActionType.TECHNICIAN_REMOVED,
                    old_value=f"{old_technician.first_name} {old_technician.last_name}" if old_technician else '',
                    new_value='',
                )
            accumulator.add_technician_change(old_technician, ticket.technician)

        # Log: zmiana priorytetu
        if old_priority != ticket.priority:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.PRIORITY_CHANGED,
                old_value=old_priority,
                new_value=ticket.priority,
            )

        # Log: zmiana kategorii
        if old_category != ticket.category:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.CATEGORY_CHANGED,
                old_value=old_category.name if old_category else '',
                new_value=ticket.category.name if ticket.category else '',
            )

        # Log: zmiana zgłaszającego
        if old_creator != ticket.creator:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.CREATOR_CHANGED,
                old_value=f"{old_creator.first_name} {old_creator.last_name}" if old_creator else '',
                new_value=f"{ticket.creator.first_name} {ticket.creator.last_name}" if ticket.creator else '',
            )

        # Log: zmiana tytułu
        if old_title != ticket.title:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.TITLE_CHANGED,
                old_value=old_title[:200],
                new_value=ticket.title[:200],
            )

        # Log: zmiana opisu
        if old_description != ticket.description:
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.DESCRIPTION_CHANGED,
            )

        # Transition comment — komentarz wysłany razem ze zmianą statusu
        if transition_comment:
            comment = Comment.objects.create(
                ticket=ticket,
                author=user,
                content=transition_comment,
                comment_type=transition_comment_type if transition_comment_type in ('REPLY', 'INTERNAL') else 'REPLY',
            )
            accumulator.add_comment(transition_comment, comment.comment_type, user)

        # Wyślij skonsolidowany e-mail
        accumulator.flush()


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ticket_id = self.kwargs.get('ticket_id')
        user = self.request.user

        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Comment.objects.none()

        if user.role == 'EMPLOYEE' and ticket.creator != user:
            return Comment.objects.none()

        queryset = Comment.objects.filter(ticket_id=ticket_id).select_related('author')

        # Pracownik nie widzi notatek wewnętrznych
        if user.role == 'EMPLOYEE':
            queryset = queryset.filter(comment_type='REPLY')

        return queryset

    def perform_create(self, serializer):
        ticket_id = self.kwargs.get('ticket_id')
        user = self.request.user

        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Zgłoszenie nie istnieje.')

        if user.role == 'EMPLOYEE' and ticket.creator != user:
            raise PermissionDenied('Nie masz dostępu do tego zgłoszenia.')

        comment_type = serializer.validated_data.get('comment_type', 'REPLY')
        if user.role == 'EMPLOYEE' and comment_type == 'INTERNAL':
            raise PermissionDenied('Nie możesz dodawać notatek wewnętrznych.')

        comment = serializer.save(author=user, ticket=ticket)
        send_comment_notification(comment)
        notify.notify_comment(comment)

        # SLA: pierwsza reakcja technika/admina przez komentarz
        if (ticket.first_response_at is None
                and user.role in ('TECHNICIAN', 'ADMIN')
                and comment.comment_type == 'REPLY'):
            ticket.first_response_at = timezone.now()
            ticket.save(update_fields=['first_response_at'])

        # Log: dodanie komentarza
        TicketLog.objects.create(
            ticket=ticket,
            user=user,
            action=TicketLog.ActionType.COMMENT_ADDED,
            new_value=comment_type,
        )

        # Auto-reopen: klient dodaje komentarz do ticketu ROZWIAZANE → wróć do W_TOKU
        if user.role == 'EMPLOYEE' and ticket.status == Ticket.Status.RESOLVED:
            old_status = ticket.status
            ticket.status = Ticket.Status.IN_PROGRESS
            ticket.clear_resolution()
            ticket.save(update_fields=['status', 'resolved_at', 'resolution_token'])
            TicketLog.objects.create(
                ticket=ticket,
                user=user,
                action=TicketLog.ActionType.REOPENED,
                old_value=old_status,
                new_value=ticket.status,
            )
            send_reopened_notification(ticket, user)


class CommentDetailView(APIView):
    """Edycja i usuwanie pojedynczego komentarza (tylko autor lub admin)."""
    permission_classes = [IsAuthenticated]

    def _get_comment(self, ticket_id, comment_id):
        try:
            return Comment.objects.select_related('author', 'ticket').get(id=comment_id, ticket_id=ticket_id)
        except Comment.DoesNotExist:
            return None

    def _check_permission(self, request, comment):
        if request.user.role != 'ADMIN' and comment.author_id != request.user.id:
            raise PermissionDenied('Możesz edytować lub usuwać tylko własne komentarze.')

    def patch(self, request, ticket_id, comment_id):
        comment = self._get_comment(ticket_id, comment_id)
        if not comment:
            return Response({'detail': 'Komentarz nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
        self._check_permission(request, comment)

        serializer = CommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(is_edited=True)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, ticket_id, comment_id):
        comment = self._get_comment(ticket_id, comment_id)
        if not comment:
            return Response({'detail': 'Komentarz nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
        self._check_permission(request, comment)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationListView(generics.ListAPIView):
    """Lista powiadomień zalogowanego użytkownika (najnowsze 50)."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related('ticket')[:50]


class NotificationActionView(APIView):
    """Akcje na powiadomieniach: oznacz jako przeczytane / oznacz wszystkie / usuń."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Liczba nieprzeczytanych (dla licznika przy dzwonku)
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread': count})

    def post(self, request):
        action_type = request.data.get('action')
        if action_type == 'mark_all_read':
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
            return Response({'detail': 'Oznaczono wszystkie jako przeczytane.'})
        if action_type == 'mark_read':
            notif_id = request.data.get('id')
            Notification.objects.filter(id=notif_id, recipient=request.user).update(is_read=True)
            return Response({'detail': 'Oznaczono jako przeczytane.'})
        return Response({'detail': 'Nieznana akcja.'}, status=status.HTTP_400_BAD_REQUEST)


class ReplyTemplateViewSet(viewsets.ModelViewSet):
    """Szablony szybkich odpowiedzi — dostępne dla techników i adminów."""
    serializer_class = ReplyTemplateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        if self.request.user.role == 'EMPLOYEE':
            return ReplyTemplate.objects.none()
        return ReplyTemplate.objects.all()

    def perform_create(self, serializer):
        if self.request.user.role == 'EMPLOYEE':
            raise PermissionDenied('Brak uprawnień do tworzenia szablonów.')
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role == 'EMPLOYEE':
            raise PermissionDenied('Brak uprawnień.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role == 'EMPLOYEE':
            raise PermissionDenied('Brak uprawnień.')
        instance.delete()


class TicketLogListView(generics.ListAPIView):
    """Lista logów systemowych dla danego zgłoszenia."""
    serializer_class = TicketLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ticket_id = self.kwargs.get('ticket_id')
        user = self.request.user

        # Pracownicy nie widzą logów systemowych
        if user.role == 'EMPLOYEE':
            return TicketLog.objects.none()

        return TicketLog.objects.filter(ticket_id=ticket_id).select_related('user')


class GlobalActivityLogView(generics.ListAPIView):
    """Globalny feed aktywności — najnowsze logi ze wszystkich zgłoszeń."""
    serializer_class = TicketLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'EMPLOYEE':
            return TicketLog.objects.none()
        return TicketLog.objects.select_related('user', 'ticket').order_by('-created_at')[:40]


class WorkLogListCreateView(generics.ListCreateAPIView):
    """Lista i tworzenie wpisów rejestru prac dla danego zgłoszenia."""
    serializer_class = WorkLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ticket_id = self.kwargs.get('ticket_id')
        user = self.request.user

        # Pracownicy nie widzą rejestru prac
        if user.role == 'EMPLOYEE':
            return WorkLog.objects.none()

        return WorkLog.objects.filter(ticket_id=ticket_id).select_related('author')

    def perform_create(self, serializer):
        ticket_id = self.kwargs.get('ticket_id')
        user = self.request.user

        if user.role == 'EMPLOYEE':
            raise PermissionDenied('Nie masz uprawnień do dodawania wpisów rejestru prac.')

        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Zgłoszenie nie istnieje.')

        serializer.save(author=user, ticket=ticket)

        # Log: rejestracja czasu pracy
        TicketLog.objects.create(
            ticket=ticket,
            user=user,
            action=TicketLog.ActionType.WORK_LOGGED,
            new_value=f'{serializer.instance.duration_minutes} min',
        )


class WorkLogDetailView(APIView):
    """Edycja i usuwanie pojedynczego wpisu rejestru prac."""
    permission_classes = [IsAuthenticated]

    def _get_worklog(self, ticket_id, wl_id):
        try:
            return WorkLog.objects.get(id=wl_id, ticket_id=ticket_id)
        except WorkLog.DoesNotExist:
            return None

    def _check_permission(self, request, worklog):
        """Tylko autor wpisu lub admin może go edytować/usuwać."""
        if request.user.role == 'EMPLOYEE':
            raise PermissionDenied('Nie masz uprawnień do tej operacji.')
        if request.user.role != 'ADMIN' and worklog.author != request.user:
            raise PermissionDenied('Możesz edytować lub usuwać tylko własne wpisy.')

    def patch(self, request, ticket_id, wl_id):
        worklog = self._get_worklog(ticket_id, wl_id)
        if not worklog:
            return Response({'detail': 'Wpis nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
        self._check_permission(request, worklog)

        serializer = WorkLogSerializer(worklog, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, ticket_id, wl_id):
        worklog = self._get_worklog(ticket_id, wl_id)
        if not worklog:
            return Response({'detail': 'Wpis nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
        self._check_permission(request, worklog)
        worklog.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TicketAttachmentView(APIView):
    """
    Upload załączników do zgłoszenia.
    GET  – lista załączników zgłoszenia
    POST – upload nowego pliku
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        attachments = Attachment.objects.filter(ticket_id=ticket_id, comment__isnull=True)
        serializer = AttachmentSerializer(attachments, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Zgłoszenie nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('files')
        if not files:
            return Response({'detail': 'Nie przesłano żadnych plików.'}, status=status.HTTP_400_BAD_REQUEST)

        validation_error = validate_uploaded_files(files)
        if validation_error:
            return validation_error

        created = _create_attachments(ticket, files, request.user)

        serializer = AttachmentSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentDeleteView(APIView):
    """Usuwanie załącznika (tylko technik/admin)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, ticket_id, attachment_id):
        user = request.user
        if user.role == 'EMPLOYEE':
            return Response({'detail': 'Brak uprawnień.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            attachment = Attachment.objects.get(id=attachment_id, ticket_id=ticket_id)
        except Attachment.DoesNotExist:
            return Response({'detail': 'Załącznik nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)

        filename = attachment.filename
        ticket = attachment.ticket

        # Usuń plik z dysku
        if attachment.file:
            attachment.file.delete(save=False)

        attachment.delete()

        # Log: usunięcie załącznika
        TicketLog.objects.create(
            ticket=ticket,
            user=user,
            action=TicketLog.ActionType.ATTACHMENT_DELETED,
            old_value=filename,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

class CommentAttachmentView(APIView):
    """
    Upload załączników do komentarza.
    POST – upload plików powiązanych z komentarzem
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id, comment_id):
        try:
            ticket = Ticket.objects.get(id=ticket_id)
            comment = Comment.objects.get(id=comment_id, ticket=ticket)
        except (Ticket.DoesNotExist, Comment.DoesNotExist):
            return Response({'detail': 'Komentarz nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('files')
        if not files:
            return Response({'detail': 'Nie przesłano żadnych plików.'}, status=status.HTTP_400_BAD_REQUEST)

        validation_error = validate_uploaded_files(files)
        if validation_error:
            return validation_error

        created = _create_attachments(ticket, files, request.user, comment=comment)

        serializer = AttachmentSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TicketResolutionActionView(APIView):
    """
    Obsługuje akcje z linków e-mailowych (akceptacja/odrzucenie rozwiązania).
    Nie wymaga logowania — token jest sekretem.
    GET /api/tickets/resolve/<token>/accept/
    GET /api/tickets/resolve/<token>/reject/
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Brak wymagania tokenu JWT

    def get(self, request, token, action):
        frontend_url = getattr(django_settings, 'FIXFLOW_FRONTEND_URL', 'http://localhost:5173')

        try:
            ticket = Ticket.objects.get(resolution_token=token)
        except Ticket.DoesNotExist:
            return redirect(f'{frontend_url}/resolution/invalid')

        if ticket.status != Ticket.Status.RESOLVED:
            return redirect(f'{frontend_url}/resolution/already-processed')

        # Sprawdzenie TTL tokenu resolucji
        ttl_hours = getattr(django_settings, 'FIXFLOW_RESOLUTION_TOKEN_TTL_HOURS', 72)
        if ticket.resolved_at and timezone.now() > ticket.resolved_at + timedelta(hours=ttl_hours):
            return redirect(f'{frontend_url}/resolution/invalid')

        if action == 'accept':
            old_status = ticket.status
            ticket.status = Ticket.Status.CLOSED
            ticket.clear_resolution()
            ticket.save(update_fields=['status', 'resolved_at', 'resolution_token'])
            TicketLog.objects.create(
                ticket=ticket,
                user=None,
                action=TicketLog.ActionType.STATUS_CHANGED,
                old_value=old_status,
                new_value=ticket.status,
            )
            return redirect(f'{frontend_url}/resolution/accepted')

        elif action == 'reject':
            old_status = ticket.status
            ticket.status = Ticket.Status.IN_PROGRESS
            ticket.clear_resolution()
            ticket.save(update_fields=['status', 'resolved_at', 'resolution_token'])
            TicketLog.objects.create(
                ticket=ticket,
                user=None,
                action=TicketLog.ActionType.REOPENED,
                old_value=old_status,
                new_value=ticket.status,
            )
            send_reopened_notification(ticket, actor=None)
            return redirect(f'{frontend_url}/resolution/rejected')

        return redirect(f'{frontend_url}/resolution/invalid')
