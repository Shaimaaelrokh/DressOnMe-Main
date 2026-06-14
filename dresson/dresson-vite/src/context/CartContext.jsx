import { createContext, useContext, useState, useEffect } from "react";
import { getCart, addToCartAPI, removeFromCartAPI, updateCartItemAPI, getWishlist, toggleWishlistAPI } from "../api/api";
import { useAuth } from "./AuthContext";

export const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// Helper to map backend CartItem to frontend cart format
const mapBackendCartItem = (item) => {
  const details = item.product_details || {};
  return {
    uniqueCartId: item.id,
    id: item.product,
    cartProductIndex: 0,
    selectedSize: item.size || "",
    selectedColor: item.color || "Standard",
    quantity: item.quantity,
    cartDisplayName: details.name || "Product",
    cartPrice: details.price || 0,
    cartImage: details.image || null,
    seller_id: details.seller_id || null,
    product_details: details,
  };
};

// Helper to map backend Wishlist Product to frontend format
const mapBackendWishlistItem = (product) => {
  return {
    id: product.id,
    text: product.name,
    price: product.price,
    files: [product.image].filter(Boolean),
  };
};

export default function CartProvider({ children }) {
  const { user } = useAuth();
  
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchWishlist();
    } else {
      setCartItems([]);
      setWishlist([]);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      const cartData = await getCart();
      if (cartData && cartData.items) {
        setCartItems(cartData.items.map(mapBackendCartItem));
      }
    } catch (error) {
      console.error("Failed to fetch cart", error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const wishlistData = await getWishlist();
      if (wishlistData && wishlistData.products) {
        setWishlist(wishlistData.products.map(mapBackendWishlistItem));
      }
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
    }
  };

  const addToCart = async (product) => {
    if (!user) {
      alert("Please login to add to cart");
      return;
    }
    try {
      const cartData = {
        product: product.id,
        quantity: 1,
        size: product.selectedSize || "ONE_SIZE",
        color: product.selectedColor || "Standard"
      };
      await addToCartAPI(cartData);
      await fetchCart(); // Re-fetch to get correct backend IDs and totals
    } catch (error) {
      console.error("Failed to add to cart", error);
      alert(error.response?.data?.error || "Failed to add to cart");
    }
  };

  const removeFromCart = async (uniqueCartId) => {
    if (!user) return;
    try {
      await removeFromCartAPI(uniqueCartId);
      setCartItems(prev => prev.filter(item => item.uniqueCartId !== uniqueCartId));
    } catch (error) {
      console.error("Failed to remove from cart", error);
    }
  };

  const updateQuantity = async (uniqueCartId, amount) => {
    if (!user) return;
    try {
      const item = cartItems.find(i => i.uniqueCartId === uniqueCartId);
      if (!item) return;
      const newQuantity = Math.max(1, item.quantity + amount);
      
      await updateCartItemAPI(uniqueCartId, newQuantity);
      setCartItems(prev =>
        prev.map(i => i.uniqueCartId === uniqueCartId ? { ...i, quantity: newQuantity } : i)
      );
    } catch (error) {
      console.error("Failed to update quantity", error);
      alert(error.response?.data?.error || "Failed to update quantity");
    }
  };

  const addToWishlist = async (product) => {
    if (!user) {
      alert("Please login to manage wishlist");
      return;
    }
    try {
      // API toggles wishlist status
      const response = await toggleWishlistAPI(product.id);
      if (response && response.wishlist) {
         setWishlist(response.wishlist.products.map(mapBackendWishlistItem));
      }
    } catch (error) {
      console.error("Failed to add to wishlist", error);
    }
  };

  const removeFromWishlist = async (id) => {
    if (!user) return;
    try {
      const response = await toggleWishlistAPI(id);
      if (response && response.wishlist) {
         setWishlist(response.wishlist.products.map(mapBackendWishlistItem));
      }
    } catch (error) {
      console.error("Failed to remove from wishlist", error);
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.id === productId);
  };

  return (
    <CartContext.Provider
      value={{
        cart: cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist
      }}
    >
      {children}
    </CartContext.Provider>
  );
}