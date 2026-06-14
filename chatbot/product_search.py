from products.models import Product
from orders.models import ExchangeRate
from django.db.models import Q
import urllib.parse
from decimal import Decimal
import requests
from django.utils import timezone
from datetime import timedelta

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

AR_TO_EN_FABRICS = {
    'قطن': 'cotton', 'قطنية': 'cotton', 'قطنيه': 'cotton',
    'حرير': 'silk',
    'صوف': 'wool',
    'كتان': 'linen',
    'جلد': 'leather',
    'جينز': 'denim', 'دنم': 'denim',
    'ستان': 'satin', 'ساتان': 'satin',
    'شيفون': 'chiffon',
    'مخمل': 'velvet', 'قطيفة': 'velvet', 'قطيفه': 'velvet',
    'بوليستر': 'polyester',
    'دانتيل': 'lace',
    'كروشيه': 'crochet',
    'نايلون': 'nylon',
    'فرو': 'fur'
}
def get_currency_rate(target_currency='EGP'):
    if target_currency == 'USD':
        return Decimal('1.00')
    try:
        rate_obj = ExchangeRate.objects.filter(currency=target_currency).first()
        now = timezone.now()
        
        # Fetch from API if it doesn't exist or is older than 12 hours
        if not rate_obj or (now - rate_obj.updated_at) > timedelta(hours=12):
            try:
                response = requests.get('https://api.exchangerate-api.com/v4/latest/USD', timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    new_rate = data['rates'].get(target_currency)
                    if new_rate:
                        if not rate_obj:
                            rate_obj = ExchangeRate(currency=target_currency)
                        rate_obj.rate_from_usd = Decimal(str(new_rate))
                        rate_obj.save()
                        return rate_obj.rate_from_usd
            except Exception as e:
                print(f"Error fetching exchange rate from API: {e}")
        
        if rate_obj:
            return rate_obj.rate_from_usd
    except Exception as e:
        print(f"Database error in get_currency_rate: {e}")
        
    return Decimal('48.50') if target_currency == 'EGP' else Decimal('1.00')

def generate_arabic_variations(word):
    """Generate common Arabic spelling variations for robust searching"""
    variations = set([word])
    if word.startswith('ال'):
        variations.add(word[2:])
    else:
        variations.add('ال' + word)
        
    temp_variations = set(variations)
    for v in temp_variations:
        if v.endswith('ة'):
            variations.add(v[:-1] + 'ه')
        if v.endswith('ه'):
            variations.add(v[:-1] + 'ة')
        if v.endswith('ا'):
            variations.add(v[:-1] + 'ه')
            variations.add(v[:-1] + 'ة')
        if v.endswith('اء'):
            variations.add(v[:-2] + 'ا')
            variations.add(v[:-2] + 'ه')
            variations.add(v[:-2] + 'ة')
            
    new_variations = set(variations)
    for v in variations:
        clean_v = v
        if 'أ' in clean_v or 'إ' in clean_v or 'آ' in clean_v:
            clean_v = clean_v.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
        if 'ي' in clean_v or 'ى' in clean_v:
            new_variations.add(clean_v.replace('ي', 'ى'))
            new_variations.add(clean_v.replace('ى', 'ي'))
        new_variations.add(clean_v)
            
    return list(new_variations)

BACKEND_URL = "http://localhost:8000"

def search_products_by_keywords(keywords, color=None, category=None):
    """
    Search for products matching English keywords, color, and category provided by Mistral.
    Also handles common category synonyms (like blouse -> tops, blouses&shirts) and bi-directional color translations.
    """
    if not keywords and not color and not category:
        return []

    search_filters = Q()
    
    def get_color_synonyms(word):
        base_syns = {word}
        en_word = AR_TO_EN_COLORS.get(word, word)
        base_syns.add(en_word)
        for ar, en in AR_TO_EN_COLORS.items():
            if en == en_word:
                base_syns.add(ar)
                
        final_syns = set()
        for syn in base_syns:
            final_syns.update(generate_arabic_variations(syn))
        return final_syns

    def get_fabric_synonyms(word):
        base_syns = {word}
        en_word = AR_TO_EN_FABRICS.get(word, word)
        base_syns.add(en_word)
        for ar, en in AR_TO_EN_FABRICS.items():
            if en == en_word:
                base_syns.add(ar)
                
        final_syns = set()
        for syn in base_syns:
            final_syns.update(generate_arabic_variations(syn))
        return final_syns

    def get_category_synonyms(word):
        base_category_syns = {word}
        
        generic_categories = ['product', 'products', 'item', 'items', 'clothes', 'clothing', 'wear', 'apparel', 'منتجات', 'ملابس', 'حاجات']
        if word in generic_categories:
            return set()

        # Specific Tops
        tshirt_syns = ['t-shirt', 't-shirts', 'تيشيرت', 'تيشرت', 'تيشرتات', 'تيشيرتات', 'بولو', 'polo']
        blouse_syns = ['blouse', 'blouses', 'blouses&shirts', 'بلوزة', 'بلوزه', 'بلوزات']
        shirt_syns = ['shirt', 'shirts', 'قميص', 'قمصان']
        crop_syns = ['crop', 'كروب']
        knitwear_syns = ['knitwear', 'تريكو']
        
        # General Tops
        general_tops_syns = ['top', 'tops', 'توب', 'توبات', 'ملابس علوية', 'علوية']

        if word in tshirt_syns:
            base_category_syns.update(tshirt_syns)
        elif word in blouse_syns:
            base_category_syns.update(blouse_syns)
        elif word in shirt_syns:
            base_category_syns.update(shirt_syns)
        elif word in crop_syns:
            base_category_syns.update(crop_syns)
        elif word in knitwear_syns:
            base_category_syns.update(knitwear_syns)
        elif word in general_tops_syns:
            base_category_syns.update(general_tops_syns + tshirt_syns + blouse_syns + shirt_syns + crop_syns + knitwear_syns)

        # Specific Bottoms
        pants_syns = ['pants', 'trousers', 'jeans', 'بنطلون', 'بناطيل', 'جينز', 'بنطال']
        shorts_syns = ['shorts', 'شورت', 'شورتات']
        skirt_syns = ['skirt', 'skirts', 'جيب', 'جيبة', 'جيبات']
        
        # General Bottoms
        general_bottoms_syns = ['bottoms', 'bottom', 'ملابس سفلية', 'سفلية']
        
        if word in pants_syns:
            base_category_syns.update(pants_syns)
        elif word in shorts_syns:
            base_category_syns.update(shorts_syns)
        elif word in skirt_syns:
            base_category_syns.update(skirt_syns)
        elif word in general_bottoms_syns:
            base_category_syns.update(general_bottoms_syns + pants_syns + shorts_syns + skirt_syns)

        # Specific Shoes
        sneakers_syns = ['sneakers', 'كوتشي', 'كوتشيات']
        heels_syns = ['heels', 'هيلز', 'هيلزات', 'كعب', 'كعوب']
        sandals_syns = ['sandals', 'صندل', 'صنادل', 'شبشب', 'شباشب', 'سليبر', 'سليبرز']
        flats_syns = ['flats', 'فلات', 'فلاتس']
        boots_syns = ['boots', 'بوت', 'بوتات']
        
        # General Shoes
        general_shoes_syns = ['shoes', 'shoe', 'footwear', 'شوز', 'شوزات', 'حذاء', 'جزمة', 'جزمه', 'جزم', 'احذية', 'أحذية', 'احذيه']
        
        if word in sneakers_syns:
            base_category_syns.update(sneakers_syns)
        elif word in heels_syns:
            base_category_syns.update(heels_syns)
        elif word in sandals_syns:
            base_category_syns.update(sandals_syns)
        elif word in flats_syns:
            base_category_syns.update(flats_syns)
        elif word in boots_syns:
            base_category_syns.update(boots_syns)
        elif word in general_shoes_syns:
            base_category_syns.update(general_shoes_syns + sneakers_syns + heels_syns + sandals_syns + flats_syns + boots_syns)

        # Specific Jewelry/Accessories
        ring_syns = ['ring', 'rings', 'خاتم', 'خواتم']
        necklace_syns = ['necklace', 'necklaces', 'عقد', 'سلسلة', 'سلسله', 'سلاسل']
        bracelet_syns = ['bracelet', 'bracelets', 'اسورة', 'اسوره', 'سواره', 'اساور']
        earring_syns = ['earring', 'earrings', 'حلق', 'حلقان']
        bag_syns = ['bag', 'bags', 'purse', 'شنطة', 'شنط', 'شنطه', 'حقيبة', 'حقائب', 'باكباك', 'بورتفيه', 'شنط كاجوال', 'شنط سواريه', 'شنط فورمال', 'شنط يوميه']
        beach_bag_syns = ['beach bag', 'شنطة بحر', 'شنط بحر']
        laptop_bag_syns = ['laptop bag', 'شنطة لابتوب', 'شنط لابتوب']
        travel_bag_syns = ['travel bag', 'شنطة سفر', 'شنط سفر']
        watch_syns = ['watch', 'watches', 'ساعة', 'ساعه', 'ساعات']
        glasses_syns = ['sunglasses', 'glasses', 'نظارة', 'نظارات', 'نظاره', 'نضارة', 'نضارات']
        belt_syns = ['belt', 'belts', 'حزام', 'احزمة', 'احزمه']
        hat_syns = ['hat', 'hats', 'cap', 'طاقية', 'كاب', 'قبعة', 'طواقي']
        hijab_syns = ['hijab', 'scarf', 'سكارف', 'طرحة', 'حجاب', 'طرح']
        hair_acc_syns = ['hair clip', 'hair tie', 'توكة', 'توك', 'مشبك شعر', 'مشابك شعر', 'بنسة', 'بنس']
        tie_syns = ['tie', 'ties', 'كرافات', 'كرافتة', 'كرفته', 'كرافاته', 'ربطة عنق']
        cufflink_syns = ['cufflink', 'cufflinks', 'زرار بدلة', 'زراير بدل', 'زراير بدله', 'كف لينك']
        pocket_square_syns = ['pocket square', 'منديل بدلة', 'مناديل بدل', 'منديل بدله']
        
        # General Jewelry/Accessories
        general_acc_syns = ['jewelry', 'jewellery', 'accessories', 'اكسسوار', 'اكسسوارات', 'مجوهرات']
        
        if word in ring_syns:
            base_category_syns.update(ring_syns)
        elif word in necklace_syns:
            base_category_syns.update(necklace_syns)
        elif word in bracelet_syns:
            base_category_syns.update(bracelet_syns)
        elif word in earring_syns:
            base_category_syns.update(earring_syns)
        elif word in bag_syns or word in beach_bag_syns or word in laptop_bag_syns or word in travel_bag_syns:
            base_category_syns.update(bag_syns + beach_bag_syns + laptop_bag_syns + travel_bag_syns)
        elif word in watch_syns:
            base_category_syns.update(watch_syns)
        elif word in glasses_syns:
            base_category_syns.update(glasses_syns)
        elif word in belt_syns:
            base_category_syns.update(belt_syns)
        elif word in hat_syns:
            base_category_syns.update(hat_syns)
        elif word in hijab_syns:
            base_category_syns.update(hijab_syns)
        elif word in hair_acc_syns:
            base_category_syns.update(hair_acc_syns)
        elif word in tie_syns:
            base_category_syns.update(tie_syns)
        elif word in cufflink_syns:
            base_category_syns.update(cufflink_syns)
        elif word in pocket_square_syns:
            base_category_syns.update(pocket_square_syns)
        elif word in general_acc_syns:
            base_category_syns.update(general_acc_syns + ring_syns + necklace_syns + bracelet_syns + earring_syns + watch_syns + glasses_syns + belt_syns + hair_acc_syns + tie_syns + cufflink_syns + pocket_square_syns)

        dresses_synonyms = ['dress', 'dresses', 'gown', 'abaya', 'فستان', 'دريس', 'فساتين', 'عباية', 'عبايه', 'دريسات', 'عبايات']
        if word in dresses_synonyms:
            base_category_syns.update(dresses_synonyms)

        kids_synonyms = ['kids', 'children', 'baby', 'boys', 'girls', 'toddler', 'أطفال', 'اطفال', 'بيبي', 'ولادي', 'بناتي', 'طفل', 'رضيع', 'اطفالي', 'عيال']
        if word in kids_synonyms:
            base_category_syns.update(kids_synonyms)

        outerwear_synonyms = ['jacket', 'coat', 'outerwear', 'hoodie', 'sweater', 'blazer', 'جاكيت', 'بالطو', 'معطف', 'هودي', 'سويتر', 'بليزر', 'جواكت', 'بالطوهات', 'سويترات', 'بلوفر', 'بلوفرات']
        if word in outerwear_synonyms:
            base_category_syns.update(outerwear_synonyms)

        beauty_synonyms = ['beauty', 'makeup', 'cosmetics', 'lipstick', 'foundation', 'skincare', 'blush', 'shadow', 'lens', 'perfume', 'fragrance', 'مكياج', 'ميكاب', 'ميكب', 'روج', 'فاونديشن', 'تجميل', 'عناية', 'سكين كير', 'بلاشر', 'ايشادو', 'عدسات', 'لينسز', 'عطر', 'برفان', 'عطور']
        if word in beauty_synonyms:
            base_category_syns.update(beauty_synonyms)

        sleepwear_synonyms = ['sleepwear', 'pajamas', 'onesies', 'بيجامة', 'بيجامات', 'لانجري']
        if word in sleepwear_synonyms:
            base_category_syns.update(sleepwear_synonyms)

        mini_syns = ['short', 'mini', 'قصير', 'قصيره', 'قصيرة', 'ميني', 'short skirt', 'mini skirt', 'short dress', 'mini dress']
        if word in mini_syns:
            base_category_syns.update(['short', 'mini', 'قصير', 'قصيره', 'قصيرة', 'ميني'])
            
        maxi_syns = ['long', 'maxi', 'طويل', 'طويله', 'طويلة', 'ماكسي', 'long skirt', 'maxi skirt', 'long dress', 'maxi dress']
        if word in maxi_syns:
            base_category_syns.update(['long', 'maxi', 'طويل', 'طويله', 'طويلة', 'ماكسي'])
            
        evening_syns = ['evening', 'soiree', 'party', 'سواريه', 'سهرة', 'سهره', 'مناسبات', 'multi-usable', 'multi', 'متعدد']
        if word in evening_syns:
            base_category_syns.update(['evening', 'soiree', 'party', 'سواريه', 'سهرة', 'سهره', 'مناسبات', 'multi-usable', 'multi', 'متعدد'])
            
        casual_syns = ['casual', 'كاجوال', 'عملي', 'multi-usable', 'multi', 'متعدد']
        if word in casual_syns:
            base_category_syns.update(['casual', 'كاجوال', 'عملي', 'multi-usable', 'multi', 'متعدد'])
            
        formal_syns = ['formal', 'classic', 'فورمال', 'كلاسيك', 'رسمي', 'رسميه', 'رسمية', 'basic', 'multi-usable', 'multi', 'متعدد']
        if word in formal_syns:
            base_category_syns.update(['formal', 'classic', 'فورمال', 'كلاسيك', 'رسمي', 'رسميه', 'رسمية', 'basic', 'multi-usable', 'multi', 'متعدد'])

        final_syns = set()
        for syn in base_category_syns:
            final_syns.update(generate_arabic_variations(syn))
            
        return final_syns
        
    color_syns = set()
    if color:
        color_clean = color.strip().lower()
        color_syns = get_color_synonyms(color_clean)
        
        color_filters = Q()
        for syn in color_syns:
            color_filters |= (
                Q(available_colors__icontains=syn) |
                Q(name__icontains=syn) |
                Q(description__icontains=syn)
            )
        search_filters &= color_filters
        
    category_syns = set()
    gender_filter = None
    if category:
        cat_clean = category.strip().lower()
        generic_categories = ['product', 'products', 'item', 'items', 'clothes', 'clothing', 'wear', 'apparel', 'منتجات', 'ملابس', 'حاجات']
        
        # Implicit Gender Detection
        female_only_categories = ['blouse', 'blouses', 'skirt', 'skirts', 'dress', 'dresses', 'gown', 'abaya', 'عباية', 'عبايه', 'فستان', 'جيبة', 'جيب', 'بلوزة', 'بلوزه']
        if cat_clean in female_only_categories:
            gender_filter = 'FEMALE'
            
        import re
        parts = re.split(r'\s+and\s+|\s*&\s*', cat_clean)
        
        base_terms = set(parts)
        for part in parts:
            if part.endswith('ies'):
                base_terms.add(part[:-3] + 'y')
            elif part.endswith('es') and not part.endswith('shoes') and not part.endswith('glasses') and not part.endswith('dresses'):
                base_terms.add(part[:-2])
            elif part.endswith('s') and not part.endswith('shoes') and not part.endswith('ss') and not part.endswith('tops') and not part.endswith('bottoms'):
                base_terms.add(part[:-1])
                
        category_syns = set()
        for term in base_terms:
            category_syns.update(get_category_synonyms(term))
            category_syns.add(term)
            
        from products.models import Category
        matched_cat_filters = Q()
        for syn in category_syns:
            matched_cat_filters |= Q(name__icontains=syn)
            
        try:
            matched_category_ids = list(Category.objects.filter(matched_cat_filters).values_list('id', flat=True))
        except Exception:
            matched_category_ids = []
            
        cat_filters = Q()
        for syn in category_syns:
            cat_filters |= Q(categories__name__icontains=syn)
            cat_filters |= Q(name__icontains=syn)
            
        for c_id in matched_category_ids:
            cat_filters |= Q(image_categories__regex=rf'\b{c_id}\b')
            
        search_filters &= cat_filters
            
    if gender_filter:
        search_filters &= Q(gender=gender_filter)

    if keywords:
        for kw in keywords:
            kw_clean = kw.strip().lower()
            
            # Skip keywords that are already covered by our smart color and category filters
            if kw_clean in color_syns or kw_clean in category_syns:
                continue
                
            # Skip generic stop words that might be extracted by Mistral
            generic_words = ['product', 'products', 'item', 'items', 'clothes', 'clothing', 'wear', 'apparel', 'منتجات', 'ملابس', 'حاجات', 'عايزه', 'اريد', 'بدي', 'ابي', 'وريني', 'فرجيني', 'هات', 'هاتي', 'عايز', 'بليز', 'ممكن', 'لو سمحت']
            if kw_clean in generic_words:
                continue
                
            if kw_clean in ['men', "men's", 'male', 'رجالي', 'ولادي', 'رجال', 'شبابي']:
                search_filters &= Q(gender='MALE')
                continue
                
            if kw_clean in ['women', "women's", 'female', 'حريمي', 'نسائي', 'بناتي', 'نساء']:
                search_filters &= Q(gender='FEMALE')
                continue
                
            if kw_clean in ['unisex', 'يصلح للجنسين', 'محايد']:
                search_filters &= Q(gender='UNISEX')
                continue
                
            if len(kw_clean) > 1:
                kw_syns = set()
                for v in generate_arabic_variations(kw_clean):
                    kw_syns.update(get_color_synonyms(v))
                    kw_syns.update(get_fabric_synonyms(v))
                    kw_syns.update(get_category_synonyms(v))
                    
                from products.models import Category
                kw_matched_cat_filters = Q()
                for syn in kw_syns:
                    kw_matched_cat_filters |= Q(name__icontains=syn)
                try:
                    kw_matched_category_ids = list(Category.objects.filter(kw_matched_cat_filters).values_list('id', flat=True))
                except Exception:
                    kw_matched_category_ids = []
                    
                kw_filters = Q()
                for syn in kw_syns:
                    kw_filters |= (
                        Q(name__icontains=syn) | 
                        Q(description__icontains=syn) |
                        Q(categories__name__icontains=syn) |
                        Q(available_colors__icontains=syn) |
                        Q(fabric_type__icontains=syn)
                    )
                for c_id in kw_matched_category_ids:
                    kw_filters |= Q(image_categories__regex=rf'\b{c_id}\b')
                    
                search_filters &= kw_filters

    results = Product.objects.filter(search_filters, is_available=True, stock__gt=0).distinct()
    return list(results)


def format_product_response(products, currency='EGP'):
    """Format products into a simple text for Mistral to summarize (no images here)"""
    if not products:
        return ""
    
    currency_map = {
        'SAR': 'ريال سعودي',
        'USD': 'دولار',
        'TRY': 'ليرة تركية',
        'AED': 'درهم إماراتي',
        'EGP': 'جنيه مصري'
    }
    currency_ar = currency_map.get(currency.upper(), 'جنيه')
    
    rate = get_currency_rate(currency)
    response = f"تم العثور على {len(products)} منتجات:\n"
    for i, product in enumerate(products, 1):
        local_price = round(product.price * rate, 2)
        response += f"{i}. {product.name} - السعر: {local_price} {currency_ar}\n"
    
    return response


def get_products_json(products, currency='EGP', requested_color=None):
    """Return structured product data as a list of dicts for the frontend to render as cards"""
    if not products:
        return []
    
    rate = get_currency_rate(currency)
    products_data = []
    for product in products:
        image_url = ""
        if product.image:
            image_url = f"{BACKEND_URL}{product.image.url}"
            
        if requested_color:
            color_clean = requested_color.strip().lower()
            mapped_color = AR_TO_EN_COLORS.get(color_clean, color_clean)
            
            # Try to see if main image name contains color
            main_img_path = getattr(product.image, 'name', '').lower()
            main_has_color = mapped_color in main_img_path or color_clean in main_img_path
            
            if not main_has_color and hasattr(product, 'additional_images') and product.additional_images:
                for add_img in product.additional_images:
                    img_path = add_img.get('image', '').lower()
                    if mapped_color in img_path or color_clean in img_path:
                        img_val = add_img.get('image')
                        image_url = f"{BACKEND_URL}{img_val}" if not img_val.startswith('http') else img_val
                        break
        
        local_price = round(product.price * rate, 2)
        
        products_data.append({
            "id": product.id,
            "name": product.name,
            "price": str(local_price),
            "currency": currency,
            "image_url": image_url,
            "slug": product.slug or "",
            "seller_id": product.seller_id,
            "category_name": product.categories.first().name if product.categories.exists() else "",
        })
    
    return products_data