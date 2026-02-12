"""Serializers for user api views"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from user.worker.tasks import send_email_task
from django.core.exceptions import ObjectDoesNotExist
from django.utils.encoding import smart_str, force_bytes


class UserSerializer(serializers.ModelSerializer):
    """serializer for user"""
    prof_image_url = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = [
            "email",
            "username",
            "password",
            "name",
            "bio",
            "private_account",
            "prof_image",
            "prof_image_url",
        ]
        extra_kwargs = {"password": {"write_only": True}, "prof_image": {"write_only": True}}

    def get_prof_image_url(self, obj):
        return obj.get_profile_image_url()

    def create(self, validated_data):
        """Create and return user with encrypted password"""
        return get_user_model().objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        """Update and return user"""
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)

        if password:
            user.set_password(password)
            user.save()

        return user


class GetTokenPairSerializer(TokenObtainPairSerializer):
    """Custom jwt serializer to accept email"""

    username_field = "email"

    def validate(self, attrs):
        data = super().validate(attrs)
        data["id"] = self.user.id
        return data


class SendEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    LINK = "127.0.0.1"

    def validate_email(self, email_to):
        try:
            user = get_user_model().objects.get(email=email_to)
        except ObjectDoesNotExist:
            raise serializers.ValidationError("email is not registered")

        uid = urlsafe_base64_encode(force_bytes(user.id))
        token = PasswordResetTokenGenerator().make_token(user)
        link = "http://{LINK}:3000/user/reset/" + uid + "/" + token

        send_email_task(link, email_to)


class ForgotPasswordUserChangeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = ["password", "confirm_password"]

    def validate(self, attr):
        password = attr.get("password")
        confirm_password = attr.get("confirm_password")

        uid = self.context.get("uid")
        token = self.context.get("token")

        if password == confirm_password:
            try:
                id = smart_str(urlsafe_base64_decode(uid))
                user = get_user_model().objects.get(id=id)
                if not PasswordResetTokenGenerator().check_token(
                    user=user, token=token
                ):
                    raise serializers.ValidationError("Link is either wrong or expired")
                user.set_password(password)
                user.save()
                return attr
            except ObjectDoesNotExist:
                raise serializers.ValidationError("User with this id does not exists")
        else:
            raise serializers.ValidationError(
                "password and confirm_password do not match"
            )
