from django.db import models
from django.conf import settings
from ecommerce_project.utils import product_main_path, product_secondary_path

from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True, null=True)
    color = models.CharField(max_length=20, blank=True, null=True, help_text="Hex color code for UI badge")
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='children'
    )

    class Meta:
        verbose_name_plural = 'categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            # Simple slugification
            self.slug = slugify(self.name)
            
            # Ensure uniqueness if needed
            original_slug = self.slug
            count = 1
            while Category.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{count}"
                count += 1
        super().save(*args, **kwargs)

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])

class Product(models.Model):
    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        UNISEX = "UNISEX", "Unisex"

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    categories = models.ManyToManyField(Category, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_before_sale = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.00)
    stock = models.IntegerField(default=0)
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)
    image = models.ImageField(upload_to=product_main_path, null=True, blank=True)
    
    # Advanced Frontend Features mapped from Profile.jsx
    available_colors = models.CharField(max_length=200, blank=True)
    fabric_type = models.CharField(max_length=100, blank=True)
    care_instructions = models.TextField(blank=True)
    size_guide = models.JSONField(default=dict, blank=True)
    shoe_size_guide = models.JSONField(default=dict, blank=True)
    image_categories = models.JSONField(default=list, blank=True)
    image_prices = models.JSONField(default=list, blank=True)
    fabric_focus = models.JSONField(default=list, blank=True)
    
    # Stores additional image URLs directly instead of using a separate table
    additional_images = models.JSONField(default=list, blank=True)
    
    is_available = models.BooleanField(default=True)
    can_be_hijabi = models.BooleanField(default=False)
    needs_basic = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    @property
    def total_stock(self):
        return self.stock

    @property
    def average_rating(self):
        from django.db.models import Avg
        avg = self.reviews.aggregate(avg=Avg('rating'))['avg']
        return avg if avg is not None else 0
    
    @property
    def is_in_stock(self):
        return self.stock > 0

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True)
    comment = models.TextField(blank=True)
    image = models.ImageField(upload_to='product_reviews/', blank=True, null=True)
    is_like = models.BooleanField(default=False)
    is_dislike = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.rating})"




