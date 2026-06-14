import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaShoppingCart, FaStar, FaCartPlus, FaHeart, FaSearch, FaCamera, FaTimes } from "react-icons/fa";
import { useCart } from "../context/CartContext";
import { getProducts, visualSearch } from "../api/api";
import Fuse from "fuse.js";
import "../styles/Shop.css";

// استيراد الصور
import mainBg from "../assets/lery.jpg";
import sideImg1 from "../assets/azza.jpg";
import sideImg2 from "../assets/zz.jpg";
import sideImg3 from "../assets/aa.jpg";
import VirtualTryOnModal from "../components/VirtualTryOnModal";

// --- Custom Dropdown Component ---
const CustomDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  // Find currently selected label
  let selectedLabel = placeholder;
  if (value) {
    for (const opt of options) {
      if (opt.isGroup) {
        const child = opt.children.find(c => c.value == value);
        if (child) selectedLabel = child.label;
      } else {
        if (opt.value == value) selectedLabel = opt.label;
      }
    }
  }

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <div className="custom-dropdown-header chic-select" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedLabel}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-dropdown-list">
          <div className="custom-dropdown-item" onClick={() => handleSelect("")}>
            {placeholder}
          </div>
          {options.map((opt, index) => {
            if (opt.isGroup) {
              return (
                <div key={`group-${index}`} className="custom-dropdown-group">
                  <div className="custom-dropdown-group-label">{opt.label}</div>
                  {opt.children.map(child => (
                    <div
                      key={child.value}
                      className={`custom-dropdown-item child ${value == child.value ? 'selected' : ''}`}
                      onClick={() => handleSelect(child.value)}
                    >
                      {child.label}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div
                key={opt.value}
                className={`custom-dropdown-item ${value == opt.value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Shop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, addToCart, addToWishlist, wishlist, isInWishlist } = useCart();
  const [activeTab, setActiveTab] = useState("shop");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(location.state?.search || "");
  const [filterSale, setFilterSale] = useState(location.state?.filter === "sale");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [tryOnProduct, setTryOnProduct] = useState(null);
  
  // Visual Search States
  const [isVisualSearch, setIsVisualSearch] = useState(false);
  const [visualSearchPreview, setVisualSearchPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Fix layout and scroll position when entering the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setSearchTerm(location.state?.search || "");
    setFilterSale(location.state?.filter === "sale");
    setCurrentPage(1);
  }, [location.state]);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [categoriesData, setCategoriesData] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  // Fetch categories for the filter dropdown
  useEffect(() => {
    if (!categoriesLoaded) {
      import("../api/api").then(({ getCategories }) => {
        getCategories().then(data => {
          const cats = data?.results || data || [];
          setCategoriesData(Array.isArray(cats) ? cats : []);
          setCategoriesLoaded(true);
        });
      });
    }
  }, [categoriesLoaded]);

  // ✅ جلب المنتجات من API الحقيقي مع دعم البحث والفلتر
  useEffect(() => {
    if (isVisualSearch) return; // Skip normal fetching if in visual search mode

    const delayDebounceFn = setTimeout(() => {
      const fetchProducts = async () => {
        setLoading(true);
        try {
          const res = await getProducts(currentPage, searchTerm, {
            category: filterCategory,
            gender: filterGender,
            is_sale: filterSale
          });
          const productsData = res.results || (Array.isArray(res) ? res : []);

          // Update pagination states if returned from backend
          if (res.count !== undefined) {
            // PAGE_SIZE is 12 in settings.py
            setTotalPages(Math.ceil(res.count / 12));
            setNextPage(res.next);
            setPrevPage(res.previous);
          }

          const formattedProducts = productsData.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price) || 0,
            priceBeforeSale: parseFloat(product.price_before_sale) || 0,
            rating: product.average_rating || 0,
            image: product.image || (product.secondary_images?.[0]?.image) || "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20fill%3D%22%23dddddd%22%20width%3D%22300%22%20height%3D%22300%22%2F%3E%3C%2Fsvg%3E",
            secondary_images: product.secondary_images || [],
            brand: product.seller_email?.split('@')[0] || product.seller_brand_name || "Seller",
            seller_id: product.seller_id,
            seller_email: product.seller_email,
            total_stock: product.total_stock || 0,
            is_in_stock: product.is_in_stock || false,
            variants: product.variants || [],
            available_colors: product.available_colors || [],
            category: product.category_name,
            category_id: product.category,
            gender: product.gender,
            text: product.description || product.name,
            tags: [product.category_name, product.gender?.toLowerCase()].filter(Boolean)
          }));

          setProducts(formattedProducts);
          setFilteredProducts(formattedProducts);

        } catch (err) {
          console.error('Error fetching products:', err);
          setToast({ show: true, message: "Failed to load products" });
          setTimeout(() => setToast({ show: false, message: "" }), 3000);
        } finally {
          setLoading(false);
        }
      };

      fetchProducts();
    }, 500); // Debounce delay 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, filterCategory, filterGender, filterSale, isVisualSearch]);

  // ✅ إضافة إلى السلة
  const handleAddToCart = async (product, e) => {
    if (e) e.stopPropagation();

    // التحقق من وجود مخزون
    if (!product.is_in_stock && product.total_stock === 0) {
      setToast({ show: true, message: "Out of stock!" });
      setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return;
    }

    // تجهيز المنتج للإضافة إلى السلة
    const formattedProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      priceBeforeSale: product.priceBeforeSale || 0,
      image: product.image,
      quantity: 1,
      selectedSize: null, // المستخدم هيختار من المودال
      selectedColor: null,
      is_in_stock: product.is_in_stock,
      variants: product.variants
    };

    const result = await addToCart(formattedProduct);
    if (result !== false) {
      setToast({ show: true, message: "Added to cart!" });
      setTimeout(() => setToast({ show: false, message: "" }), 2000);
    }
  };

  // ✅ إضافة/إزالة من المفضلة
  const handleWishlistClick = async (product, e) => {
    if (e) e.stopPropagation();

    const formattedProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      priceBeforeSale: product.priceBeforeSale || 0,
      image: product.image,
      rating: product.rating
    };

    const result = await addToWishlist(formattedProduct);
    const message = isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist";
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2000);
  };

  const handleNavClick = (path, tabName) => {
    setActiveTab(tabName);
    navigate(path);
  };

  const handleVisualSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsVisualSearch(true);
    setLoading(true);
    
    const previewUrl = URL.createObjectURL(file);
    setVisualSearchPreview(previewUrl);

    try {
      const res = await visualSearch(file);
      const productsData = res.results || (Array.isArray(res) ? res : []);
      
      const formattedProducts = productsData.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price) || 0,
        priceBeforeSale: parseFloat(product.price_before_sale) || 0,
        rating: product.average_rating || 0,
        image: product.image || (product.secondary_images?.[0]?.image) || "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20fill%3D%22%23dddddd%22%20width%3D%22300%22%20height%3D%22300%22%2F%3E%3C%2Fsvg%3E",
        secondary_images: product.secondary_images || [],
        brand: product.seller_email?.split('@')[0] || product.seller_brand_name || "Seller",
        seller_id: product.seller_id,
        seller_email: product.seller_email,
        total_stock: product.total_stock || 0,
        is_in_stock: product.is_in_stock || false,
        variants: product.variants || [],
        available_colors: product.available_colors || [],
        category: product.category_name,
        category_id: product.category,
        gender: product.gender,
        text: product.description || product.name,
        tags: [product.category_name, product.gender?.toLowerCase()].filter(Boolean)
      }));

      setProducts(formattedProducts);
      setFilteredProducts(formattedProducts);
      setTotalPages(1);
    } catch (err) {
      console.error('Error with visual search:', err);
      setToast({ show: true, message: "Failed to perform visual search" });
      setTimeout(() => setToast({ show: false, message: "" }), 3000);
      clearVisualSearch();
    } finally {
      setLoading(false);
    }
  };

  const clearVisualSearch = () => {
    setIsVisualSearch(false);
    if (visualSearchPreview) {
      URL.revokeObjectURL(visualSearchPreview);
      setVisualSearchPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setCurrentPage(1);
  };

  return (
    <div className="shop-container">
      {toast.show && (
        <div className="toast-overlay">
          <div className="toast-box">{toast.message}</div>
        </div>
      )}

      <div className="background-wrapper">
        <img src={mainBg} alt="Background" className="main-bg-img" />
      </div>

      <div className="glass-overlay">
        <div className="main-border-frame">

          <header className="navbar original-shop-navbar">
            <div className="brand-logo" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>Dress On Me</div>

            <nav className={`nav-links-pill ${menuOpen ? 'mobile-expanded' : ''}`}>
              <span className={activeTab === "home" ? "nav-item active" : "nav-item"}
                style={{ cursor: "pointer" }}
                onClick={() => { handleNavClick("/home", "home"); setMenuOpen(false); }}>Home</span>

              <span className={activeTab === "shop" ? "nav-item active" : "nav-item"}
                style={{ cursor: "pointer" }}
                onClick={() => { handleNavClick("/shop", "shop"); setMenuOpen(false); }}>Shop</span>

              <span className={activeTab === "contact" ? "nav-item active" : "nav-item"}
                style={{ cursor: "pointer" }}
                onClick={() => { handleNavClick("/contact", "contact"); setMenuOpen(false); }}>Contact</span>


              <div className="nav-icons-group">
                <FaUserCircle className="profile-icon" style={{ cursor: "pointer" }} onClick={() => navigate("/profile")} />
                <div className="cart-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/wish")}>
                  <FaHeart className="cart-icon" />
                  {wishlist?.length > 0 && <span className="cart-badge">{wishlist.length}</span>}
                </div>
                <div className="cart-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/cart")}>
                  <FaShoppingCart className="cart-icon" />
                  {cart?.length > 0 && <span className="cart-badge">{cart.length}</span>}
                </div>
              </div>
            </nav>

            <div className="social-media-group">
              <a href="#!"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="#!"><i className="fa-brands fa-instagram"></i></a>
              <a href="#!"><i className="fa-brands fa-x-twitter"></i></a>
            </div>

            {/* Mobile Hamburger Toggle for Navbar Links */}
            <button
              className="shop-hamburger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
              <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
              <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
            </button>
          </header>

          <div className="layout-grid">
            <section className="hero-text-block">
              <h1 className="main-title">delicate <br /> Pieces</h1>
              <div className="description-meta">
                <h3 className="sub-brand">Elegant Pieces</h3>
                <p className="main-para">
                  Those pieces will be an unforgettable gift that will preserve wonderful moments.
                </p>
              </div>
            </section>

            <aside className="visual-side-panel">
              <div className="side-card-large">
                <div className="card-image-wrapper">
                  <img src={sideImg1} alt="exquisite" className="side-main-img" />
                </div>
                <div className="card-content-box">
                  <p>PLUNGE INTO THE WORLD OF EXQUISITE</p>
                  <button className="btn-view-side" onClick={() => {
                    navigate("/shop", { state: { search: "jewelry" } });
                    setTimeout(() => {
                      const searchSection = document.querySelector('.search-section');
                      if (searchSection) {
                        searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}>View More</button>
                </div>
              </div>
              <div className="side-gallery-row">
                <div className="gallery-box">
                  <img src={sideImg2} alt="View 1" className="gallery-img-item" />
                </div>
                <div className="gallery-box">
                  <img src={sideImg3} alt="View 2" className="gallery-img-item" />
                </div>
              </div>
            </aside>
          </div>

          {/* شريط البحث */}
          <div className="search-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '10px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '450px', display: 'flex', alignItems: 'center' }}>
              <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }} />
              <input
                type="text"
                placeholder="Search by product name or category (e.g., bags, dresses)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (isVisualSearch) clearVisualSearch();
                  setCurrentPage(1);
                }}
                disabled={isVisualSearch}
                style={{
                  width: '100%',
                  padding: '14px 45px 14px 50px',
                  borderRadius: '30px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: isVisualSearch ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  color: isVisualSearch ? '#888' : '#fff',
                  outline: 'none',
                  fontSize: '1rem'
                }}
              />
              <FaCamera 
                style={{ 
                  position: 'absolute', 
                  right: '15px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: isVisualSearch ? '#ff4444' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }} 
                onClick={() => isVisualSearch ? clearVisualSearch() : fileInputRef.current?.click()}
                title={isVisualSearch ? "Clear Image Search" : "Search by Image"}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleVisualSearch} 
              />
            </div>
            
            {isVisualSearch && visualSearchPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff' }}>Visual Search Active</span>
                <img src={visualSearchPreview} alt="Search Query" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '5px' }} />
                <FaTimes style={{ cursor: 'pointer', color: '#ff4444' }} onClick={clearVisualSearch} />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="filters-section d-flex justify-content-center gap-3 mb-4">
            <CustomDropdown
              placeholder="All Categories"
              value={filterCategory}
              onChange={(val) => { setFilterCategory(val); setCurrentPage(1); }}
              options={categoriesData.map(cat => {
                const cleanName = (name) => name ? name.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : "Unknown";
                const catName = cleanName(cat.name);

                const getFlatCategories = (catObj, depth = 1) => {
                  let items = [];
                  if (catObj.children && catObj.children.length > 0) {
                    catObj.children.forEach(child => {
                      const prefix = "—".repeat(depth);
                      items.push({ label: `${prefix} ${cleanName(child.name)}`, value: child.id });
                      items = items.concat(getFlatCategories(child, depth + 1));
                    });
                  }
                  return items;
                };

                if (cat.children && cat.children.length > 0) {
                  return {
                    isGroup: true,
                    label: catName,
                    children: [
                      { label: `All ${catName}`, value: cat.id },
                      ...getFlatCategories(cat)
                    ]
                  };
                } else {
                  return { label: catName, value: cat.id };
                }
              })}
            />

            <CustomDropdown
              placeholder="All Genders"
              value={filterGender}
              onChange={(val) => { setFilterGender(val); setCurrentPage(1); }}
              options={[
                { label: "Male", value: "MALE" },
                { label: "Female", value: "FEMALE" },
                { label: "Unisex", value: "UNISEX" }
              ]}
            />
          </div>

          {/* عرض المنتجات */}
          <section className="products-grid" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {loading && filteredProducts.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px" }}>
                <div className="spinner-border text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((item) => (
                <div
                  className="product-card"
                  key={item.id}
                  onClick={() => navigate("/profile", { state: { sellerId: item.seller_id, scrollToPostId: item.id } })}
                  style={{ cursor: "pointer" }}
                >
                  <div className="product-img-container">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300?text=No+Image";
                      }}
                    />
                    {/* ✅ إشارة نفاد المخزون */}
                    {!item.is_in_stock && item.total_stock === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#ff4444',
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        OUT OF STOCK
                      </div>
                    )}
                  </div>
                  <div className="product-details">
                    <span className="brand-tag">{item.brand}</span>
                    <h4 className="item-name">{item.name}</h4>
                    <div className="rating-stars">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className={i < Math.floor(item.rating) ? "star yellow" : "star gray"} />
                      ))}
                      <span style={{ fontSize: '12px', marginLeft: '5px', color: '#aaa' }}>
                        {item.rating > 0 ? item.rating.toFixed(1) : ''}
                      </span>
                    </div>
                    <div className="card-footer">
                      <div className="d-flex align-items-center gap-2">
                        {item.priceBeforeSale > item.price ? (
                          <>
                            <span className="price-text" style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85em' }}>
                              ${item.priceBeforeSale.toFixed(2)}
                            </span>
                            <span className="price-text fw-bold text-danger">
                              ${item.price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="price-text">${item.price.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="product-actions">
                        <button
                          className="wishlist-btn-text"
                          onClick={(e) => handleWishlistClick(item, e)}
                          style={{ background: '#000', color: isInWishlist(item.id) ? '#ff4444' : '#fff' }}
                        >
                          {isInWishlist(item.id) ? '❤️' : '♡'} Wish
                        </button>
                        <button
                          className="add-btn"
                          onClick={(e) => handleAddToCart(item, e)}
                          disabled={!item.is_in_stock && item.total_stock === 0}
                          style={{ opacity: (!item.is_in_stock && item.total_stock === 0) ? 0.5 : 1 }}
                        >
                          <FaCartPlus />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px" }}>
                <h3>No products found for "{searchTerm}"</h3>
                <p>Try searching for categories like bags, dresses, or accessories.</p>
              </div>
            )}
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '40px 0' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={!prevPage}
                style={{
                  padding: '10px 20px',
                  borderRadius: '25px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: prevPage ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: prevPage ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: prevPage ? 'pointer' : 'not-allowed',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s'
                }}
              >
                Previous
              </button>

              <span style={{ color: '#fff', fontWeight: 'bold' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={!nextPage}
                style={{
                  padding: '10px 20px',
                  borderRadius: '25px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: nextPage ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: nextPage ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: nextPage ? 'pointer' : 'not-allowed',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s'
                }}
              >
                Next
              </button>
            </div>
          )}

        </div>
      </div>
      {tryOnProduct && (
        <VirtualTryOnModal
          product={tryOnProduct}
          onClose={() => setTryOnProduct(null)}
        />
      )}
    </div>
  );
};

export default Shop;