# Product Delete Functionality - Quick Guide

## Backend Setup ✅

The delete functionality is now ready! I've added security checks to ensure only the product owner can delete their products.

### API Endpoint

**DELETE** `/api/products/{product_id}/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
- `204 No Content` - Product deleted successfully
- `403 Forbidden` - Not the product owner
- `404 Not Found` - Product doesn't exist

### Security
- ✅ Only the seller who created the product can delete it
- ✅ Authentication required
- ✅ Ownership validation

---

## Frontend Implementation

### Example: Delete Button in Seller Dashboard

```javascript
const deleteProduct = async (productId) => {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (response.status === 204) {
      // Success - remove from UI
      alert('Product deleted successfully!');
      // Refresh product list or remove from state
      fetchProducts();
    } else if (response.status === 403) {
      alert('You can only delete your own products');
    } else {
      alert('Failed to delete product');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('An error occurred while deleting the product');
  }
};
```

### React Example

```jsx
function ProductCard({ product, onDelete }) {
  const handleDelete = async () => {
    if (window.confirm(`Delete "${product.name}"?`)) {
      try {
        await axios.delete(`/api/products/${product.id}/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        onDelete(product.id); // Update parent state
        toast.success('Product deleted successfully!');
      } catch (error) {
        if (error.response?.status === 403) {
          toast.error('You can only delete your own products');
        } else {
          toast.error('Failed to delete product');
        }
      }
    }
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleDelete} className="btn-delete">
        🗑️ Delete
      </button>
    </div>
  );
}
```

### Seller Dashboard with Delete

```jsx
function SellerDashboard() {
  const [products, setProducts] = useState([]);

  const handleDeleteProduct = (productId) => {
    // Remove from state after successful deletion
    setProducts(products.filter(p => p.id !== productId));
  };

  return (
    <div className="dashboard">
      <h2>My Products</h2>
      <div className="product-grid">
        {products.map(product => (
          <ProductCard 
            key={product.id} 
            product={product}
            onDelete={handleDeleteProduct}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Testing

### Test with cURL

```bash
# Delete a product (replace with actual product ID and token)
curl -X DELETE http://localhost:8000/api/products/1/ \
  -H "Authorization: Bearer your_access_token_here"
```

### Expected Responses

**Success (204):**
```
(No content - product deleted)
```

**Forbidden (403):**
```json
{
  "detail": "You can only delete your own products."
}
```

**Not Found (404):**
```json
{
  "detail": "Not found."
}
```

---

## Additional Features Available

The same security applies to **updating** products:

**PUT/PATCH** `/api/products/{product_id}/`
- Only the seller can update their own products
- Same authentication and ownership checks

---

## Summary

✅ Delete endpoint ready at `DELETE /api/products/{id}/`
✅ Security: Only product owner can delete
✅ Returns 204 on success
✅ Frontend just needs to call the endpoint with auth token
