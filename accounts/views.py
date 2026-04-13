from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from .models import CustomUser

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'ADMIN'

class TechnicianListView(generics.ListAPIView):
    """
    Zwraca listę wszystkich użytkowników o roli Technik lub Admin.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role__in=[CustomUser.Role.TECHNICIAN, CustomUser.Role.ADMIN])

class CurrentUserView(APIView):
    """
    Zwraca dane aktualnie zalogowanego użytkownika
    na podstawie przekazanego tokenu JWT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(generics.ListAPIView):
    """
    Zwraca listę wszystkich użytkowników w systemie.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    queryset = CustomUser.objects.all()

class UserCreateView(generics.CreateAPIView):
    """
    Tworzy nowego użytkownika. Tylko dla administratorów.
    """
    serializer_class = UserCreateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Pobiera, aktualizuje lub usuwa użytkownika. Tylko dla administratorów.
    """
    queryset = CustomUser.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer
