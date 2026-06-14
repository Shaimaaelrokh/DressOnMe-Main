import requests
from django.conf import settings
from .models import ExchangeRate
from datetime import timedelta
from django.utils import timezone

def sync_exchange_rates():
    """
    Fetches the latest exchange rates from the API and updates the database.
    Only updates rates if they are older than 24 hours to avoid hitting API limits.
    """
    if not settings.EXCHANGE_API_KEY:
        return False

    # Check if any rate needs updating (older than 24 hours)
    cutoff_time = timezone.now() - timedelta(hours=24)
    needs_update = ExchangeRate.objects.filter(updated_at__lt=cutoff_time).exists()
    
    # If no rates exist yet, we should also update
    if not ExchangeRate.objects.exists():
        needs_update = True

    if not needs_update:
        return True # Already up-to-date

    url = f"https://v6.exchangerate-api.com/v6/{settings.EXCHANGE_API_KEY}/latest/USD"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('result') == 'success':
                rates = data.get('conversion_rates', {})
                # Update existing rates in DB
                for exchange_rate in ExchangeRate.objects.all():
                    currency_code = exchange_rate.currency.upper()
                    if currency_code in rates:
                        exchange_rate.rate_from_usd = rates[currency_code]
                        exchange_rate.save()
                return True
    except Exception as e:
        print(f"Failed to sync exchange rates: {e}")
    
    return False
