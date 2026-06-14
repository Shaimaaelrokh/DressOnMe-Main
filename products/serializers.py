from rest_framework import serializers
from .models import Category, Product, Review
from users.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    parent_name = serializers.ReadOnlyField(source='parent.name')

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'color', 'parent', 'parent_name', 'children')

    def get_children(self, obj):
        # Recursive serialization for nested categories
        return CategorySerializer(obj.children.all(), many=True).data

class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ('id', 'product', 'user', 'user_name', 'user_email', 'user_avatar', 'rating', 'comment', 'image', 'is_like', 'is_dislike', 'parent', 'replies', 'created_at')
        read_only_fields = ('user', 'product', 'created_at')

    def get_user_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

    def get_user_avatar(self, obj):
        request = self.context.get('request')
        if hasattr(obj.user, 'profile') and obj.user.profile.image:
            return request.build_absolute_uri(obj.user.profile.image.url) if request else obj.user.profile.image.url
        return None

    def get_replies(self, obj):
        if obj.replies.exists():
            return ReviewSerializer(obj.replies.all(), many=True, context=self.context).data
        return []




class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    seller_id = serializers.ReadOnlyField(source='seller.id')
    seller_email = serializers.ReadOnlyField(source='seller.email')
    seller_brand_name = serializers.ReadOnlyField(source='seller.profile.brand_name')
    seller_avatar = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    additional_images = serializers.SerializerMethodField()
    fabric_focus = serializers.SerializerMethodField()
    total_stock = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField() # Calculated from reviews
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    in_cart_count = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('seller', 'total_stock', 'is_in_stock', 'average_rating', 'likes_count', 'is_liked', 'dislikes_count', 'is_disliked', 'in_cart_count', 'sales_count')

    def get_category_name(self, obj):
        first_cat = obj.categories.first()
        return first_cat.name if first_cat else None

    def get_likes_count(self, obj):
        return obj.reviews.filter(is_like=True).count()

    def get_seller_avatar(self, obj):
        request = self.context.get('request')
        if hasattr(obj.seller, 'profile') and obj.seller.profile.image:
            return request.build_absolute_uri(obj.seller.profile.image.url) if request else obj.seller.profile.image.url
        return None

    def get_additional_images(self, obj):
        request = self.context.get('request')
        if not request or not obj.additional_images:
            return obj.additional_images
        
        result = []
        for img_dict in obj.additional_images:
            img_url = img_dict.get('image')
            if img_url and isinstance(img_url, str) and img_url.startswith('/'):
                result.append({'image': request.build_absolute_uri(img_url)})
            else:
                result.append(img_dict)
        return result

    def get_fabric_focus(self, obj):
        request = self.context.get('request')
        if not request or not obj.fabric_focus:
            return obj.fabric_focus
        return [request.build_absolute_uri(url) if isinstance(url, str) and url.startswith('/') else url for url in obj.fabric_focus]

    def get_reviews(self, obj):
        top_level = obj.reviews.filter(parent__isnull=True)
        return ReviewSerializer(top_level, many=True, context=self.context).data

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.reviews.filter(user=request.user, is_like=True).exists()
        return False

    def get_dislikes_count(self, obj):
        return obj.reviews.filter(is_dislike=True).count()

    def get_is_disliked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.reviews.filter(user=request.user, is_dislike=True).exists()
        return False


    def get_in_cart_count(self, obj):
        from orders.models import CartItem
        from django.db.models import Sum
        return CartItem.objects.filter(product=obj).aggregate(total=Sum('quantity'))['total'] or 0

    def get_sales_count(self, obj):
        from orders.models import OrderItem, Order
        from django.db.models import Sum
        return OrderItem.objects.filter(
            product=obj,
            order__status__in=[Order.Status.PAID, Order.Status.SHIPPED, Order.Status.DELIVERED]
        ).aggregate(total=Sum('quantity'))['total'] or 0

    def validate(self, data):
        # Removed variant validation since variants are decoupled.
        # Removed creation check to allow Profile.jsx to create products without variants for now
        
        return data

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)
