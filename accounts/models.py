from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', _('Pracownik')
        TECHNICIAN = 'TECHNICIAN', _('Technik')
        ADMIN = 'ADMIN', _('Administrator')

    username = None
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
        verbose_name=_('Rola')
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name=_('Zdjęcie profilowe')
    )
    
    # Preferencje powiadomień
    notify_new_ticket = models.BooleanField(default=True, verbose_name=_('Powiadamiaj o nowych zgłoszeniach'))
    notify_ticket_comment = models.BooleanField(default=True, verbose_name=_('Powiadamiaj o komentarzach'))
    notify_ticket_status_change = models.BooleanField(default=True, verbose_name=_('Powiadamiaj o zmianie statusu'))

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
