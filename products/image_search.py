import torch
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import io
import torch.nn.functional as F
import os
from django.conf import settings

# Global cache for the model and embeddings
_MODEL = None
_TRANSFORM = None
_PRODUCT_EMBEDDINGS = {} # {product_id: { 'tensor': tensor, 'image_path': str }}

def _get_model_and_transform():
    global _MODEL, _TRANSFORM
    if _MODEL is None:
        # Load a pretrained ResNet50 model
        weights = models.ResNet50_Weights.DEFAULT
        _MODEL = models.resnet50(weights=weights)
        
        # We only want to extract features, so we replace the final fully connected layer 
        # with an Identity layer to get the 2048-dimensional feature vector.
        import torch.nn as nn
        _MODEL.fc = nn.Identity()
        
        _MODEL.eval()
        
        # Standard ImageNet transforms
        _TRANSFORM = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    return _MODEL, _TRANSFORM

def extract_features(image):
    """
    Extracts a 2048-dimensional feature vector from an image.
    :param image: PIL Image
    """
    model, transform = _get_model_and_transform()
    img_t = transform(image)
    batch_t = torch.unsqueeze(img_t, 0)
    
    with torch.no_grad():
        features = model(batch_t)
        # Normalize the feature vector for cosine similarity
        features = F.normalize(features, p=2, dim=1)
    
    return features.squeeze(0)

def load_all_product_embeddings():
    """
    Loads embeddings for all products into the in-memory cache.
    """
    from .models import Product
    global _PRODUCT_EMBEDDINGS
    
    # Simple lazy sync: we just rebuild it completely if a visual search is requested 
    # and products have changed or it's empty. In a production app, we'd use signals to update incrementally.
    products = Product.objects.filter(image__isnull=False).exclude(image='')
    
    for product in products:
        if product.id not in _PRODUCT_EMBEDDINGS:
            try:
                # Open the image file from the Django storage
                img_path = product.image.path
                if os.path.exists(img_path):
                    image = Image.open(img_path).convert('RGB')
                    features = extract_features(image)
                    _PRODUCT_EMBEDDINGS[product.id] = features
            except Exception as e:
                print(f"Error processing image for product {product.id}: {e}")
                
def find_similar_products(uploaded_image_bytes, top_k=10):
    """
    Finds top_k similar products given an uploaded image.
    :param uploaded_image_bytes: Bytes of the uploaded image
    :param top_k: Number of products to return
    :return: List of tuples (product_id, similarity_score)
    """
    try:
        image = Image.open(io.BytesIO(uploaded_image_bytes)).convert('RGB')
    except Exception as e:
        raise ValueError("Invalid image file")

    query_features = extract_features(image)
    
    # Ensure cache is loaded
    # For a small DB, reloading missing ones is fast
    load_all_product_embeddings()
    
    results = []
    for pid, features in _PRODUCT_EMBEDDINGS.items():
        # Cosine similarity between two normalized vectors is just their dot product
        similarity = torch.dot(query_features, features).item()
        results.append((pid, similarity))
    
    # Sort by descending similarity
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:top_k]
