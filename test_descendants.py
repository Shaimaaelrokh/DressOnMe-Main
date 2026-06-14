import os
import sys
import django

sys.path.append(r'c:\Users\dell\Desktop\DRESSONME\back_gp')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_project.settings')
django.setup()

from products.models import Category, Product

category_id = 22
descendant_ids = {int(category_id)}
to_visit = [int(category_id)]
while to_visit:
    curr = to_visit.pop(0)
    children = Category.objects.filter(parent_id=curr).values_list('id', flat=True)
    for cid in children:
        if cid not in descendant_ids:
            descendant_ids.add(cid)
            to_visit.append(cid)

print("Descendant IDs for 22:", descendant_ids)

# Let's also check for Tops under Men's Fashion
category_id = 2
descendant_ids_2 = {int(category_id)}
to_visit = [int(category_id)]
while to_visit:
    curr = to_visit.pop(0)
    children = Category.objects.filter(parent_id=curr).values_list('id', flat=True)
    for cid in children:
        if cid not in descendant_ids_2:
            descendant_ids_2.add(cid)
            to_visit.append(cid)

print("Descendant IDs for 2:", descendant_ids_2)
