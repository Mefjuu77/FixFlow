"""
Paginacja dla API zgłoszeń.

OptInPageNumberPagination paginuje wyłącznie, gdy klient przekaże parametr
`?page=`. W przeciwnym razie zwraca pełną listę (zachowanie wsteczne dla
pulpitu, statystyk i palety komend, które agregują wszystkie zgłoszenia).
"""

from rest_framework.pagination import PageNumberPagination


class OptInPageNumberPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        # Brak parametru `page` → bez paginacji (pełna lista jak dotychczas)
        if 'page' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
