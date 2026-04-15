from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


# ============================================================
# 1. UTWORZENIE ZGŁOSZENIA
# ============================================================

def send_ticket_created_notification(ticket):
    """
    Zgłoszenie zostało utworzone.
    → Mail do ZGŁASZAJĄCEGO (potwierdzenie przyjęcia).
    → Mail do PRZYPISANEGO TECHNIKA (jeśli od razu przypisano).
    """
    # -- Potwierdzenie dla zgłaszającego --
    if ticket.creator.email:
        send_mail(
            subject=f'[FixFlow] Dziękujemy! Otrzymaliśmy Twoje zgłoszenie #{ticket.id}',
            message=(
                f'Witaj {ticket.creator.first_name},\n\n'
                f'Twoje zgłoszenie (#{ticket.id}) zatytułowane "{ticket.title}" zostało pomyślnie '
                f'przyjęte do systemu FixFlow i oczekuje na przypisanie do technika.\n\n'
                f'Powiadomimy Cię niezwłocznie, gdy tylko status zgłoszenia ulegnie zmianie '
                f'lub technik zada dodatkowe pytanie.\n\n'
                f'Zaloguj się do panelu FixFlow, aby na bieżąco śledzić postępy.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )

    # -- Powiadomienie technika (jeśli przypisano od razu) --
    if ticket.technician and ticket.technician.email:
        send_mail(
            subject=f'[FixFlow] Nowe zgłoszenie #{ticket.id} przypisane do Ciebie',
            message=(
                f'Witaj {ticket.technician.first_name},\n\n'
                f'Zostało Ci przypisane nowe zgłoszenie (#{ticket.id}).\n\n'
                f'Tytuł: {ticket.title}\n'
                f'Priorytet: {ticket.get_priority_display()}\n'
                f'Zgłaszający: {ticket.creator.first_name} {ticket.creator.last_name}\n\n'
                f'Zaloguj się do FixFlow, aby rozpocząć pracę nad zgłoszeniem.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.technician.email],
            fail_silently=True,
        )


# ============================================================
# 2. ZMIANA STATUSU
# ============================================================

def send_status_change_notification(ticket, old_status, new_status):
    """
    Status zgłoszenia uległ zmianie.
    → Mail do ZGŁASZAJĄCEGO (informacja o postępie).
    → Mail do TECHNIKA (jeśli przypisany – informacja o zmianie statusu).
    """
    status_labels = {
        'NOWE': 'Nowe',
        'W_TOKU': 'W toku',
        'ROZWIAZANE': 'Rozwiązane',
        'ZAMKNIETE': 'Zamknięte',
    }

    old_label = status_labels.get(old_status, old_status)
    new_label = status_labels.get(new_status, new_status)

    # -- Powiadomienie zgłaszającego --
    if ticket.creator.email:
        send_mail(
            subject=f'[FixFlow] Zmiana statusu zgłoszenia #{ticket.id}: {ticket.title}',
            message=(
                f'Witaj {ticket.creator.first_name},\n\n'
                f'Status Twojego zgłoszenia #{ticket.id} został zmieniony.\n\n'
                f'Poprzedni status: {old_label}\n'
                f'Nowy status: {new_label}\n\n'
                f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )

    # -- Powiadomienie technika (jeśli przypisany i to nie on zmienił) --
    if ticket.technician and ticket.technician.email and ticket.technician != ticket.creator:
        send_mail(
            subject=f'[FixFlow] Status zgłoszenia #{ticket.id} zmieniony na: {new_label}',
            message=(
                f'Witaj {ticket.technician.first_name},\n\n'
                f'Status zgłoszenia #{ticket.id} ("{ticket.title}") został zmieniony.\n\n'
                f'Poprzedni status: {old_label}\n'
                f'Nowy status: {new_label}\n\n'
                f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.technician.email],
            fail_silently=True,
        )


# ============================================================
# 3. PRZYPISANIE / ZMIANA TECHNIKA
# ============================================================

def send_technician_assigned_notification(ticket, old_technician=None):
    """
    Technik został przypisany lub zmieniony.
    → Mail do ZGŁASZAJĄCEGO (kto zajmie się jego sprawą).
    → Mail do NOWEGO TECHNIKA (że dostal nowe zadanie).
    → Mail do STAREGO TECHNIKA (że został odłączony, jeśli byl wcześniej ktoś inny).
    """
    new_tech = ticket.technician

    # -- Powiadomienie zgłaszającego --
    if ticket.creator.email and new_tech:
        send_mail(
            subject=f'[FixFlow] Przypisano technika do zgłoszenia #{ticket.id}',
            message=(
                f'Witaj {ticket.creator.first_name},\n\n'
                f'Twoje zgłoszenie (#{ticket.id}) o tytule "{ticket.title}" zostało zaktualizowane.\n\n'
                f'Do Twojej sprawy został przypisany specjalista: '
                f'{new_tech.first_name} {new_tech.last_name}.\n'
                f'Będzie on teraz bezpośrednio odpowiedzialny za weryfikację '
                f'i rozwiązanie Twojego problemu.\n\n'
                f'Zaloguj się do systemu, jeśli potrzebujesz dodać dodatkowe informacje.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )

    # -- Powiadomienie nowego technika --
    if new_tech and new_tech.email:
        send_mail(
            subject=f'[FixFlow] Przypisano Ci zgłoszenie #{ticket.id}: {ticket.title}',
            message=(
                f'Witaj {new_tech.first_name},\n\n'
                f'Zostało Ci przypisane zgłoszenie (#{ticket.id}).\n\n'
                f'Tytuł: {ticket.title}\n'
                f'Priorytet: {ticket.get_priority_display()}\n'
                f'Zgłaszający: {ticket.creator.first_name} {ticket.creator.last_name}\n\n'
                f'Zaloguj się do FixFlow, aby rozpocząć pracę.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_tech.email],
            fail_silently=True,
        )

    # -- Powiadomienie starego technika (został odłączony) --
    if old_technician and old_technician.email and old_technician != new_tech:
        send_mail(
            subject=f'[FixFlow] Usunięto Twoje przypisanie do zgłoszenia #{ticket.id}',
            message=(
                f'Witaj {old_technician.first_name},\n\n'
                f'Zostałeś/aś odłączony/a od zgłoszenia #{ticket.id} ("{ticket.title}").\n\n'
                f'Zgłoszenie zostało przekazane innemu specjaliście.\n'
                f'Nie musisz podejmować żadnych dalszych działań.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[old_technician.email],
            fail_silently=True,
        )


# ============================================================
# 4. KOMENTARZE
# ============================================================

def send_comment_notification(comment):
    """
    Dodano nowy komentarz.
    → Technik/Admin odpowiada → mail do ZGŁASZAJĄCEGO.
    → Pracownik odpowiada → mail do TECHNIKA.
    → Notatki wewnętrzne (INTERNAL) → BEZ maila do pracownika.
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
            message=(
                f'Witaj {ticket.creator.first_name},\n\n'
                f'Otrzymałeś nową odpowiedź w zgłoszeniu #{ticket.id}.\n\n'
                f'Od: {author.first_name} {author.last_name}\n'
                f'Treść: {comment.content}\n\n'
                f'Zaloguj się do FixFlow, aby odpowiedzieć.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.creator.email],
            fail_silently=True,
        )

    # Pracownik odpowiada → powiadom przypisanego technika
    elif author.role == 'EMPLOYEE' and ticket.technician and ticket.technician.email:
        send_mail(
            subject=f'[FixFlow] Nowy komentarz od zgłaszającego – #{ticket.id}: {ticket.title}',
            message=(
                f'Witaj {ticket.technician.first_name},\n\n'
                f'Zgłaszający dodał komentarz do zgłoszenia #{ticket.id}.\n\n'
                f'Od: {author.first_name} {author.last_name}\n'
                f'Treść: {comment.content}\n\n'
                f'Zaloguj się do FixFlow, aby odpowiedzieć.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.technician.email],
            fail_silently=True,
        )
