import requests
import sys

url = 'http://127.0.0.1:8000/api/products/visual-search/'

try:
    # First, let's find an existing product image to test with
    from products.models import Product
    product = Product.objects.exclude(image='').first()
    if not product:
        print("No products with images found.")
        sys.exit(1)
        
    img_path = product.image.path
    print(f"Testing with image: {img_path}")
    
    with open(img_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(url, files=files)
        
    print("Status Code:", response.status_code)
    try:
        data = response.json()
        if 'results' in data:
            print("Found", len(data['results']), "results")
            if len(data['results']) > 0:
                print("First result ID:", data['results'][0]['id'])
        else:
            print("Response:", data)
    except Exception as e:
        print("Error parsing JSON:", e)
        print("Text:", response.text[:200])

except Exception as e:
    import traceback
    traceback.print_exc()
