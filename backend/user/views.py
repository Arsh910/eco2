"""Views for user api"""

from rest_framework import generics, permissions
from rest_framework.views import APIView
from user.serializer import (
    UserSerializer,
    GetTokenPairSerializer,
    SendEmailSerializer,
    ForgotPasswordUserChangeSerializer,
)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now


class CreateUserView(generics.CreateAPIView):
    """Create a new user in the system"""

    serializer_class = UserSerializer


class LoginUserView(TokenObtainPairView):
    """Login a user an return token"""

    serializer_class = GetTokenPairSerializer


class UpdateUserView(generics.RetrieveUpdateAPIView):
    """Retrive  and update the user"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ForgotPasswordUserView(APIView):
    def post(self, request):
        serializer = SendEmailSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            return Response(
                {
                    "message": "An email will be sent to you within 1 min to reset your password"
                },
                status=status.HTTP_200_OK,
            )


class ForgotPasswordUserChangeView(APIView):
    def patch(self, request, uid, token, format=None):
        serializer = ForgotPasswordUserChangeSerializer(
            data=request.data, context={"uid": uid, "token": token}
        )
        if serializer.is_valid(raise_exception=True):
            return Response({"msg": "password changed sucessfully"})
        else:
            return Response({"error": "some error happend"})


class UpdateLastVisitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        user.last_visit = now()
        user.save(update_fields=["last_visit"])
        return Response({"status": "last_visit updated"})
