from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer
from .models import CustomUser

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
