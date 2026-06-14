# Product Stock Calculation Fix

## Summary

Fixed the product stock calculation to properly sum quantities from all size variants instead of using a separate stock field.

## Changes Made

### 1. Product Model (`products/models.py`)
- Added `total_stock` property that calculates sum of all variant stocks
- Added `is_in_stock` property to check if any stock is available
- These properties dynamically calculate values from ProductVariant stocks

### 2. Product Serializer (`products/serializers.py`)
- Added `total_stock` as read-only field
- Added `is_in_stock` as read-only field
- API now returns calculated stock values

### 3. Product Admin (`products/admin.py`)
- Updated admin list display to show `total_stock` instead of `stock` field
- Added `get_total_stock()` method for admin display

## How It Works

**Before:**
- Product had a `stock` field that could be out of sync with variant stocks
- Stock wasn't properly calculated from sizes

**After:**
- `Product.total_stock` = Sum of all `ProductVariant.stock` values
- If product has variants: XS(10) + S(15) + M(20) = total_stock: 45
- If no variants exist: total_stock = 0

## API Response Example

```json
{
  "id": 1,
  "name": "T-Shirt",
  "price": "29.99",
  "stock": 0,  // Old field (can be deprecated)
  "total_stock": 45,  // NEW: Calculated from variants
  "is_in_stock": true,  // NEW: Boolean availability
  "variants": [
    {"size": "XS", "stock": 10},
    {"size": "S", "stock": 15},
    {"size": "M", "stock": 20}
  ]
}
```

## Frontend Usage

Update frontend to use `total_stock` instead of `stock`:

```javascript
// Before
if (product.stock > 0) { ... }

// After
if (product.total_stock > 0) { ... }
// Or use the boolean
if (product.is_in_stock) { ... }
```

## Next Steps

- Update frontend to use `total_stock` field
- Consider removing the old `stock` field from Product model (requires migration)
- Update any stock checks in cart/order logic to use variant-specific stock
