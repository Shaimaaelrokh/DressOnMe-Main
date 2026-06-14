import os
import django
import sys
import json

# Setup Django environment
sys.path.append(r'c:\Users\dell\Desktop\DRESSONME\back_gp')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_project.settings')
django.setup()

from products.models import Product
from products.serializers import ProductSerializer

# Get a product that has empty image_categories
# e.g., the oldest ones
products = Product.objects.all().order_by('id')[:5]

serializer = ProductSerializer(products, many=True)
print(json.dumps(serializer.data, indent=2))
