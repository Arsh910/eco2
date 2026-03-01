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


from user.utils import validate_google_token
from user.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from user.serializer import GoogleLoginSerializer

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class GoogleLoginView(APIView):
    """
    Check the Google token, create a user if not exists, return JWT.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = GoogleLoginSerializer

    def post(self, request):
        import time
        import requests
        from django.core.files.base import ContentFile
        
        start_time = time.time()

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        try:
            req_start = time.time()
            user_data = validate_google_token(token)
            req_end = time.time()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # user_data contains 'email', 'name', 'picture', etc.
        email = user_data.get('email')
        name = user_data.get('name')
        picture = user_data.get('picture')
        
        if not email:
            return Response({'error': 'Email not found in Google token'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        db_start = time.time()
        user = User.objects.filter(email=email).first()

        if user:
            # User exists, update name if empty
            if not user.name:
                user.name = name
                user.save()
        else:
            # Create new user
            username = email.split('@')[0]
            base_username = username
            
            # Ensure username uniqueness
            import uuid
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{uuid.uuid4().hex[:4]}"

            try:
                user = User.objects.create(
                    email=email,
                    username=username,
                    name=name
                )
            except Exception as e:
                return Response({'error': 'Failed to create user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if picture and not user.prof_image:
            try:
                # Add timeout to prevent hanging on network issues
                img_response = requests.get(picture, timeout=10)
                if img_response.status_code == 200:
                    user.prof_image.save(
                        f"{user.username}_social.jpg",
                        ContentFile(img_response.content),
                        save=True
                    )
            except Exception as e:
                print(f"Failed to download profile image: {e}")

        db_end = time.time()

        # Generate JWT
        refresh = RefreshToken.for_user(user)
        
        total_time = time.time() - start_time
        
        # Get absolute URL for profile image
        prof_image_url = user.get_profile_image_url()
        if prof_image_url and not prof_image_url.startswith('http'):
             prof_image_url = request.build_absolute_uri(prof_image_url)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'email': user.email,
            'username': user.username,
            'name': user.name,
            'prof_image': prof_image_url
        })


