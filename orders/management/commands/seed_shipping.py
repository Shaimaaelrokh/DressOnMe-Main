from django.core.management.base import BaseCommand
from orders.models import ShippingRate

class Command(BaseCommand):
    help = 'Seed the database with realistic shipping rates for regions and countries'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Shipping Rates...")
        
        rates = [
            # EGYPT (Base: $3 = ~150 EGP)
            {'country': 'Egypt', 'region': None, 'rate': 150.00, 'currency': 'EGP'},
            {'country': 'Egypt', 'region': 'Cairo', 'rate': 50.00, 'currency': 'EGP'},
            {'country': 'Egypt', 'region': 'Giza', 'rate': 60.00, 'currency': 'EGP'},
            {'country': 'Egypt', 'region': 'Alexandria', 'rate': 70.00, 'currency': 'EGP'},
            
            # GULF
            {'country': 'Saudi Arabia', 'region': None, 'rate': 30.00, 'currency': 'SAR'},
            {'country': 'United Arab Emirates', 'region': None, 'rate': 30.00, 'currency': 'AED'},
            {'country': 'Qatar', 'region': None, 'rate': 30.00, 'currency': 'QAR'},
            {'country': 'Kuwait', 'region': None, 'rate': 3.00, 'currency': 'KWD'},
            {'country': 'Bahrain', 'region': None, 'rate': 3.00, 'currency': 'BHD'},
            {'country': 'Oman', 'region': None, 'rate': 3.00, 'currency': 'OMR'},

            # AMERICAS
            {'country': 'United States', 'region': None, 'rate': 20.00, 'currency': 'USD'},
            {'country': 'Canada', 'region': None, 'rate': 25.00, 'currency': 'CAD'},

            # EUROPE
            {'country': 'United Kingdom', 'region': None, 'rate': 15.00, 'currency': 'GBP'},
            {'country': 'France', 'region': None, 'rate': 15.00, 'currency': 'EUR'},
            {'country': 'Germany', 'region': None, 'rate': 15.00, 'currency': 'EUR'},
            {'country': 'Italy', 'region': None, 'rate': 15.00, 'currency': 'EUR'},
            {'country': 'Spain', 'region': None, 'rate': 15.00, 'currency': 'EUR'},

            # REST OF WORLD DEFAULT
            {'country': 'WORLD', 'region': None, 'rate': 25.00, 'currency': 'USD'},
        ]

        count = 0
        for data in rates:
            obj, created = ShippingRate.objects.update_or_create(
                country=data['country'],
                region=data.get('region'),
                defaults={'rate': data['rate'], 'currency': data.get('currency', 'USD')}
            )
            if created:
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} new shipping rates!"))
