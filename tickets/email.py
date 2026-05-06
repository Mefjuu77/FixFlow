from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
import logging
import time

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, 'FIXFLOW_FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = 'http://127.0.0.1:8000'  # URL backendu do linków tokenowych
AUTO_CLOSE_DAYS = getattr(settings, 'FIXFLOW_AUTO_CLOSE_DAYS', 7)

# ============================================================
# Kolory statusów i priorytetów
# ============================================================

STATUS_COLORS = {
    'NOWE': '#2563EB',
    'W_TOKU': '#D97706',
    'ROZWIAZANE': '#16A34A',
    'ZAMKNIETE': '#14B8A6',
}

STATUS_LABELS = {
    'NOWE': 'Nowe',
    'W_TOKU': 'W toku',
    'ROZWIAZANE': 'Rozwiązane',
    'ZAMKNIETE': 'Zamknięte',
}

STATUS_BADGE_COLORS = {
    'NOWE': ('#DBEAFE', '#1E40AF'),
    'W_TOKU': ('#FEF3C7', '#92400E'),
    'ROZWIAZANE': ('#DCFCE7', '#166534'),
    'ZAMKNIETE': ('#CCFBF1', '#115E59'),
}

PRIORITY_COLORS = {
    'WYSOKI': '#DC2626',
    'NORMALNY': '#2563EB',
    'NISKI': '#6B7280',
}

PRIORITY_BADGE_COLORS = {
    'WYSOKI': ('#FEE2E2', '#991B1B'),
    'NORMALNY': ('#DBEAFE', '#1E40AF'),
    'NISKI': ('#F3F4F6', '#1F2937'),
}

PRIORITY_LABELS = {
    'WYSOKI': 'Wysoki',
    'NORMALNY': 'Normalny',
    'NISKI': 'Niski',
}


# ============================================================
# Budowanie szablonu HTML
# ============================================================

def _badge(label, bg_color, text_color):
    """Generuje inline badge HTML."""
    return (
        f'<span style="display:inline-block;padding:3px 10px;border-radius:20px;'
        f'font-size:12px;font-weight:600;color:{text_color};background-color:{bg_color};'
        f'letter-spacing:0.3px;">{label}</span>'
    )


