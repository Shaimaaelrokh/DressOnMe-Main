import os
import json
import requests
import random
import base64
from django.conf import settings
from chatbot.product_search import search_products_by_keywords, get_products_json


def analyze_suitability_with_vision(candidates, api_key, occasion, gender, category, is_hijabi, has_undershirt=False):
    if not candidates:
        return -1

    base_prompt = f"Occasion: {occasion}, Category: {category}. "

    if is_hijabi and gender.lower() != 'male':
        cat = category.lower()

        base_prompt += (
            "ABSOLUTE MODESTY RULE: The user is a Hijabi. If the item is a dress, gown, or skirt, it MUST reach the ankles. "
            "If the item exposes any part of the calves, knees, or thighs, you MUST REJECT IT. "
        )

        if has_undershirt:
            base_prompt += (
                "This item will be worn OVER a long-sleeve undershirt. "
                "Return the index (0, 1, or 2) of the FIRST item that is: "
                "long length (maxi / reaching the ankles or floor), not transparent, not extremely tight. "
                "Sleeves do NOT matter since a long-sleeve undershirt will be worn underneath. "
                "If NONE qualify, return -1."
            )
        elif cat in ['shirt', 'undershirt']:
            base_prompt += (
                "This is a base-layer undershirt for a Hijabi woman (to be worn under a dress). "
                "Return the index (0, 1, or 2) of the FIRST item that has: "
                "FULL long sleeves reaching the wrist. Length does not matter. "
                "If NONE have full long sleeves, return -1."
            )
        elif cat in ['dress', 'gown', 'فستان']:
            base_prompt += (
                "You are strictly checking a standalone dress for a Hijabi Muslim woman. "
                "Return the index (0, 1, or 2) of the FIRST dress that meets ALL of: "
                "(1) Maxi length — reaching the ankles or floor. "
                "(2) Has full long sleeves to the wrist. "
                "(3) Not transparent, not extremely tight. "
                "If NONE meet ALL three criteria, return -1."
            )
        elif cat in ['skirt', 'جيبة', 'bottom']:
            base_prompt += (
                "Checking a skirt for a Hijabi woman. "
                "Return the index (0, 1, or 2) of the FIRST item that is: "
                "maxi or ankle-length (reaching the ankles or floor). "
                "NO mini skirts, NO midi skirts, NO above-knee skirts. "
                "If NONE qualify, return -1."
            )
        elif cat in ['pants', 'trousers', 'بنطلون']:
            base_prompt += (
                "Checking pants/trousers for a Hijabi woman. "
                "Return the index (0, 1, or 2) of the FIRST item that is: "
                "full-length to the ankle, not transparent, not skin-tight. "
                "Wide-leg, straight, or loose fit are preferred. "
                "If NONE qualify, return -1."
            )
        elif cat in ['top', 'blouse', 'blazer', 'jacket', 'cardigan', 'sweater']:
            base_prompt += (
                "Checking a top/blouse/blazer for a Hijabi woman to wear with pants or a skirt. "
                "Return the index (0, 1, or 2) of the FIRST item that has: "
                "FULL long sleeves to the wrist, not transparent, not a crop top. "
                "If NONE qualify, return -1."
            )
        else:
            base_prompt += (
                f"Choose the index (0, 1, or 2) of the most suitable {category} "
                f"for a Hijabi woman for this occasion. If none are suitable, return -1."
            )
    else:
        base_prompt += (
            f"Choose the index (0, 1, or 2) of the most suitable {category} "
            f"for this occasion. If none are suitable, return -1."
        )

    messages = [{"role": "user", "content": [{"type": "text", "text": base_prompt}]}]

    for i, p in enumerate(candidates):
        try:
            if not getattr(p, 'image', None):
                continue
            with open(p.image.path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                messages[0]["content"].append({"type": "text", "text": f"Image {i}:"})
                messages[0]["content"].append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{encoded_string}"}
                })
        except Exception:
            pass

    messages[0]["content"].append({
        "type": "text",
        "text": "CRITICAL INSTRUCTION: Do NOT try to choose the 'best of the worst'. If NONE of the items perfectly match the modesty criteria, you MUST output -1. Output ONLY a single integer (0, 1, 2, or -1) and absolutely nothing else. No explanations, no markdown."
    })

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "pixtral-large-latest",
        "messages": messages,
        "temperature": 0.0,
        "max_tokens": 5
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            try:
                idx = int(content)
                if 0 <= idx < len(candidates):
                    return idx
                return -1
            except ValueError:
                return -1
        else:
            print(f"[VISION API] Error: {response.status_code} - {response.text}")
            if is_hijabi:
                return -1
            return 0
    except Exception as e:
        print(f"[VISION API] Exception: {e}")
        if is_hijabi:
            return -1
        return 0


