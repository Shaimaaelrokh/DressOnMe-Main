from rest_framework import viewsets
from .models import Category, Product
from django.db.models import Sum, Count
from .serializers import CategorySerializer, ProductSerializer
from django.core.files.storage import default_storage

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing product categories.
    
    Method: GET (List all categories)
    Returns: Hierarchical list of categories with 'children' field.
    """
    queryset = Category.objects.filter(parent__isnull=True)

    serializer_class = CategorySerializer
    pagination_class = None

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAdminUser
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Category, Product

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing products.
    
    Methods: GET (List/Retrieve), POST (Create), PUT/PATCH (Update), DELETE (Destroy)
    Headers: Authorization: Bearer <token> (for POST, PUT, PATCH, DELETE)
    
    POST/PUT Body (Multipart):
        name (str), description (str), price (decimal), category (int), gender (str),
        image (file), secondary_image_1..4 (file),
        variants (list of dicts: {"size": str, "color": str, "stock": int})
    """
    # queryset = Product.objects.all().order_by('-created_at') # Superseded by get_queryset
    serializer_class = ProductSerializer

    filterset_fields = ['categories__parent', 'categories__slug', 'gender', 'price', 'seller']

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
        if self.action in ['list', 'retrieve', 'visual_search']:
            permission_classes = [AllowAny]
        else:
            # Let default handle others, or use IsAuthenticatedOrReadOnly
            # But let's check what default was. We can just return super().get_permissions()
            # but wait, let's just make it AllowAny for visual_search
            if self.action == 'visual_search':
                permission_classes = [AllowAny]
            else:
                return super().get_permissions()
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all().order_by('-created_at')

        # Filter by category and all its subcategories recursively
        category_id = self.request.query_params.get('category')
        if category_id:
            try:
                descendant_ids = {int(category_id)}
                to_visit = [int(category_id)]
                while to_visit:
                    curr = to_visit.pop(0)
                    children = Category.objects.filter(parent_id=curr).values_list('id', flat=True)
                    for cid in children:
                        if cid not in descendant_ids:
                            descendant_ids.add(cid)
                            to_visit.append(cid)
                queryset = queryset.filter(categories__id__in=descendant_ids).distinct()
            except ValueError:
                pass

        # Handle smart colloquial search
        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            from django.db.models import Q
            try:
                from chatbot.product_search import AR_TO_EN_COLORS
            except ImportError:
                AR_TO_EN_COLORS = {
                    'حمرا': 'red', 'حمرة': 'red', 'حمره': 'red', 'احمر': 'red', 'أحمر': 'red',
                    'زرقا': 'blue', 'ازرق': 'blue', 'أزرق': 'blue',
                    'خضرا': 'green', 'اخضر': 'green', 'أخضر': 'green',
                    'صفرا': 'yellow', 'اصفر': 'yellow', 'أصفر': 'yellow',
                    'سودا': 'black', 'سوده': 'black', 'اسود': 'black', 'أسود': 'black',
                    'بيضا': 'white', 'بيضه': 'white', 'ابيض': 'white', 'أبيض': 'white',
                    'بمبى': 'pink', 'بمبي': 'pink', 'بينك': 'pink', 'وردي': 'pink',
                    'بنفسجي': 'purple', 'موف': 'purple',
                    'بني': 'brown',
                    'رمادي': 'gray', 'رصاصي': 'gray', 'رصاصى': 'gray',
                    'برتقالي': 'orange', 'اورانج': 'orange', 'أورانج': 'orange'
                }
            
            def get_synonyms(word):
                syns = {word}
                en_word = AR_TO_EN_COLORS.get(word, word)
                syns.add(en_word)
                for ar, en in AR_TO_EN_COLORS.items():
                    if en == en_word:
                        syns.add(ar)
                
                # Granular synonym mappings
                mappings = {
                    'tshirt': ['t-shirt', 'tshirt', 'تيشيرت', 'تيشرت', 'بولو', 'polo', 'polos'],
                    'blouse': ['blouse', 'blouses', 'بلوزة', 'بلوزه', 'بلوزات', 'top', 'tops', 'توب'],
                    'shirt': ['shirt', 'shirts', 'قميص', 'قمصان', 'blouses&shirts'],
                    'knitwear': ['knitwear', 'تريكو'],
                    'crop': ['crop', 'كروب'],
                    'pants': ['pants', 'trousers', 'بنطلون', 'بناطيل', 'بنطال', 'joggers'],
                    'jeans': ['jeans', 'جينز'],
                    'skirt': ['skirt', 'skirts', 'جيب', 'جيبة', 'جيبات'],
                    'shorts': ['shorts', 'short', 'شورت', 'شورتات'],
                    'sneakers': ['sneaker', 'sneakers', 'كوتشي', 'كوتشيات'],
                    'heels': ['heels', 'heel', 'هيلز', 'هيلزات', 'كعب'],
                    'sandals': ['sandals', 'sandal', 'صندل', 'صنادل'],
                    'boots': ['boots', 'boot', 'بوت', 'بوات'],
                    'slippers': ['slippers', 'slipper', 'شبشب', 'شباشب', 'سليبر', 'فلات', 'flats', 'فلاتس'],
                    'shoes_general': ['shoe', 'shoes', 'footwear', 'حذاء', 'احذية', 'أحذية', 'جزمة', 'جزمه', 'جزم', 'شوز', 'شوزات'],
                    'bag': ['bag', 'bags', 'شنطة', 'شنط', 'حقيبة', 'حقائب', 'شنطه'],
                    'backpack': ['backpack', 'باكباك'],
                    'purse': ['purse', 'handbag', 'بورتفيه'],
                    'jewelry': ['jewelry', 'مجوهرات'],
                    'necklace': ['necklace', 'سلسلة', 'عقد', 'سلاسل'],
                    'ring': ['ring', 'rings', 'خاتم', 'خواتم'],
                    'bracelet': ['bracelet', 'bracelets', 'اسورة', 'اساور', 'حظاظة'],
                    'earring': ['earring', 'earrings', 'حلق', 'حلقان'],
                    'watch': ['watch', 'watches', 'ساعة', 'ساعه', 'ساعات'],
                    'sunglasses': ['sunglasses', 'نظارة', 'نضارة', 'نظارات'],
                    'headwear': ['hat', 'cap', 'طاقية', 'كاب', 'قبعة'],
                    'scarf': ['scarf', 'سكارف', 'طرحة', 'حجاب', 'طرح'],
                    'jacket': ['jacket', 'جاكيت', 'جواكت'],
                    'coat': ['coat', 'بالطو', 'معطف'],
                    'hoodie': ['hoodie', 'هودي'],
                    'sweater': ['sweater', 'سويتر'],
                    'blazer': ['blazer', 'بليزر'],
                    'makeup': ['makeup', 'مكياج', 'ميكاب', 'ميكب', 'تجميل', 'cosmetics'],
                    'lipstick': ['lipstick', 'روج', 'احمر شفاه'],
                    'foundation': ['foundation', 'فاونديشن'],
                    'skincare': ['skincare', 'عناية', 'سكين كير'],
                    'perfume': ['perfume', 'fragrance', 'عطر', 'برفان', 'عطور'],
                    'pajamas': ['pajamas', 'sleepwear', 'بيجامة', 'بيجامات', 'لانجري'],
                    'kids': ['kids', 'baby', 'أطفال', 'اطفال', 'بيبي'],
                    'dress': ['dress', 'dresses', 'gown', 'maxi', 'mini', 'evening', 'فستان', 'دريس', 'فساتين', 'سواريه', 'ماكسي', 'ميني'],
                }
                
                # General expansion logic
                general_groups = {
                    'tops_general': (['top', 'tops', 'ملابس علوية'], ['tshirt', 'blouse', 'shirt', 'knitwear', 'crop']),
                    'bottoms_general': (['bottoms', 'ملابس سفلية'], ['pants', 'jeans', 'skirt', 'shorts']),
                    'shoes_all': (mappings['shoes_general'], ['sneakers', 'heels', 'sandals', 'boots', 'slippers', 'shoes_general']),
                    'bags_all': (['bags', 'شنط', 'حقائب'], ['bag', 'backpack', 'purse']),
                    'accessories_all': (['accessory', 'accessories', 'اكسسوار', 'اكسسوارات'], ['jewelry', 'necklace', 'ring', 'bracelet', 'earring', 'watch', 'sunglasses', 'headwear', 'scarf']),
                    'outerwear_all': (['outerwear', 'ملابس خارجية'], ['jacket', 'coat', 'hoodie', 'sweater', 'blazer']),
                    'beauty_all': (['beauty', 'جمال', 'منتجات تجميل'], ['makeup', 'lipstick', 'foundation', 'skincare', 'perfume'])
                }
                
                # Check granular match
                for key, syn_list in mappings.items():
                    if word in syn_list:
                        syns.update(syn_list)
                
                # Check general match
                for gen_key, (gen_words, specific_keys) in general_groups.items():
                    if word in gen_words:
                        syns.update(gen_words)
                        for k in specific_keys:
                            syns.update(mappings[k])
                
                return syns

            words = search_query.lower().split()
            search_filters = Q()
            for word in words:
                word_syns = get_synonyms(word)
                word_q = Q()
                for syn in word_syns:
                    word_q |= (
                        Q(name__icontains=syn) |
                        Q(description__icontains=syn) |
                        Q(categories__name__icontains=syn) |
                        Q(available_colors__icontains=syn) |
                        Q(fabric_type__icontains=syn) |
                        Q(seller__profile__brand_name__icontains=syn) |
                        Q(seller__username__icontains=syn)
                    )
                search_filters &= word_q
            
            queryset = queryset.filter(search_filters)

        # Frontend doesn't send stock or variants currently, so filtering by stock=0 hides all new products.
        # Instead, we filter by is_available=True.
        from django.db.models import Q
        if user.is_authenticated:
            # Show if available OR if I am the seller
            queryset = queryset.filter(Q(is_available=True) | Q(seller=user))
        else:
            # Guest: strictly available
            queryset = queryset.filter(is_available=True)
            
        # Handle sale filter
        is_sale = self.request.query_params.get('is_sale')
        if is_sale and str(is_sale).lower() in ['true', '1']:
            from django.db.models import F
            queryset = queryset.filter(price__lt=F('price_before_sale'), price_before_sale__gt=0)
            
        return queryset.distinct()

    ordering_fields = ['price', 'created_at']

    def perform_create(self, serializer):
        user = self.request.user
        # Frontend doesn't send stock or availability, so we default to 100 stock and available=True
        stock = self.request.data.get('stock', 100)
        
        is_available_raw = self.request.data.get('is_available', True)
        is_available = False if str(is_available_raw).lower() in ['false', '0'] else True
        
        can_be_hijabi_raw = self.request.data.get('can_be_hijabi', False)
        can_be_hijabi = str(can_be_hijabi_raw).lower() in ['true', '1']

        needs_basic_raw = self.request.data.get('needs_basic', False)
        needs_basic = str(needs_basic_raw).lower() in ['true', '1']
        
        product = serializer.save(
            seller=user, 
            stock=stock, 
            is_available=is_available, 
            can_be_hijabi=can_be_hijabi, 
            needs_basic=needs_basic
        )

        category_id = self.request.data.get('category')
        if category_id:
            try:
                product.categories.add(int(category_id))
            except ValueError:
                pass

        # Handle secondary images
        additional_images = []
        for i in range(1, 5):
            image_key = f'secondary_image_{i}'
            if image_key in self.request.FILES:
                file_obj = self.request.FILES[image_key]
                file_name = default_storage.save(f'products/secondary/{file_obj.name}', file_obj)
                file_url = default_storage.url(file_name)
                additional_images.append({'image': file_url})
        
        if additional_images:
            product.additional_images = additional_images
        
        fabric_focus = []
        for i in range(0, 10):
            image_key = f'fabric_focus_{i}'
            if image_key in self.request.FILES:
                file_obj = self.request.FILES[image_key]
                file_name = default_storage.save(f'products/fabric_focus/{file_obj.name}', file_obj)
                file_url = default_storage.url(file_name)
                fabric_focus.append(file_url)
                
        if fabric_focus:
            product.fabric_focus = fabric_focus
            
        if additional_images or fabric_focus:
            update_fields = []
            if additional_images: update_fields.append('additional_images')
            if fabric_focus: update_fields.append('fabric_focus')
            product.save(update_fields=update_fields)
    
    def perform_update(self, serializer):
        """Only allow seller to update their own products"""
        product = self.get_object()
        if product.seller != self.request.user:
            raise PermissionDenied("You can only update your own products.")
            
        kwargs = {}
        if 'can_be_hijabi' in self.request.data:
            kwargs['can_be_hijabi'] = str(self.request.data['can_be_hijabi']).lower() in ['true', '1']
        if 'needs_basic' in self.request.data:
            kwargs['needs_basic'] = str(self.request.data['needs_basic']).lower() in ['true', '1']
            
        product = serializer.save(**kwargs)

        # Handle secondary images update if any new ones are uploaded
        has_new_secondary = any(f'secondary_image_{i}' in self.request.FILES for i in range(1, 5))
        
        if has_new_secondary:
            additional_images = []
            for i in range(1, 5):
                image_key = f'secondary_image_{i}'
                if image_key in self.request.FILES:
                    file_obj = self.request.FILES[image_key]
                    file_name = default_storage.save(f'products/secondary/{file_obj.name}', file_obj)
                    file_url = default_storage.url(file_name)
                    additional_images.append({'image': file_url})
            
            product.additional_images = additional_images
            
        has_new_fabric = any(f'fabric_focus_{i}' in self.request.FILES for i in range(0, 10))
        if has_new_fabric:
            fabric_focus = []
            for i in range(0, 10):
                image_key = f'fabric_focus_{i}'
                if image_key in self.request.FILES:
                    file_obj = self.request.FILES[image_key]
                    file_name = default_storage.save(f'products/fabric_focus/{file_obj.name}', file_obj)
                    file_url = default_storage.url(file_name)
                    fabric_focus.append(file_url)
            product.fabric_focus = fabric_focus
            
        if has_new_secondary or has_new_fabric:
            update_fields = []
            if has_new_secondary: update_fields.append('additional_images')
            if has_new_fabric: update_fields.append('fabric_focus')
            product.save(update_fields=update_fields)
    
    def perform_destroy(self, instance):
        """Only allow seller to delete their own products"""
        if instance.seller != self.request.user:
            raise PermissionDenied("You can only delete your own products.")
        instance.delete()

    @action(detail=True, methods=['get', 'post'], url_path='reviews')
    def reviews(self, request, pk=None):
        """
        List or create reviews for a specific product.
        
        Headers: Authorization: Bearer <token> (Required for POST)
        Methods: GET, POST
        POST Body:
            rating (int), comment (str)
        """
        product = self.get_object()

        if request.method == 'GET':
            reviews = product.reviews.all().order_by('-created_at')
            from .serializers import ReviewSerializer # Local import to avoid circular dependency if any
            serializer = ReviewSerializer(reviews, many=True, context={'request': request})
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({'detail': 'Authentication required'}, status=401)
            
            from .models import Review
            
            rating = request.data.get('rating')
            comment = request.data.get('comment', '')
            parent_id = request.data.get('parent')
            
            if parent_id:
                # It's a reply, allow multiple
                from .serializers import ReviewSerializer
                data = request.data.copy()
                data['product'] = product.id
                serializer = ReviewSerializer(data=data, context={'request': request})
                if serializer.is_valid():
                    serializer.save(user=request.user, product=product)
                    return Response(serializer.data, status=201)
                return Response(serializer.errors, status=400)
            else:
                review = Review.objects.filter(product=product, user=request.user, parent__isnull=True).first()
                
                if rating is not None and int(rating) == 0:
                    if review:
                        review.delete()
                    return Response({'detail': 'Review deleted or not created'}, status=200)
                
                if review:
                    # Update existing top-level review
                    if rating is not None:
                        review.rating = int(rating)
                    if comment is not None:
                        review.comment = comment
                    if 'image' in request.FILES:
                        review.image = request.FILES['image']
                    review.save()
                    from .serializers import ReviewSerializer
                    serializer = ReviewSerializer(review, context={'request': request})
                    return Response(serializer.data, status=200)
                else:
                    from .serializers import ReviewSerializer
                    data = request.data.copy()
                    data['product'] = product.id
                    serializer = ReviewSerializer(data=data, context={'request': request})
                    if serializer.is_valid():
                        serializer.save(user=request.user, product=product)
                        return Response(serializer.data, status=201)
                    return Response(serializer.errors, status=400)


    @action(detail=True, methods=['post'], url_path='dislike')
    def dislike(self, request, pk=None):
        from rest_framework import permissions
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)
        product = self.get_object()
        from .models import Review
        review, created = Review.objects.get_or_create(user=request.user, product=product)
        if review.is_dislike:
            review.is_dislike = False
            review.save()
            return Response({'status': 'undisliked', 'count': Review.objects.filter(product=product, is_dislike=True).count()})
        else:
            review.is_dislike = True
            review.is_like = False # mutually exclusive
            review.save()
            
            # If disliked, remove from wishlist (like) to keep backward compatibility
            from orders.models import Wishlist
            wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
            wishlist.products.remove(product)
            
            return Response({'status': 'disliked', 'count': Review.objects.filter(product=product, is_dislike=True).count()})

    @action(detail=True, methods=['post'], url_path='like')
    def like(self, request, pk=None):
        from rest_framework import permissions
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)
        product = self.get_object()
        from .models import Review
        review, created = Review.objects.get_or_create(user=request.user, product=product)
        if review.is_like:
            review.is_like = False
            review.save()
            return Response({'status': 'unliked', 'count': Review.objects.filter(product=product, is_like=True).count()})
        else:
            review.is_like = True
            review.is_dislike = False # mutually exclusive
            review.save()
            return Response({'status': 'liked', 'count': Review.objects.filter(product=product, is_like=True).count()})

    from rest_framework import permissions
    @action(detail=False, methods=['post'], url_path='visual-search', permission_classes=[permissions.AllowAny])
    def visual_search(self, request):
        """
        Accepts an image upload and returns visually similar products.
        Uses ResNet50 model for feature extraction.
        """
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=400)
        
        uploaded_image = request.FILES['image']
        image_bytes = uploaded_image.read()
        
        try:
            from .image_search import find_similar_products
            # Get top 12 similar products
            similar_results = find_similar_products(image_bytes, top_k=12)
            
            # similar_results is a list of (product_id, similarity)
            if not similar_results:
                return Response({'results': []})
                
            # Fetch the products, but we want to maintain the order of similarity
            product_ids = [pid for pid, _ in similar_results]
            
            # Bulk fetch products
            from django.db.models import Case, When
            preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(product_ids)])
            
            # Only return available products
            queryset = Product.objects.filter(id__in=product_ids, is_available=True).order_by(preserved)
            
            # Serialize the results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data})
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='build-outfit', permission_classes=[permissions.AllowAny])
    def build_outfit(self, request):
        """
        Builds a complete outfit using Mistral AI based on Occasion, Gender, Season, and Budget.
        """
        occasion = request.data.get('occasion', '')
        gender = request.data.get('gender', '')
        season = request.data.get('season', '')
        budget = request.data.get('budget', '')
        is_hijabi_raw = request.data.get('is_hijabi', False)
        is_hijabi = str(is_hijabi_raw).lower() == 'true'
        
        if not occasion:
            return Response({'error': 'Occasion is required'}, status=400)
            
        from .outfit_builder import build_outfit as generate_outfit
        result = generate_outfit(occasion, gender, season, budget, is_hijabi)
        
        if "error" in result:
            return Response(result, status=500)
            
        return Response(result)
