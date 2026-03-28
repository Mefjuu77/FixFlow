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
