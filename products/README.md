# Products App

This app manages the catalog of clothing items, categories, reviews, and product variants (sizes and stock).

## 🌟 Features
- **Categorization**: Multi-level category hierarchy (e.g., Clothing -> Mens -> T-Shirts).
- **Inventory Management**: Track stock levels per size (`XS`, `S`, `M`, `L`, `XL`, `XXL`, `ONE_SIZE`) using `ProductVariant`.
- **Advanced Filtering**: Filter products by category, target gender, price range, seller, and available sizes.
- **Full-Text Search**: Search products by name or description.
- **Review System**: Customer rating (1-5) and review system with dynamic average score calculations.
- **Rich Media**: Supports main product images and multiple secondary images for detailed views.

## 🛠️ Key Components

### Models
- `Category`: Handles hierarchy and automatic slugification.
- `Product`: Core model featuring global attributes like price, gender target, and availability.
- `ProductVariant`: Defines the physical inventory (intersection of product, size, and color).
- `ProductImage`: Allows an unlimited number of secondary images per product.
- `Review`: Stores user ratings and feedback.

### Views
- `ProductViewSet`: Fully featured REST API for products with complex filtering, search, and variant loading.
- `CategoryViewSet`: Endpoint for retrieving the nested category tree.

## 📡 API Endpoints & Filtering
- **List/Search**: `GET /api/products/?search=shirt`
- **By Gender**: `GET /api/products/?gender=FEMALE`
- **By Size**: `GET /api/products/?variants__size=L`
- **By Seller**: `GET /api/products/?seller=1`
- **Multi-Filter**: `GET /api/products/?gender=MALE&variants__size=M&category=2`

> [!TIP]
> The `total_stock` and `is_in_stock` properties on the Product model are calculated dynamically based on its variants.
