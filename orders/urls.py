from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, CartItemViewSet, WishlistViewSet, OrderViewSet, SellerOrdersView, ShippingRateListView, ValidateCouponView, SellerCouponViewSet, CalculateShippingView
from .stripe_views import StripeWebhookView, StripeCheckoutView

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'cart-items', CartItemViewSet, basename='cart-item')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'seller-coupons', SellerCouponViewSet, basename='seller-coupon')

urlpatterns = [
    path('', include(router.urls)),
    path('seller-orders/', SellerOrdersView.as_view(), name='seller-orders'),
    # path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('checkout-session/', StripeCheckoutView.as_view(), name='checkout-session'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('shipping-rates/', ShippingRateListView.as_view(), name='shipping-rates'),
    path('calculate-shipping/', CalculateShippingView.as_view(), name='calculate-shipping'),
    path('coupons/validate/', ValidateCouponView.as_view(), name='validate-coupon'),
]
