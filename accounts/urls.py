from django.urls import path
from rest_framework.permissions import AllowAny
from .views import CurrentUserView, TechnicianListView, UserListView, UserCreateView, UserDetailView, UserToggleActiveView, LogoutView, ChangePasswordView, CustomTokenObtainPairView, CustomTokenRefreshView

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain_pair'),
    path('refresh/', CustomTokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='user_logout'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('technicians/', TechnicianListView.as_view(), name='technician_list'),
    path('list/', UserListView.as_view(), name='user_list'),
    path('create/', UserCreateView.as_view(), name='user_create'),
    path('<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('<int:pk>/toggle-active/', UserToggleActiveView.as_view(), name='user_toggle_active'),
]
