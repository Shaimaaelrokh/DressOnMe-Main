# Orders App

This app manages the shopping cart, wishlists, order processing, and Stripe payment integration.

## 🌟 Features
- **Cart Management**: Real-time cart synchronization with size preservation and stock-limit enforcement.
- **Wishlist**: Simple toggle mechanism for products in/out of a personal wishlist.
- **Order Tracking**: Detailed order history including item snapshots (size, price at purchase, seller info).
- **Stripe Integration**: Secure payment processing using Stripe Checkout Sessions.
- **Webhooks**: Automatic order status updates (`PENDING` -> `PAID`) via Stripe webhook fulfillment.
- **Stock Guard**: Real-time stock verification prevents ordering more items than available in a specific size/color.

## 🛠️ Key Components

### Models
- `Cart`: Linked to a user, manages the active shopping session.
- `CartItem`: Items in the cart including size, color, and quantity.
- `Wishlist`: Personal collection of saved products.
- `Order`: Represents a purchase lifecycle (`PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- `OrderItem`: Snapshot of product details at the time of purchase.

### Views
- `CartViewSet`: API for adding/removing items and managing quantities.
- `OrderViewSet`: History and detail views for user orders.
- `StripeCheckoutView`: Initiates the secure session creation with Stripe.
- `StripeWebhookView`: Handle's Stripe's "Checkout Completed" events.

## 💸 Payment Flow
1. User adds items to **Cart**.
2. User clicks **Checkout**, backend creates a **Stripe Session**.
3. User is redirected to **Stripe's Secure Portal**.
4. Upon payment, Stripe sends a **Webhook** to the backend.
5. Backend verifies the signature, marks the **Order as Paid**, and **Clears the Cart**.

> [!WARNING]
> Stock is temporarily deducted when the order is created and restored automatically if the session expires or is cancelled.
