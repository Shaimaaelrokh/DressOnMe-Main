from django.contrib import admin
from .models import Cart, CartItem, Wishlist, Order, OrderItem, ShippingRate, Coupon, ExchangeRate

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'size', 'color', 'price', 'quantity')
    can_delete = False

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('product', 'size', 'color', 'quantity')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('id', 'user__email', 'stripe_payment_intent_id')
    inlines = [OrderItemInline]
    readonly_fields = ('user', 'total_amount', 'shipping_cost', 'discount_amount', 'coupon_used', 'currency', 'exchange_rate_applied', 'stripe_payment_intent_id', 'stripe_customer_id', 'created_at', 'updated_at')
    ordering = ('-created_at',)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    inlines = [CartItemInline]

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user',)
    filter_horizontal = ('products',)

@admin.register(ShippingRate)
class ShippingRateAdmin(admin.ModelAdmin):
    list_display = ('country', 'region', 'currency', 'rate')
    search_fields = ('country', 'region', 'currency')
    list_filter = ('country', 'currency')

@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ('currency', 'rate_from_usd')
    search_fields = ('currency',)

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'seller', 'discount_percentage', 'active', 'valid_from', 'valid_until', 'created_at')
    search_fields = ('code', 'seller__email')
    list_filter = ('active', 'created_at', 'valid_from', 'valid_until')
