import os

from django.conf import settings as django_settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Category, Ticket, Comment, Attachment, TicketLog, WorkLog
from .serializers import CategorySerializer, TicketSerializer, CommentSerializer, AttachmentSerializer, TicketLogSerializer, WorkLogSerializer
from .email import send_ticket_created_notification, send_comment_notification, TicketEmailAccumulator, send_reopened_notification

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
    permission_classes = [IsAuthenticated]

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'EMPLOYEE':
            return Ticket.objects.filter(creator=user)
        return Ticket.objects.all()

    def perform_create(self, serializer):
        # Automatycznie przypisuje aktualnie zalogowanego użytkownika jako twórcę zgłoszenia
        ticket = serializer.save(creator=self.request.user)
        send_ticket_created_notification(ticket)

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

        queryset = Comment.objects.filter(ticket_id=ticket_id)

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

        return TicketLog.objects.filter(ticket_id=ticket_id)


class GlobalActivityLogView(generics.ListAPIView):
    """Globalny feed aktywności — najnowsze logi ze wszystkich zgłoszeń."""
    serializer_class = TicketLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'EMPLOYEE':
            return TicketLog.objects.none()
        return TicketLog.objects.all().order_by('-created_at')[:20]


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

        return WorkLog.objects.filter(ticket_id=ticket_id)

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

        created = []
        for f in files:
            attachment = Attachment.objects.create(
                ticket=ticket,
                file=f,
                filename=f.name,
                uploaded_by=request.user,
            )
            created.append(attachment)

        # Log: dodanie załączników (jeden zbiorczy wpis)
        if len(created) == 1:
            log_value = created[0].filename
        else:
            log_value = f'{len(created)} załączników'
        TicketLog.objects.create(
            ticket=ticket,
            user=request.user,
            action=TicketLog.ActionType.ATTACHMENT_ADDED,
            new_value=log_value,
        )

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

        created = []
        for f in files:
            attachment = Attachment.objects.create(
                ticket=ticket,
                comment=comment,
                file=f,
                filename=f.name,
                uploaded_by=request.user,
            )
            created.append(attachment)

        # Log: dodanie załączników (jeden zbiorczy wpis)
        if len(created) == 1:
            log_value = created[0].filename
        else:
            log_value = f'{len(created)} załączników'
        TicketLog.objects.create(
            ticket=ticket,
            user=request.user,
            action=TicketLog.ActionType.ATTACHMENT_ADDED,
            new_value=log_value,
        )

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
