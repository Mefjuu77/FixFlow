"""
Management command: auto_close_tickets

Zamyka zgłoszenia w statusie ROZWIAZANE, w których upłynął czas na weryfikację
klienta (domyślnie 7 dni). Uruchamiany cyklicznie (cron/scheduler).

Użycie:
    python manage.py auto_close_tickets
    python manage.py auto_close_tickets --dry-run
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from tickets.models import Ticket, TicketLog
from tickets.email import send_auto_closed_notification


class Command(BaseCommand):
    help = 'Automatycznie zamyka zgłoszenia ROZWIAZANE po upływie czasu weryfikacji.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Tylko wyświetl zgłoszenia do zamknięcia, nie zmieniaj statusów.',
        )

    def handle(self, *args, **options):
        auto_close_days = getattr(settings, 'FIXFLOW_AUTO_CLOSE_DAYS', 7)
        cutoff = timezone.now() - timedelta(days=auto_close_days)
        dry_run = options['dry_run']

        tickets_to_close = Ticket.objects.filter(
            status=Ticket.Status.RESOLVED,
            resolved_at__isnull=False,
            resolved_at__lte=cutoff,
        )

        count = tickets_to_close.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('Brak zgłoszeń do automatycznego zamknięcia.'))
            return

        self.stdout.write(f'Znaleziono {count} zgłoszeń do zamknięcia:')

        for ticket in tickets_to_close:
            days_since = (timezone.now() - ticket.resolved_at).days
            self.stdout.write(f'  • #{ticket.id} "{ticket.title}" (rozwiązane {days_since} dni temu)')

            if not dry_run:
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

        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] {count} zgłoszeń zostałoby zamkniętych.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Zamknięto {count} zgłoszeń.'))