def build_outfit(occasion, gender, season, budget_str, is_hijabi=False):
    try:
        try:
            budget = float(''.join(filter(str.isdigit, str(budget_str))))
        except ValueError:
            budget = 3000

        # ---- Occasion detection ----
        occasion_lower = occasion.lower()

        is_explicit_casual = any(w in occasion_lower for w in [
            'casual', 'university', 'everyday', 'جامعة', 'كاجوال', 'كاجول', 'يومي', 'خروجة', 'خروجه'
        ])
        is_wedding = any(w in occasion_lower for w in [
            "wedding", "soiree", "evening", "party", "فرح", "سهرة", "سهره",
            "خطوبة", "زفاف", "مناسبة", "مناسبات", "سواريه", "سوارية", "عرس", "حفلة", "حفله"
        ])
        is_formal = any(w in occasion_lower for w in [
            "work", "corporate", "formal", "عمل", "شغل", "مقابلة", "رسمي", "فورمال", "كلاسيك"
        ])

        negations = ['not ', 'no ', 'مش ', 'بدون ', 'لا ', 'غير ', 'معدا ', 'ما عدا ', 'مفيش ']
        for neg in negations:
            for w in ["wedding", "soiree", "evening", "party", "فرح", "سهرة", "سهره",
                      "خطوبة", "زفاف", "مناسبة", "مناسبات", "سواريه", "سوارية", "عرس", "حفلة", "حفله"]:
                if f"{neg}{w}" in occasion_lower:
                    is_wedding = False
            for w in ["work", "corporate", "formal", "عمل", "شغل", "مقابلة", "رسمي", "فورمال", "كلاسيك"]:
                if f"{neg}{w}" in occasion_lower:
                    is_formal = False

        if is_explicit_casual:
            is_wedding = False
            is_formal  = False
            is_casual  = True
        else:
            is_casual = not is_wedding and not is_formal

        occasion_kw = []
        if is_wedding:   occasion_kw.extend(["soiree", "evening", "party", "سواريه", "سهرة"])
        elif is_formal:  occasion_kw.extend(["formal", "classic", "فورمال", "كلاسيك"])
        elif is_casual:  occasion_kw.extend(["casual", "كاجوال"])

        if is_hijabi and gender.lower() != 'male':
            occasion_kw.extend(["long", "maxi", "modest", "طويل", "محتشم", "ماكسي", "مقفول", "طويلة"])

        # ================================================================
        # الكلمات المحظورة في الكاجوال — تشمل اسم الـ category والـ name والـ description
        # ================================================================
        NON_CASUAL_WORDS = [
            # فورمال وعمل
            'formal', 'work', 'corporate', 'عمل', 'شغل', 'رسمي', 'فورمال',
            # سواريه وسهرة بكل أشكالها
            'soiree', 'soiree dress', 'soiree dresses',
            'evening', 'evening dress', 'evening dresses', 'evening gown', 'evening gowns',
            'سواريه', 'سوارية', 'سهرة', 'سهره', 'سهرات',
            # أفراح ومناسبات
            'party', 'wedding', 'زفاف', 'فرح', 'افراح', 'أفراح', 'عرس', 'اعراس', 'أعراس',
            'مناسبة', 'مناسبات', 'حفلة', 'حفله', 'خطوبة',
            # سيمي فورمال وكلاسيك
            'semi-formal', 'semi formal', 'سيمي فورمال', 'classic', 'كلاسيك',
            # أقمشة وتفاصيل رسمية/سهرة
            'satin', 'sequin', 'sequined', 'shiny', 'glitter', 'glittery',
            'ستان', 'ساتان', 'ترتر', 'لامع', 'لامعة', 'جليتر',
            'tulle', 'تول',
            'lace', 'دانتيل',
            'chiffon', 'شيفون',
            # كعب عالي
            'heels', 'heel', 'high heel', 'high-heel', 'pumps',
            'كعب', 'كعب عالي',
        ]

        # ================================================================
        # الكلمات المحظورة خصيصاً للفساتين في الكاجوال
        # فستان كاجوال لازم يكون فيه كلمة casual صريحة أو يكون مش سواريه
        # ================================================================
        DRESS_FORBIDDEN_IN_CASUAL = [
            'soiree', 'evening', 'party', 'wedding', 'gown',
            'سواريه', 'سوارية', 'سهرة', 'سهره', 'زفاف', 'فرح', 'مناسبة',
            'حفلة', 'حفله', 'خطوبة', 'عرس',
            'satin', 'sequin', 'tulle', 'lace', 'chiffon', 'glitter',
            'ستان', 'ساتان', 'ترتر', 'تول', 'دانتيل', 'شيفون', 'جليتر',
            'formal', 'classic', 'semi-formal',
            'رسمي', 'كلاسيك', 'سيمي فورمال',
        ]

        # ---- Deterministic Outfit Generation ----
        outfits_plan = []

        def make_piece(cat, kw):
            return {"category": cat, "color": "", "keywords": kw, "estimated_price": 0}

        is_female = gender.lower() != 'male'

        if is_female:
            if is_wedding:
                for _ in range(8):
                    shoe_cat = random.choice(["heels", "pumps", "sandals"])
                    pieces = [
                        make_piece("dress", [random.choice(["soiree", "multi"])]),
                        make_piece("shoes", [shoe_cat]),
                        make_piece("bag", ["clutch"]),
                        make_piece("accessories", ["soiree"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["soiree"]))
                    outfits_plan.append({"style_name": "Evening Elegance", "pieces": pieces})

                for _ in range(4):
                    bot_cat = random.choice(["pants", "skirt"])
                    pieces = [
                        make_piece("blouse", ["chiffon"]),
                        make_piece(bot_cat, ["soiree"]),
                        make_piece("shoes", ["heels"]),
                        make_piece("bag", ["clutch"]),
                        make_piece("accessories", ["soiree"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["soiree"]))
                    outfits_plan.append({"style_name": "Chic Soiree", "pieces": pieces})

                for _ in range(3):
                    bot_cat = random.choice(["pants", "skirt"])
                    pieces = [
                        make_piece("blazer", ["soiree"]),
                        make_piece(bot_cat, ["soiree"]),
                        make_piece("shoes", ["heels"]),
                        make_piece("bag", ["clutch"]),
                        make_piece("accessories", ["soiree"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["soiree"]))
                    outfits_plan.append({"style_name": "Modern Evening Suit", "pieces": pieces})

            elif is_formal:
                for _ in range(7):
                    bot_cat = random.choice(["pants", "skirt"])
                    pieces = [
                        make_piece("blazer", ["formal"]),
                        make_piece(bot_cat, ["formal"]),
                        make_piece("shoes", [random.choice(["loafers", "pumps"])]),
                        make_piece("bag", ["tote"]),
                        make_piece("accessories", ["formal"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["formal"]))
                    outfits_plan.append({"style_name": "Corporate Smart", "pieces": pieces})

                for _ in range(5):
                    top_cat = random.choice(["shirt", "blouse"])
                    bot_cat = random.choice(["skirt", "pants"])
                    pieces = [
                        make_piece(top_cat, ["formal"]),
                        make_piece(bot_cat, ["formal"]),
                        make_piece("shoes", ["pumps"]),
                        make_piece("bag", ["formal"]),
                        make_piece("accessories", ["formal"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["formal"]))
                    outfits_plan.append({"style_name": "Business Classic", "pieces": pieces})

                for _ in range(3):
                    pieces = [
                        make_piece("dress", ["formal"]),
                        make_piece("shoes", ["pumps"]),
                        make_piece("bag", ["formal"]),
                        make_piece("accessories", ["formal"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["formal"]))
                    outfits_plan.append({"style_name": "Formal Elegance", "pieces": pieces})

            else:  # Casual
                for _ in range(6):
                    top_cat  = random.choice(["shirt", "t-shirt", "top", "blouse"])
                    bot_cat  = random.choice(["pants", "jeans", "skirt"])
                    shoe_cat = random.choice(["sneakers", "flats", "sandals", "boots"])
                    bag_cat  = random.choice(["backpack", "bag", "crossbody"])
                    pieces = [
                        make_piece(top_cat, ["casual"]),
                        make_piece(bot_cat, ["casual"]),
                        make_piece(shoe_cat, ["casual"]),
                        make_piece(bag_cat, ["casual"]),
                        make_piece("accessories", ["casual"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["casual"]))
                    outfits_plan.append({"style_name": "Everyday Casual", "pieces": pieces})

                for _ in range(4):
                    shoe_cat = random.choice(["sneakers", "flats", "sandals"])
                    bag_cat  = random.choice(["bag", "crossbody", "tote"])
                    pieces = [
                        make_piece("dress", ["casual"]),
                        make_piece(shoe_cat, ["casual"]),
                        make_piece(bag_cat, ["casual"]),
                        make_piece("accessories", ["casual"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["casual"]))
                    outfits_plan.append({"style_name": "Casual Dress", "pieces": pieces})

                for _ in range(5):
                    out_cat  = random.choice(["jacket", "cardigan", "sweater", "hoodie"])
                    bot_cat  = random.choice(["pants", "jeans", "skirt"])
                    shoe_cat = random.choice(["sneakers", "boots"])
                    bag_cat  = random.choice(["bag", "backpack"])
                    pieces = [
                        make_piece("top", ["casual"]),
                        make_piece(out_cat, ["casual"]),
                        make_piece(bot_cat, ["casual"]),
                        make_piece(shoe_cat, ["casual"]),
                        make_piece(bag_cat, ["casual"]),
                        make_piece("accessories", ["casual"])
                    ]
                    if is_hijabi: pieces.append(make_piece("hijab", ["casual"]))
                    outfits_plan.append({"style_name": "Layered Casual", "pieces": pieces})

        else:  # Male
            if is_wedding or is_formal:
                for _ in range(11):
                    pieces = [
                        make_piece("blazer", ["suit", "formal", "classic"]),
                        make_piece("shirt",  ["classic", "formal"]),
                        make_piece("pants",  ["formal", "classic", "suit"]),
                        make_piece("shoes",  ["formal", "classic", "oxford"])
                    ]
                    outfits_plan.append({"style_name": "Gentleman Formal", "pieces": pieces})
                for _ in range(4):
                    pieces = [
                        make_piece("shirt", ["classic", "formal"]),
                        make_piece("pants", ["formal", "classic"]),
                        make_piece("shoes", ["formal", "classic"])
                    ]
                    outfits_plan.append({"style_name": "Smart Classic", "pieces": pieces})
            else:
                for _ in range(9):
                    pieces = [
                        make_piece("shirt", ["casual", "t-shirt", "polo"]),
                        make_piece("pants", ["jeans", "casual"]),
                        make_piece("shoes", ["sneakers", "casual"])
                    ]
                    outfits_plan.append({"style_name": "Urban Casual", "pieces": pieces})
                for _ in range(6):
                    pieces = [
                        make_piece("shirt", ["casual", "button-down"]),
                        make_piece("pants", ["chinos", "jeans", "casual"]),
                        make_piece("shoes", ["sneakers", "loafers", "casual"])
                    ]
                    outfits_plan.append({"style_name": "Smart Casual", "pieces": pieces})

        # ---- helpers ----
        global_usage_count = {}

        def get_full_text(p):
            """Helper: يرجع النص الكامل للمنتج (categories + name + description) بـ lowercase"""
            all_cat_names = " ".join([c.name for c in p.categories.all()]).lower()
            return all_cat_names + " " + (p.name or "").lower() + " " + (p.description or "").lower()

        def get_priority(p):
            cat_name = p.category.name if getattr(p, 'category', None) else ""
            p_text   = (p.name + " " + cat_name).lower()

            priority = 100
            if is_hijabi:
                if any(k in p_text for k in ['long', 'maxi', 'طويل', 'محتشم', 'sleeve', 'كم', 'عباية', 'abaya', 'hijab']):
                    priority -= 50
                if any(k in p_text for k in ['short', 'mini', 'قصير', 'ميني', 'midi', 'ميدي', 'نص كم',
                                              'half sleeve', 'sleeveless', 'بدون اكمام', 'حمالات',
                                              'كت', 'عاري', 'شفاف', 'شورت', 'above knee', 'فوق الركبة']):
                    priority += 100

            if any(ck in p_text for ck in occasion_kw):
                priority -= 10
            if 'multi-usable' in p_text or 'multi' in p_text or 'متعدد' in p_text:
                priority -= 25
            if is_formal or is_wedding:
                if 'chiffon' in p_text or 'شيفون' in p_text:
                    priority -= 5

            usage = global_usage_count.get(p.id, 0)
            if usage == 1:
                priority += 5000

            return priority

        def get_valid_prods(prods):
            v = [p for p in prods if getattr(p, 'image', None)]

            # --- Dynamic Repetition Limits ---
            filtered_v = []
            for p in v:
                p_text = get_full_text(p)
                usage  = global_usage_count.get(p.id, 0)

                is_unlimited      = any(c in p_text for c in ['bag', 'shoe', 'accessory', 'jewelry', 'hijab', 'scarf', 'شنط', 'حذاء', 'اكسسوار', 'حجاب'])
                is_basic_clothing = any(c in p_text for c in ['blouse', 'shirt', 'top', 'pants', 'skirt', 'jeans', 'بلوزة', 'قميص', 'بنطلون', 'بناطيل', 'جيبة', 'جيبات'])
                is_main_clothing  = any(c in p_text for c in ['dress', 'gown', 'abaya', 'blazer', 'jacket', 'suit', 'فستان', 'عباية', 'بليزر', 'جاكيت', 'بدلة'])

                if is_main_clothing and usage >= 1:
                    continue
                elif is_basic_clothing and usage >= 5:
                    continue
                elif not is_unlimited and usage >= 2:
                    continue

                filtered_v.append(p)
            v = filtered_v

            if is_hijabi:
                v2 = []
                for p in v:
                    p_text      = get_full_text(p)
                    is_clothing = any(c in p_text for c in clothing_cats)
                    if is_clothing:
                        if not getattr(p, 'can_be_hijabi', False):
                            continue
                        if getattr(p, 'needs_basic', False) and not any(c in p_text for c in ['dress', 'gown', 'abaya', 'فستان', 'عباية', 'دريس', 'عبايه']):
                            continue
                    v2.append(p)
                v = v2

            if is_wedding:
                formal_words = ['formal', 'work', 'corporate', 'عمل', 'شغل', 'رسمي', 'فورمال']
                v = [p for p in v if not any(fw in get_full_text(p) for fw in formal_words)]

            # ================================================================
            # ✅ فلتر الكاجوال المحسّن — طبقتين:
            #
            # طبقة 1: شيل أي منتج فيه كلمة من NON_CASUAL_WORDS
            #          في أي حاجة (categories + name + description)
            #
            # طبقة 2: للفساتين تحديداً — شيل أي فستان فيه كلمة من
            #          DRESS_FORBIDDEN_IN_CASUAL حتى لو طبقة 1 عدّاه
            # ================================================================
            if is_casual:
                result = []
                for p in v:
                    full_text = get_full_text(p)

                    # طبقة 1: فلتر عام
                    if any(fw in full_text for fw in NON_CASUAL_WORDS):
                        print(f"[CASUAL BLOCKED - General] '{p.name}' | text snippet: {full_text[:120]}")
                        continue

                    # طبقة 2: فلتر إضافي للفساتين
                    is_dress_product = any(c in full_text for c in ['dress', 'gown', 'فستان', 'دريس'])
                    if is_dress_product:
                        if any(fw in full_text for fw in DRESS_FORBIDDEN_IN_CASUAL):
                            print(f"[CASUAL BLOCKED - Dress] '{p.name}' | text snippet: {full_text[:120]}")
                            continue

                    result.append(p)
                v = result

            return v

        def is_match(p, keywords):
            text_to_check = (
                p.get('ai_reasoning', '') + " " +
                p.get('name', '')          + " " +
                p.get('category_name', '')
            ).lower()
            return any(cat in text_to_check for cat in keywords)

        clothing_cats = [
            'dress', 'gown', 'skirt', 'top', 'shirt', 'blouse',
            'pants', 'bottom', 'blazer', 'jacket', 'cardigan', 'sweater',
            'بنطلون', 'بناطيل', 'جيبة', 'جيبات', 'جينز', 'تيشرت', 'قميص',
            'بلوزة', 'جاكيت', 'سويتر', 'شورت', 'توب', 'كارديجان',
            'فستان', 'عباية', 'دريس', 'عبايه'
        ]

        def get_validated_fallback(candidates_list, cat_name):
            if not candidates_list:
                return None
            candidates_list.sort(key=lambda p: (get_priority(p), float(p.price)))
            if is_hijabi and any(c in cat_name.lower() for c in clothing_cats):
                safe_list = [p for p in candidates_list if not getattr(p, 'needs_basic', False)]
                if safe_list:
                    return safe_list[0]
                return None
            return candidates_list[0]

        def base_gender_kw():
            if gender.lower() in ['female', 'women', 'woman', 'girl']:
                return ['women']
            elif gender.lower() in ['male', 'men', 'man', 'boy']:
                return ['men']
            return []

        def base_occasion_kw():
            kw = base_gender_kw()
            if is_wedding:   kw.append("soiree")
            elif is_formal:  kw.append("formal")
            elif is_casual:  kw.append("casual")
            return kw

        # ================================================================
        #  MAIN LOOP
        # ================================================================
        final_outfits = []
        seen_outfits  = set()

        for outfit in outfits_plan:
            style_name = outfit.get("style_name", "Curated Look")
            pieces     = outfit.get("pieces", [])

            has_dress = any(p.get("category", "").lower() in ["dress", "gown", "فستان", "عباية"] for p in pieces)
            if has_dress:
                pieces = [p for p in pieces if p.get("category", "").lower() not in [
                    "top", "shirt", "blouse", "undershirt", "بلوزة", "قميص", "تيشرت", "t-shirt", "tshirt"
                ]]

            final_products = []
            total_price    = 0

            for item in pieces:
                category  = item.get("category", "")
                color     = item.get("color", "")
                keywords  = item.get("keywords", [])
                est_price = item.get("estimated_price", float('inf'))

                kw_to_search = keywords.copy()

                if gender.lower() in ['female', 'women', 'woman', 'girl']:
                    kw_to_search.append('women')
                elif gender.lower() in ['male', 'men', 'man', 'boy']:
                    kw_to_search.append('men')

                critical_kw    = []
                ambiguous_cats = ['dress', 'gown', 'skirt', 'shirt', 'blouse', 'top', 'فستان', 'جيبة', 'قميص']
                if any(amb in category.lower() for amb in ambiguous_cats):
                    if is_wedding:   critical_kw.append("soiree")
                    elif is_formal:  critical_kw.append("formal")
                    elif is_casual:  critical_kw.append("casual")

                if is_hijabi and any(c in category.lower() for c in ['dress', 'gown', 'skirt', 'فستان', 'جيبة']):
                    critical_kw.extend(["long", "maxi"])

                for c_kw in critical_kw:
                    if c_kw not in [k.lower() for k in kw_to_search]:
                        kw_to_search.append(c_kw)

                matched_products = search_products_by_keywords(kw_to_search, color=color, category=category)

                if not matched_products:
                    fallback_kw = base_gender_kw() + critical_kw
                    matched_products = search_products_by_keywords(fallback_kw, color=color, category=category)

                if not matched_products:
                    fallback_kw = base_gender_kw() + critical_kw
                    matched_products = search_products_by_keywords(fallback_kw, color=None, category=category)

                if not matched_products:
                    last_resort = base_gender_kw()
                    if is_hijabi and any(c in category.lower() for c in ['dress', 'gown', 'skirt', 'فستان', 'جيبة']):
                        last_resort.extend(["long", "maxi"])
                    matched_products = search_products_by_keywords(last_resort, color=None, category=category)

                valid_products = get_valid_prods(matched_products)

                affordable_products = [p for p in valid_products if float(p.price) <= budget * 0.7]
                if affordable_products:
                    valid_products = affordable_products

                if not valid_products:
                    continue

                valid_products.sort(key=lambda p: (
                    get_priority(p),
                    max(0, float(p.price) - est_price),
                    float(p.price)
                ))

                selected = None

                if category.lower() in ['hijab', 'hijabs', 'scarf']:
                    selected = random.choice(valid_products[:3])
                else:
                    selected = random.choice(valid_products[:3])

                    is_dress = any(c in category.lower() for c in ['dress', 'gown', 'abaya', 'فستان', 'عباية', 'دريس', 'عبايه'])
                    if is_hijabi and is_dress and getattr(selected, 'needs_basic', False):
                        print(f"[OUTFIT BUILDER] '{selected.name}' needs a basic layer. Adding blouse combo...")

                        us_kw = base_gender_kw() + ['blouse', 'chiffon']
                        us_products = search_products_by_keywords(us_kw, color=None, category='blouse')

                        if not us_products:
                            us_products = search_products_by_keywords(base_gender_kw() + ['blouse', 'long sleeve'], color=None, category='blouse')

                        if not us_products:
                            us_products = search_products_by_keywords(base_gender_kw() + ['long sleeve'], color=None, category='shirt')

                        valid_us = get_valid_prods(us_products)

                        if valid_us:
                            valid_us.sort(key=lambda p: get_priority(p))
                            us_selected = valid_us[0]
                            global_usage_count[us_selected.id] = global_usage_count.get(us_selected.id, 0) + 1
                            us_data = get_products_json([us_selected])[0]
                            us_data["ai_reasoning"] = "undershirt for modest layering"
                            final_products.append(us_data)
                            total_price += float(us_data["price"])
                            print(f"[OUTFIT BUILDER] Added blouse '{us_selected.name}'.")
                        else:
                            print(f"[OUTFIT BUILDER] No suitable undershirt found — skipping item.")
                            selected = None

                if not selected:
                    continue

                global_usage_count[selected.id] = global_usage_count.get(selected.id, 0) + 1
                prod_data = get_products_json([selected])[0]
                prod_data["ai_reasoning"] = f"{color.title()} {category.title()} - Est: {est_price}"
                final_products.append(prod_data)
                total_price += float(prod_data["price"])

            # ================================================================
            #  POST-PROCESSING
            # ================================================================
            if not final_products:
                continue

            has_dress  = any(is_match(p, ['dress', 'gown', 'abaya', 'jumpsuit', 'فستان', 'عباية']) for p in final_products)

            if has_dress:
                cleaned = []
                for p in final_products:
                    if is_match(p, ['dress', 'gown', 'abaya', 'jumpsuit', 'فستان', 'عباية', 'دريس', 'عبايه']):
                        cleaned.append(p)
                    elif "undershirt for modest layering" in p.get("ai_reasoning", ""):
                        cleaned.append(p)
                    elif is_match(p, clothing_cats + ['بنطلون', 'بناطيل', 'جيبة', 'جيبات', 'جينز',
                                                       'تيشرت', 'قميص', 'بلوزة', 'جاكيت', 'سويتر',
                                                       'شورت', 'توب', 'كارديجان']):
                        print(f"[OUTFIT BUILDER] Stripping clothing item '{p.get('name')}' because outfit contains a dress.")
                        continue
                    else:
                        cleaned.append(p)
                final_products = cleaned

            has_top    = any(is_match(p, ['top', 'blouse', 'shirt', 't-shirt', 'crop', 'sweater', 'hoodie',
                                          'jacket', 'cardigan', 'blazer', 'تيشرت', 'قميص', 'بلوزة',
                                          'جاكيت', 'سويتر', 'توب', 'كارديجان']) for p in final_products)
            has_bottom = any(is_match(p, ['pants', 'skirt', 'shorts', 'jeans', 'trouser', 'bottom',
                                          'بنطلون', 'بناطيل', 'جيبة', 'جيبات', 'جينز', 'شورت']) for p in final_products)
            has_hijab  = any(is_match(p, ['hijab', 'scarf', 'veil', 'headscarf', 'طرحة', 'حجاب', 'طرح']) for p in final_products)
            has_shoes  = any(is_match(p, ['shoes', 'heels', 'sneakers', 'flats', 'loafers', 'sandals',
                                          'pumps', 'حذاء', 'كوتشي', 'شوز', 'كعب']) for p in final_products)
            has_bag    = any(is_match(p, ['bag', 'clutch', 'tote', 'backpack', 'purse', 'شنطة', 'حقيبة', 'حقيبه', 'شنط']) for p in final_products)
            has_acc    = any(is_match(p, ['accessory', 'jewelry', 'necklace', 'bracelet', 'ring',
                                          'earring', 'watch', 'اكسسوار', 'مجوهرات', 'ساعة', 'خاتم', 'سلسلة']) for p in final_products)

            base_f_kw = base_occasion_kw()

            # ---- Shoes fallback ----
            if not has_shoes:
                fallback_shoes = search_products_by_keywords(base_f_kw.copy(), color=None, category='shoes')
                valid_shoes    = get_valid_prods(fallback_shoes)
                sel = get_validated_fallback(valid_shoes, 'shoes')
                if not sel:
                    fallback_shoes = search_products_by_keywords([], color=None, category='shoes')
                    sel = get_validated_fallback(get_valid_prods(fallback_shoes), 'shoes')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Shoes (Fallback) - Est: 600"
                    final_products.append(pd)
                    total_price += float(pd["price"])

            # ---- Bag fallback ----
            if not has_bag:
                fallback_bags = search_products_by_keywords(base_f_kw.copy(), color=None, category='bag')
                valid_bags    = get_valid_prods(fallback_bags)
                sel = get_validated_fallback(valid_bags, 'bag')
                if not sel:
                    fallback_bags = search_products_by_keywords([], color=None, category='bag')
                    sel = get_validated_fallback(get_valid_prods(fallback_bags), 'bag')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Bag (Fallback) - Est: 500"
                    final_products.append(pd)
                    total_price += float(pd["price"])

            # ---- Accessories fallback ----
            if not has_acc:
                fallback_acc = search_products_by_keywords(base_f_kw.copy(), color=None, category='accessory')
                valid_acc    = get_valid_prods(fallback_acc)
                sel = get_validated_fallback(valid_acc, 'accessory')
                if not sel:
                    fallback_acc = search_products_by_keywords([], color=None, category='accessory')
                    sel = get_validated_fallback(get_valid_prods(fallback_acc), 'accessory')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Accessories (Fallback) - Est: 300"
                    final_products.append(pd)
                    total_price += float(pd["price"])

            # ---- Hijab fallback ----
            if is_hijabi and not has_hijab:
                fallback_hijab = search_products_by_keywords(['women'], color=None, category='hijabs')
                valid_hijabs   = get_valid_prods(fallback_hijab)
                sel = get_validated_fallback(valid_hijabs, 'hijab')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Hijab - Est: 300"
                    final_products.insert(0, pd)
                    total_price += float(pd["price"])

            # ---- Top fallback ----
            if has_bottom and not has_top and not has_dress:
                fallback_top = search_products_by_keywords(base_f_kw.copy(), color=None, category='top')
                valid_tops   = get_valid_prods(fallback_top)
                sel = get_validated_fallback(valid_tops, 'top')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Top (Fallback) - Est: 1000"
                    final_products.insert(0, pd)
                    total_price += float(pd["price"])
                    has_top = True

            # ---- Bottom fallback ----
            if has_top and not has_bottom and not has_dress:
                fallback_bottom = search_products_by_keywords(base_f_kw.copy(), color=None, category='bottom')
                valid_bottoms   = get_valid_prods(fallback_bottom)
                sel = get_validated_fallback(valid_bottoms, 'pants')
                if sel:
                    global_usage_count[sel.id] = global_usage_count.get(sel.id, 0) + 1
                    pd = get_products_json([sel])[0]
                    pd["ai_reasoning"] = "Essential Bottom (Fallback) - Est: 1000"
                    final_products.insert(1, pd)
                    total_price += float(pd["price"])
                    has_bottom = True

            # ---- Critical clothing fallback ----
            if not (has_dress or (has_top and has_bottom)):
                f_kw           = base_f_kw.copy()
                fallback_dress = search_products_by_keywords(f_kw, color=None, category='dress')
                valid_dresses  = get_valid_prods(fallback_dress)
                selected_dress = get_validated_fallback(valid_dresses, 'dress')

                if not selected_dress and is_hijabi:
                    valid_dresses.sort(key=lambda p: get_priority(p))
                    selected_dress = get_validated_fallback(valid_dresses, 'dress')
                    if selected_dress:
                        us_kw       = base_gender_kw() + ['long sleeve']
                        us_products = search_products_by_keywords(us_kw, color=None, category='shirt')
                        valid_us    = get_valid_prods(us_products)
                        us_sel      = get_validated_fallback(valid_us, 'undershirt')
                        if us_sel:
                            global_usage_count[us_sel.id] = global_usage_count.get(us_sel.id, 0) + 1
                            us_pd = get_products_json([us_sel])[0]
                            us_pd["ai_reasoning"] = "Long-sleeve undershirt for modest layering"
                            final_products.append(us_pd)
                            total_price += float(us_pd["price"])
                        else:
                            selected_dress = None

                if selected_dress:
                    global_usage_count[selected_dress.id] = global_usage_count.get(selected_dress.id, 0) + 1
                    pd = get_products_json([selected_dress])[0]
                    pd["ai_reasoning"] = "Essential Clothing - Est: 2000"
                    final_products.insert(0, pd)
                    total_price += float(pd["price"])
                    has_dress = True
                else:
                    fallback_top    = search_products_by_keywords(f_kw, color=None, category='top')
                    valid_tops      = get_valid_prods(fallback_top)
                    selected_top    = get_validated_fallback(valid_tops, 'top')

                    fallback_bottom = search_products_by_keywords(f_kw, color=None, category='bottom')
                    valid_bottoms   = get_valid_prods(fallback_bottom)
                    selected_bottom = get_validated_fallback(valid_bottoms, 'pants')

                    if selected_top and selected_bottom:
                        global_usage_count[selected_top.id]    = global_usage_count.get(selected_top.id, 0) + 1
                        global_usage_count[selected_bottom.id] = global_usage_count.get(selected_bottom.id, 0) + 1

                        pt = get_products_json([selected_top])[0]
                        pt["ai_reasoning"] = "Essential Top (Fallback) - Est: 1000"
                        final_products.insert(0, pt)

                        pb = get_products_json([selected_bottom])[0]
                        pb["ai_reasoning"] = "Essential Bottom (Fallback) - Est: 1000"
                        final_products.insert(1, pb)

                        total_price += float(pt["price"]) + float(pb["price"])
                        has_top    = True
                        has_bottom = True

            is_valid_clothing = has_dress or (has_top and has_bottom)

            # ---- Emergency Hijabi fallback ----
            if not is_valid_clothing and is_hijabi:
                print(f"[OUTFIT BUILDER] Emergency fallback for Hijabi outfit '{style_name}'...")
                emerg_kw    = base_f_kw.copy() + ['long', 'dress']
                emerg_prods = search_products_by_keywords(emerg_kw, color=None, category='dress')
                if not emerg_prods:
                    emerg_prods = search_products_by_keywords(['women', 'dress'], color=None, category='dress')

                valid_emerg = get_valid_prods(emerg_prods)
                valid_emerg.sort(key=lambda p: get_priority(p))
                sel_dress = get_validated_fallback(valid_emerg, 'dress')

                if not sel_dress:
                    sel_dress = get_validated_fallback(valid_emerg, 'dress')
                    if sel_dress:
                        us_kw       = base_gender_kw() + ['long sleeve']
                        us_products = search_products_by_keywords(us_kw, color=None, category='shirt')
                        valid_us    = get_valid_prods(us_products)
                        us_sel      = get_validated_fallback(valid_us, 'undershirt')
                        if us_sel:
                            global_usage_count[us_sel.id] = global_usage_count.get(us_sel.id, 0) + 1
                            us_pd = get_products_json([us_sel])[0]
                            us_pd["ai_reasoning"] = "Long-sleeve undershirt for modest layering (Emergency)"
                            final_products.append(us_pd)
                            total_price += float(us_pd["price"])
                        else:
                            sel_dress = None

                if sel_dress:
                    global_usage_count[sel_dress.id] = global_usage_count.get(sel_dress.id, 0) + 1
                    pd = get_products_json([sel_dress])[0]
                    pd["ai_reasoning"] = "Emergency Modest Dress - Est: 2000"

                    all_clothing_kw = clothing_cats + [
                        'تيشرت', 'قميص', 'بلوزة', 'جاكيت', 'سويتر', 'بنطلون',
                        'بناطيل', 'جيبة', 'جيبات', 'جينز', 'شورت', 'توب', 'كارديجان'
                    ]
                    final_products = [p for p in final_products if not is_match(p, all_clothing_kw)]
                    final_products.insert(0, pd)
                    total_price += float(pd["price"])
                    is_valid_clothing = True
                else:
                    tops_prods    = search_products_by_keywords(base_f_kw.copy() + ['top'], color=None, category='top')
                    bottoms_prods = search_products_by_keywords(base_f_kw.copy(), color=None, category='bottom')
                    valid_tops    = get_valid_prods(tops_prods)
                    valid_bots    = get_valid_prods(bottoms_prods)
                    valid_tops.sort(key=lambda p: get_priority(p))
                    valid_bots.sort(key=lambda p: get_priority(p))

                    sel_t = get_validated_fallback(valid_tops, 'top')
                    sel_b = get_validated_fallback(valid_bots, 'pants')

                    if sel_t and sel_b:
                        global_usage_count[sel_t.id] = global_usage_count.get(sel_t.id, 0) + 1
                        global_usage_count[sel_b.id] = global_usage_count.get(sel_b.id, 0) + 1

                        all_clothing_kw = clothing_cats + [
                            'تيشرت', 'قميص', 'بلوزة', 'جاكيت', 'سويتر', 'بنطلون',
                            'بناطيل', 'جيبة', 'جيبات', 'جينز', 'شورت', 'توب', 'كارديجان',
                            'فستان', 'عباية', 'دريس', 'عبايه'
                        ]
                        final_products = [p for p in final_products if not is_match(p, all_clothing_kw)]

                        pt = get_products_json([sel_t])[0]
                        pt["ai_reasoning"] = "Emergency Top - Est: 1000"
                        final_products.insert(0, pt)

                        pb = get_products_json([sel_b])[0]
                        pb["ai_reasoning"] = "Emergency Bottom - Est: 1000"
                        final_products.insert(1, pb)

                        total_price += float(pt["price"]) + float(pb["price"])
                        is_valid_clothing = True

            # ---- Append outfit if valid ----
            if is_valid_clothing:
                outfit_hash = tuple(sorted(p['id'] for p in final_products))
                if outfit_hash not in seen_outfits:
                    seen_outfits.add(outfit_hash)
                    final_outfits.append({
                        "style_name":  style_name,
                        "products":    final_products,
                        "total_price": total_price
                    })
                else:
                    print(f"[OUTFIT BUILDER] Discarding outfit '{style_name}' — duplicate outfit.")
            else:
                print(f"[OUTFIT BUILDER] Discarding outfit '{style_name}' — lacks valid clothing after all fallbacks.")

        return {
            "outfits":    final_outfits,
            "budget_str": budget_str
        }

    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response. Please try again."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}