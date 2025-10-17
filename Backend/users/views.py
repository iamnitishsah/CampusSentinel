from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from rest_framework import status

def get_tokens_for_user(User):
    refresh = RefreshToken.for_user(User)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token)
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        return Response({"user": user_data, "tokens": tokens}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({"error": "Missing email or password"}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "Account disabled."}, status=status.HTTP_403_FORBIDDEN)

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        return Response({"user": user_data, "tokens": tokens}, status=status.HTTP_200_OK)


# class LogoutView(APIView):
#     permission_classes = []
#
#     def post(self, request):
#         auth_header = request.headers.get("Authorization")
#
#         if not auth_header:
#             return Response({"detail": "Authorization header missing."}, status=status.HTTP_400_BAD_REQUEST)
#
#         if not auth_header.startswith("Bearer "):
#             return Response({"detail": "Invalid Authorization header format."}, status=status.HTTP_400_BAD_REQUEST)
#
#         refresh_token = auth_header.split(" ")[1]
#
#         try:
#             token = RefreshToken(refresh_token)
#             token.blacklist()
#         except Exception:
#             return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
#
#         return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)



class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data
        return Response({"user": data}, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        allowed = ("full_name", "phone_number")
        updated = False
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data[field])
                updated = True
        if updated:
            user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)