def _build_html_email(title, greeting, body_html, ticket=None, accent_color='#2563EB'):
    """
    Buduje kompletny HTML e-maila z inline CSS.

    Args:
        title: Nagłówek widoczny w headerze e-maila
        greeting: Tekst powitania (np. "Witaj Jan,")
        body_html: Główna treść wiadomości (HTML)
        ticket: Obiekt zgłoszenia (opcjonalny, do wyświetlenia karty szczegółów + CTA)
        accent_color: Kolor akcentowy headera
    """
    # Karta szczegółów zgłoszenia
    ticket_card = ''
    cta_button = ''

    if ticket:
        priority_label = PRIORITY_LABELS.get(getattr(ticket, 'priority', ''), '—')
        priority_bg, priority_text = PRIORITY_BADGE_COLORS.get(getattr(ticket, 'priority', ''), ('#F3F4F6', '#1F2937'))
        status_label = STATUS_LABELS.get(getattr(ticket, 'status', ''), '—')
        status_bg, status_text = STATUS_BADGE_COLORS.get(getattr(ticket, 'status', ''), ('#F3F4F6', '#1F2937'))

        creator_name = ''
        if hasattr(ticket, 'creator') and ticket.creator:
            creator_name = f'{ticket.creator.first_name} {ticket.creator.last_name}'

        technician_name = ''
        if hasattr(ticket, 'technician') and ticket.technician:
            technician_name = f'{ticket.technician.first_name} {ticket.technician.last_name}'

        ticket_card = f'''
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
          <tr>
            <td style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:12px;border-bottom:1px solid #E2E8F0;">
                    <span style="font-size:13px;color:#64748B;font-weight:500;">Zgłoszenie</span>
                    <span style="font-size:13px;color:#94A3B8;font-weight:400;"> · </span>
                    <span style="font-size:13px;color:{accent_color};font-weight:700;">#{ticket.id}</span>
                    <div style="margin-top:4px;font-size:16px;font-weight:700;color:#1E293B;line-height:1.4;">
                      {ticket.title}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="vertical-align:top;padding-right:8px;">
                          <div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Status</div>
                          {_badge(status_label, status_bg, status_text)}
                        </td>
                        <td width="50%" style="vertical-align:top;padding-left:8px;">
                          <div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Priorytet</div>
                          {_badge(priority_label, priority_bg, priority_text)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {"<tr><td style='padding-top:12px;'><div style='font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;'>Zgłaszający</div><div style='font-size:13px;color:#334155;font-weight:500;'>" + creator_name + "</div></td></tr>" if creator_name else ""}
                {"<tr><td style='padding-top:8px;'><div style='font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;'>Przypisany technik</div><div style='font-size:13px;color:#334155;font-weight:500;'>" + technician_name + "</div></td></tr>" if technician_name else ""}
              </table>
            </td>
          </tr>
        </table>
        '''

        ticket_url = f'{FRONTEND_URL}/tickets/{ticket.id}'
        cta_button = f'''
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
          <tr>
            <td align="center">
              <a href="{ticket_url}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:{accent_color};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                Otwórz zgłoszenie &rarr;
              </a>
            </td>
          </tr>
        </table>
        '''

    html = f'''<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, {accent_color} 0%, #1E40AF 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                &#9881; FixFlow
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">
                System zgłoszeń IT
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
              <div style="font-size:18px;font-weight:700;color:#1E293B;margin-bottom:6px;">
                {greeting}
              </div>
              <div style="font-size:14px;color:#475569;line-height:1.7;margin-top:16px;">
                {body_html}
              </div>

              {ticket_card}
              {cta_button}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <div style="font-size:12px;color:#94A3B8;line-height:1.6;">
                <strong style="color:#64748B;">FixFlow</strong> &middot; System zgłoszeń IT<br>
                Ta wiadomość została wygenerowana automatycznie. Nie odpowiadaj na nią.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>'''

    return html


# ============================================================
# Wysyłanie z wątkowanie (threading)
# ============================================================

def _send_threaded_email(subject, plain, html, ticket, recipient_list):
    """Wysyła e-mail z nagłówkami umożliwiającymi wątkowanie w klientach pocztowych."""
    thread_id = f'<fixflow-ticket-{ticket.id}@fixflow.local>'
    msg_id = f'<fixflow-ticket-{ticket.id}-{int(time.time() * 1000)}@fixflow.local>'

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipient_list,
        headers={
            'Message-ID': msg_id,
            'References': thread_id,
            'In-Reply-To': thread_id,
        },
    )
    msg.attach_alternative(html, 'text/html')

    try:
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f'Błąd wysyłania e-maila: {e}')


# ============================================================
# Akumulator zdarzeń e-mail (konsolidacja wielu zmian w 1 mail)
# ============================================================

