import urllib.request
import json
from rest_framework_simplejwt.tokens import RefreshToken
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_project.settings')
django.setup()
from users.models import User

user = User.objects.first()
refresh = RefreshToken.for_user(user)
token = str(refresh.access_token)

req = urllib.request.Request('http://127.0.0.1:8000/api/analytics/dashboard/', headers={
    'X-Dashboard-Pin': '7894561230+789456120$5',
    'Authorization': f'Bearer {token}'
})
try:
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
    data = json.loads(response.read().decode('utf-8'))
    print("KPIS:", data.get('kpis'))
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
