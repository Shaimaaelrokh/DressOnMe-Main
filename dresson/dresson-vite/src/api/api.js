import api from './axios';

// --- AUTH API ---
export const loginUser = async (email, password) => {
    const response = await api.post('users/login/', { email, password });
    return response.data;
};

export const logoutUser = async (refreshToken) => {
    const response = await api.post('users/logout/', { refresh: refreshToken });
    return response.data;
};

export const verifyOTP = async (email, otp) => {
    const response = await api.post('users/verify-otp/', { email, otp });
    return response.data;
};

export const registerUser = async (userData) => {
    const response = await api.post('users/register/', userData);
    return response.data;
};

export const toggleFollow = async (userId) => {
    const response = await api.post(`users/${userId}/follow/`);
    return response.data;
};

// --- USER PROFILE API ---
export const getUserProfile = async () => {
    const response = await api.get('users/me/');
    return response.data;
};

export const updateUserProfile = async (profileData) => {
    const response = await api.put('users/profile/', profileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Password Reset
export const forgotPassword = async (email) => {
    const response = await api.post('users/forgot-password/', { email });
    return response.data;
};

export const resetPassword = async (email, otp, new_password) => {
    const response = await api.post('users/reset-password/', { email, otp, new_password });
    return response.data;
};

// Token Refresh (for JWT refresh)
export const refreshToken = async (refreshToken) => {
    const response = await api.post('users/token/refresh/', { refresh: refreshToken });
    return response.data;
};

// Public User Profile
export const getPublicUserProfile = async (userId) => {
    const response = await api.get(`users/${userId}/`);
    return response.data;
};

// Verify Dashboard PIN
export const verifyDashboardPin = async (pin) => {
    const response = await api.post('users/verify-dashboard-pin/', { pin });
    return response.data;
};

let cachedCountries = null;
export const getCountries = async () => {
    if (cachedCountries) return cachedCountries;
    try {
        const response = await api.get('users/countries/');
        cachedCountries = response.data;
        return cachedCountries;
    } catch (error) {
        console.error("Error fetching countries:", error);
        throw error;
    }
};


// Calculate Shipping
export const calculateShipping = async (country, region) => {
    try {
        const response = await api.post('orders/calculate-shipping/', { country, region });
        return response.data;
    } catch (error) {
        console.error("Error calculating shipping:", error);
        throw error;
    }
};

// --- PRODUCTS API ---
let cachedCategories = null;
export const getCategories = async () => {
    if (cachedCategories) return cachedCategories;
    try {
        const response = await api.get('products/categories/');
        cachedCategories = response.data;
        return cachedCategories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};

// Category CRUD operations (for admin)
export const createCategory = async (categoryData) => {
    const response = await api.post('products/categories/', categoryData);
    return response.data;
};

export const getCategory = async (categoryId) => {
    const response = await api.get(`products/categories/${categoryId}/`);
    return response.data;
};

export const updateCategory = async (categoryId, categoryData) => {
    const response = await api.put(`products/categories/${categoryId}/`, categoryData);
    return response.data;
};

export const partialUpdateCategory = async (categoryId, categoryData) => {
    const response = await api.patch(`products/categories/${categoryId}/`, categoryData);
    return response.data;
};

export const deleteCategory = async (categoryId) => {
    await api.delete(`products/categories/${categoryId}/`);
    return true;
};

export const getProducts = async (page = 1, search = "", options = {}) => {
    try {
        let url = `products/?page=${page}&search=${encodeURIComponent(search)}`;
        if (options.category) url += `&category=${options.category}`;
        if (options.gender) url += `&gender=${options.gender}`;
        // Support price filtering if backend supports it. Assume min_price and max_price.
        if (options.min_price) url += `&min_price=${options.min_price}`;
        if (options.max_price) url += `&max_price=${options.max_price}`;
        if (options.is_sale) url += `&is_sale=true`;
        
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

export const visualSearch = async (imageFile) => {
    try {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const response = await api.post('products/visual-search/', formData);
        return response.data;
    } catch (error) {
        console.error("Error performing visual search:", error);
        return { results: [] };
    }
};


export const buildOutfit = async (outfitData) => {
    try {
        const response = await api.post('products/build-outfit/', outfitData);
        return response.data;
    } catch (error) {
        console.error("Error building outfit:", error);
        throw error;
    }
};

export const getSellerProducts = async (sellerId) => {
    try {
        let allResults = [];
        let nextUrl = `products/?seller=${sellerId}`;
        while (nextUrl) {
            const response = await api.get(nextUrl);
            const data = response.data;
            if (data && data.results) {
                allResults = allResults.concat(data.results);
                nextUrl = data.next ? data.next.replace(api.defaults.baseURL || "http://127.0.0.1:8000/api/", "") : null;
            } else {
                return data; // Not paginated
            }
        }
        return allResults;
    } catch (error) {
        console.error("Error fetching seller products:", error);
        return [];
    }
};

export const getProduct = async (productId) => {
    const response = await api.get(`products/${productId}/`);
    return response.data;
};

export const addProductReview = async (productId, reviewData) => {
    try {
        const isFormData = reviewData instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        const response = await api.post(`products/${productId}/reviews/`, reviewData, config);
        return response.data;
    } catch (error) {
        console.error("Error adding product review:", error);
        throw error;
    }
};

export const getProductReviews = async (productId) => {
    const response = await api.get(`products/${productId}/reviews/`);
    return response.data;
};

export const addProduct = async (productData) => {
    try {
        const response = await api.post('products/', productData);
        return response.data;
    } catch (error) {
        console.error("Error adding product:", error);
        throw error;
    }
};

export const updateProduct = async (productId, productData) => {
    try {
        const response = await api.patch(`products/${productId}/`, productData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
};

export const partialUpdateProduct = async (productId, productData) => {
    try {
        const response = await api.patch(`products/${productId}/`, productData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
};

export const deleteProduct = async (productId) => {
    try {
        await api.delete(`products/${productId}/`);
        return true;
    } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
};


// --- ORDERS & CART API ---
// Cart operations
export const getCartList = async () => {
    const response = await api.get('orders/cart/');
    return response.data;
};

export const getCart = async () => {
    try {
        const response = await api.get('orders/cart/current/');
        return response.data;
    } catch (error) {
        console.error("Error fetching cart:", error);
        return { items: [] };
    }
};

export const createCart = async () => {
    const response = await api.post('orders/cart/');
    return response.data;
};

export const getCartById = async (cartId) => {
    const response = await api.get(`orders/cart/${cartId}/`);
    return response.data;
};

export const updateCart = async (cartId, cartData) => {
    const response = await api.put(`orders/cart/${cartId}/`, cartData);
    return response.data;
};

export const partialUpdateCart = async (cartId, cartData) => {
    const response = await api.patch(`orders/cart/${cartId}/`, cartData);
    return response.data;
};

export const deleteCart = async (cartId) => {
    await api.delete(`orders/cart/${cartId}/`);
    return true;
};

// Cart Item operations
export const getCartItems = async () => {
    const response = await api.get('orders/cart-items/');
    return response.data;
};

export const addToCartAPI = async (cartData) => {
    try {
        const response = await api.post('orders/cart-items/', cartData);
        return response.data;
    } catch (error) {
        console.error("Error adding to cart:", error);
        throw error;
    }
};

export const getCartItem = async (itemId) => {
    const response = await api.get(`orders/cart-items/${itemId}/`);
    return response.data;
};

export const removeFromCartAPI = async (itemId) => {
    try {
        await api.delete(`orders/cart-items/${itemId}/`);
        return true;
    } catch (error) {
        console.error("Error removing from cart:", error);
        throw error;
    }
};

export const updateCartItemAPI = async (itemId, quantity) => {
    try {
        const response = await api.patch(`orders/cart-items/${itemId}/`, { quantity });
        return response.data;
    } catch (error) {
        console.error("Error updating cart item:", error);
        throw error;
    }
};

export const putUpdateCartItem = async (itemId, cartData) => {
    const response = await api.put(`orders/cart-items/${itemId}/`, cartData);
    return response.data;
};

// Wishlist operations
export const getWishlistList = async () => {
    const response = await api.get('orders/wishlist/');
    return response.data;
};

export const createWishlist = async () => {
    const response = await api.post('orders/wishlist/');
    return response.data;
};

export const getWishlist = async () => {
    try {
        const response = await api.get('orders/wishlist/mine/');
        return response.data;
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return { products: [] };
    }
};

export const getWishlistById = async (wishlistId) => {
    const response = await api.get(`orders/wishlist/${wishlistId}/`);
    return response.data;
};

export const updateWishlist = async (wishlistId, wishlistData) => {
    const response = await api.put(`orders/wishlist/${wishlistId}/`, wishlistData);
    return response.data;
};

export const partialUpdateWishlist = async (wishlistId, wishlistData) => {
    const response = await api.patch(`orders/wishlist/${wishlistId}/`, wishlistData);
    return response.data;
};

export const deleteWishlist = async (wishlistId) => {
    await api.delete(`orders/wishlist/${wishlistId}/`);
    return true;
};

export const toggleWishlistAPI = async (productId) => {
    try {
        const response = await api.post('orders/wishlist/toggle_product/', { product_id: productId });
        return response.data;
    } catch (error) {
        console.error("Error toggling wishlist:", error);
        throw error;
    }
};

// Order operations
export const getOrders = async () => {
    const response = await api.get('orders/orders/');
    return response.data;
};

export const createOrder = async (orderData) => {
    const response = await api.post('orders/orders/', orderData);
    return response.data;
};

export const getOrder = async (orderId) => {
    const response = await api.get(`orders/orders/${orderId}/`);
    return response.data;
};

export const updateOrder = async (orderId, orderData) => {
    const response = await api.put(`orders/orders/${orderId}/`, orderData);
    return response.data;
};

export const partialUpdateOrder = async (orderId, orderData) => {
    const response = await api.patch(`orders/orders/${orderId}/`, orderData);
    return response.data;
};

export const deleteOrder = async (orderId) => {
    await api.delete(`orders/orders/${orderId}/`);
    return true;
};

export const getSellerOrders = async () => {
    try {
        const response = await api.get('orders/seller-orders/');
        return response.data;
    } catch (error) {
        console.error("Error fetching seller orders:", error);
        return [];
    }
};

// Create Stripe Checkout Session
export const createCheckoutSession = async (shippingRateId, couponCode = null, shippingDetails = null) => {
    try {
        const payload = {
            shipping_rate_id: shippingRateId
        };
        if (couponCode) {
            payload.coupon_code = couponCode;
        }
        if (shippingDetails) {
            payload.shipping_details = shippingDetails;
        }
        const response = await api.post('orders/checkout-session/', payload);
        return response.data;
    } catch (error) {
        console.error("Error creating checkout session:", error);
        throw error;
    }
};

export const stripeWebhook = async (payload, signature) => {
    const response = await api.post('orders/stripe-webhook/', payload, {
        headers: { 'Stripe-Signature': signature }
    });
    return response.data;
};

// Shipping and Coupons
export const getShippingRates = async () => {
    try {
        const response = await api.get('orders/shipping-rates/');
        return response.data;
    } catch (error) {
        console.error("Error fetching shipping rates:", error);
        return [];
    }
};

export const validateCoupon = async (code) => {
    try {
        const response = await api.post('orders/coupons/validate/', { code });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// --- COMMUNITY API ---
// Post operations
export const getPosts = async () => {
    try {
        let allResults = [];
        let nextUrl = 'community/posts/';
        while (nextUrl) {
            const response = await api.get(nextUrl);
            const data = response.data;
            if (data && data.results) {
                allResults = allResults.concat(data.results);
                nextUrl = data.next ? data.next.replace(api.defaults.baseURL || "http://127.0.0.1:8000/api/", "") : null;
            } else {
                return data; // Not paginated
            }
        }
        return allResults;
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

export const addPost = async (newPostData) => {
    try {
        const response = await api.post('community/posts/', newPostData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error adding post:", error);
        throw error;
    }
};

export const getPost = async (postId) => {
    const response = await api.get(`community/posts/${postId}/`);
    return response.data;
};

export const updatePostInAPI = async (postId, updatedData) => {
    try {
        const response = await api.patch(`community/posts/${postId}/`, updatedData);
        return response.data;
    } catch (error) {
        console.error("Error updating post:", error);
        throw error;
    }
};

export const putUpdatePost = async (postId, postData) => {
    const response = await api.put(`community/posts/${postId}/`, postData);
    return response.data;
};

export const deletePost = async (postId) => {
    try {
        await api.delete(`community/posts/${postId}/`);
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
};

export const toggleLikePost = async (postId) => {
    try {
        const response = await api.post(`community/posts/${postId}/like/`);
        return response.data;
    } catch (error) {
        console.error("Error toggling like:", error);
        throw error;
    }
};

export const toggleDislikePost = async (postId) => {
    try {
        const response = await api.post(`community/posts/${postId}/dislike/`);
        return response.data;
    } catch (error) {
        console.error("Error toggling dislike:", error);
        throw error;
    }
};
export const toggleDislikeProduct = async (productId) => {
    try {
        const response = await api.post(`products/${productId}/dislike/`);
        return response.data;
    } catch (error) {
        console.error("Error toggling product dislike:", error);
        throw error;
    }
};

export const toggleLikeProduct = async (productId) => {
    try {
        const response = await api.post(`products/${productId}/like/`);
        return response.data;
    } catch (error) {
        console.error("Error toggling product like:", error);
        throw error;
    }
};


export const getPostComments = async (postId) => {
    const response = await api.get(`community/posts/${postId}/comments/`);
    return response.data;
};

export const addCommentToPost = async (postId, commentData) => {
    try {
        const isFormData = commentData instanceof FormData;
        const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        const response = await api.post(`community/posts/${postId}/add_comment/`, commentData, config);
        return response.data;
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};

// Comment operations
export const getComments = async () => {
    const response = await api.get('community/comments/');
    return response.data;
};

export const addComment = async (commentData) => {
    const response = await api.post('community/comments/', commentData);
    return response.data;
};

export const getComment = async (commentId) => {
    const response = await api.get(`community/comments/${commentId}/`);
    return response.data;
};

export const updateComment = async (commentId, commentData) => {
    const response = await api.put(`community/comments/${commentId}/`, commentData);
    return response.data;
};

export const partialUpdateComment = async (commentId, commentData) => {
    const response = await api.patch(`community/comments/${commentId}/`, commentData);
    return response.data;
};

export const deleteComment = async (commentId) => {
    await api.delete(`community/comments/${commentId}/`);
    return true;
};

// --- MAKEUP HISTORY API ---
export const getMakeupHistory = async () => {
    try {
        const response = await api.get('makeup/history/');
        return response.data;
    } catch (error) {
        console.error("Error fetching makeup history:", error);
        return [];
    }
};

export const createMakeupHistory = async (historyData) => {
    const response = await api.post('makeup/history/', historyData);
    return response.data;
};

export const getMakeupHistoryItem = async (historyId) => {
    const response = await api.get(`makeup/history/${historyId}/`);
    return response.data;
};

export const updateMakeupHistory = async (historyId, historyData) => {
    const response = await api.put(`makeup/history/${historyId}/`, historyData);
    return response.data;
};

export const partialUpdateMakeupHistory = async (historyId, historyData) => {
    const response = await api.patch(`makeup/history/${historyId}/`, historyData);
    return response.data;
};

export const deleteMakeupHistory = async (historyId) => {
    try {
        await api.delete(`makeup/history/${historyId}/`);
        return true;
    } catch (error) {
        console.error("Error deleting makeup history:", error);
        throw error;
    }
};

// --- CONTACT API ---
export const submitContactForm = async (contactData) => {
    try {
        const response = await api.post('users/contact/', contactData);
        return response.data;
    } catch (error) {
        console.error("Error submitting contact form:", error);
        throw error;
    }
};

// --- SELLER COUPONS API ---
export const getSellerCoupons = async () => {
    try {
        const response = await api.get('orders/seller-coupons/');
        return response.data;
    } catch (error) {
        console.error("Error fetching seller coupons:", error);
        throw error;
    }
};

export const createSellerCoupon = async (couponData) => {
    try {
        const response = await api.post('orders/seller-coupons/', couponData);
        return response.data;
    } catch (error) {
        console.error("Error creating seller coupon:", error);
        throw error;
    }
};

export const deleteSellerCoupon = async (couponId) => {
    try {
        await api.delete(`orders/seller-coupons/${couponId}/`);
        return true;
    } catch (error) {
        console.error("Error deleting seller coupon:", error);
        throw error;
    }
};