class TicketEmailAccumulator:
    """
    Zbiera zdarzenia (zmiana statusu, przypisanie technika, komentarz)
    i wysyła JEDEN skondensowany e-mail per odbiorca.
    """

    def __init__(self, ticket, actor=None):
        self.ticket = ticket
        self.actor = actor
        self._status_change = None      # (old_status, new_status)
        self._technician_change = None  # (old_tech, new_tech)
        self._comment = None            # (content, comment_type, author)

    def add_status_change(self, old_status, new_status):
        self._status_change = (old_status, new_status)

    def add_technician_change(self, old_tech, new_tech):
        self._technician_change = (old_tech, new_tech)

    def add_comment(self, content, comment_type='REPLY', author=None):
        self._comment = (content, comment_type, author or self.actor)

    def flush(self):
        """Buduje i wysyła skondensowane e-maile do odpowiednich odbiorców."""
        ticket = self.ticket

        if not self._status_change and not self._technician_change and not self._comment:
            return

        # --- Buduj sekcje HTML ---
        sections_html = ''
        sections_plain = ''

        # Sekcja: zmiana statusu
        if self._status_change:
            old_s, new_s = self._status_change
            old_label = STATUS_LABELS.get(old_s, old_s)
            new_label = STATUS_LABELS.get(new_s, new_s)
            old_bg, old_text = STATUS_BADGE_COLORS.get(old_s, ('#F3F4F6', '#1F2937'))
            new_bg, new_text = STATUS_BADGE_COLORS.get(new_s, ('#F3F4F6', '#1F2937'))

            sections_html += (
                f'<div style="margin:12px 0;padding:14px 18px;background-color:#F8FAFC;'
                f'border-radius:10px;border:1px solid #E2E8F0;">'
                f'<div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;'
                f'letter-spacing:0.5px;margin-bottom:8px;">Zmiana statusu</div>'
                f'{_badge(old_label, old_bg, old_text)}'
                f'<span style="display:inline-block;margin:0 10px;color:#94A3B8;font-size:16px;'
                f'vertical-align:middle;">&rarr;</span>'
                f'{_badge(new_label, new_bg, new_text)}'
                f'</div>'
            )
            sections_plain += f'Zmiana statusu: {old_label} → {new_label}\n'

        # Sekcja: zmiana technika
        if self._technician_change:
            old_tech, new_tech = self._technician_change
            if new_tech:
                tech_name = f'{new_tech.first_name} {new_tech.last_name}'
                sections_html += (
                    f'<div style="margin:12px 0;padding:14px 18px;background-color:#F8FAFC;'
                    f'border-radius:10px;border:1px solid #E2E8F0;">'
                    f'<div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;'
                    f'letter-spacing:0.5px;margin-bottom:6px;">Przypisany technik</div>'
                    f'<span style="font-size:14px;font-weight:700;color:#1E40AF;">'
                    f'&#128736; {tech_name}</span></div>'
                )
                sections_plain += f'Przypisany technik: {tech_name}\n'
            else:
                sections_html += (
                    f'<div style="margin:12px 0;padding:14px 18px;background-color:#F8FAFC;'
                    f'border-radius:10px;border:1px solid #E2E8F0;">'
                    f'<div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;'
                    f'letter-spacing:0.5px;margin-bottom:6px;">Przypisany technik</div>'
                    f'<span style="font-size:13px;color:#6B7280;font-style:italic;">'
                    f'Usunięto przypisanie</span></div>'
                )
                sections_plain += 'Przypisany technik: usunięto przypisanie\n'

        # Sekcja: komentarz
        if self._comment:
            content, comment_type, author = self._comment
            if comment_type != 'INTERNAL':
                author_name = f'{author.first_name} {author.last_name}' if author else 'System'
                sections_html += (
                    f'<div style="margin:12px 0;padding:14px 18px;background-color:#F8FAFC;'
                    f'border-left:4px solid #2563EB;border-radius:0 8px 8px 0;">'
                    f'<div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;'
                    f'letter-spacing:0.5px;margin-bottom:6px;">Komentarz od {author_name}</div>'
                    f'<div style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">'
                    f'{content}</div></div>'
                )
                sections_plain += f'Komentarz od {author_name}:\n{content}\n'

        if not sections_html:
            return

        # --- Subject ---
        subject = f'[FixFlow] #{ticket.id}: {ticket.title}'

        # --- Wyślij do zgłaszającego ---
        if ticket.creator and ticket.creator.email:
            greeting = f'Witaj {ticket.creator.first_name},'
            body = f'W Twoim zgłoszeniu <strong>#{ticket.id}</strong> dokonano zmian.'

            # Dodaj przyciski akceptacji/odrzucenia gdy status zmienił się na ROZWIAZANE
            resolution_buttons_html = ''
            if self._status_change and self._status_change[1] == 'ROZWIAZANE' and ticket.resolution_token:
                accept_url = f'{BACKEND_URL}/api/tickets/resolve/{ticket.resolution_token}/accept/'
                reject_url = f'{BACKEND_URL}/api/tickets/resolve/{ticket.resolution_token}/reject/'
                resolution_buttons_html = f'''
                <div style="margin:20px 0;padding:20px;background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;text-align:center;">
                    <div style="font-size:14px;color:#166534;font-weight:600;margin-bottom:6px;">Czy rozwiązanie jest poprawne?</div>
                    <div style="font-size:13px;color:#4B5563;margin-bottom:16px;">Jeśli nie zareagujesz w ciągu {AUTO_CLOSE_DAYS} dni, zgłoszenie zostanie automatycznie zamknięte.</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" style="padding:0 6px;">
                                <a href="{accept_url}" style="display:inline-block;padding:12px 28px;background-color:#16A34A;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">✓ Akceptuję rozwiązanie</a>
                            </td>
                            <td align="center" style="padding:0 6px;">
                                <a href="{reject_url}" style="display:inline-block;padding:12px 28px;background-color:#DC2626;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">✗ To nie rozwiązuje problemu</a>
                            </td>
                        </tr>
                    </table>
                </div>
                '''

            html = _build_html_email(
                title='Aktualizacja zgłoszenia',
                greeting=greeting,
                body_html=body + sections_html + resolution_buttons_html,
                ticket=ticket,
                accent_color=STATUS_COLORS.get(ticket.status, '#2563EB'),
            )
            plain = (
                f'Witaj {ticket.creator.first_name},\n\n'
                f'W Twoim zgłoszeniu #{ticket.id} dokonano zmian.\n\n'
                f'{sections_plain}\n'
                f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
            )
            _send_threaded_email(subject, plain, html, ticket, [ticket.creator.email])

        # --- Wyślij do nowego technika (jeśli został przypisany i to nie on jest twórcą) ---
        if self._technician_change:
            _, new_tech = self._technician_change
            if new_tech and new_tech.email and new_tech != ticket.creator:
                greeting = f'Witaj {new_tech.first_name},'
                body = f'Zostałeś przypisany do zgłoszenia <strong>#{ticket.id}</strong>.'
                html = _build_html_email(
                    title='Przypisanie do zgłoszenia',
                    greeting=greeting,
                    body_html=body + sections_html,
                    ticket=ticket,
                    accent_color='#2563EB',
                )
                plain = (
                    f'Witaj {new_tech.first_name},\n\n'
                    f'Zostałeś przypisany do zgłoszenia #{ticket.id}.\n\n'
                    f'{sections_plain}\n'
                    f'Zaloguj się do FixFlow, aby rozpocząć pracę.'
                )
                _send_threaded_email(subject, plain, html, ticket, [new_tech.email])

        # --- Wyślij do starego technika (odłączony) ---
        if self._technician_change:
            old_tech, new_tech = self._technician_change
            if old_tech and old_tech.email and old_tech != new_tech and old_tech != ticket.creator:
                html = _build_html_email(
                    title='Zmiana przypisania',
                    greeting=f'Witaj {old_tech.first_name},',
                    body_html=(
                        f'Zostałeś/aś <strong>odłączony/a</strong> od zgłoszenia '
                        f'<strong>#{ticket.id}</strong>. Nie musisz podejmować dalszych działań.'
                    ),
                    ticket=ticket,
                    accent_color='#6B7280',
                )
                plain = (
                    f'Witaj {old_tech.first_name},\n\n'
                    f'Zostałeś/aś odłączony/a od zgłoszenia #{ticket.id}.\n'
                    f'Nie musisz podejmować żadnych dalszych działań.'
                )
                _send_threaded_email(
                    subject,
                    plain, html, ticket, [old_tech.email]
                )

        # --- Wyślij do technika, jeśli pracownik dodał komentarz (bez zmian statusu/technika) ---
        if (self._comment and not self._status_change and not self._technician_change):
            content, comment_type, author = self._comment
            if (comment_type != 'INTERNAL' and author and
                    getattr(author, 'role', '') == 'EMPLOYEE' and
                    ticket.technician and ticket.technician.email):
                author_name = f'{author.first_name} {author.last_name}'
                html = _build_html_email(
                    title='Nowy komentarz od zgłaszającego',
                    greeting=f'Witaj {ticket.technician.first_name},',
                    body_html=(
                        f'Zgłaszający dodał nowy komentarz do zgłoszenia '
                        f'<strong>#{ticket.id}</strong>.' + sections_html
                    ),
                    ticket=ticket,
                    accent_color='#2563EB',
                )
                plain = (
                    f'Witaj {ticket.technician.first_name},\n\n'
                    f'Zgłaszający dodał komentarz do zgłoszenia #{ticket.id}.\n\n'
                    f'{sections_plain}\n'
                    f'Zaloguj się do FixFlow, aby odpowiedzieć.'
                )
                _send_threaded_email(subject, plain, html, ticket, [ticket.technician.email])


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
        plain = (
            f'Witaj {ticket.creator.first_name},\n\n'
            f'Twoje zgłoszenie (#{ticket.id}) zatytułowane "{ticket.title}" zostało pomyślnie '
            f'przyjęte do systemu FixFlow i oczekuje na przypisanie do technika.\n\n'
            f'Powiadomimy Cię niezwłocznie, gdy tylko status zgłoszenia ulegnie zmianie '
            f'lub technik zada dodatkowe pytanie.\n\n'
            f'Zaloguj się do panelu FixFlow, aby na bieżąco śledzić postępy.'
        )
        html = _build_html_email(
            title='Potwierdzenie zgłoszenia',
            greeting=f'Witaj {ticket.creator.first_name},',
            body_html=(
                'Twoje zgłoszenie zostało <strong>pomyślnie przyjęte</strong> do systemu FixFlow '
                'i oczekuje na przypisanie do technika.<br><br>'
                'Powiadomimy Cię niezwłocznie, gdy tylko status zgłoszenia ulegnie zmianie '
                'lub technik zada dodatkowe pytanie.'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.creator.email]
        )

    # -- Powiadomienie technika (jeśli przypisano od razu) --
    if ticket.technician and ticket.technician.email:
        plain = (
            f'Witaj {ticket.technician.first_name},\n\n'
            f'Zostało Ci przypisane nowe zgłoszenie (#{ticket.id}).\n\n'
            f'Tytuł: {ticket.title}\n'
            f'Priorytet: {ticket.get_priority_display()}\n'
            f'Zgłaszający: {ticket.creator.first_name} {ticket.creator.last_name}\n\n'
            f'Zaloguj się do FixFlow, aby rozpocząć pracę nad zgłoszeniem.'
        )
        html = _build_html_email(
            title='Nowe zgłoszenie przypisane',
            greeting=f'Witaj {ticket.technician.first_name},',
            body_html=(
                'Zostało Ci przypisane <strong>nowe zgłoszenie</strong>. '
                'Zapoznaj się ze szczegółami poniżej i rozpocznij pracę.'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.technician.email]
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
    old_label = STATUS_LABELS.get(old_status, old_status)
    new_label = STATUS_LABELS.get(new_status, new_status)
    old_bg, old_text = STATUS_BADGE_COLORS.get(old_status, ('#F3F4F6', '#1F2937'))
    new_bg, new_text = STATUS_BADGE_COLORS.get(new_status, ('#F3F4F6', '#1F2937'))
    new_accent = STATUS_COLORS.get(new_status, '#2563EB')

    status_change_html = (
        f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;text-align:center;">'
        f'  {_badge(old_label, old_bg, old_text)}'
        f'  <span style="display:inline-block;margin:0 12px;color:#94A3B8;font-size:18px;vertical-align:middle;">&rarr;</span>'
        f'  {_badge(new_label, new_bg, new_text)}'
        f'</div>'
    )

    # -- Powiadomienie zgłaszającego --
    if ticket.creator.email:
        plain = (
            f'Witaj {ticket.creator.first_name},\n\n'
            f'Status Twojego zgłoszenia #{ticket.id} został zmieniony.\n\n'
            f'Poprzedni status: {old_label}\n'
            f'Nowy status: {new_label}\n\n'
            f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
        )
        html = _build_html_email(
            title='Zmiana statusu zgłoszenia',
            greeting=f'Witaj {ticket.creator.first_name},',
            body_html=(
                f'Status Twojego zgłoszenia <strong>#{ticket.id}</strong> został zmieniony.'
                f'{status_change_html}'
            ),
            ticket=ticket,
            accent_color=new_accent,
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.creator.email]
        )

    # -- Powiadomienie technika (jeśli przypisany i to nie on jest zgłaszającym) --
    if ticket.technician and ticket.technician.email and ticket.technician != ticket.creator:
        plain = (
            f'Witaj {ticket.technician.first_name},\n\n'
            f'Status zgłoszenia #{ticket.id} ("{ticket.title}") został zmieniony.\n\n'
            f'Poprzedni status: {old_label}\n'
            f'Nowy status: {new_label}\n\n'
            f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
        )
        html = _build_html_email(
            title='Zmiana statusu zgłoszenia',
            greeting=f'Witaj {ticket.technician.first_name},',
            body_html=(
                f'Status zgłoszenia <strong>#{ticket.id}</strong> został zmieniony.'
                f'{status_change_html}'
            ),
            ticket=ticket,
            accent_color=new_accent,
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.technician.email]
        )


