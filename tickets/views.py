from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Category, Ticket
from .serializers import CategorySerializer, TicketSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'EMPLOYEE':
            return Ticket.objects.filter(creator=user)
        return Ticket.objects.all()

    def perform_create(self, serializer):
        # Automatycznie przypisuje aktualnie zalogowanego użytkownika jako twórcę zgłoszenia
        serializer.save(creator=self.request.user)
