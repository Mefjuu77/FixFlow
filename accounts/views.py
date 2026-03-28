from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer

class CurrentUserView(APIView):
    """
    Zwraca dane aktualnie zalogowanego użytkownika
    na podstawie przekazanego tokenu JWT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
