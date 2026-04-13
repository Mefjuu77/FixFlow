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
