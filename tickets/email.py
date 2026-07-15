from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
import logging
import time

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, 'FIXFLOW_FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = getattr(settings, 'FIXFLOW_BACKEND_URL', 'http://127.0.0.1:8000')
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
        f'<span style="display:inline-block;padding:4px 12px;border-radius:6px;'
        f'font-size:12px;font-weight:700;color:{text_color};background-color:{bg_color};'
        f'letter-spacing:0.3px;line-height:1.4;">{label}</span>'
    )


def _build_html_email(title, greeting, body_html, ticket=None, accent_color='#2563EB'):
    """
    Buduje kompletny HTML e-maila z inline CSS.
    Design dopasowany do systemu FixFlow — nowoczesny, czytelny, responsywny.

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
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px 0;">
          <tr>
            <td style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <!-- Ticket card header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 24px 14px 24px;border-bottom:1px solid #F1F5F9;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size:12px;color:#94A3B8;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Zgłoszenie</span>
                          <span style="font-size:12px;color:#CBD5E1;"> &bull; </span>
                          <span style="font-size:12px;color:{accent_color};font-weight:800;">#{ticket.id}</span>
                        </td>
                        <td align="right">
                          {_badge(status_label, status_bg, status_text)}
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:8px;font-size:17px;font-weight:800;color:#0F172A;line-height:1.4;letter-spacing:-0.2px;">
                      {ticket.title}
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Ticket card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 24px 20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="33%" style="vertical-align:top;padding-right:12px;">
                          <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Priorytet</div>
                          {_badge(priority_label, priority_bg, priority_text)}
                        </td>
                        <td width="33%" style="vertical-align:top;padding-right:12px;">
                          <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Zgłaszający</div>
                          <div style="font-size:13px;color:#334155;font-weight:600;">{creator_name or '—'}</div>
                        </td>
                        <td width="33%" style="vertical-align:top;">
                          <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Technik</div>
                          <div style="font-size:13px;color:#334155;font-weight:600;">{technician_name or '<span style="color:#94A3B8;font-style:italic;font-weight:400;">Nie przypisano</span>'}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
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
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background-color:{accent_color};box-shadow:0 4px 14px rgba(37,99,235,0.25);">
                    <a href="{ticket_url}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;line-height:1;">
                      Otwórz zgłoszenie &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        '''

    # Preheader — tekst widoczny w podglądzie skrzynki
    preheader = title
    if ticket:
        preheader = f'{title} — #{ticket.id}: {ticket.title}'

    html = f'''<!DOCTYPE html>
<html lang="pl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Preheader (ukryty tekst widoczny w podglądzie) -->
  <div style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Logo / Brand bar -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <div style="width:36px;height:36px;background-color:{accent_color};border-radius:10px;text-align:center;line-height:36px;">
                      <span style="font-size:18px;color:#ffffff;">&#9881;</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">FixFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.04);">
              <!-- Accent top bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background-color:{accent_color};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Content -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:36px 36px 12px 36px;">
                    <!-- Title pill -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="background-color:#F1F5F9;border-radius:6px;padding:6px 14px;">
                          <span style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;">{title}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Greeting -->
                    <div style="font-size:20px;font-weight:800;color:#0F172A;margin-bottom:16px;letter-spacing:-0.3px;line-height:1.3;">
                      {greeting}
                    </div>

                    <!-- Body -->
                    <div style="font-size:15px;color:#475569;line-height:1.75;margin-bottom:4px;">
                      {body_html}
                    </div>

                    {ticket_card}
                    {cta_button}
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 36px;">
                    <div style="border-top:1px solid #F1F5F9;"></div>
                  </td>
                </tr>
              </table>

              <!-- Help text -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 36px 28px 36px;">
                    <div style="font-size:13px;color:#94A3B8;line-height:1.6;">
                      Jeśli potrzebujesz pomocy, zaloguj się do
                      <a href="{FRONTEND_URL}" style="color:{accent_color};font-weight:600;text-decoration:none;">panelu FixFlow</a>
                      lub skontaktuj się z administratorem systemu.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 16px 0 16px;text-align:center;">
              <div style="font-size:12px;color:#94A3B8;line-height:1.7;">
                <strong style="color:#64748B;font-weight:700;">FixFlow</strong> &middot; System zgłoszeń IT<br>
                Ta wiadomość została wygenerowana automatycznie &mdash; nie odpowiadaj na nią.
              </div>
              <div style="margin-top:12px;font-size:11px;color:#CBD5E1;">
                &copy; 2026 FixFlow. Wszelkie prawa zastrzeżone.
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
                f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;'
                f'border-radius:12px;border:1px solid #E2E8F0;">'
                f'<div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;'
                f'letter-spacing:0.8px;margin-bottom:10px;">Zmiana statusu</div>'
                f'{_badge(old_label, old_bg, old_text)}'
                f'<span style="display:inline-block;margin:0 10px;color:#CBD5E1;font-size:16px;'
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
                    f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;'
                    f'border-radius:12px;border:1px solid #E2E8F0;">'
                    f'<div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;'
                    f'letter-spacing:0.8px;margin-bottom:8px;">Przypisany technik</div>'
                    f'<span style="font-size:14px;font-weight:700;color:#1E40AF;">'
                    f'&#128736; {tech_name}</span></div>'
                )
                sections_plain += f'Przypisany technik: {tech_name}\n'
            else:
                sections_html += (
                    f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;'
                    f'border-radius:12px;border:1px solid #E2E8F0;">'
                    f'<div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;'
                    f'letter-spacing:0.8px;margin-bottom:8px;">Przypisany technik</div>'
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
                    f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;'
                    f'border-left:4px solid #2563EB;border-radius:0 12px 12px 0;">'
                    f'<div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;'
                    f'letter-spacing:0.8px;margin-bottom:8px;">Komentarz od {author_name}</div>'
                    f'<div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">'
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
                <div style="margin:24px 0;padding:24px;background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;text-align:center;">
                    <div style="font-size:15px;color:#166534;font-weight:700;margin-bottom:6px;">Czy rozwiązanie jest poprawne?</div>
                    <div style="font-size:13px;color:#4B5563;margin-bottom:20px;line-height:1.5;">Jeśli nie zareagujesz w ciągu {AUTO_CLOSE_DAYS} dni, zgłoszenie zostanie automatycznie zamknięte.</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" style="padding:4px;">
                                <table cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="border-radius:8px;background-color:#16A34A;box-shadow:0 2px 8px rgba(22,163,74,0.25);">
                                            <a href="{accept_url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;line-height:1;">&#10003; Akceptuję rozwiązanie</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding:4px;padding-top:10px;">
                                <table cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="border-radius:8px;background-color:#DC2626;box-shadow:0 2px 8px rgba(220,38,38,0.2);">
                                            <a href="{reject_url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;line-height:1;">&#10007; To nie rozwiązuje problemu</a>
                                        </td>
                                    </tr>
                                </table>
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
        f'<div style="margin:20px 0;padding:18px 24px;background-color:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;text-align:center;">'
        f'  {_badge(old_label, old_bg, old_text)}'
        f'  <span style="display:inline-block;margin:0 14px;color:#CBD5E1;font-size:18px;vertical-align:middle;">&rarr;</span>'
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
        f'<div style="margin:16px 0;padding:16px 20px;background-color:#F8FAFC;border-left:4px solid #2563EB;border-radius:0 12px 12px 0;">'
        f'  <div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">'
        f'    Odpowiedź od {author.first_name} {author.last_name}'
        f'  </div>'
        f'  <div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">'
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
