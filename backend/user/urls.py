"""urls for user api"""

from django.urls import path
from rest_framework_simplejwt import views as jwt_views
from user.views import (
    CreateUserView,
    LoginUserView,
    UpdateUserView,
    ForgotPasswordUserView,
    ForgotPasswordUserChangeView,
    UpdateLastVisitView,
)

app_name = "user"

urlpatterns = [
    path("signup/", CreateUserView.as_view(), name="signup"),
    path("login/", LoginUserView.as_view(), name="login"),
    path("token/refresh/", jwt_views.TokenRefreshView.as_view(), name="refresh"),
    path("manageuser/", UpdateUserView.as_view(), name="manageuser"),
    path("forgot/", ForgotPasswordUserView.as_view(), name="forgotpassword"),
    path(
        "reset/<uid>/<token>/",
        ForgotPasswordUserChangeView.as_view(),
        name="resetpassword",
    ),
    path("lastvisit/", UpdateLastVisitView.as_view(), name="lastvisit"),
]
