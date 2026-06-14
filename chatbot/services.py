import os
import requests
import json
from .product_search import search_products_by_keywords, format_product_response, get_products_json
from django.conf import settings
from products.models import Category, Product

api_key = getattr(settings, "MISTRAL_API_KEY", None)
print(f"[DEBUG] API Key found: {api_key is not None}")

def get_bot_response(messages_history, user_message, user_image=None, user=None):
    """Generate bot response using Mistral Function Calling.
    
    Returns a JSON string with structure:
    {
        "text": "bot reply text",
        "products": [{"id": 1, "name": "...", "price": "...", "image_url": "...", "slug": "..."}]
    }
    """

    if not api_key:
        print("[DEBUG] No API key found")
        return json.dumps({"text": "عذراً، خدمة الذكاء الاصطناعي غير متصلة.", "products": []})

    try:
        active_cats = list(Category.objects.values_list('name', flat=True).distinct())
        cat_str = ", ".join(active_cats) if active_cats else "clothing, jewelry, accessories, shoes, bags"
    except Exception:
        cat_str = "clothing, jewelry, accessories, shoes, bags"

    try:
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        system_prompt = f"""You are Wella, a smart AI shopping assistant for the e-commerce store 'Dress On Me'.
The store has the following EXACT categories available in the database:
[{cat_str}]

CRITICAL RULES YOU MUST OBEY:
1. MIRROR THE USER'S LANGUAGE AND DIALECT EXACTLY. If the user speaks English, reply in English. If French, reply in French. If Saudi Arabic, reply in Saudi Arabic. If Egyptian Arabic, reply in Egyptian Arabic. ADAPT PERFECTLY to their language and dialect automatically without them asking.
2. When writing Arabic, NEVER use diacritics (التشكيل). Write text completely plain without harakat. NEVER use Russian.
3. CULTURAL ADAPTATION: If the user speaks Egyptian Arabic, act as a native Egyptian (e.g. say "اهلا بيكي", "الحمد لله"). If they speak Saudi, use Saudi greetings (e.g. "هلا والله", "يا هلا"). If they speak English, use English greetings (e.g. "Hello!"). Only reply to explicit Islamic greetings if the user initiated them. Keep it brief, natural, and introduce yourself as "Wella".
4. Be smart, polite, and friendly. Do NOT assume, guess, or use any user names.
5. You specialize in EVERYTHING the store sells.
6. If the user asks for products, use the `search_store` tool. You MUST translate their request into the MOST GENERAL exact category name from the list (e.g. choose 'Blazers' instead of 'Formal Blazer', 'Footwear' instead of 'Sneakers' or 'Formal Shoes') to ensure we don't miss any items. If they ask for 'طرحه', use 'Scarves'. This mapping is CRITICAL.
7. When the tool returns products and prices, state the exact price and currency provided by the tool without modification.
8. BE EXTREMELY PRECISE. Do NOT generalize. Map the user's request perfectly to the provided database categories.
9. Do NOT ask clarifying questions if the requested item conceptually matches a category (e.g. if they ask for 'طرحه', just search for 'Hijab Scarf' immediately).
"""
        messages = [{"role": "system", "content": system_prompt}]
        for msg in messages_history[-5:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        if user_image:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": user_message or "Analyze this picture for fashion advice"},
                    {"type": "image_url", "image_url": f"data:image/jpeg;base64,{user_image}"}
                ]
            })
            model_name = "pixtral-12b-2409"
        else:
            messages.append({"role": "user", "content": user_message})
            model_name = "mistral-large-latest"
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_store",
                    "description": "Search the database for ANY product in the store. The store is dynamic. Translate Arabic queries into English keywords, color, and category.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "keywords": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "ONLY for specific brands (e.g. 'Zara') or specific materials. DO NOT put the clothing item name, category name, or Arabic words here! Leave EMPTY if the user just asks for a category."
                            },
                            "color": {
                                "type": "string",
                                "description": "The requested color in English (e.g. 'red'). Extract this even if the user uses slang like 'حمرا'."
                            },
                            "category": {
                                "type": "string",
                                "description": "The exact English category name from the provided database list (e.g. 'Hijab Scarf', 'Skirts', 'Sneakers')."
                            },
                            "currency": {
                                "type": "string",
                                "description": "Optional 3-letter currency code (e.g., SAR, USD, TRY, AED) if the user explicitly asks for prices in a specific currency."
                            }
                        }
                    }
                }
            }
        ]
        
        data = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1024,
            "tools": tools,
            "tool_choice": "auto"
        }
        
        import time
        print(f"[MISTRAL] Sending Request 1")
        response1 = requests.post(url, headers=headers, json=data, timeout=30)
        
        if response1.status_code == 429:
            print("[MISTRAL] Rate limited on Request 1. Retrying in 2 seconds...")
            time.sleep(2)
            response1 = requests.post(url, headers=headers, json=data, timeout=30)
            
        if response1.status_code != 200:
            print(f"[MISTRAL] API Error 1: {response1.text}")
            return json.dumps({"text": "عذراً، الخادم عليه ضغط حالياً. من فضلك انتظري لحظة وجربي تاني.", "products": []})
            
        result1 = response1.json()
        response_msg = result1["choices"][0]["message"]
        # Check for Mistral tool hallucination in raw text
        content_text = response_msg.get("content", "") or ""
        if not response_msg.get("tool_calls") and "search_store" in content_text and "{" in content_text and "}" in content_text:
            import re
            match = re.search(r'search_store.*?({.*})', content_text)
            if match:
                print("[MISTRAL] Recovered hallucinated tool call!")
                response_msg["tool_calls"] = [{
                    "id": "call_hallucinated",
                    "function": {
                        "name": "search_store",
                        "arguments": match.group(1)
                    }
                }]
                response_msg["content"] = ""

        # Check if Mistral decided to call a tool
        if response_msg.get("tool_calls"):
            print("[MISTRAL] Tool call triggered!")
            
            tool_call = response_msg["tool_calls"][0]
            try:
                function_args = json.loads(tool_call["function"]["arguments"])
                keywords = function_args.get("keywords", [])
                color = function_args.get("color")
                category = function_args.get("category")
                requested_currency = function_args.get("currency")
            except json.JSONDecodeError:
                keywords = []
                color = None
                category = None
                requested_currency = None
                
            print(f"[MISTRAL] Searching DB for keywords: {keywords}, color: {color}, category: {category}")
            
            currency = 'EGP'
            if requested_currency:
                currency = requested_currency.upper()
            elif user and hasattr(user, 'profile') and user.profile.currency:
                currency = user.profile.currency

            # Execute DB search
            products = search_products_by_keywords(keywords, color=color, category=category)
            products_text = format_product_response(products, currency)
            products_json = get_products_json(products, currency, requested_color=color)
            has_products = bool(products)
            
            if not has_products:
                products_text = "لم يتم العثور على منتجات مطابقة في المتجر."
            
            # Build clean assistant message for tool call response
            assistant_tool_msg = {
                "role": "assistant",
                "content": "",
                "tool_calls": [tool_call]
            }
            messages.append(assistant_tool_msg)
                
            # Append tool result
            messages.append({
                "role": "tool",
                "name": "search_store",
                "tool_call_id": tool_call["id"],
                "content": products_text
            })
            
            # Try Request 2 for AI summary, but fallback if it fails
            try:
                data2 = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 256,
                }
                    
                print("[MISTRAL] Sending Request 2")
                response2 = requests.post(url, headers=headers, json=data2, timeout=30)
                
                if response2.status_code == 429:
                    print("[MISTRAL] Rate limited on Request 2. Retrying in 2 seconds...")
                    time.sleep(2)
                    response2 = requests.post(url, headers=headers, json=data2, timeout=30)
                
                print(f"[MISTRAL] Request 2 status: {response2.status_code}")
                
                if response2.status_code == 200:
                    result2 = response2.json()
                    final_reply = result2["choices"][0]["message"]["content"]
                else:
                    print(f"[MISTRAL] Request 2 Error: {response2.text}")
                    # Fallback: use a simple message
                    if has_products:
                        final_reply = f"لقيتلك {len(products)} منتجات ممكن تعجبك! 🛍️"
                    else:
                        final_reply = "للأسف مش لاقية المنتج ده دلوقتي. جربي تسألي عن حاجة تانية! 💫"
            except Exception as e2:
                print(f"[MISTRAL] Request 2 Exception: {e2}")
                if has_products:
                    final_reply = f"لقيتلك {len(products)} منتجات ممكن تعجبك! 🛍️"
                else:
                    final_reply = "للأسف مش لاقية المنتج ده دلوقتي."
                
            # Return JSON with text + products data
            return json.dumps({
                "text": final_reply,
                "products": products_json
            }, ensure_ascii=False)
                
        # If no tool calls, just return the response
        reply_text = response_msg.get("content", "عذراً، لم أفهم سؤالك جيداً.")
        return json.dumps({"text": reply_text, "products": []}, ensure_ascii=False)
        
    except requests.exceptions.Timeout:
        return json.dumps({"text": "عذراً، استغرق الرد وقتاً طويلاً. من فضلك حاول مرة أخرى.", "products": []})
    except Exception as e:
        print(f"[MISTRAL] Error: {e}")
        import traceback
        traceback.print_exc()
        return json.dumps({"text": "عذراً، حدث خطأ غير متوقع في النظام.", "products": []})