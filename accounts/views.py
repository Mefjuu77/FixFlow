from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, ProfileUpdateSerializer, ChangePasswordSerializer, CustomTokenObtainPairSerializer, CustomTokenRefreshSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .email import send_password_reset_email
from .models import CustomUser

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

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


class PasswordResetRequestView(APIView):
    """
    Wysyła e-mail z linkiem do resetu hasła.
    Zawsze zwraca 200 (nie ujawnia, czy konto istnieje — ochrona przed enumeracją).
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            send_password_reset_email(user)
        except CustomUser.DoesNotExist:
            pass  # Celowo nie ujawniamy braku konta

        return Response(
            {'detail': 'Jeśli konto o podanym adresie istnieje, wysłaliśmy wiadomość z instrukcją resetu hasła.'},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    Ustawia nowe hasło na podstawie uid + token z e-maila.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response(
                {'detail': 'Nieprawidłowy lub wygasły link resetu hasła.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, data['token']):
            return Response(
                {'detail': 'Link resetu hasła jest nieprawidłowy lub wygasł.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(data['new_password'])
        user.save()
        return Response({'detail': 'Hasło zostało pomyślnie zmienione. Możesz się zalogować.'}, status=status.HTTP_200_OK)

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

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Pobiera lub aktualizuje użytkownika. Tylko dla administratorów. (Usuwanie zostało wyłączone)
    """
    queryset = CustomUser.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


class UserToggleActiveView(APIView):
    """
    POST: Przełącza status is_active użytkownika (aktywuj/dezaktywuj).
    Tylko dla administratorów. Admin nie może dezaktywować samego siebie.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'Użytkownik nie został znaleziony.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.pk == request.user.pk:
            return Response(
                {'detail': 'Nie możesz dezaktywować własnego konta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])

        action = 'aktywowane' if user.is_active else 'dezaktywowane'
        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'detail': f'Konto zostało {action}.',
            'user': serializer.data,
        })
