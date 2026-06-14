# Users App

This app handles user authentication, profile management, and contact requests.

> [!NOTE]
> We use a custom User model that utilizes **email** as the username field for a more modern authentication experience.

## 🌟 Features
- **Registration & Login**: JWT-based authentication using `djangorestframework-simplejwt`.
- **OTP Verification**: Email-based OTP for secure registration and identity verification.
- **Profiles**: Comprehensive user profiles with roles (`CUSTOMER`, `SELLER`, `ADMIN`), avatars, and bios.
- **Public Profiles**: Publicly accessible profiles for sellers to showcase their brand and total products.
- **Contact Us**: A system for users to send inquiries or feedback directly to the administration.

## 🛠️ Key Components

### Models
- `User`: Extended Django User model with roles and verification status.
- `Profile`: Stores additional user information like avatar, bio, address, and brand details for sellers.
- `UserOTP`: Secure storage for temporary verification codes.
- `ContactMessage`: Stores contact form submissions for admin review.

### Views
- `RegisterView`: Handles user sign-up and initiates OTP verification.
- `VerifyOTPView`: Validates the OTP sent to the user's email.
- `UserDetailView`: Allows authenticated users to manage their own private data.
- `PublicUserProfileView`: Provides public data (brand, bio, avatar) for any user.

## 📡 API Endpoints
- `POST /api/users/register/`: Register a new account.
- `POST /api/users/verify-otp/`: Verify email via OTP.
- `POST /api/users/token/`: Obtain JWT tokens (Login).
- `GET /api/users/me/`: Get current user details.
- `GET /api/users/profile/<id>/`: Get public profile details.

> [!IMPORTANT]
> OTP codes are valid for 10 minutes from the time of generation.
