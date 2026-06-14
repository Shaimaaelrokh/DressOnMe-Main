from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem, Wishlist, Order, OrderItem
from .serializers import (
    CartSerializer, CartItemSerializer, 
    WishlistSerializer, OrderSerializer, SellerOrderItemSerializer
)
from products.models import Product
from django.db import transaction

class CartViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing the authenticated user's cart.
    
    Headers: Authorization: Bearer <token>
    Method: GET (current)
    """
    serializer_class = CartSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart

    @action(detail=False, methods=['get'])
    def current(self, request):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

class CartItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing items within a cart.
    
    Headers: Authorization: Bearer <token>
    Methods: POST (Create), PUT/PATCH (Update), DELETE (Destroy)
    POST Body:
        product (int): Product ID
        quantity (int): Desired quantity
        size (str): Selected size
        color (str): Selected color
    """
    serializer_class = CartItemSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def create(self, request, *args, **kwargs):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        # Support both 'product' (DRF default) and 'product_id' (Frontend)
        product_id = request.data.get('product_id') or request.data.get('product')
        quantity = int(request.data.get('quantity', 1))
        size = request.data.get('size') 
        color = request.data.get('color', 'Standard')

        # Basic validation
        if not product_id:
            return Response({'error': 'Product ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, id=product_id)

        if product.stock < quantity:
             return Response({'error': f'Insufficient stock. Available: {product.stock}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check existing item (Correctly including COLOR)
        cart_item_filters = {
            'cart': cart, 
            'product_id': product_id, 
            'size': size,
            'color': color 
        }
        cart_item = CartItem.objects.filter(**cart_item_filters).first()
        
        if cart_item:
            new_quantity = cart_item.quantity + quantity
            if product.stock < new_quantity:
                 return Response({'error': f'Insufficient stock. Max available: {product.stock}'}, status=status.HTTP_400_BAD_REQUEST)
            
            cart_item.quantity = new_quantity
            cart_item.save()
            serializer = self.get_serializer(cart_item)
            return Response(serializer.data)
        
        # We must copy request.data because it might be immutable, and the serializer expects 'product' and 'cart'
        data = request.data.copy()
        if 'product' not in data and product_id:
            data['product'] = product_id
        data['cart'] = cart.id

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save(cart=cart, size=size, color=color)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        pass # Overridden by create method

    def perform_update(self, serializer):
        instance = self.get_object()
        new_quantity = int(self.request.data.get('quantity', instance.quantity))
        product = instance.product
        if product.stock < new_quantity:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f'Insufficient stock. Max available: {product.stock}')
        
        serializer.save()

class WishlistViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing the authenticated user's wishlist.
    
    Headers: Authorization: Bearer <token>
    Methods: GET (mine), POST (toggle_product)
    POST Body (toggle_product):
        product_id (int): Product ID to add/remove
    """
    serializer_class = WishlistSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def get_object(self):
        wishlist, created = Wishlist.objects.get_or_create(user=self.request.user)
        return wishlist

    @action(detail=False, methods=['get'])
    def mine(self, request):
        wishlist = self.get_object()
        serializer = self.get_serializer(wishlist)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def toggle_product(self, request):
        wishlist = self.get_object()
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)
        
        if product in wishlist.products.all():
            wishlist.products.remove(product)
            message = "Removed from wishlist"
        else:
            wishlist.products.add(product)
            message = "Added to wishlist"
            
        serializer = self.get_serializer(wishlist)
        return Response({
            'message': message,
            'wishlist': serializer.data
        })

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating orders.
    
    Headers: Authorization: Bearer <token>
    Methods: GET (List/Retrieve), POST (Create)
    POST Body:
        (Standard Order fields, defaults to cart contents if body empty)
    """
    serializer_class = OrderSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    ordering = ['-created_at']

    @transaction.atomic
    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        cart = Cart.objects.filter(user=self.request.user).first()
        if not cart or not cart.items.exists():
            raise ValidationError({'error': 'Cart is empty'})

        # =========================================================================
        # PHASE 1: PRE-CALCULATION & LOCKING (Before Order Creation)
        # =========================================================================
        
        cart_items = list(cart.items.select_related('product').all())
        virtual_order_items = [] 
        total_amount = 0
        
        locked_products = {}
        product_qtys = {}
        
        # Aggregate total quantities requested for each product
        for item in cart_items:
            pid = item.product.id
            product_qtys[pid] = product_qtys.get(pid, 0) + item.quantity

        # Lock and validate each unique product once
        for pid, total_qty in product_qtys.items():
            try:
                product = Product.objects.select_for_update().get(id=pid)
            except Product.DoesNotExist:
                raise ValidationError({'error': f'Product not found'})

            if product.stock < total_qty:
                raise ValidationError({'error': f'Insufficient stock for {product.name}. Available: {product.stock}, Requested: {total_qty}'})
            
            locked_products[pid] = product

        # Build virtual items and calculate total amount
        for item in cart_items:
            product = locked_products[item.product.id]
            target_size = item.size
            target_color = item.color if item.color else 'Standard'

            item_price = product.price 
            item_total = item_price * item.quantity
            total_amount += item_total
            
            virtual_order_items.append({
                'product': product,
                'price': item_price,
                'quantity': item.quantity,
                'size': target_size,
                'color': target_color
            })

        # =========================================================================
        # PHASE 2: EXECUTION (Order Creation & Stock Update)
        # =========================================================================
        
        # 1. Create Order (Now safe to do)
        order = serializer.save(user=self.request.user, total_amount=total_amount)

        # 2. Deduct Stock (once per product)
        for pid, product in locked_products.items():
            product.stock -= product_qtys[pid]
            product.save(update_fields=['stock'])

        # 3. Create Items
        for v_item in virtual_order_items:
            OrderItem.objects.create(
                order=order,
                product=v_item['product'],
                size=v_item['size'],
                color=v_item['color'],
                price=v_item['price'],
                quantity=v_item['quantity']
            )

        # 4. Cleanup
        cart.items.all().delete()



class SellerOrdersView(APIView):
    """
    Retrieve all orders containing the seller's products.
    
    Headers: Authorization: Bearer <token>
    Method: GET
    """
    permission_classes = [permissions.IsAuthenticated]


    def get(self, request):
        # Filter items where product's seller is the request user
        seller_items = OrderItem.objects.filter(
            product__seller=request.user
        ).order_by('-order__created_at')
        
        serializer = SellerOrderItemSerializer(seller_items, many=True)
        return Response(serializer.data)

class SellerCouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet for sellers to manage their own coupons.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from .models import Coupon
        # Ensure only sellers can access this? Or just return coupons owned by the user.
        return Coupon.objects.filter(seller=self.request.user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)
    
    def get_serializer_class(self):
        from .serializers import CouponSerializer
        return CouponSerializer

class CalculateShippingView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import ShippingRate
        
        country = request.data.get('country')
        region = request.data.get('region')
        
        if not country:
            return Response({'error': 'Country is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        rate_obj = None
        
        # 1. Check exact Region match (e.g., Egypt -> Cairo)
        if region:
            rate_obj = ShippingRate.objects.filter(country=country, region__icontains=region).first()
            
        # 2. Check Country base rate
        if not rate_obj:
            rate_obj = ShippingRate.objects.filter(country=country, region__isnull=True).first()
            
        # 3. Fallback to WORLD rate
        if not rate_obj:
            rate_obj = ShippingRate.objects.filter(country='WORLD').first()
            
        if rate_obj:
            from .serializers import ShippingRateSerializer
            serializer = ShippingRateSerializer(rate_obj)
            return Response(serializer.data)
            
        return Response({'rate': 25.00, 'currency': 'USD', 'id': None, 'exchange_rate_from_usd': 1.0})

class ShippingRateListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import ShippingRate
        from .serializers import ShippingRateSerializer
        from .utils import sync_exchange_rates
        
        # Sync exchange rates if needed (e.g. older than 24h)
        sync_exchange_rates()

        rates = ShippingRate.objects.all().order_by('country', 'region')
        serializer = ShippingRateSerializer(rates, many=True)
        return Response(serializer.data)

class ValidateCouponView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import Coupon
        from django.utils import timezone
        
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Coupon code is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            coupon = Coupon.objects.filter(code__iexact=code, active=True).order_by('-created_at').first()
            if not coupon:
                return Response({'error': 'Invalid or inactive coupon code'}, status=status.HTTP_400_BAD_REQUEST)
            
            now = timezone.now()
            if coupon.valid_from and now < coupon.valid_from:
                return Response({'error': 'Coupon is not yet valid'}, status=status.HTTP_400_BAD_REQUEST)
            if coupon.valid_until and now > coupon.valid_until:
                return Response({'error': 'Coupon has expired'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'valid': True,
                'code': coupon.code,
                'discount_percentage': coupon.discount_percentage,
                'seller_id': coupon.seller_id,
                'seller_email': coupon.seller.email if coupon.seller else None
            })
        except Exception as e:
            return Response({'error': 'An error occurred while validating the coupon'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
