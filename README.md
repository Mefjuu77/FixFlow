# FixFlow — System Zgłoszeń IT

<div align="center">

**Nowoczesny system helpdesk do zarządzania zgłoszeniami IT**

*Django REST Framework · React · TypeScript · PostgreSQL*

</div>

---

##  Spis treści

- [O projekcie](#o-projekcie)
- [Funkcjonalności](#funkcjonalności)
- [Stack technologiczny](#stack-technologiczny)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Uruchomienie](#uruchomienie)
- [Struktura projektu](#struktura-projektu)

---

##  O projekcie

FixFlow to fullstackowy system helpdesk zaprojektowany do zarządzania zgłoszeniami IT w organizacji. Umożliwia pracownikom zgłaszanie problemów technicznych, a technikom ich obsługę i śledzenie postępów — z powiadomieniami e-mail na każdym etapie.

System obsługuje trzy role użytkowników:
- **Pracownik** — tworzy zgłoszenia i śledzi ich statusy
- **Technik** — obsługuje przypisane zgłoszenia, zmienia statusy, komentuje
- **Administrator** — pełna kontrola nad systemem, zarządzanie użytkownikami

---

##  Funkcjonalności

### Zarządzanie zgłoszeniami
- Tworzenie, edycja i śledzenie zgłoszeń IT
- System statusów: Nowe → W toku → Rozwiązane → Zamknięte
- Priorytety: Wysoki, Normalny, Niski
- Kategorie zgłoszeń (Sprzęt, Oprogramowanie, Sieć, Dostęp do konta, Inne)
- Relacje między zgłoszeniami (duplikaty, powiązane, blokujące)
- Komentarze z obsługą Markdown (publiczne i wewnętrzne)
- Filtrowanie, sortowanie i paginacja

### Powiadomienia
- Powiadomienia e-mail (SMTP/Gmail) z responsywnymi szablonami HTML
- Powiadomienia in-app (dzwonek) w czasie rzeczywistym
- System akceptacji/odrzucenia rozwiązania przez e-mail (tokeny jednorazowe)
- Automatyczne zamykanie zgłoszeń po braku reakcji

### Panel użytkownika
- Dashboard z widokiem dostosowanym do roli
- Statystyki i wykresy (Chart.js)
- Eksport raportów do XLSX
- Paleta poleceń (Ctrl+K) — szybka nawigacja
- Dark mode / Light mode
- Internacjonalizacja (PL / EN)

### Bezpieczeństwo
- Uwierzytelnianie JWT (access + refresh tokens) z automatyczną rotacją
- Throttling API (ochrona przed brute-force)
- Reset hasła przez e-mail
- Blacklisting tokenów przy wylogowaniu
- Nagłówki bezpieczeństwa w trybie produkcyjnym (HSTS, XSS, CSP)

---

##  Stack technologiczny

### Backend
| Technologia | Wersja | Opis |
|---|---|---|
| Python | 3.12+ | Język programowania |
| Django | 6.0 | Framework webowy |
| Django REST Framework | 3.17 | REST API |
| SimpleJWT | 5.5 | Uwierzytelnianie JWT |
| PostgreSQL | 14+ | Baza danych |
| openpyxl | 3.1 | Eksport XLSX |

### Frontend
| Technologia | Wersja | Opis |
|---|---|---|
| React | 19 | Biblioteka UI |
| TypeScript | 5.x | Typowanie statyczne |
| Vite | 6.x | Build tool |
| React Router | 7 | Routing |
| Axios | 1.x | HTTP client |
| react-i18next | — | Internacjonalizacja |
| Lucide React | — | Ikony |
| Chart.js | — | Wykresy |
| TailwindCSS | 4 | Style CSS |

---

##  Wymagania

- **Python** 3.12+
- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** 9+

---

##  Instalacja

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/Mefjuu77/FixFlow.git
cd FixFlow
```

### 2. Backend (Django)

```bash
# Stwórz i aktywuj wirtualne środowisko
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# Zainstaluj zależności
pip install -r requirements.txt
```

### 3. Konfiguracja zmiennych środowiskowych

```bash
# Skopiuj plik wzorcowy
cp .env.example .env

# Edytuj .env i uzupełnij wartości:
# - DJANGO_SECRET_KEY (wygeneruj nowy)
# - DB_PASSWORD (hasło do PostgreSQL)
# - EMAIL_HOST_USER / EMAIL_HOST_PASSWORD (Gmail App Password)
```

> **Tip:** Wygeneruj SECRET_KEY poleceniem:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

### 4. Baza danych

```sql
-- W PostgreSQL stwórz bazę danych:
CREATE DATABASE fixflow;
```

```bash
# Wykonaj migracje
python manage.py migrate

# Stwórz konto administratora
python manage.py createsuperuser
```

### 5. Frontend (React)

```bash
cd frontend
npm install
```

---

##  Uruchomienie

Potrzebujesz **dwóch terminali**:

### Terminal 1 — Backend
```bash
cd FixFlow
.\venv\Scripts\activate      # Windows
python manage.py runserver
```
Backend API: `http://127.0.0.1:8000/`

### Terminal 2 — Frontend
```bash
cd FixFlow/frontend
npm run dev
```
Frontend: `http://localhost:5173/`

---

##  Struktura projektu

```
FixFlow/
├── accounts/           # Moduł użytkowników (model, widoki, serializery)
│   ├── models.py       # CustomUser z rolami (Employee/Technician/Admin)
│   ├── views.py        # Auth (JWT), CRUD użytkowników, reset hasła
│   ├── serializers.py  # Serializacja danych użytkownika
│   └── email.py        # E-mail resetu hasła
├── tickets/            # Moduł zgłoszeń
│   ├── models.py       # Ticket, Comment, Category, Notification, TicketRelation
│   ├── views.py        # CRUD zgłoszeń, komentarze, powiązania
│   ├── email.py        # Powiadomienia e-mail (szablony HTML)
│   └── reports.py      # Eksport XLSX
├── config/             # Konfiguracja Django
│   ├── settings.py     # Ustawienia projektu
│   └── urls.py         # Routing API
├── frontend/           # Aplikacja React
│   ├── src/
│   │   ├── pages/      # Strony (Dashboard, Tickets, Statistics, Settings...)
│   │   ├── components/ # Komponenty (CommandPalette, NotificationBell...)
│   │   ├── context/    # React Context (Auth, Theme)
│   │   ├── api/        # Konfiguracja Axios + serwisy
│   │   └── i18n/       # Tłumaczenia (PL/EN)
│   └── package.json
├── .env.example        # Wzorcowy plik zmiennych środowiskowych
├── requirements.txt    # Zależności Python
└── manage.py           # Django management
```

---
