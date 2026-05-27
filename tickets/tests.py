from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Category, Ticket, Comment, WorkLog, TicketLog

User = get_user_model()


class TicketAPITestCase(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Sieć i internet')
        self.category2 = Category.objects.create(name='Sprzęt komputerowy')

        self.employee1 = User.objects.create_user(
            email='pracownik1@test.pl',
            password='testpassword123',
            first_name='Jan',
            last_name='Kowalski',
            role='EMPLOYEE'
        )
        self.employee2 = User.objects.create_user(
            email='pracownik2@test.pl',
            password='testpassword123',
            first_name='Anna',
            last_name='Nowak',
            role='EMPLOYEE'
        )
        self.technician = User.objects.create_user(
            email='technik@test.pl',
            password='testpassword123',
            first_name='Tomasz',
            last_name='Wiśniewski',
            role='TECHNICIAN'
        )
        self.admin = User.objects.create_user(
            email='admin@test.pl',
            password='testpassword123',
            first_name='Adam',
            last_name='Adminowski',
            role='ADMIN'
        )

        self.ticket1 = Ticket.objects.create(
            title='Awaria internetu',
            description='Brak sieci w pokoju 204.',
            category=self.category,
            creator=self.employee1,
            priority='WYSOKI'
        )

    # =========================================================
    # Blok 1: Uwierzytelnianie i JWT (5 testów)
    # =========================================================

    def test_anonymous_cannot_access_tickets(self):
        """Niezalogowany użytkownik nie może wyświetlić listy zgłoszeń (401)."""
        response = self.client.get(reverse('ticket-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_categories(self):
        """Niezalogowany użytkownik nie może wyświetlić listy kategorii (401)."""
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_access_ticket_detail(self):
        """Niezalogowany użytkownik nie może wyświetlić szczegółów zgłoszenia (401)."""
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_employee_can_access_ticket_list(self):
        """Zalogowany pracownik uzyskuje dostęp do listy swoich zgłoszeń (200)."""
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(reverse('ticket-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_with_valid_credentials_returns_tokens(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'email': 'pracownik1@test.pl',
            'password': 'testpassword123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    # =========================================================
    # Blok 2: Kontrola ról (RBAC) (6 testów)
    # =========================================================

    def test_employee_cannot_view_others_ticket_detail(self):
        """Pracownik otrzymuje 404 przy próbie dostępu do cudzego zgłoszenia."""
        self.client.force_authenticate(user=self.employee2)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_technician_can_view_all_tickets(self):
        """Technik może wyświetlić dowolne zgłoszenie w systemie."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Awaria internetu')

    def test_employee_cannot_create_category(self):
        """Pracownik nie może tworzyć kategorii — rola ADMIN jest wymagana (403)."""
        self.client.force_authenticate(user=self.employee1)
        response = self.client.post(reverse('category-list'), {'name': 'Testowa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_technician_cannot_create_category(self):
        """Technik nie może tworzyć kategorii — rola ADMIN jest wymagana (403)."""
        self.client.force_authenticate(user=self.technician)
        response = self.client.post(reverse('category-list'), {'name': 'Testowa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_category(self):
        """Administrator może tworzyć nowe kategorie zgłoszeń (201)."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('category-list'), {'name': 'Oprogramowanie'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 3)

    def test_employee_cannot_add_internal_note(self):
        """Pracownik nie może dodawać notatek wewnętrznych — typ INTERNAL jest zarezerwowany (403)."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'content': 'Próba notatki wewnętrznej.',
            'comment_type': 'INTERNAL'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================
    # Blok 3: Izolacja danych użytkownika (5 testów)
    # =========================================================

    def test_employee_sees_only_own_tickets_on_list(self):
        """Pracownik widzi na liście wyłącznie swoje zgłoszenia."""
        Ticket.objects.create(
            title='Problem z monitorem',
            description='Monitor nie wyświetla obrazu.',
            category=self.category,
            creator=self.employee2,
            priority='NORMALNY'
        )
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(reverse('ticket-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Awaria internetu')

    def test_technician_sees_all_tickets_on_list(self):
        """Technik widzi na liście zgłoszenia wszystkich pracowników."""
        Ticket.objects.create(
            title='Problem z monitorem',
            description='Monitor nie wyświetla obrazu.',
            category=self.category,
            creator=self.employee2,
            priority='NORMALNY'
        )
        self.client.force_authenticate(user=self.technician)
        response = self.client.get(reverse('ticket-list'))
        self.assertEqual(len(response.data), 2)

    def test_employee_cannot_delete_others_ticket(self):
        """Pracownik nie może usunąć cudzego zgłoszenia — queryset izoluje dane (404)."""
        self.client.force_authenticate(user=self.employee2)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_employee_cannot_comment_on_others_ticket(self):
        """Pracownik nie może dodać komentarza do cudzego zgłoszenia (403)."""
        self.client.force_authenticate(user=self.employee2)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'content': 'Próba komentarza.',
            'comment_type': 'REPLY'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_list_work_logs(self):
        """Pracownik nie widzi listy wpisów czasu pracy — widok zwraca pustą kolekcję."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    # =========================================================
    # Blok 4: Moduł Kategorii (4 testy)
    # =========================================================

    def test_authenticated_user_can_list_categories(self):
        """Zalogowany użytkownik może pobrać listę wszystkich kategorii."""
        self.client.force_authenticate(user=self.employee1)
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_can_update_category(self):
        """Administrator może zaktualizować nazwę istniejącej kategorii."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('category-detail', kwargs={'pk': self.category.id})
        response = self.client.patch(url, {'name': 'Sieć LAN/WAN'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, 'Sieć LAN/WAN')

    def test_admin_can_delete_category(self):
        """Administrator może usunąć kategorię z systemu."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('category-detail', kwargs={'pk': self.category2.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Category.objects.count(), 1)

    def test_category_name_is_required(self):
        """Próba utworzenia kategorii bez nazwy zwraca błąd walidacji (400)."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('category-list'), {'name': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # Blok 5: Moduł Zgłoszeń – CRUD (7 testów)
    # =========================================================

    def test_employee_can_create_ticket(self):
        """Pracownik może zgłosić awarię — weryfikacja kodu 201 i liczby rekordów."""
        self.client.force_authenticate(user=self.employee1)
        data = {
            'title': 'Problem z klawiaturą',
            'description': 'Nie działają niektóre klawisze w laptopie.',
            'category': self.category.id,
            'priority': 'NISKI'
        }
        response = self.client.post(reverse('ticket-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ticket.objects.count(), 2)

    def test_created_ticket_has_correct_creator(self):
        """Nowe zgłoszenie jest automatycznie przypisywane do zalogowanego pracownika."""
        self.client.force_authenticate(user=self.employee2)
        data = {
            'title': 'Brak dostępu do drukarki',
            'description': 'Drukarka sieciowa jest niedostępna.',
            'category': self.category.id,
            'priority': 'NORMALNY'
        }
        response = self.client.post(reverse('ticket-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ticket.objects.get(id=response.data['id']).creator, self.employee2)

    def test_new_ticket_has_status_nowe(self):
        """Nowo utworzone zgłoszenie otrzymuje domyślny status NOWE."""
        self.client.force_authenticate(user=self.employee1)
        data = {
            'title': 'Zablokowane konto domenowe',
            'description': 'Brak możliwości logowania do systemu.',
            'category': self.category.id,
            'priority': 'WYSOKI'
        }
        response = self.client.post(reverse('ticket-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ticket.objects.get(id=response.data['id']).status, 'NOWE')

    def test_employee_can_read_own_ticket_detail(self):
        """Pracownik może wyświetlić szczegóły własnego zgłoszenia (200)."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Awaria internetu')

    def test_technician_can_update_ticket_status(self):
        """Technik może zmienić status zgłoszenia poprzez żądanie PATCH."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.patch(url, {'status': 'W_TOKU'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'W_TOKU')

    def test_technician_can_assign_himself_to_ticket(self):
        """Technik może przypisać siebie jako obsługującego zgłoszenie."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        response = self.client.patch(url, {'technician': self.technician.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['technician'], self.technician.id)

    def test_ticket_title_is_required(self):
        """Próba utworzenia zgłoszenia bez tytułu zwraca błąd walidacji (400)."""
        self.client.force_authenticate(user=self.employee1)
        data = {
            'title': '',
            'description': 'Opis bez tytułu.',
            'category': self.category.id,
            'priority': 'NISKI'
        }
        response = self.client.post(reverse('ticket-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # Blok 6: Moduł Komentarzy (5 testów)
    # =========================================================

    def test_employee_can_add_comment_to_own_ticket(self):
        """Pracownik może dodać komentarz publiczny do własnego zgłoszenia."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'content': 'Problem nadal występuje po restarcie routera.',
            'comment_type': 'REPLY'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.filter(ticket=self.ticket1).count(), 1)

    def test_technician_can_add_internal_note(self):
        """Technik może dodać wewnętrzną notatkę serwisową (INTERNAL) do zgłoszenia."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'content': 'Sprawdzono konfigurację switcha. Planowana wymiana kabla.',
            'comment_type': 'INTERNAL'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.get(ticket=self.ticket1).comment_type, 'INTERNAL')

    def test_comment_is_linked_to_correct_ticket(self):
        """Dodany komentarz jest powiązany z właściwym zgłoszeniem w bazie danych."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        self.client.post(url, {
            'content': 'Potwierdzam, awaria nadal trwa.',
            'comment_type': 'REPLY'
        }, format='json')
        comment = Comment.objects.get(ticket=self.ticket1)
        self.assertEqual(comment.ticket, self.ticket1)
        self.assertEqual(comment.author, self.employee1)

    def test_employee_cannot_see_internal_notes(self):
        """Pracownik nie może odczytać notatek wewnętrznych (INTERNAL) technika."""
        Comment.objects.create(
            ticket=self.ticket1,
            author=self.technician,
            content='Notatka wewnętrzna widoczna tylko dla techników.',
            comment_type='INTERNAL'
        )
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_adding_comment_creates_ticket_log_entry(self):
        """Dodanie komentarza automatycznie tworzy wpis w dzienniku zdarzeń zgłoszenia."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-comments', kwargs={'ticket_id': self.ticket1.id})
        self.client.post(url, {
            'content': 'Diagnozy zakończona — usterka zidentyfikowana.',
            'comment_type': 'REPLY'
        }, format='json')
        self.assertTrue(
            TicketLog.objects.filter(
                ticket=self.ticket1,
                action=TicketLog.ActionType.COMMENT_ADDED
            ).exists()
        )

    # =========================================================
    # Blok 7: Rejestracja czasu pracy (5 testów)
    # =========================================================

    def test_technician_can_log_work_time(self):
        """Technik może zarejestrować czas pracy poświęcony na obsługę zgłoszenia."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'description': 'Diagnoza problemu sieciowego i wymiana kabla.',
            'duration_minutes': 45
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkLog.objects.filter(ticket=self.ticket1).count(), 1)

    def test_employee_cannot_log_work_time(self):
        """Pracownik nie może rejestrować czasu pracy — uprawnienie zarezerwowane dla technika (403)."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.post(url, {
            'description': 'Próba rejestracji czasu.',
            'duration_minutes': 30
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_work_log_stores_correct_duration(self):
        """Zarejestrowany czas pracy jest zapisywany z prawidłową wartością w minutach."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        self.client.post(url, {
            'description': 'Konfiguracja urządzenia sieciowego.',
            'duration_minutes': 90
        }, format='json')
        self.assertEqual(WorkLog.objects.get(ticket=self.ticket1).duration_minutes, 90)

    def test_technician_can_list_work_logs(self):
        """Technik może odczytać listę wpisów czasu pracy dla danego zgłoszenia."""
        WorkLog.objects.create(
            ticket=self.ticket1,
            author=self.technician,
            description='Wstępna diagnoza.',
            duration_minutes=20
        )
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_work_log_creates_ticket_log_entry(self):
        """Rejestracja czasu pracy automatycznie tworzy wpis WORK_LOGGED w dzienniku zdarzeń."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-work-logs', kwargs={'ticket_id': self.ticket1.id})
        self.client.post(url, {
            'description': 'Wymiana modułu zasilającego.',
            'duration_minutes': 60
        }, format='json')
        self.assertTrue(
            TicketLog.objects.filter(
                ticket=self.ticket1,
                action=TicketLog.ActionType.WORK_LOGGED
            ).exists()
        )

    # =========================================================
    # Blok 8: Dziennik zdarzeń (TicketLog) (5 testów)
    # =========================================================

    def test_status_change_creates_log_entry(self):
        """Zmiana statusu zgłoszenia tworzy wpis STATUS_CHANGED w dzienniku zdarzeń."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        self.client.patch(url, {'status': 'W_TOKU'}, format='json')
        self.assertTrue(
            TicketLog.objects.filter(
                ticket=self.ticket1,
                action=TicketLog.ActionType.STATUS_CHANGED
            ).exists()
        )

    def test_technician_assignment_creates_log_entry(self):
        """Przypisanie technika do zgłoszenia tworzy wpis TECHNICIAN_ASSIGNED w dzienniku."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        self.client.patch(url, {'technician': self.technician.id}, format='json')
        self.assertTrue(
            TicketLog.objects.filter(
                ticket=self.ticket1,
                action=TicketLog.ActionType.TECHNICIAN_ASSIGNED
            ).exists()
        )

    def test_employee_cannot_read_ticket_logs(self):
        """Pracownik nie ma dostępu do dziennika zdarzeń — widok zwraca pustą listę."""
        self.client.force_authenticate(user=self.employee1)
        url = reverse('ticket-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_technician_can_read_ticket_logs(self):
        """Technik może odczytać dziennik zdarzeń dla dowolnego zgłoszenia."""
        TicketLog.objects.create(
            ticket=self.ticket1,
            user=self.technician,
            action=TicketLog.ActionType.STATUS_CHANGED,
            old_value='NOWE',
            new_value='W_TOKU'
        )
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-logs', kwargs={'ticket_id': self.ticket1.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_status_log_records_old_and_new_value(self):
        """Wpis dziennika przy zmianie statusu zawiera prawidłowe wartości przed i po zmianie."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        self.client.patch(url, {'status': 'W_TOKU'}, format='json')
        log = TicketLog.objects.get(
            ticket=self.ticket1,
            action=TicketLog.ActionType.STATUS_CHANGED
        )
        self.assertEqual(log.old_value, 'NOWE')
        self.assertEqual(log.new_value, 'W_TOKU')

    # =========================================================
    # Blok 9: Pełny cykl życia zgłoszenia (4 testy)
    # =========================================================

    def test_full_ticket_lifecycle(self):
        """Weryfikuje kompletny przepływ zgłoszenia: NOWE → W_TOKU → ROZWIAZANE."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})

        response = self.client.patch(url, {
            'status': 'W_TOKU',
            'technician': self.technician.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'W_TOKU')
        self.assertEqual(response.data['technician'], self.technician.id)

        response = self.client.patch(url, {'status': 'ROZWIAZANE'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ROZWIAZANE')
        self.assertIsNotNone(response.data['resolved_at'])

    def test_resolved_at_is_set_on_resolution(self):
        """Pole resolved_at jest automatycznie uzupełniane przy przejściu na status ROZWIAZANE."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        self.client.patch(url, {'status': 'ROZWIAZANE'}, format='json')
        self.ticket1.refresh_from_db()
        self.assertIsNotNone(self.ticket1.resolved_at)

    def test_resolved_at_is_cleared_on_reopen(self):
        """Pole resolved_at jest kasowane po ponownym otwarciu zgłoszenia."""
        self.client.force_authenticate(user=self.technician)
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.id})
        self.client.patch(url, {'status': 'ROZWIAZANE'}, format='json')
        self.client.patch(url, {'status': 'W_TOKU'}, format='json')
        self.ticket1.refresh_from_db()
        self.assertIsNone(self.ticket1.resolved_at)

    def test_ticket_creation_creates_log_entry(self):
        """Utworzenie nowego zgłoszenia automatycznie generuje wpis CREATED w dzienniku zdarzeń."""
        self.client.force_authenticate(user=self.employee1)
        data = {
            'title': 'Drukarka nie działa',
            'description': 'Błąd połączenia z drukarką sieciową.',
            'category': self.category.id,
            'priority': 'NORMALNY'
        }
        response = self.client.post(reverse('ticket-list'), data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_ticket = Ticket.objects.get(id=response.data['id'])
        self.assertTrue(
            TicketLog.objects.filter(
                ticket=new_ticket,
                action=TicketLog.ActionType.CREATED
            ).exists()
        )
