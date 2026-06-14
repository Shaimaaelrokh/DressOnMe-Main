from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, F, Q
from django.db.models.functions import TruncMonth, TruncWeek, TruncYear
from django.utils import timezone
from datetime import timedelta

from users.models import User, Country
from orders.models import Order, OrderItem
from products.models import Product

class DashboardStatsAPIView(APIView):
    """
    Returns analytics and metrics for the Dashboard.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None

        import os
        dashboard_pin = request.headers.get('X-Dashboard-Pin') or request.META.get('HTTP_X_DASHBOARD_PIN')
        correct_pin = os.getenv('DASHBOARD_PIN', '7894561230+789456120$5').strip()
        
        if dashboard_pin: dashboard_pin = dashboard_pin.strip()
        
        if not dashboard_pin or dashboard_pin != correct_pin:
            return Response({"detail": f"Access Denied: Valid Dashboard PIN required. Got: {dashboard_pin}, Expected: {correct_pin}"}, status=403)
            
        effective_role = User.Role.ADMIN

        # Base filters depending on role
        if effective_role == User.Role.ADMIN:
            orders = Order.objects.all()
            products = Product.objects.all()
            order_items = OrderItem.objects.all()
            total_sellers = User.objects.filter(role=User.Role.SELLER).count()
            total_buyers = User.objects.filter(role=User.Role.CUSTOMER).count()
            total_users = total_sellers + total_buyers

        # 1. Total KPI
        total_orders = orders.count()
        if effective_role == User.Role.ADMIN:
            total_revenue = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        else:
            total_revenue = order_items.aggregate(total=Sum(F('price') * F('quantity')))['total'] or 0
        total_profit = 0  # To be calculated from actual commissions later

        # Time ranges
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        twelve_months_ago = now - timedelta(days=365)
        five_years_ago = now - timedelta(days=365 * 5)

        # 2. Monthly Data (Last 12 months)
        monthly_sales = orders.filter(created_at__gte=twelve_months_ago)\
            .annotate(month=TruncMonth('created_at'))\
            .values('month')\
            .annotate(
                revenue=Sum('total_amount') if effective_role == User.Role.ADMIN else Sum('items__price'),
                orders_count=Count('id')
            )\
            .order_by('month')

        monthly_data = [{"m": m["month"].strftime('%Y-%m'), "revenue": m["revenue"] or 0, "profit": 0, "gross": float(m["revenue"] or 0)} for m in monthly_sales]

        # 3. Weekly Data (Last 4-5 weeks)
        weekly_sales = orders.filter(created_at__gte=thirty_days_ago)\
            .annotate(week=TruncWeek('created_at'))\
            .values('week')\
            .annotate(
                revenue=Sum('total_amount') if effective_role == User.Role.ADMIN else Sum('items__price'),
            )\
            .order_by('week')

        weekly_data = [{"m": w["week"].strftime('%Y-W%W'), "revenue": w["revenue"] or 0, "profit": 0, "gross": float(w["revenue"] or 0)} for w in weekly_sales]

        # 4. Yearly Data (Last 5 years)
        yearly_sales = orders.filter(created_at__gte=five_years_ago)\
            .annotate(year=TruncYear('created_at'))\
            .values('year')\
            .annotate(
                revenue=Sum('total_amount') if effective_role == User.Role.ADMIN else Sum('items__price'),
            )\
            .order_by('year')

        yearly_data = [{"m": y["year"].strftime('%Y'), "revenue": y["revenue"] or 0, "profit": 0, "gross": float(y["revenue"] or 0)} for y in yearly_sales]

        # 5. Top Sellers
        if effective_role == User.Role.ADMIN:
            top_seller_users = User.objects.filter(role=User.Role.SELLER).annotate(
                total_orders=Count('orders'),
            ).order_by('-total_orders')[:5]
            
            top_sellers = []
            for s in top_seller_users:
                rev = OrderItem.objects.filter(product__seller=s).aggregate(total=Sum(F('price')*F('quantity')))['total'] or 0
                
                # Fetch country flag if exists
                c_flag = "🌍"
                if hasattr(s, 'profile') and s.profile.country:
                    country_obj = Country.objects.filter(name=s.profile.country).first()
                    if country_obj and country_obj.flag:
                        c_flag = country_obj.flag

                top_sellers.append({
                    "name": s.profile.brand_name if hasattr(s, 'profile') and s.profile.brand_name else (s.first_name or s.email),
                    "country": c_flag,
                    "revenue": rev,
                    "orders": s.total_orders,
                    "growth": 0.0,
                    "cat": "عام"
                })
        else:
            top_sellers = [] # Sellers don't see other sellers

        # 6. Country Data & Currency Meta
        all_countries = Country.objects.all()
        countries_data = []
        currency_meta = {}
        for c in all_countries:
            c_sellers = User.objects.filter(role=User.Role.SELLER, profile__country=c.name).count()
            c_buyers = User.objects.filter(role=User.Role.CUSTOMER, profile__country=c.name).count()
            
            if effective_role == User.Role.ADMIN:
                c_orders_qs = Order.objects.filter(user__profile__country=c.name)
            else:
                c_orders_qs = Order.objects.filter(items__product__seller=user, user__profile__country=c.name)

            c_revenue = c_orders_qs.aggregate(total=Sum('total_amount'))['total'] or 0

            # Calculate real return rate: REFUNDED / total orders
            c_total_orders = c_orders_qs.count()
            c_refunded = c_orders_qs.filter(payment_status=Order.PaymentStatus.REFUNDED).count()
            if c_total_orders > 0:
                c_return_rate = round((c_refunded / c_total_orders) * 100, 1)
            else:
                c_return_rate = 0.0
                
            countries_data.append({
                "name": c.name, "code": c.code, "currency": c.currency,
                "lat": c.lat, "lng": c.lng, "flag": c.flag,
                "sellers": c_sellers, "buyers": c_buyers,
                "revenue": float(c_revenue), "returns": c_return_rate, "growth": 0.0
            })
            currency_meta[c.currency] = {
                "name": c.name, "flag": c.flag, "base": c.base_rate, "stability": c.stability
            }

        # 7. Radar Data (Removed mocked engagement stats)
        radar_data = []

        # 8. Best Selling Products
        best_selling = products.annotate(
            total_sold=Sum('orderitem__quantity')
        ).filter(total_sold__gt=0).order_by('-total_sold')[:5]

        best_selling_data = [
            {
                "id": p.id, "name": p.name, "total_sold": p.total_sold,
                "revenue": p.price * p.total_sold,
                "category": p.category.name if p.category else "Uncategorized"
            }
            for p in best_selling
        ]

        # 9. Recent Orders
        recent_orders = orders.order_by('-created_at')[:5]
        recent_orders_data = [
            {
                "id": o.id, "customer": o.user.email, "total_amount": o.total_amount,
                "status": o.status, "date": o.created_at.strftime('%Y-%m-%d')
            }
            for o in recent_orders
        ]

        return Response({
            "kpis": {
                "total_users": total_users, "total_sellers": total_sellers,
                "total_buyers": total_buyers, "total_orders": total_orders,
                "total_revenue": total_revenue, "total_profit": total_profit,
                "total_countries": len(countries_data),
            },
            "monthly_data": monthly_data,
            "weekly_data": weekly_data,
            "yearly_data": yearly_data,
            "top_sellers": top_sellers,
            "countries": countries_data,
            "currency_meta": currency_meta,
            "radar_data": radar_data,
            "best_selling": best_selling_data,
            "recent_orders": recent_orders_data
        })
