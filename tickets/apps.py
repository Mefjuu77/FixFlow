import os
import threading
import time
import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class TicketsConfig(AppConfig):
    name = 'tickets'

    def ready(self):
        """Uruchamia wątek automatycznego zamykania zgłoszeń przy starcie serwera."""
        # Zapobiega podwójnemu uruchomieniu (Django reload w trybie dev)
        if os.environ.get('RUN_MAIN') != 'true' and not os.environ.get('FIXFLOW_AUTOCLOSE_STARTED'):
            return

        os.environ['FIXFLOW_AUTOCLOSE_STARTED'] = '1'
        thread = threading.Thread(target=self._auto_close_loop, daemon=True)
        thread.start()
        logger.info('[AutoClose] Wątek automatycznego zamykania zgłoszeń uruchomiony.')

    @staticmethod
    def _auto_close_loop():
        """Pętla sprawdzająca zgłoszenia do automatycznego zamknięcia co 1 godzinę."""
        from django.conf import settings
        from django.utils import timezone
        from datetime import timedelta

        # Poczekaj 30s po starcie serwera, aby uniknąć problemów z niegotową bazą
        time.sleep(30)

        check_interval = 60 * 60  # 1 godzina

        while True:
            try:
                from tickets.models import Ticket, TicketLog
                from tickets.email import send_auto_closed_notification

                auto_close_days = getattr(settings, 'FIXFLOW_AUTO_CLOSE_DAYS', 7)
                cutoff = timezone.now() - timedelta(days=auto_close_days)

                tickets_to_close = Ticket.objects.filter(
                    status=Ticket.Status.RESOLVED,
                    resolved_at__isnull=False,
                    resolved_at__lte=cutoff,
                )

                count = 0
                for ticket in tickets_to_close:
                    old_status = ticket.status
                    ticket.status = Ticket.Status.CLOSED
                    ticket.clear_resolution()
                    ticket.save(update_fields=['status', 'resolved_at', 'resolution_token'])

                    TicketLog.objects.create(
                        ticket=ticket,
                        user=None,
                        action=TicketLog.ActionType.AUTO_CLOSED,
                        old_value=old_status,
                        new_value=ticket.status,
                    )
                    send_auto_closed_notification(ticket)
                    count += 1

                if count > 0:
                    logger.info(f'[AutoClose] Automatycznie zamknięto {count} zgłoszeń.')

            except Exception as e:
                logger.error(f'[AutoClose] Błąd: {e}')

            time.sleep(check_interval)
