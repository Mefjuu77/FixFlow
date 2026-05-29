"""
Powiadomienia in-app (dzwonek w interfejsie).

Tworzy rekordy Notification dla odpowiednich odbiorców, z poszanowaniem
preferencji powiadomień użytkownika (flagi notify_* na CustomUser).
Logika doboru odbiorców jest spójna z modułem e-mail.
"""

from .models import Notification


def _wants(user, field):
    """Czy użytkownik chce dany typ powiadomień (domyślnie True)."""
    return getattr(user, field, True)


def notify_ticket_created(ticket):
    """Nowe zgłoszenie → powiadom przypisanego technika (jeśli od razu przypisano)."""
    tech = ticket.technician
    if tech and tech != ticket.creator and _wants(tech, 'notify_new_ticket'):
        Notification.objects.create(
            recipient=tech,
            ticket=ticket,
            type=Notification.Type.NEW_TICKET,
            message=f'Przypisano Ci nowe zgłoszenie #{ticket.id}: {ticket.title}',
        )


def notify_comment(comment):
    """Nowy komentarz (nie-wewnętrzny) → powiadom drugą stronę."""
    if comment.comment_type == 'INTERNAL':
        return
    ticket = comment.ticket
    author = comment.author
    author_name = f'{author.first_name} {author.last_name}'.strip()

    # Technik/Admin odpowiada → powiadom zgłaszającego
    if author.role in ('TECHNICIAN', 'ADMIN'):
        recipient = ticket.creator
    else:
        recipient = ticket.technician

    if recipient and recipient != author and _wants(recipient, 'notify_ticket_comment'):
        Notification.objects.create(
            recipient=recipient,
            ticket=ticket,
            type=Notification.Type.COMMENT,
            message=f'Nowy komentarz od {author_name} w zgłoszeniu #{ticket.id}',
        )


def notify_status_change(ticket, new_status, actor=None):
    """Zmiana statusu → powiadom zgłaszającego i technika (poza osobą zmieniającą)."""
    from .models import Ticket
    label = dict(Ticket.Status.choices).get(new_status, new_status)

    recipients = set()
    if ticket.creator:
        recipients.add(ticket.creator)
    if ticket.technician:
        recipients.add(ticket.technician)

    for r in recipients:
        if r == actor:
            continue
        if not _wants(r, 'notify_ticket_status_change'):
            continue
        Notification.objects.create(
            recipient=r,
            ticket=ticket,
            type=Notification.Type.STATUS_CHANGE,
            message=f'Status zgłoszenia #{ticket.id} zmieniono na: {label}',
        )


def notify_assignment(ticket, new_tech, actor=None):
    """Przypisanie technika → powiadom przypisanego (poza osobą zmieniającą)."""
    if new_tech and new_tech != actor and _wants(new_tech, 'notify_new_ticket'):
        Notification.objects.create(
            recipient=new_tech,
            ticket=ticket,
            type=Notification.Type.ASSIGNMENT,
            message=f'Przypisano Cię do zgłoszenia #{ticket.id}: {ticket.title}',
        )
