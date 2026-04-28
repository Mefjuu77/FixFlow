from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import CurrentUserView, TechnicianListView, UserListView, UserCreateView, UserDetailView, LogoutView

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='user_logout'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('technicians/', TechnicianListView.as_view(), name='technician_list'),
    path('list/', UserListView.as_view(), name='user_list'),
    path('create/', UserCreateView.as_view(), name='user_create'),
    path('<int:pk>/', UserDetailView.as_view(), name='user_detail'),
]
