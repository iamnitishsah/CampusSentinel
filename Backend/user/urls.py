from django.urls import path, include
from .views import UserCreateView
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView, TokenObtainPairView

urlpatterns = [
    path('register/', UserCreateView.as_view(), name='user_register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
]
