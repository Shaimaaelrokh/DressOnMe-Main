from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
import random
from .models import User, Profile, ContactMessage, UserOTP, Country
from .serializers import (
    UserSerializer, UserRegistrationSerializer, ProfileSerializer, 
    ContactMessageSerializer, MyTokenObtainPairSerializer, CountrySerializer
)

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Login view to obtain an OTP.
    
    Method: POST
    Body:
        email (str): User's email
        password (str): User's password
    Returns:
        detail (str): Status message
        otp_required (bool): Always True
        email (str): User's email
    """
    serializer_class = MyTokenObtainPairSerializer


    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = serializer.user
        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Delete old OTP for this user and create a fresh one
        UserOTP.objects.filter(user=user).delete()
        UserOTP.objects.create(user=user, code=otp_code)

        # Send OTP via email
        from .email_utils import send_otp_email
        email_sent = send_otp_email(user, otp_code)
        
        if not email_sent:
            # Fallback: print to console if email fails
            print(f"\n[OTP DEBUG] Code for {user.email}: {otp_code}\n")
        
        return Response({
            "detail": "OTP sent to your email." if email_sent else "OTP generated. Check console.",
            "otp_required": True,
            "email": user.email
        }, status=status.HTTP_200_OK)

class VerifyOTPView(generics.GenericAPIView):
    """
    Verify OTP to obtain JWT tokens.
    
    Method: POST
    Body:
        email (str): User's email
        otp (str): 6-digit OTP code
    Returns:
        refresh (str): Refresh JWT token
        access (str): Access JWT token
        role (str): User's role
    """
    permission_classes = (permissions.AllowAny,)

    
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        code = request.data.get('otp')
        
        try:
            user = User.objects.get(email=email)
            otp = user.otp
            if otp.code == code and not otp.is_expired():
                # Generate tokens
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                
                # Optional: mark as verified and/or delete
                otp.delete() 
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'role': user.role
                })
            else:
                return Response({"detail": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, UserOTP.DoesNotExist):
            return Response({"detail": "Invalid request or OTP not generated"}, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(generics.GenericAPIView):
    """
    Request a password reset OTP.
    Method: POST
    Body: email (str)
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            otp_code = str(random.randint(100000, 999999))
            
            UserOTP.objects.filter(user=user).delete()
            UserOTP.objects.create(user=user, code=otp_code)
            
            from .email_utils import send_password_reset_email
            email_sent = send_password_reset_email(user, otp_code)
            
            if not email_sent:
                print(f"\n[OTP DEBUG] Password Reset Code for {user.email}: {otp_code}\n")
                
            return Response({
                "detail": "Password reset OTP sent to your email." if email_sent else "OTP generated. Check console.",
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            # Return same message to prevent email enumeration
            return Response({"detail": "If the email exists, an OTP has been sent."}, status=status.HTTP_200_OK)


class ResetPasswordView(generics.GenericAPIView):
    """
    Verify OTP and set new password.
    Method: POST
    Body: email (str), otp (str), new_password (str)
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        code = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not all([email, code, new_password]):
            return Response({"detail": "Email, OTP, and new password are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            otp = user.otp
            if otp.code == code and not otp.is_expired():
                user.set_password(new_password)
                user.save()
                otp.delete()
                return Response({"detail": "Password reset successfully. You can now login."}, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, UserOTP.DoesNotExist):
            return Response({"detail": "Invalid request or OTP not generated"}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """
    User registration view.
    
    Method: POST
    Body:
        email (str), username (str), first_name (str), last_name (str),
        password (str), password_confirm (str), role (str), age (int),
        gender (str), product_type (str), payment_method (str),
        favorite_colors (str), country (str), currency (str),
        tax_number (str, optional), brand_name (str, optional),
        brand_year (int, optional), brand_intro (str, optional)
    """
    queryset = User.objects.all()

    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("\n[REGISTRATION VALIDATION ERRORS]:", serializer.errors, "\n")
        return super().post(request, *args, **kwargs)

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update current user details.
    
    Headers: Authorization: Bearer <token>
    Methods: GET, PUT, PATCH
    """
    queryset = User.objects.all()

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class PublicUserProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

class ToggleFollowView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request, pk, *args, **kwargs):
        try:
            target_user = User.objects.get(pk=pk)
            target_profile = target_user.profile
            
            if target_user == request.user:
                return Response({"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)
                
            if target_profile.followers.filter(id=request.user.id).exists():
                target_profile.followers.remove(request.user)
                is_following = False
            else:
                target_profile.followers.add(request.user)
                is_following = True
                
            return Response({
                "is_following": is_following,
                "followers_count": target_profile.followers.count()
            })
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class CountryListView(generics.ListAPIView):
    queryset = Country.objects.all().order_by('name')
    permission_classes = (permissions.AllowAny,)
    serializer_class = CountrySerializer

class ProfileUpdateView(generics.UpdateAPIView):
    """
    Update user profile information.
    
    Headers: Authorization: Bearer <token>
    Methods: PUT, PATCH
    Body (Partial):
        gender (str), tax_number (str), brand_name (str), country (str), currency (str), age (int)
    """
    queryset = Profile.objects.all()

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def perform_update(self, serializer):
        # The serializer handles profile fields. 
        # We need to manually handle first_name and last_name on the User model.
        user = self.request.user
        first_name = self.request.data.get('first_name')
        last_name = self.request.data.get('last_name')
        
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()
        
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = True # Force partial updates even for PUT to prevent data wiping
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return the full user data so frontend can update its state
        user_serializer = UserSerializer(request.user, context={'request': request})
        return Response(user_serializer.data)

class ContactCreateView(generics.CreateAPIView):
    """
    Submit a contact message.
    
    Method: POST
    Body:
        name (str), email (str), subject (str), message (str)
    """
    queryset = ContactMessage.objects.all()

    serializer_class = ContactMessageSerializer
    permission_classes = (permissions.AllowAny,)
    
    def perform_create(self, serializer):
        contact_message = serializer.save()
        
        # Send auto-reply to user
        from .email_utils import send_contact_auto_reply, send_contact_notification
        send_contact_auto_reply(contact_message)
        
        # Send notification to admin
        send_contact_notification(contact_message)

import os
class VerifyDashboardPinAPIView(generics.GenericAPIView):
    """
    Verify Dashboard Admin PIN
    
    Method: POST
    Body:
        pin (str)
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        pin = request.data.get('pin')
        correct_pin = os.getenv('DASHBOARD_PIN')
        
        if pin == correct_pin:
            return Response({"success": True})
        return Response({"detail": "Invalid PIN"}, status=status.HTTP_403_FORBIDDEN)


from rest_framework_simplejwt.tokens import RefreshToken
class LogoutView(generics.GenericAPIView):
    """
    Logout view to blacklist the refresh token.
    
    Method: POST
    Body:
        refresh (str): The refresh JWT token to be blacklisted
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful, token blacklisted"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)