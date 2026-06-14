"""
Stripe payment views for handling payment intents and webhooks.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
import logging
import json
from django.db import transaction

from .models import Order, Cart, OrderItem
from .stripe_utils import construct_webhook_event, create_checkout_session

logger = logging.getLogger(__name__)


# class CreatePaymentIntentView(APIView):
#     """
#     Create a Stripe payment intent for checkout.
#     """
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         """
#         Create a payment intent for the user's cart.
        
#         Expected request data:
#         {
#             "order_id": 123  # Optional: if order already created
#         }
        
#         Returns:
#         {
#             "client_secret": "pi_xxx_secret_xxx",
#             "payment_intent_id": "pi_xxx"
#         }
#         """
#         try:
#             user = request.user
#             order_id = request.data.get('order_id')
            
#             if order_id:
#                 # Payment for existing order
#                 try:
#                     order = Order.objects.get(id=order_id, user=user)
#                     amount = int(order.total_amount * 100)  # Convert to cents
#                 except Order.DoesNotExist:
#                     return Response(
#                         {'error': 'Order not found'},
#                         status=status.HTTP_404_NOT_FOUND
#                     )
#             else:
#                 # Payment for cart items
#                 cart = Cart.objects.filter(user=user).first()
#                 if not cart or not cart.items.exists():
#                     return Response(
#                         {'error': 'Cart is empty'},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
                
#                 # Calculate total amount
#                 total_amount = sum(
#                     item.product.price * item.quantity 
#                     for item in cart.items.all()
#                 )
#                 amount = int(total_amount * 100)  # Convert to cents
                
#                 # Create order
#                 order = Order.objects.create(
#                     user=user,
#                     total_amount=total_amount,
#                     status=Order.Status.PENDING,
#                     payment_status='PENDING'
#                 )
                
#                 # Create order items from cart
#                 from .models import OrderItem
#                 for item in cart.items.all():
#                     OrderItem.objects.create(
#                         order=order,
#                         product=item.product,
#                         price=item.product.price,
#                         quantity=item.quantity
#                     )
            
#             # Create payment intent
#             metadata = {
#                 'order_id': str(order.id),
#                 'user_id': str(user.id),
#                 'user_email': user.email,
#             }
            
#             payment_intent = create_payment_intent(
#                 amount=amount,
#                 currency='usd',
#                 metadata=metadata
#             )
            
#             if not payment_intent:
#                 return Response(
#                     {'error': 'Failed to create payment intent'},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                 )
            
#             # Update order with payment intent ID
#             order.stripe_payment_intent_id = payment_intent.id
#             order.payment_status = 'PROCESSING'
#             order.save()
            
#             return Response({
#                 'client_secret': payment_intent.client_secret,
#                 'payment_intent_id': payment_intent.id,
#                 'order_id': order.id,
#                 'amount': amount,
#             })
            
#         except Exception as e:
#             logger.error(f"Error creating payment intent: {str(e)}")
#             return Response(
#                 {'error': 'An error occurred while processing your request'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


