"""
E-mail resetu hasła.

Wykorzystuje wbudowany generator tokenów Django (PasswordResetTokenGenerator).
Link prowadzi do frontendu: <FRONTEND_URL>/reset-password/<uid>/<token>
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
import logging

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, 'FIXFLOW_FRONTEND_URL', 'http://localhost:5173')


def send_password_reset_email(user):
    """Wysyła e-mail z linkiem do resetu hasła."""
    if not user.email:
        return

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f'{FRONTEND_URL}/reset-password/{uid}/{token}'

    subject = '[FixFlow] Reset hasła'
    accent = '#2563EB'

    html = f'''<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:20px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">&#9881; FixFlow</span>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:4px;background-color:{accent};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td style="padding:36px;">
              <div style="font-size:20px;font-weight:800;color:#0F172A;margin-bottom:16px;">Reset hasła</div>
              <div style="font-size:15px;color:#475569;line-height:1.7;margin-bottom:8px;">
                Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.
                Kliknij przycisk poniżej, aby ustawić nowe hasło. Link jest ważny przez ograniczony czas.
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;">
                <tr><td align="center">
                  <table cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="border-radius:10px;background-color:{accent};">
                      <a href="{reset_url}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
                        Ustaw nowe hasło &rarr;
                      </a>
                    </td>
                  </tr></table>
                </td></tr>
              </table>
              <div style="font-size:13px;color:#94A3B8;line-height:1.6;margin-top:20px;">
                Jeśli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.
              </div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:24px 16px 0 16px;">
          <div style="font-size:12px;color:#94A3B8;">
            Ta wiadomość została wygenerowana automatycznie &mdash; nie odpowiadaj na nią.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'''

    plain = (
        f'Reset hasła FixFlow\n\n'
        f'Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.\n'
        f'Otwórz poniższy link, aby ustawić nowe hasło:\n\n'
        f'{reset_url}\n\n'
        f'Jeśli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.'
    )

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=True)
    except Exception as e:
        logger.error(f'Błąd wysyłania e-maila resetu hasła: {e}')
