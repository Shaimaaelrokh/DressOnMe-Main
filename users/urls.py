from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, UserDetailView, ProfileUpdateView, 
    ContactCreateView, MyTokenObtainPairView, VerifyOTPView,
    PublicUserProfileView, CountryListView, VerifyDashboardPinAPIView,
    LogoutView, ToggleFollowView, ForgotPasswordView, ResetPasswordView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('profile/', ProfileUpdateView.as_view(), name='profile-update'),
    path('contact/', ContactCreateView.as_view(), name='contact-create'),
    path('<int:pk>/', PublicUserProfileView.as_view(), name='public-user-profile'),
    path('<int:pk>/follow/', ToggleFollowView.as_view(), name='toggle-follow'),
    path('countries/', CountryListView.as_view(), name='country-list'),
    path('verify-dashboard-pin/', VerifyDashboardPinAPIView.as_view(), name='verify-dashboard-pin'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]
