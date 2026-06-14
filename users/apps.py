from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        try:
            from .models import Country
            INITIAL_MAP = [
                {"name": "Egypt", "currency": "EGP", "code": "EG", "flag": "🇪🇬", "lat": 26.0, "lng": 30.0, "stability": 42, "base_rate": 48.50},
                {"name": "Saudi Arabia", "currency": "SAR", "code": "SA", "flag": "🇸🇦", "lat": 24.0, "lng": 45.0, "stability": 92, "base_rate": 3.75},
                {"name": "United Arab Emirates", "currency": "AED", "code": "AE", "flag": "🇦🇪", "lat": 24.0, "lng": 54.0, "stability": 91, "base_rate": 3.67},
                {"name": "United States", "currency": "USD", "code": "US", "flag": "🇺🇸", "lat": 38.0, "lng": -97.0, "stability": 95, "base_rate": 1.0},
                {"name": "United Kingdom", "currency": "GBP", "code": "GB", "flag": "🇬🇧", "lat": 51.0, "lng": -1.0, "stability": 85, "base_rate": 0.79},
                {"name": "Europe", "currency": "EUR", "code": "DE", "flag": "🇪🇺", "lat": 51.0, "lng": 10.0, "stability": 88, "base_rate": 0.92},
            ]
            if not Country.objects.exists():
                for c in INITIAL_MAP:
                    Country.objects.create(**c)
        except Exception:
            pass
