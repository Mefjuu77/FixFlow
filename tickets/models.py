import secrets

from django.db import models
from django.conf import settings
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = 'NOWE', 'Nowe'
        IN_PROGRESS = 'W_TOKU', 'W toku'
        RESOLVED = 'ROZWIAZANE', 'Rozwiązane'
        CLOSED = 'ZAMKNIETE', 'Zamknięte'

    class Priority(models.TextChoices):
        LOW = 'NISKI', 'Niski'
        NORMAL = 'NORMALNY', 'Normalny'
        HIGH = 'WYSOKI', 'Wysoki'

    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.NEW,
        db_index=True
    )
    priority = models.CharField(
        max_length=20, 
        choices=Priority.choices, 
        default=Priority.NORMAL,
        db_index=True
    )
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='tickets')
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_tickets'
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tickets'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True, help_text='Data przejścia w status Rozwiązane')
    first_response_at = models.DateTimeField(null=True, blank=True, help_text='Data pierwszej reakcji technika (komentarz lub zmiana statusu)')
    resolution_token = models.CharField(max_length=64, blank=True, default='', help_text='Token do akcji akceptacji/odrzucenia z e-maila')

    def generate_resolution_token(self):
        """Generuje unikalny token i ustawia resolved_at."""
        self.resolution_token = secrets.token_urlsafe(48)
        self.resolved_at = timezone.now()

    def clear_resolution(self):
        """Czyści dane rozwiązania (przy ponownym otwarciu)."""
        self.resolution_token = ''
        self.resolved_at = None

    def __str__(self):
        return f"[{self.id}] {self.title}"


class Comment(models.Model):
    class CommentType(models.TextChoices):
        REPLY = 'REPLY', 'Odpowiedź'
        INTERNAL = 'INTERNAL', 'Notatka wewnętrzna'

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content = models.TextField()
    comment_type = models.CharField(
        max_length=20,
        choices=CommentType.choices,
        default=CommentType.REPLY
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Podbicie daty ostatniej aktualizacji zgłoszenia — targeted UPDATE
        # zamiast pełnego self.ticket.save() (eliminacja N+1 SELECT + UPDATE)
        Ticket.objects.filter(pk=self.ticket_id).update(updated_at=timezone.now())

    def __str__(self):
        return f"Komentarz #{self.id} do zgłoszenia [{self.ticket.id}]"


class Attachment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    file = models.FileField(upload_to='attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_attachments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} (zgłoszenie #{self.ticket.id})"


class TicketLog(models.Model):
    """Automatyczny log zdarzeń na zgłoszeniu."""
    class ActionType(models.TextChoices):
        CREATED = 'CREATED', 'Utworzono zgłoszenie'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Zmieniono status'
        TECHNICIAN_ASSIGNED = 'TECHNICIAN_ASSIGNED', 'Przypisano technika'
        TECHNICIAN_REMOVED = 'TECHNICIAN_REMOVED', 'Usunięto technika'
        PRIORITY_CHANGED = 'PRIORITY_CHANGED', 'Zmieniono priorytet'
        CATEGORY_CHANGED = 'CATEGORY_CHANGED', 'Zmieniono kategorię'
        CREATOR_CHANGED = 'CREATOR_CHANGED', 'Zmieniono zgłaszającego'
        ATTACHMENT_ADDED = 'ATTACHMENT_ADDED', 'Dodano załącznik'
        TITLE_CHANGED = 'TITLE_CHANGED', 'Zmieniono tytuł'
        DESCRIPTION_CHANGED = 'DESCRIPTION_CHANGED', 'Zmieniono opis'
        ATTACHMENT_DELETED = 'ATTACHMENT_DELETED', 'Usunięto załącznik'
        AUTO_CLOSED = 'AUTO_CLOSED', 'Automatycznie zamknięto'
        REOPENED = 'REOPENED', 'Ponownie otwarto'
        COMMENT_ADDED = 'COMMENT_ADDED', 'Dodano komentarz'
        WORK_LOGGED = 'WORK_LOGGED', 'Zarejestrowano czas pracy'

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_logs'
    )
    action = models.CharField(max_length=30, choices=ActionType.choices)
    old_value = models.CharField(max_length=200, blank=True, default='')
    new_value = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Log [{self.get_action_display()}] zgłoszenie #{self.ticket_id}"


class WorkLog(models.Model):
    """Ręczny wpis technika o pracach wykonanych na zgłoszeniu."""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='work_logs')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='work_logs'
    )
    description = models.TextField()
    duration_minutes = models.PositiveIntegerField(help_text='Czas pracy w minutach')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"WorkLog #{self.id} ({self.duration_minutes}min) zgłoszenie #{self.ticket_id}"


class Notification(models.Model):
    """Powiadomienie in-app dla użytkownika (dzwonek w interfejsie)."""
    class Type(models.TextChoices):
        NEW_TICKET = 'NEW_TICKET', 'Nowe zgłoszenie'
        COMMENT = 'COMMENT', 'Nowy komentarz'
        STATUS_CHANGE = 'STATUS_CHANGE', 'Zmiana statusu'
        ASSIGNMENT = 'ASSIGNMENT', 'Przypisanie'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    type = models.CharField(max_length=20, choices=Type.choices)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Powiadomienie [{self.get_type_display()}] -> {self.recipient_id}"


class ReplyTemplate(models.Model):
    """Szablon szybkiej odpowiedzi (canned response) dla techników/adminów."""
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reply_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title