# ============================================================
# 3. PRZYPISANIE / ZMIANA TECHNIKA
# ============================================================

def send_technician_assigned_notification(ticket, old_technician=None):
    """
    Technik został przypisany lub zmieniony.
    → Mail do ZGŁASZAJĄCEGO (kto zajmie się jego sprawą).
    → Mail do NOWEGO TECHNIKA (że dostał nowe zadanie).
    → Mail do STAREGO TECHNIKA (że został odłączony, jeśli był wcześniej ktoś inny).
    """
    new_tech = ticket.technician

    # -- Powiadomienie zgłaszającego --
    if ticket.creator.email and new_tech:
        tech_name = f'{new_tech.first_name} {new_tech.last_name}'
        plain = (
            f'Witaj {ticket.creator.first_name},\n\n'
            f'Twoje zgłoszenie (#{ticket.id}) o tytule "{ticket.title}" zostało zaktualizowane.\n\n'
            f'Do Twojej sprawy został przypisany specjalista: '
            f'{tech_name}.\n'
            f'Będzie on teraz bezpośrednio odpowiedzialny za weryfikację '
            f'i rozwiązanie Twojego problemu.\n\n'
            f'Zaloguj się do systemu, jeśli potrzebujesz dodać dodatkowe informacje.'
        )
        html = _build_html_email(
            title='Przypisano technika',
            greeting=f'Witaj {ticket.creator.first_name},',
            body_html=(
                f'Do Twojego zgłoszenia <strong>#{ticket.id}</strong> został przypisany specjalista:<br><br>'
                f'<div style="display:inline-block;padding:8px 16px;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;margin:4px 0;">'
                f'  <span style="font-size:14px;font-weight:700;color:#1E40AF;">&#128736; {tech_name}</span>'
                f'</div><br><br>'
                f'Będzie bezpośrednio odpowiedzialny za weryfikację i rozwiązanie Twojego problemu.'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.creator.email]
        )

    # -- Powiadomienie nowego technika --
    if new_tech and new_tech.email:
        plain = (
            f'Witaj {new_tech.first_name},\n\n'
            f'Zostało Ci przypisane zgłoszenie (#{ticket.id}).\n\n'
            f'Tytuł: {ticket.title}\n'
            f'Priorytet: {ticket.get_priority_display()}\n'
            f'Zgłaszający: {ticket.creator.first_name} {ticket.creator.last_name}\n\n'
            f'Zaloguj się do FixFlow, aby rozpocząć pracę.'
        )
        html = _build_html_email(
            title='Nowe zgłoszenie przypisane',
            greeting=f'Witaj {new_tech.first_name},',
            body_html=(
                'Zostało Ci przypisane <strong>nowe zgłoszenie</strong>. '
                'Zapoznaj się ze szczegółami poniżej i rozpocznij pracę.'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [new_tech.email]
        )

    # -- Powiadomienie starego technika (został odłączony) --
    if old_technician and old_technician.email and old_technician != new_tech:
        plain = (
            f'Witaj {old_technician.first_name},\n\n'
            f'Zostałeś/aś odłączony/a od zgłoszenia #{ticket.id} ("{ticket.title}").\n\n'
            f'Zgłoszenie zostało przekazane innemu specjaliście.\n'
            f'Nie musisz podejmować żadnych dalszych działań.'
        )
        html = _build_html_email(
            title='Zmiana przypisania',
            greeting=f'Witaj {old_technician.first_name},',
            body_html=(
                f'Zostałeś/aś <strong>odłączony/a</strong> od zgłoszenia <strong>#{ticket.id}</strong>.<br><br>'
                f'Zgłoszenie zostało przekazane innemu specjaliście. '
                f'Nie musisz podejmować żadnych dalszych działań.'
            ),
            ticket=ticket,
            accent_color='#6B7280',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [old_technician.email]
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

    # Fragment komentarza w ładnym bloku
    comment_block = (
        f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;border-left:4px solid #2563EB;border-radius:0 8px 8px 0;">'
        f'  <div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">'
        f'    Odpowiedź od {author.first_name} {author.last_name}'
        f'  </div>'
        f'  <div style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">'
        f'    {comment.content}'
        f'  </div>'
        f'</div>'
    )

    # Technik/Admin odpowiada → powiadom twórcę zgłoszenia
    if author.role in ['TECHNICIAN', 'ADMIN'] and ticket.creator.email:
        plain = (
            f'Witaj {ticket.creator.first_name},\n\n'
            f'Otrzymałeś nową odpowiedź w zgłoszeniu #{ticket.id}.\n\n'
            f'Od: {author.first_name} {author.last_name}\n'
            f'Treść: {comment.content}\n\n'
            f'Zaloguj się do FixFlow, aby odpowiedzieć.'
        )
        html = _build_html_email(
            title='Nowa odpowiedź w zgłoszeniu',
            greeting=f'Witaj {ticket.creator.first_name},',
            body_html=(
                f'Otrzymałeś nową odpowiedź w zgłoszeniu <strong>#{ticket.id}</strong>.'
                f'{comment_block}'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.creator.email]
        )

    # Pracownik odpowiada → powiadom przypisanego technika
    elif author.role == 'EMPLOYEE' and ticket.technician and ticket.technician.email:
        plain = (
            f'Witaj {ticket.technician.first_name},\n\n'
            f'Zgłaszający dodał komentarz do zgłoszenia #{ticket.id}.\n\n'
            f'Od: {author.first_name} {author.last_name}\n'
            f'Treść: {comment.content}\n\n'
            f'Zaloguj się do FixFlow, aby odpowiedzieć.'
        )
        html = _build_html_email(
            title='Nowy komentarz od zgłaszającego',
            greeting=f'Witaj {ticket.technician.first_name},',
            body_html=(
                f'Zgłaszający dodał nowy komentarz do zgłoszenia <strong>#{ticket.id}</strong>.'
                f'{comment_block}'
            ),
            ticket=ticket,
            accent_color='#2563EB',
        )
        _send_threaded_email(
            f'[FixFlow] #{ticket.id}: {ticket.title}',
            plain, html, ticket, [ticket.technician.email]
        )


# ============================================================
# 5. PONOWNE OTWARCIE ZGŁOSZENIA
# ============================================================

def send_reopened_notification(ticket, actor=None):
    """
    Zgłoszenie zostało ponownie otwarte (klient odrzucił rozwiązanie).
    → Mail do TECHNIKA.
    """
    if not ticket.technician or not ticket.technician.email:
        return

    actor_name = f'{actor.first_name} {actor.last_name}' if actor else 'Klient (z linku e-mail)'

    plain = (
        f'Witaj {ticket.technician.first_name},\n\n'
        f'Zgłoszenie #{ticket.id} ("{ticket.title}") zostało ponownie otwarte.\n\n'
        f'Klient odrzucił rozwiązanie. Sprawa wymaga dalszej pracy.\n\n'
        f'Zaloguj się do FixFlow, aby sprawdzić szczegóły.'
    )
    html = _build_html_email(
        title='Zgłoszenie ponownie otwarte',
        greeting=f'Witaj {ticket.technician.first_name},',
        body_html=(
            f'Zgłoszenie <strong>#{ticket.id}</strong> zostało <strong>ponownie otwarte</strong>.'
            f'<br><br>'
            f'<div style="margin:12px 0;padding:14px 18px;background-color:#FEF2F2;'
            f'border-radius:10px;border:1px solid #FECACA;">'
            f'<div style="font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;'
            f'letter-spacing:0.5px;margin-bottom:6px;">Odrzucone przez</div>'
            f'<span style="font-size:14px;font-weight:700;color:#DC2626;">{actor_name}</span>'
            f'</div>'
            f'Sprawa wymaga dalszej pracy. Status został zmieniony na <strong>W toku</strong>.'
        ),
        ticket=ticket,
        accent_color='#DC2626',
    )
    _send_threaded_email(
        f'[FixFlow] #{ticket.id}: {ticket.title}',
        plain, html, ticket, [ticket.technician.email]
    )


# ============================================================
# 6. AUTO-ZAMKNIĘCIE ZGŁOSZENIA
# ============================================================

def send_auto_closed_notification(ticket):
    """
    Zgłoszenie zostało automatycznie zamknięte po upływie czasu weryfikacji.
    → Mail do ZGŁASZAJĄCEGO.
    """
    if not ticket.creator or not ticket.creator.email:
        return

    plain = (
        f'Witaj {ticket.creator.first_name},\n\n'
        f'Twoje zgłoszenie #{ticket.id} ("{ticket.title}") zostało automatycznie zamknięte,\n'
        f'ponieważ nie otrzymaliśmy odpowiedzi w wyznaczonym terminie.\n\n'
        f'Jeśli problem nadal występuje, możesz utworzyć nowe zgłoszenie w panelu FixFlow.'
    )
    html = _build_html_email(
        title='Zgłoszenie automatycznie zamknięte',
        greeting=f'Witaj {ticket.creator.first_name},',
        body_html=(
            f'Twoje zgłoszenie <strong>#{ticket.id}</strong> zostało '
            f'<strong>automatycznie zamknięte</strong>, ponieważ nie otrzymaliśmy '
            f'odpowiedzi w wyznaczonym terminie ({AUTO_CLOSE_DAYS} dni).'
            f'<br><br>'
            f'Jeśli problem nadal występuje, możesz utworzyć nowe zgłoszenie w panelu FixFlow.'
        ),
        ticket=ticket,
        accent_color='#14B8A6',
    )
    _send_threaded_email(
        f'[FixFlow] #{ticket.id}: {ticket.title}',
        plain, html, ticket, [ticket.creator.email]
    )
