import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_project.settings')
django.setup()

from users.email_utils import send_otp_email

class MockUser:
    def __init__(self, email, first_name):
        self.email = email
        self.first_name = first_name

def test_email():
    print("Testing email sending...")
    user = MockUser(email=settings.EMAIL_HOST_USER, first_name="Test User")
    success = send_otp_email(user, "123456")
    
    if success:
        print(f"SUCCESS: Email sent to {settings.EMAIL_HOST_USER}")
    else:
        print("FAILED: Check console for errors or Gmail app password permissions.")

if __name__ == "__main__":
    test_email()
