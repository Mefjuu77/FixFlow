from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, ProfileUpdateSerializer, ChangePasswordSerializer
from .models import CustomUser

class ChangePasswordView(APIView):
    """
    Zmienia hasło zalogowanego użytkownika.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Hasło zostało pomyślnie zmienione."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    GET: Zwraca dane aktualnie zalogowanego użytkownika.
    PATCH: Aktualizuje profil (imię, nazwisko, avatar).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Zwróć pełne dane użytkownika po aktualizacji
            return Response(UserSerializer(request.user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListAPIView):
    """
    Zwraca listę wszystkich użytkowników w systemie.
    Dostępne tylko dla techników i administratorów.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    queryset = CustomUser.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.role == 'EMPLOYEE':
            # Pracownik widzi tylko siebie
            return CustomUser.objects.filter(id=user.id)
        return CustomUser.objects.all()


class LogoutView(APIView):
    """
    POST /api/users/logout/
    Blacklistuje refresh token po stronie serwera.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token jest wymagany.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Wylogowano pomyślnie.'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response(
                {'detail': 'Token jest nieprawidłowy lub już wygasł.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
