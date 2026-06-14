"""
Stripe payment utilities for handling payment intents, webhooks, and transactions.
"""
import stripe
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe with secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


# def create_payment_intent(amount, currency='usd', metadata=None):
#     """
#     Create a Stripe payment intent.
    
#     Args:
#         amount (int): Amount in cents (e.g., 2000 for $20.00)
#         currency (str): Currency code (default: 'usd')
#         metadata (dict): Optional metadata to attach to the payment intent
    
#     Returns:
#         dict: Payment intent object or None if error
#     """
#     try:
#         payment_intent = stripe.PaymentIntent.create(
#             amount=amount,
#             currency=currency,
#             metadata=metadata or {},
#             automatic_payment_methods={
#                 'enabled': True,
#             },
#         )
#         logger.info(f"Payment intent created: {payment_intent.id}")
#         return payment_intent
#     except stripe.error.StripeError as e:
#         logger.error(f"Stripe error creating payment intent: {str(e)}")
#         return None
#     except Exception as e:
#         logger.error(f"Unexpected error creating payment intent: {str(e)}")
#         return None


def retrieve_payment_intent(payment_intent_id):
    """
    Retrieve a payment intent by ID.
    
    Args:
        payment_intent_id (str): The payment intent ID
    
    Returns:
        dict: Payment intent object or None if error
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return payment_intent
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving payment intent: {str(e)}")
        return None


def confirm_payment_intent(payment_intent_id):
    """
    Confirm a payment intent.
    
    Args:
        payment_intent_id (str): The payment intent ID
    
    Returns:
        dict: Payment intent object or None if error
    """
    try:
        payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)
        logger.info(f"Payment intent confirmed: {payment_intent_id}")
        return payment_intent
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error confirming payment intent: {str(e)}")
        return None


def create_refund(payment_intent_id, amount=None, reason=None):
    """
    Create a refund for a payment intent.
    
    Args:
        payment_intent_id (str): The payment intent ID
        amount (int): Amount to refund in cents (None for full refund)
        reason (str): Reason for refund ('duplicate', 'fraudulent', 'requested_by_customer')
    
    Returns:
        dict: Refund object or None if error
    """
    try:
        refund_params = {'payment_intent': payment_intent_id}
        if amount:
            refund_params['amount'] = amount
        if reason:
            refund_params['reason'] = reason
            
        refund = stripe.Refund.create(**refund_params)
        logger.info(f"Refund created for payment intent: {payment_intent_id}")
        return refund
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating refund: {str(e)}")
        return None


def construct_webhook_event(payload, sig_header):
    """
    Construct and verify a Stripe webhook event.
    
    Args:
        payload (bytes): The raw request payload
        sig_header (str): The Stripe-Signature header
    
    Returns:
        dict: Event object or None if verification fails
    """
    try:
        if not settings.STRIPE_WEBHOOK_SECRET:
            # Fallback for local development if no webhook secret is set
            import json
            return json.loads(payload)
            
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid webhook payload: {str(e)}")
        return None
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid webhook signature: {str(e)}")
        return None


def get_payment_status(payment_intent_id):
    """
    Get the status of a payment intent.
    
    Args:
        payment_intent_id (str): The payment intent ID
    
    Returns:
        str: Payment status or None if error
    """
    payment_intent = retrieve_payment_intent(payment_intent_id)
    if payment_intent:
        return payment_intent.status
    return None
def create_checkout_session(order, success_url, cancel_url, request=None):
    """
    Create a Stripe Checkout Session for an order.
    """
    # try-except block removed to allow exception propagation to the view
    coupon_used = getattr(order, 'coupon_used', None)

    line_items = []
    for item in order.items.all():
        product_data = {
            'name': item.product.name,
        }
        
        # Add image if available and we have request to build absolute URI
        if item.product.image and request:
            try:
                image_url = request.build_absolute_uri(item.product.image.url)
                # Stripe might reject local URLs, but we send it anyway just in case it works or for prod.
                product_data['images'] = [image_url]
            except Exception as e:
                logger.warning(f"Could not build image URL for product {item.product.id}: {e}")

        item_discount_multiplier = 1.0
        if coupon_used:
            if coupon_used.seller is None or item.product.seller_id == coupon_used.seller_id:
                item_discount_multiplier = 1.0 - (coupon_used.discount_percentage / 100.0)

        line_items.append({
            'price_data': {
                'currency': getattr(order, 'currency', 'usd').lower(),
                'product_data': product_data,
                'unit_amount': int(float(item.price) * item_discount_multiplier * 100),
            },
            'quantity': item.quantity,
        })
        
    if getattr(order, 'shipping_cost', 0) > 0:
        line_items.append({
            'price_data': {
                'currency': getattr(order, 'currency', 'usd').lower(),
                'product_data': {
                    'name': 'Shipping',
                },
                'unit_amount': int(float(order.shipping_cost) * 100),
            },
            'quantity': 1,
        })

    checkout_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=line_items,
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            'order_id': order.id,
            'user_id': order.user.id
        },
        customer_email=order.user.email,
    )
    return checkout_session
