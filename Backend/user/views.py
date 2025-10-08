from rest_framework import generics
from django.contrib.auth import get_user_model
from .serializers import UserCreateSerializer

# Create your views here.
class UserCreateView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = []