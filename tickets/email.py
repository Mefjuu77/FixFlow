from django.core.mail import send_mail
from django.conf import settings


def send_comment_notification(comment):
    """
    Wysyła powiadomienie e-mail o nowym komentarzu.
    - Jeśli autor to technik/admin → mail do twórcy zgłoszenia
    - Jeśli autor to pracownik → mail do przypisanego technika
    - Notatki wewnętrzne NIE generują maili do pracownika
    """
    ticket = comment.ticket
    author = comment.author

    # Notatki wewnętrzne – nie powiadamiaj pracownika
    if comment.comment_type == 'INTERNAL':
        return

    # Technik/Admin odpowiada → powiadom twórcę zgłoszenia
    if author.role in ['TECHNICIAN', 'ADMIN'] and ticket.creator.email:
        send_mail(
            subject=f'[FixFlow] Nowa odpowiedź w zgłoszeniu #{ticket.id}: {ticket.title}',
            message=f'Otrzymałeś nową odpowiedź w zgłoszeniu #{ticket.id}.\n\n'
                    f'Od: {author.first_name} {author.last_name}\n'
                    f'Treść: {comment.content}\n\n'
                    f'Zaloguj się do FixFlow, aby odpowiedzieć.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )

    # Pracownik odpowiada → powiadom przypisanego technika
    elif author.role == 'EMPLOYEE' and ticket.technician and ticket.technician.email:
        send_mail(
            subject=f'[FixFlow] Nowy komentarz od zgłaszającego – #{ticket.id}: {ticket.title}',
            message=f'Zgłaszający dodał komentarz do zgłoszenia #{ticket.id}.\n\n'
                    f'Od: {author.first_name} {author.last_name}\n'
                    f'Treść: {comment.content}\n\n'
                    f'Zaloguj się do FixFlow, aby odpowiedzieć.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.technician.email],
            fail_silently=True,
        )


def send_status_change_notification(ticket, old_status, new_status):
    """
    Wysyła powiadomienie e-mail do twórcy zgłoszenia o zmianie statusu.
    """
    status_labels = {
        'NOWE': 'Nowe',
        'W_TOKU': 'W toku',
        'ROZWIAZANE': 'Rozwiązane',
        'ZAMKNIETE': 'Zamknięte',
    }

    if ticket.creator.email:
        send_mail(
            subject=f'[FixFlow] Zmiana statusu zgłoszenia #{ticket.id}: {ticket.title}',
            message=f'Status Twojego zgłoszenia #{ticket.id} został zmieniony.\n\n'
                    f'Poprzedni status: {status_labels.get(old_status, old_status)}\n'
                    f'Nowy status: {status_labels.get(new_status, new_status)}\n\n'
                    f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )
