from django.core.management.base import BaseCommand
from products.models import Category
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Seeds the database with a comprehensive clothing category hierarchy'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Commencing category seeding...'))

        categories_data = {
            "Men's Fashion": {
                "Tops": ["T-Shirts", "Shirts", "Hoodies & Sweatshirts", "Polos"],
                "Bottoms": ["Jeans", "Trousers", "Shorts", "Joggers"],
                "Footwear": ["Sneakers", "Formal Shoes", "Boots", "Sandals"],
                "Outerwear": ["Jackets", "Coats", "Blazers"]
            },
            "Women's Fashion": {
                "Tops": ["Blouses & Shirts", "T-Shirts", "Knitwear", "Crops"],
                "Bottoms": ["Skirts", "Jeans", "Trousers & Leggings", "Shorts"],
                "Dresses": ["Evening Dresses", "Casual Dresses", "Maxi Dresses", "Mini Dresses"],
                "Footwear": ["Heels", "Flats", "Sneakers", "Boots"],
                "Accessories": ["Bags", "Jewelry", "Scarves"]
            },
            "Unisex Fashion": {
                "T-Shirts": [],
                "Hoodies": [],
                "Accessories": ["Sunglasses", "Hats", "Belts"],
                "Footwear": ["Sneakers", "Sandals"]
            },
            "Kids": {
                "Boys": ["Tops", "Bottoms", "Outerwear"],
                "Girls": ["Dresses", "Tops", "Bottoms"],
                "Baby": ["Onesies", "Sleepwear"]
            },
            "Accessories": {
                "Watches": [],
                "Bags & Backpacks": [],
                "Sunglasses": [],
                "Hats & Caps": [],
                "Belts": []
            }
        }

        def seed_recursive(data, parent=None):
            for cat_name, subcats in data.items():
                obj, created = Category.objects.get_or_create(
                    name=cat_name,
                    parent=parent
                )
                
                if created:
                    self.stdout.write(f'Created category: {obj}')
                else:
                    self.stdout.write(f'Category already exists: {obj}')

                if isinstance(subcats, dict):
                    seed_recursive(subcats, parent=obj)
                elif isinstance(subcats, list):
                    for sub_name in subcats:
                        sub_obj, sub_created = Category.objects.get_or_create(
                            name=sub_name,
                            parent=obj
                        )
                        if sub_created:
                            self.stdout.write(f'  Created subcategory: {sub_obj}')

        seed_recursive(categories_data)
        self.stdout.write(self.style.SUCCESS('Category hierarchy established successfully.'))
