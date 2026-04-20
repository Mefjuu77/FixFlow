from django.db import models
from django.conf import settings

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
        default=Status.NEW
    )
    priority = models.CharField(
        max_length=20, 
        choices=Priority.choices, 
        default=Priority.NORMAL
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Podbicie daty ostatniej aktualizacji zgłoszenia
        self.ticket.save()

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
    created_at = models.DateTimeField(auto_now_add=True)

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
