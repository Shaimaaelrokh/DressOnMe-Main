from django.contrib.auth.models import AbstractUser
from django.db import models
from ecommerce_project.utils import avatar_path, brand_path
from django.db.models.signals import post_save
from django.dispatch import receiver
class User(AbstractUser):
    class Role(models.TextChoices):
        SELLER = "SELLER", "Seller"
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    currency = models.CharField(max_length=10)
    code = models.CharField(max_length=5, blank=True)
    flag = models.CharField(max_length=10, blank=True)
    lat = models.FloatField(default=0.0)
    lng = models.FloatField(default=0.0)
    stability = models.IntegerField(default=70)
    base_rate = models.FloatField(default=1.0)

    def __str__(self):
        return f"{self.name} ({self.currency})"

class Profile(models.Model):
    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    country = models.CharField(max_length=100, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    image = models.ImageField(upload_to=avatar_path, blank=True, null=True)
    cover_image = models.ImageField(upload_to=avatar_path, blank=True, null=True)
   
    # New Customer/Seller fields
    age = models.IntegerField(null=True, blank=True)
    product_type = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    favorite_colors = models.CharField(max_length=255, blank=True)
    
    # Seller specific details
    tax_number = models.CharField(max_length=20, blank=True)
    brand_name = models.CharField(max_length=100, blank=True)
    brand_year = models.IntegerField(null=True, blank=True)
    brand_intro = models.TextField(blank=True)
    
    followers = models.ManyToManyField(User, related_name='followed_profiles', blank=True)
    
    def __str__(self):
        return f"{self.user.email}'s Profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.name} - {self.subject}"

class UserOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='otp')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def is_expired(self):
        from django.utils import timezone
        import datetime
        return timezone.now() > self.created_at + datetime.timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.user.email}"