@method_decorator(csrf_exempt, name='dispatch')
class StripeCheckoutView(APIView):
    """
    Create a Stripe Checkout Session for the user's cart.
    Includes strict stock deduction.
    
    Headers: Authorization: Bearer <token>
    Method: POST
    Returns: { "checkout_url": str }
    """
    permission_classes = [IsAuthenticated]


    @transaction.atomic
    def post(self, request):
        try:
            from products.models import Product
            from rest_framework.exceptions import ValidationError as DRFValidationError
            # Map DRF Validation Error to response if needed, or catch generic
            
            user = request.user
            cart = Cart.objects.filter(user=user).select_related('user').first()
            
            if not cart or not cart.items.exists():
                return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
            
            shipping_rate_id = request.data.get('shipping_rate_id')
            coupon_code = request.data.get('coupon_code')
            shipping_details = request.data.get('shipping_details', {})
            
            from .models import ShippingRate, Coupon, ExchangeRate
            shipping_cost = 0.00
            order_currency = 'usd'
            exchange_rate_to_usd = 1.0000

            if shipping_rate_id:
                try:
                    sr = ShippingRate.objects.get(id=shipping_rate_id)
                    shipping_cost = float(sr.rate)
                    order_currency = sr.currency.lower()
                    try:
                        er = ExchangeRate.objects.get(currency=sr.currency)
                        exchange_rate_to_usd = float(er.rate_from_usd)
                    except ExchangeRate.DoesNotExist:
                        pass
                except ShippingRate.DoesNotExist:
                    pass

            coupon_obj = None
            discount_percentage = 0
            if coupon_code:
                coupon_obj = Coupon.objects.filter(code__iexact=coupon_code, active=True).order_by('-created_at').first()
                if coupon_obj:
                    discount_percentage = coupon_obj.discount_percentage

            # =========================================================================
            # PHASE 1: PRE-CALCULATION & LOCKING
            # =========================================================================
            
            cart_items = list(cart.items.select_related('product').all())
            virtual_order_items = [] 
            subtotal = 0
            
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
                    return Response({'error': f'Product not found'}, status=status.HTTP_400_BAD_REQUEST)

                if product.stock < total_qty:
                    return Response({'error': f'Insufficient stock for {product.name}. Available: {product.stock}, Requested: {total_qty}'}, status=status.HTTP_400_BAD_REQUEST)
                
                locked_products[pid] = product

            # Build virtual items
            for item in cart_items:
                product = locked_products[item.product.id]
                target_size = item.size
                target_color = item.color if item.color else 'Standard'

                item_price_usd = float(product.price)
                item_price_local = item_price_usd * exchange_rate_to_usd
                item_total = item_price_local * item.quantity
                subtotal += item_total
                
                virtual_order_items.append({
                    'product': product,
                    'price': item_price_local, # Save the converted price
                    'quantity': item.quantity,
                    'size': target_size,
                    'color': target_color
                })

            # =========================================================================
            # PHASE 2: EXECUTION
            # =========================================================================
            
            discount_amount = 0
            if coupon_obj:
                for v_item in virtual_order_items:
                    # Discount only applies to the seller who owns the coupon
                    if coupon_obj.seller is None or v_item['product'].seller_id == coupon_obj.seller_id:
                        item_total = v_item['price'] * v_item['quantity']
                        discount_amount += float(item_total) * (discount_percentage / 100.0)

            total_amount = float(subtotal) - discount_amount + shipping_cost

            # 1. Create Order
            order = Order.objects.create(
                user=user,
                total_amount=total_amount,
                shipping_cost=shipping_cost,
                discount_amount=discount_amount,
                coupon_used=coupon_obj,
                currency=order_currency.upper(),
                exchange_rate_applied=exchange_rate_to_usd,
                status=Order.Status.PENDING,
                payment_status='PENDING',
                shipping_country=shipping_details.get('country'),
                shipping_state=shipping_details.get('state'),
                shipping_city=shipping_details.get('city'),
                shipping_street=shipping_details.get('street'),
                shipping_zip=shipping_details.get('zip'),
                shipping_phone=shipping_details.get('phone')
            )
            
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
            
            # 3. Create Stripe Session (Must succeed or rollback)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            success_url = f"{frontend_url}/checkout-success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{frontend_url}/cart"
            
            # Additional check: are items actually saved?
            if not order.items.exists():
                raise Exception("Order has no items before creating Stripe session.")

            session = create_checkout_session(order, success_url, cancel_url, request=request)
            
            if not session:
                # Force rollback by raising exception
                raise Exception("Failed to create Stripe Session - Check Server Logs for Stripe Error")
            
            order.stripe_payment_intent_id = session.id
            order.save()
            
            # 4. Clear Cart
            cart.items.all().delete()
            
            return Response({'checkout_url': session.url})
            
        except Exception as e:
            logger.error(f"Error in StripeCheckoutView: {str(e)}")
            # Since we are in atomic block, any exception rolls back DB changes.
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events.
    
    Method: POST
    Headers: HTTP_STRIPE_SIGNATURE
    Body: Raw Stripe event payload
    """
    permission_classes = [AllowAny]


    def post(self, request):
        """
        Handle incoming Stripe webhook events.
        """
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        if not sig_header and settings.STRIPE_WEBHOOK_SECRET:
            logger.error("No Stripe signature header found but secret is configured")
            return HttpResponse(status=400)
        
        # Construct and verify webhook event
        event = construct_webhook_event(payload, sig_header)
        
        if not event:
            return HttpResponse(status=400)
        
        logger.info(f"Received Stripe webhook event: {event['type']}")
        
        # Handle different event types
        if event['type'] == 'checkout.session.completed':
            self._handle_checkout_session_completed(event['data']['object'])
        elif event['type'] == 'payment_intent.succeeded':
            self._handle_payment_success(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            self._handle_payment_failed(event['data']['object'])
        elif event['type'] == 'charge.refunded':
            self._handle_refund(event['data']['object'])
        
        return HttpResponse(status=200)
    
    def _handle_payment_success(self, payment_intent):
        """
        Handle successful payment.
        """
        try:
            order_id = payment_intent['metadata'].get('order_id')
            if not order_id:
                logger.error("No order_id in payment intent metadata")
                return
            
            order = Order.objects.get(id=order_id)
            order.status = Order.Status.PAID
            order.payment_status = Order.PaymentStatus.PAID
            order.save() # This will trigger emails via Order.save()
            
            # Clear user's cart
            cart = Cart.objects.filter(user=order.user).first()
            if cart:
                cart.items.all().delete()
            
            logger.info(f"Payment succeeded and emails triggered for order {order.id}")
            
            logger.info(f"Payment succeeded for order {order.id}")
            
        except Order.DoesNotExist:
            logger.error(f"Order not found for payment intent {payment_intent['id']}")
        except Exception as e:
            logger.error(f"Error handling payment success: {str(e)}")
    
    def _handle_payment_failed(self, payment_intent):
        """
        Handle failed payment.
        """
        try:
            order_id = payment_intent['metadata'].get('order_id')
            if not order_id:
                return
            
            order = Order.objects.get(id=order_id)
            order.payment_status = 'FAILED'
            order.save()
            
            logger.info(f"Payment failed for order {order.id}")
            
        except Order.DoesNotExist:
            logger.error(f"Order not found for payment intent {payment_intent['id']}")
        except Exception as e:
            logger.error(f"Error handling payment failure: {str(e)}")
    
    def _handle_refund(self, charge):
        """
        Handle refund.
        """
        try:
            payment_intent_id = charge.get('payment_intent')
            if not payment_intent_id:
                return
            
            order = Order.objects.filter(stripe_payment_intent_id=payment_intent_id).first()
            if order:
                order.payment_status = 'REFUNDED'
                order.status = Order.Status.CANCELLED
                order.save()
                
                logger.info(f"Refund processed for order {order.id}")
            
        except Exception as e:
            logger.error(f"Error handling refund: {str(e)}")

    def _handle_checkout_session_completed(self, session):
        """
        Handle successful checkout session.
        """
        try:
            order_id = session['metadata'].get('order_id')
            if not order_id:
                return
            
            order = Order.objects.get(id=order_id)
            order.status = Order.Status.PAID
            order.payment_status = Order.PaymentStatus.PAID
            order.save() # This will trigger emails via Order.save()
            
            # Clear cart
            cart = Cart.objects.filter(user=order.user).first()
            if cart:
                cart.items.all().delete()
                
            logger.info(f"Checkout session completed and emails triggered for order {order.id}")
                
        except Exception as e:
            logger.error(f"Error in _handle_checkout_session_completed: {e}")
