from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Category, Ticket, Comment, Attachment
from .serializers import CategorySerializer, TicketSerializer, CommentSerializer, AttachmentSerializer
from .email import send_comment_notification, send_status_change_notification

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
        serializer.save(creator=self.request.user)

    def perform_update(self, serializer):
        old_status = self.get_object().status
        ticket = serializer.save()
        
        # Jeśli status się zmienił, wysyłamy maila do twórcy zgłoszenia
        if old_status != ticket.status:
            send_status_change_notification(ticket, old_status, ticket.status)


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

        MAX_FILE_SIZE = 5 * 1024 * 1024
        MAX_TOTAL_SIZE = 15 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'}
        import os
        
        total_size = sum(f.size for f in files)
        if total_size > MAX_TOTAL_SIZE:
            return Response({'detail': 'Łączny rozmiar plików przekracza maksymalny limit operacji (15 MB).'}, status=status.HTTP_400_BAD_REQUEST)

        for f in files:
            if f.size > MAX_FILE_SIZE:
                return Response({'detail': f'Plik {f.name} przekracza maksymalny rozmiar 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
            ext = os.path.splitext(f.name)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                return Response({'detail': f'Plik {f.name} posiada niedozwolony format ({ext}).'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for f in files:
            attachment = Attachment.objects.create(
                ticket=ticket,
                file=f,
                filename=f.name,
                uploaded_by=request.user,
            )
            created.append(attachment)

        serializer = AttachmentSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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

        MAX_FILE_SIZE = 5 * 1024 * 1024
        MAX_TOTAL_SIZE = 15 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip'}
        import os

        total_size = sum(f.size for f in files)
        if total_size > MAX_TOTAL_SIZE:
            return Response({'detail': 'Łączny rozmiar plików przekracza maksymalny limit operacji (15 MB).'}, status=status.HTTP_400_BAD_REQUEST)

        for f in files:
            if f.size > MAX_FILE_SIZE:
                return Response({'detail': f'Plik {f.name} przekracza maksymalny rozmiar 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
            ext = os.path.splitext(f.name)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                return Response({'detail': f'Plik {f.name} posiada niedozwolony format ({ext}).'}, status=status.HTTP_400_BAD_REQUEST)

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

        serializer = AttachmentSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
