"""
Email utility functions for sending various types of emails.
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_otp_email(user, otp_code):
    """
    Send OTP verification email to user.
    
    Args:
        user: User object
        otp_code: 6-digit OTP code
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = 'Your OTP Verification Code - Clothes E-Commerce'
        
        # Render HTML email
        html_content = render_to_string('emails/otp_verification.html', {
            'user_name': user.first_name or user.email.split('@')[0],
            'otp_code': otp_code,
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        # Create plain text version
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"OTP email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send OTP email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, otp_code):
    """
    Send password reset email to user.
    """
    try:
        subject = 'Password Reset Code - Clothes E-Commerce'
        
        # Render HTML email
        html_content = render_to_string('emails/password_reset.html', {
            'user_name': user.first_name or user.email.split('@')[0],
            'otp_code': otp_code,
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        # Create plain text version
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Password reset email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False


def send_contact_auto_reply(contact_message):
    """
    Send auto-reply email to user who submitted contact form.
    
    Args:
        contact_message: ContactMessage object
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = f'Re: {contact_message.subject} - Clothes E-Commerce'
        
        # Render HTML email
        html_content = render_to_string('emails/contact_auto_reply.html', {
            'contact_name': contact_message.name,
            'subject': contact_message.subject,
            'message': contact_message.message,
            'submitted_at': contact_message.created_at.strftime('%B %d, %Y at %I:%M %p'),
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        # Create plain text version
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[contact_message.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Contact auto-reply sent successfully to {contact_message.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send contact auto-reply to {contact_message.email}: {str(e)}")
        return False


def send_contact_notification(contact_message):
    """
    Send notification email to admin about new contact message.
    
    Args:
        contact_message: ContactMessage object
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = f'New Contact Message: {contact_message.subject}'
        
        # Render HTML email
        html_content = render_to_string('emails/contact_notification.html', {
            'contact_name': contact_message.name,
            'contact_email': contact_message.email,
            'subject': contact_message.subject,
            'message': contact_message.message,
            'submitted_at': contact_message.created_at.strftime('%B %d, %Y at %I:%M %p'),
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        # Create plain text version
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.ADMIN_EMAIL]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Contact notification sent successfully to admin")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send contact notification to admin: {str(e)}")
        return False


def send_payment_confirmation_email(order):
    """
    Send payment confirmation email to customer.
    
    Args:
        order: Order object
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = f'Payment Confirmation - Order #{order.id} - Clothes E-Commerce'
        
        # Prepare order items data
        order_items = []
        for item in order.items.all():
            order_items.append({
                'product_name': item.product.name if item.product else 'Product',
                'size': getattr(item, 'size', None),
                'color': getattr(item, 'color', None),
                'quantity': item.quantity,
                'price': f"{item.price:.2f}",
            })
        
        # Render HTML email
        html_content = render_to_string('emails/payment_confirmation.html', {
            'customer_name': order.user.first_name or order.user.email.split('@')[0],
            'order_id': order.id,
            'order_items': order_items,
            'total_amount': f"{order.total_amount:.2f}",
            'transaction_id': order.stripe_payment_intent_id,
            'payment_date': order.updated_at.strftime('%B %d, %Y at %I:%M %p'),
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        # Create plain text version
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[order.user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Payment confirmation email sent successfully to {order.user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send payment confirmation email: {str(e)}")
        return False


def send_order_notification_to_sellers(order):
    """
    Notify each seller about the items purchased from them in this order.
    """
    try:
        # Group items by seller
        seller_items = {}
        for item in order.items.all():
            if item.product and item.product.seller:
                seller_email = item.product.seller.email
                if seller_email not in seller_items:
                    seller_items[seller_email] = {
                        'seller': item.product.seller,
                        'items': [],
                        'revenue': 0
                    }
                
                subtotal = item.price * item.quantity
                seller_items[seller_email]['items'].append({
                    'product_name': item.product.name,
                    'size': item.size,
                    'color': item.color,
                    'quantity': item.quantity,
                    'subtotal': f"{subtotal:.2f}"
                })
                seller_items[seller_email]['revenue'] += subtotal

        # Send email to each seller
        for email_addr, data in seller_items.items():
            subject = f'You have a new sale! - Order #{order.id}'
            
            html_content = render_to_string('emails/order_notification_seller.html', {
                'seller_name': data['seller'].first_name or email_addr.split('@')[0],
                'order_id': order.id,
                'items': data['items'],
                'seller_revenue': f"{data['revenue']:.2f}",
                'admin_email': settings.ADMIN_EMAIL,
            })
            
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email_addr]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Seller notification sent to {email_addr} for Order #{order.id}")
            
        return True
    except Exception as e:
        logger.error(f"Error sending seller notifications: {str(e)}")
        return False


def send_order_status_update_emails(order):
    """
    Notify both the customer and all involved sellers about an order status change.
    """
    try:
        # 1. Notify Customer
        customer_subject = f'Order Update - Order #{order.id} is now {order.get_status_display()}'
        customer_html = render_to_string('emails/order_status_update.html', {
            'name': order.user.first_name or order.user.email.split('@')[0],
            'order_id': order.id,
            'status': order.get_status_display(),
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        customer_email = EmailMultiAlternatives(
            subject=customer_subject,
            body=strip_tags(customer_html),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[order.user.email]
        )
        customer_email.attach_alternative(customer_html, "text/html")
        customer_email.send()
        
        # 2. Notify involved Sellers (optional but recommended)
        sellers = set()
        for item in order.items.all():
            if item.product and item.product.seller:
                sellers.add(item.product.seller.email)
        
        for seller_email in sellers:
            seller_subject = f'Order Status Updated - Order #{order.id}'
            seller_html = render_to_string('emails/order_status_update.html', {
                'name': 'Seller',
                'order_id': order.id,
                'status': order.get_status_display(),
                'admin_email': settings.ADMIN_EMAIL,
            })
            
            s_email = EmailMultiAlternatives(
                subject=seller_subject,
                body=strip_tags(seller_html),
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[seller_email]
            )
            s_email.attach_alternative(seller_html, "text/html")
            s_email.send()

        return True
    except Exception as e:
        logger.error(f"Error sending status update emails: {str(e)}")
        return False


def send_order_received_email(order):
    """
    Notify customer that their order has been received.
    """
    try:
        subject = f'Order Received - Order #{order.id} - Clothes E-Commerce'
        html_content = render_to_string('emails/order_received.html', {
            'customer_name': order.user.first_name or order.user.email.split('@')[0],
            'order_id': order.id,
            'order_status': order.status,
            'admin_email': settings.ADMIN_EMAIL,
        })
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=strip_tags(html_content),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[order.user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Order received email sent for order {order.id}")
        return True
    except Exception as e:
        logger.error(f"Error sending order received email: {str(e)}")
        return False
