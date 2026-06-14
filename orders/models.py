from django.db import models
from django.conf import settings
from products.models import Product

class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart for {self.user.email}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    size = models.CharField(max_length=10, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True, default='Standard')
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product', 'size', 'color')

    def __str__(self):
        return f"{self.quantity} x {self.product.name} ({self.size})"

class Wishlist(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist')
    products = models.ManyToManyField(Product, related_name='wishlisted_by')

    def __str__(self):
        return f"Wishlist for {self.user.email}"

class ExchangeRate(models.Model):
    currency = models.CharField(max_length=3, unique=True, help_text="Currency code, e.g., USD, EGP, SAR")
    rate_from_usd = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000, help_text="How much of this currency equals 1 USD. e.g. 50.0 for EGP")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.currency} - {self.rate_from_usd}"

class ShippingRate(models.Model):
    country = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True, null=True, help_text="Optional. If left blank, applies to the whole country.")
    currency = models.CharField(max_length=3, default='USD', help_text="Currency code, e.g., USD, EGP")
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('country', 'region')

    def __str__(self):
        region_str = f" - {self.region}" if self.region else " - All Regions"
        return f"{self.country}{region_str}: ${self.rate}"

class Coupon(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coupons', null=True, blank=True)
    code = models.CharField(max_length=50, unique=True)
    discount_percentage = models.PositiveIntegerField(help_text="Discount percentage (e.g. 10 for 10%)")
    active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.discount_percentage}% OFF"

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        SHIPPED = 'SHIPPED', 'Shipped'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    coupon_used = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    exchange_rate_applied = models.DecimalField(max_digits=10, decimal_places=4, default=1.0000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Shipping Address Details
    shipping_country = models.CharField(max_length=100, blank=True, null=True)
    shipping_state = models.CharField(max_length=100, blank=True, null=True)
    shipping_city = models.CharField(max_length=100, blank=True, null=True)
    shipping_street = models.TextField(blank=True, null=True)
    shipping_zip = models.CharField(max_length=20, blank=True, null=True)
    shipping_phone = models.CharField(max_length=30, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Store original status to detect changes
        self._original_status = self.status

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        status_changed = not is_new and self.status != self._original_status
        
        super().save(*args, **kwargs)
        
        # Trigger Emails
        from users.email_utils import (
            send_payment_confirmation_email, 
            send_order_notification_to_sellers,
            send_order_status_update_emails,
            send_order_received_email
        )

        if is_new:
            # Send initial confirmation
            send_order_received_email(self)
        elif status_changed:
            if self.status == Order.Status.PAID:
                # Send the "Big" confirmation emails
                send_payment_confirmation_email(self)
                send_order_notification_to_sellers(self)
            else:
                # Send generic status update email (Shipped, Delivered, etc.)
                send_order_status_update_emails(self)

            # Task 3: Restore Stock if Order Fails or Cancelled
            if self.status in [Order.Status.CANCELLED, Order.PaymentStatus.FAILED] and \
               self._original_status not in [Order.Status.CANCELLED, Order.PaymentStatus.FAILED]:
                from products.models import Product
                from django.db import transaction
                
                # Use atomic block for safety
                with transaction.atomic():
                    for item in self.items.all():
                        try:
                            product = Product.objects.select_for_update().get(id=item.product.id)
                            product.stock += item.quantity
                            product.save(update_fields=['stock'])
                        except Product.DoesNotExist:
                            raise ValueError(f"CRITICAL: Cannot restore stock for {item.product.name}. Product not found.")

        # Update original status after save
        self._original_status = self.status

    def __str__(self):
        return f"Order {self.id} - {self.user.email}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    size = models.CharField(max_length=10, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True, default='Standard')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order {self.order.id})"
