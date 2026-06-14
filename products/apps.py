from django.apps import AppConfig

class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'

    def ready(self):
        try:
            from .models import Category
            groups_config = {
                "👗 Women's Clothing": {
                    "color": "#e91e8c",
                    "items": ["Casual Blouse","Cotton Blouses","Chiffon Blouses","Lace Blouses","Soiree Blouse",
                              "Classic Pants (Women)","Formal Pants (Women)","Soiree Pants","Skinny Jeans (Women)",
                              "Wide Leg Jeans","Casual T-Shirt (Women)","Classic T-Shirt (Women)","Formal Shirt (Women)",
                              "Semi-Formal Blazer","Formal Blazer","Classic Skirt","Mini Skirt","Formal Skirt","Basic Tops (Women)"]
                },
                "👠 Women's Shoes": {
                    "color": "#9c27b0",
                    "items": ["Sneakers (Women)","Heels","Sandals (Women)","Slippers"]
                },
                "💍 Women's Accessories": {
                    "color": "#f59e0b",
                    "items": ["Hijab Scarf","Socks","Earrings","Necklace","Rings","Bracelets","Sunglasses (Women)"]
                },
                "👔 Men's Clothing": {
                    "color": "#1976d2",
                    "items": ["Classic Pants (Men)","Men's Jeans","Sports Pants (Men)","Casual T-Shirt (Men)",
                              "Classic T-Shirt (Men)","Formal Pants (Men)","Formal Shirt (Men)","Basic Tops (Men)"]
                },
                "👟 Men's Shoes": {
                    "color": "#0288d1",
                    "items": ["Sneakers (Men)","Classic Shoes (Men)","Sandals (Men)"]
                },
                "🕶️ Men's Accessories": {
                    "color": "#455a64",
                    "items": ["Sunglasses (Men)"]
                },
                "💄 Beauty & Cosmetics": {
                    "color": "#e91e63",
                    "items": ["Skincare","Makeup","Lips (أحمر الشفاه)","Lens (عدسات العيون)","Shadow (ظل العيون)","Blush (أحمر الخدود)","Beauty & Cosmetics","Perfumes & Fragrances"]
                }
            }
            
            makeup_subs = ["Lips (أحمر الشفاه)", "Lens (عدسات العيون)", "Shadow (ظل العيون)", "Blush (أحمر الخدود)"]
            
            for group, config in groups_config.items():
                parent, created = Category.objects.get_or_create(name=group, parent=None)
                if parent.color != config['color']:
                    parent.color = config['color']
                    parent.save()
                    
                for item in config['items']:
                    if item in makeup_subs:
                        # Ensure Makeup exists and set it as parent
                        makeup_parent, _ = Category.objects.get_or_create(name="Makeup", parent=parent)
                        Category.objects.get_or_create(name=item, parent=makeup_parent)
                    else:
                        Category.objects.get_or_create(name=item, parent=parent)
        except Exception:
            # Silently pass if DB is not ready during initial migrations
            pass
