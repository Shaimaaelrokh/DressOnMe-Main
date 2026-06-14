import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaShoppingCart, FaStar } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import "../styles/Shop.css";

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, addToCart } = useCart();
  const [toast, setToast] = useState({ show: false, message: "" });

  // دالة لعرض Toast
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 2000);
  };

  // دالة للحصول على الصورة الصحيحة
  const getProductImage = (item) => {
    // إذا كان المنتج من البروفايل (عنده files)
    if (item.files && item.files.length > 0) {
      return item.files[0]; // base64 string
    }
    // إذا كان من Shop (عنده image)
    if (item.image) {
      return item.image;
    }
    // صورة افتراضية
    return "https://via.placeholder.com/300?text=No+Image";
  };

  // دالة للحصول على اسم المنتج
  const getProductName = (item) => {
    return item.name || item.text || "product";
  };

  // دالة للحصول على السعر
  const getProductPrice = (item) => {
    return parseFloat(item.price) || 0;
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    showToast("Added successfully");
  };

  const handleRemoveFromWishlist = (id) => {
    removeFromWishlist(id);
    showToast("Removed from wishlist");
  };

  return (
    <div className="shop-container">
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          color: "white",
          padding: "20px 40px",
          borderRadius: "12px",
          fontSize: "18px",
          fontWeight: "bold",
          zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          animation: "fadeInOut 2s ease-in-out",
          textAlign: "center"
        }}>
          {toast.message}
        </div>
      )}

      <div className="glass-overlay" style={{ minHeight: "100vh", padding: "20px" }}>
        <div className="main-border-frame">
          <header className="navbar">
            <div className="brand-logo" onClick={() => navigate("/shop")} style={{cursor: 'pointer'}}>
              My Wishlist 
            </div>
            <button className="btn-view-side" onClick={() => navigate("/shop")}>
              Back to Shop
            </button>
          </header>

          <section className="products-grid" style={{ marginTop: "40px" }}>
            {wishlist && wishlist.length > 0 ? (
              wishlist.map((item) => (
                <div className="product-card" key={item.id}>
                  <div className="product-img-container">
                    <img 
                      src={getProductImage(item)} 
                      alt={getProductName(item)}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300?text=Image+Error";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  </div>
                  <div className="product-details">
                    <span className="brand-tag">{item.brand || item.user || "Brand"}</span>
                    <h4 className="item-name">{getProductName(item)}</h4>
                    <div className="rating-stars">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className={i < (item.rating || 0) ? "star yellow" : "star gray"} />
                      ))}
                    </div>
                    <div className="card-footer">
                      <span className="price-text">${getProductPrice(item).toFixed(2)}</span>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button 
                          className="add-btn" 
                          style={{ backgroundColor: "#ff4d4d" }} 
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          title="حذف من قائمة الأمنيات"
                        >
                          <FaTrash />
                        </button>
                        <button 
                          className="add-btn" 
                          onClick={() => handleAddToCart(item)}
                          title="إضافة للسلة"
                        >
                          <FaShoppingCart />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="hero-text-block" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
                <h2 className="main-title" style={{ fontSize: "2rem" }}>Wishlist is empty</h2>
                <p style={{ fontSize: "1.2rem", marginBottom: "20px", opacity: 0.8 , color:"white" }}>
                 You haven't added any products to your wishlist yet
                </p>
                <button className="btn-view-side" onClick={() => navigate("/shop")}>Start Shopping Now</button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* إضافة CSS للـ Animation */}
      <style>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          10% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          90% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default WishlistPage;