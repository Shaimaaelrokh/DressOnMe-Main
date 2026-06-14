from rest_framework import serializers
from .models import Cart, CartItem, Wishlist, Order, OrderItem, ShippingRate, Coupon
from products.serializers import ProductSerializer

class CartItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    stock_available = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_details', 'quantity', 'size', 'color', 'stock_available')

    def get_stock_available(self, obj):
        return obj.product.stock if obj.product else 0

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'total_price')

    def get_total_price(self, obj):
        return sum(item.product.price * item.quantity for item in obj.items.all())

class WishlistSerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ('id', 'user', 'products')

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    seller = serializers.ReadOnlyField(source='product.seller.email')

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_name', 'seller', 'size', 'color', 'price', 'quantity')

class ShippingRateSerializer(serializers.ModelSerializer):
    exchange_rate_from_usd = serializers.SerializerMethodField()

    class Meta:
        model = ShippingRate
        fields = ('id', 'country', 'region', 'rate', 'currency', 'exchange_rate_from_usd')

    def get_exchange_rate_from_usd(self, obj):
        from .models import ExchangeRate
        try:
            return float(ExchangeRate.objects.get(currency=obj.currency).rate_from_usd)
        except ExchangeRate.DoesNotExist:
            return 1.0000

class CouponSerializer(serializers.ModelSerializer):
    seller_email = serializers.ReadOnlyField(source='seller.email')

    class Meta:
        model = Coupon
        fields = ('id', 'code', 'discount_percentage', 'active', 'seller', 'seller_email', 'valid_from', 'valid_until', 'created_at')
        read_only_fields = ('seller', 'seller_email', 'created_at')

class SellerOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    buyer_email = serializers.ReadOnlyField(source='order.user.email')
    order_status = serializers.ReadOnlyField(source='order.status')
    payment_status = serializers.ReadOnlyField(source='order.payment_status')
    created_at = serializers.ReadOnlyField(source='order.created_at')

    class Meta:
        model = OrderItem
        fields = (
            'id', 'order', 'product', 'product_name', 'buyer_email', 
            'size', 'color', 'price', 'quantity', 
            'order_status', 'payment_status', 'created_at'
        )

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'user', 'items', 'total_amount', 'shipping_cost', 'discount_amount', 'coupon_used', 'status', 'payment_status', 'stripe_payment_intent_id', 'created_at')
