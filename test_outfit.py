import os
import sys
import django

# Setup Django
sys.path.append(r"c:\Users\dell\Desktop\DRESSONME\back_gp")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ecommerce_project.settings")
django.setup()

from products.outfit_builder import build_outfit

try:
    print("Running build_outfit...")
    res = build_outfit(
        gender="female",
        occasion="casual outing",
        user_id=None,
        budget=10000,
        is_hijabi=True
    )
    print("Success! Generated", len(res), "outfits.")
except Exception as e:
    import traceback
    traceback.print_exc()
