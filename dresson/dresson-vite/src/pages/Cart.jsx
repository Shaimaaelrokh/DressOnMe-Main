import React, { useState } from "react";
import "../styles/Cart.css";
import { 
  FaShoppingCart, FaUserCircle, FaTrashAlt, FaPlus, FaMinus, 
  FaFacebookF, FaTwitter, FaInstagram, FaPinterestP, FaYoutube 
} from "react-icons/fa"; 
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createCheckoutSession, validateCoupon, calculateShipping } from "../api/api";
import { Country, State } from "country-state-city";
import carrtImg from "../assets/colorr.jpg"; 

const Cart = () => {
  const navigate = useNavigate();
  const { cart: cartItems = [], removeFromCart, updateQuantity } = useCart(); 

  const [confirmDelete, setConfirmDelete] = useState({ show: false, itemId: null });

  const handleDeleteClick = (id) => {
    setConfirmDelete({ show: true, itemId: id });
  };

  const confirmDeletion = () => {
    removeFromCart(confirmDelete.itemId);
    setConfirmDelete({ show: false, itemId: null });
  };

  const cancelDeletion = () => {
    setConfirmDelete({ show: false, itemId: null });
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const { user } = useAuth();

  const [countries, setCountries] = useState(Country.getAllCountries());
  
  const defaultCountryName = user?.profile?.country || "Egypt";
  const userCountryObj = Country.getAllCountries().find(c => c.name === defaultCountryName || c.isoCode === defaultCountryName);
  const defaultIsoCode = userCountryObj ? userCountryObj.isoCode : "EG";

  const [selectedCountry, setSelectedCountry] = useState(defaultIsoCode);
  const [states, setStates] = useState(State.getStatesOfCountry(defaultIsoCode));
  const [selectedState, setSelectedState] = useState("");
  
  const [shippingInfo, setShippingInfo] = useState({
      rate: 3.00,
      currency: "USD",
      id: null,
      exchange_rate_from_usd: 1.0
  });

  const [shippingAddress, setShippingAddress] = useState({
      city: "",
      street: "",
      zip: "",
      phone: ""
  });

  // Fetch dynamic shipping rate when destination changes
  React.useEffect(() => {
      const countryObj = countries.find(c => c.isoCode === selectedCountry);
      const countryName = countryObj ? countryObj.name : "";
      const stateObj = states.find(s => s.isoCode === selectedState);
      const stateName = stateObj ? stateObj.name : "";
      
      if (countryName) {
          calculateShipping(countryName, stateName).then(data => {
              setShippingInfo(data);
          }).catch(err => {
              console.error("Failed to calculate shipping", err);
          });
      }
  }, [selectedCountry, selectedState]);

  const handleCountryChange = (e) => {
      const iso = e.target.value;
      setSelectedCountry(iso);
      const countryStates = State.getStatesOfCountry(iso);
      setStates(countryStates);
      if (countryStates.length > 0) {
          setSelectedState(countryStates[0].isoCode);
      } else {
          setSelectedState("");
      }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponError("");
    try {
      const res = await validateCoupon(couponInput);
      if (res.valid) {
        setAppliedCoupon(res);
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.error || "Invalid coupon");
    }
  };

  const shipping = parseFloat(shippingInfo.rate) || 0;
  const currentCurrency = shippingInfo.currency ? shippingInfo.currency.toUpperCase() : "USD";
  const exchangeRate = shippingInfo.exchange_rate_from_usd || 1.0;

  const subtotal = cartItems.reduce((acc, item) => {
    const priceUsd = parseFloat(item.cartPrice || item.price) || 0; 
    const priceLocal = priceUsd * exchangeRate;
    const quantity = parseInt(item.quantity) || 1;
    return acc + (priceLocal * quantity);
  }, 0);

  const discountAmount = appliedCoupon ? cartItems.reduce((acc, item) => {
    // Determine the seller_id for this item from its product details
    const itemSellerId = item.product_details?.seller_id || item.seller_id;
    // Check if the coupon applies to this seller (or if it's a global coupon with no seller)
    if (!appliedCoupon.seller_id || itemSellerId === appliedCoupon.seller_id) {
      const priceUsd = parseFloat(item.cartPrice || item.price) || 0;
      const priceLocal = priceUsd * exchangeRate;
      const quantity = parseInt(item.quantity) || 1;
      return acc + (priceLocal * quantity) * (appliedCoupon.discount_percentage / 100);
    }
    return acc;
  }, 0) : 0;
  const totalAmount = subtotal - discountAmount + shipping;

  // ✅ جيب صورة المنتج المضاف فعلاً (cartImage أولاً)
  const getImageUrl = (item) => {
    // لو في صورة مخصوصة للمنتج المختار
    if (item.cartImage) return item.cartImage;
    // وإلا جيب أول صورة
    if (item.files && item.files.length > 0) {
      return item.files[0] || "https://via.placeholder.com/70?text=No+Image";
    }
    return "https://via.placeholder.com/70?text=No+Image";
  };

  // ✅ اسم المنتج مع التفاصيل
  const getDisplayName = (item) => {
    return item.cartDisplayName || item.text || "Product";
  };

  // ✅ السعر الصح للعرض
  const getItemPrice = (item) => {
    return parseFloat(item.cartPrice || item.price) || 0;
  };

  const handleCheckout = async () => {
    if (!shippingAddress.city || !shippingAddress.street || !shippingAddress.phone) {
        alert("Please fill in your shipping city, street, and phone number.");
        return;
    }

    try {
      setIsCheckingOut(true);
      const res = await createCheckoutSession(
          shippingInfo.id || null, 
          appliedCoupon ? appliedCoupon.code : null,
          {
              country: selectedCountry,
              state: selectedState,
              city: shippingAddress.city,
              street: shippingAddress.street,
              zip: shippingAddress.zip,
              phone: shippingAddress.phone
          }
      );
      if (res && res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        alert("Failed to initialize checkout session.");
        setIsCheckingOut(false);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while creating checkout session.");
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="cart-page">
      {/* ✅ Section Cover - تم تصليح مشكلة الخلفية المقطوعة */}
      <section 
        className="cart-cover" 
        style={{ 
          backgroundImage: `url(${carrtImg})`,
          minHeight: "320px",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <nav className="carrt-nav-overlay">
          <div className="nav-links">
            <a href="#!" onClick={(e) => { e.preventDefault(); navigate("/home"); }}>Home</a>
            <a href="#!" onClick={(e) => { e.preventDefault(); navigate("/shop"); }}>Shop</a>
            <a href="#!" onClick={(e) => { e.preventDefault(); navigate("/blog"); }}>Blog</a>
            <a href="#!" onClick={(e) => { e.preventDefault(); navigate("/about"); }}>About</a>
            <a href="#!" onClick={(e) => { e.preventDefault(); navigate("/contact"); }}>Contact</a>
            <FaUserCircle className="profile-icon" size={20} style={{ cursor: "pointer" }} onClick={() => navigate("/profile")} />
            <FaShoppingCart className="cart-icon" size={20} style={{ color: "#ffc107", cursor: "pointer" }} />
          </div>
        </nav>
        <div className="cover-text" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <h1># Your Cart</h1>
            <p>Review your selected items before checkout!</p>
        </div>
      </section>

      <div className="container py-5">
        {cartItems && cartItems.length > 0 ? (
          <div className="table-responsive mb-5">
            <table className="table cart-table text-center align-middle">
              <thead>
                <tr>
                  <th>DELETE</th>
                  <th>IMAGE</th>
                  <th>PRODUCT</th>
                  <th>DETAILS</th>
                  <th>UNIT PRICE</th>
                  <th>QUANTITY</th>
                  <th>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => {
                  const itemPrice = getItemPrice(item);
                  const itemQty = parseInt(item.quantity) || 1;
                  const itemImage = getImageUrl(item);
                  const displayName = getDisplayName(item);

                  return (
                    <tr key={item.id}>
                      <td>
                        <FaTrashAlt 
                          className="delete-icon" 
                          style={{ cursor: "pointer", color: "red" }} 
                          onClick={() => handleDeleteClick(item.uniqueCartId)} // نستخدم uniqueCartId
                          />
                      </td>
                      <td>
                        {/* ✅ صورة المنتج المختار فعلاً */}
                        <img 
                          src={itemImage} 
                          alt="product" 
                          className="cart-product-img" 
                          style={{ 
                            width: "80px", 
                            height: "80px", 
                            borderRadius: "10px", 
                            objectFit: "cover",
                            border: "2px solid #f0f0f0",
                          }}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/80?text=No+Image";
                          }}
                        />
                      </td>
                      <td className="text-start" style={{ maxWidth: "160px" }}>
                        {/* ✅ اسم المنتج */}
                        <div className="fw-bold text-truncate">{displayName}</div>
                        {/* ✅ الكاتيجوري لو موجودة */}
                        {item.cartCategory && (
                          <div className="text-muted small mt-1">📦 {item.cartCategory}</div>
                        )}
                      </td>
                      <td>
                        {/* ✅ تفاصيل الاختيار (المقاس واللون) */}
                        <div className="d-flex flex-column align-items-center gap-1">
                          {item.selectedSize && (
                            <span className="badge bg-primary rounded-pill" style={{ fontSize: "0.7rem" }}>
                              Size: {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="badge bg-secondary rounded-pill" style={{ fontSize: "0.7rem" }}>
                              Color: {item.selectedColor}
                            </span>
                          )}
                          {!item.selectedSize && !item.selectedColor && (
                            <span className="text-muted small">—</span>
                          )}
                        </div>
                      </td>
                      <td className="fw-bold">{currentCurrency} {(itemPrice * exchangeRate).toFixed(2)}</td>
                      <td>
                        {/* ✅ تعديل الجزء الخاص بزيادة ونقص الكمية */}
<div className="quantity-control d-flex justify-content-center align-items-center gap-2">
  <button 
    className="btn btn-sm btn-light border" 
    onClick={() => updateQuantity(item.uniqueCartId, -1)} // تغيير item.id إلى item.uniqueCartId
    disabled={itemQty <= 1}
  >
    <FaMinus size={10} />
  </button>
  <span className="mx-2 fw-bold">{itemQty}</span>
  <button 
    className="btn btn-sm btn-light border" 
    onClick={() => updateQuantity(item.uniqueCartId, 1)} // تغيير item.id إلى item.uniqueCartId
  >
    <FaPlus size={10} />
  </button>
</div>
                      </td>
                      <td className="fw-bold text-success">
                        {currentCurrency} {((parseFloat(item.cartPrice || item.price) || 0) * exchangeRate * (parseInt(item.quantity) || 1)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5">
            <FaShoppingCart size={80} className="text-muted mb-4" />
            <h3 className="mb-4">Shopping cart is empty 🛍️</h3>
            <p className="text-muted mb-4">You haven't added any products yet</p>
            <button className="btn btn-dark px-5 py-2" onClick={() => navigate("/shop")}>
               Start Shopping Now
            </button>
          </div>
        )}

        {cartItems.length > 0 && (
            <div className="row g-4 mt-5">
            <div className="col-md-6">
                <h4 className="fw-bold mb-3">Apply discount coupon</h4>
                <div className="d-flex gap-2 mb-2">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter coupon code" 
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button className="btn btn-dark" onClick={handleApplyCoupon}>Apply</button>
                </div>
                {couponError && <div className="text-danger small mb-2">{couponError}</div>}
                {appliedCoupon && <div className="text-success small mb-2">Coupon '{appliedCoupon.code}' applied! (-{appliedCoupon.discount_percentage}%)</div>}

                <h4 className="fw-bold mt-4 mb-3">Shipping Destination</h4>
                <div className="d-flex flex-column gap-3 bg-light p-3 rounded border">
                  <div>
                    <label className="form-label small fw-bold text-muted mb-1">Country</label>
                    <select 
                      className="form-select border-0 shadow-sm" 
                      value={selectedCountry} 
                      onChange={handleCountryChange}
                    >
                      {countries.map(c => (
                        <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {states.length > 0 && (
                    <div>
                      <label className="form-label small fw-bold text-muted mb-1">State / Province</label>
                      <select 
                        className="form-select border-0 shadow-sm" 
                        value={selectedState} 
                        onChange={(e) => setSelectedState(e.target.value)}
                      >
                        {states.map(s => (
                          <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted mb-1">City</label>
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-sm" 
                        placeholder="e.g. Nasr City"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-muted mb-1">Zip Code</label>
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-sm" 
                        placeholder="e.g. 11765"
                        value={shippingAddress.zip}
                        onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="form-label small fw-bold text-muted mb-1">Street Address</label>
                    <input 
                      type="text" 
                      className="form-control border-0 shadow-sm" 
                      placeholder="e.g. 123 Main St, Apt 4B"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-muted mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      className="form-control border-0 shadow-sm" 
                      placeholder="e.g. +201012345678"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    />
                  </div>
                </div>
            </div>

            <div className="col-md-6 border p-4 shadow-sm bg-light rounded-4">
                <h4 className="fw-bold mb-3">Cart Totals</h4>
                <table className="table table-borderless">
                <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td className="text-end">{currentCurrency} {subtotal.toFixed(2)}</td>
                    </tr>
                    {appliedCoupon && (
                      <tr>
                        <td className="text-success">
                          Discount ({appliedCoupon.discount_percentage}%) 
                          {appliedCoupon.seller_id ? <div style={{fontSize: '12px'}}>(Applied to eligible items)</div> : null}
                        </td>
                        <td className="text-success text-end">-{currentCurrency} {discountAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>Shipping</td>
                      <td className="text-end">{currentCurrency} {shipping.toFixed(2)}</td>
                    </tr>
                    <tr className="fw-bold border-top fs-5">
                        <td>Total Amount</td>
                        <td className="text-primary text-end">{currentCurrency} {totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
                </table>
                <button 
                  className="btn btn-warning w-100 mt-3 fw-bold py-2"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                {isCheckingOut ? "Processing..." : "PROCEED TO CHECKOUT"}
                </button>
            </div>
            </div>
        )}
      </div>

      {/* تأكيد الحذف */}
      {confirmDelete.show && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.7)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#000", color: "#fff", padding: "30px",
              borderRadius: "10px", textAlign: "center", maxWidth: "90%",
            }}
          >
            <p style={{ fontSize: "18px", marginBottom: "20px", color: "white" }}>
              Are you sure you want to delete this item?
            </p>
            <div className="d-flex justify-content-center gap-3">
              <button className="btn btn-danger" onClick={confirmDeletion}>Yes, Delete</button>
              <button className="btn btn-secondary" onClick={cancelDeletion}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-section bg-dark text-white pt-5 pb-3 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-4">
              <h4 className="mb-3">Contact</h4>
              <p><strong>Phone:</strong> +201029924884</p>
              <p><strong>Address:</strong> Autostrad El Maadi, Cairo</p>
              <p><strong>Hours:</strong> 10:00 - 18:00, Mon - Sat</p>
            </div>
            <div className="col-md-4 mb-4">
              <h4 className="mb-3">About</h4>
              <ul className="list-unstyled">
                <li><a href="#!" className="text-white-50 text-decoration-none">About us</a></li>
                <li><a href="#!" className="text-white-50 text-decoration-none">Delivery Info</a></li>
                <li><a href="#!" className="text-white-50 text-decoration-none">Privacy Policy</a></li>
                <li><a href="#!" className="text-white-50 text-decoration-none">Terms & Conditions</a></li>
              </ul>
            </div>
            <div className="col-md-4 mb-4">
              <h4 className="mb-3">Follow Us</h4>
              <div className="d-flex gap-3 fs-4">
                <FaFacebookF className="icon-hover" style={{ cursor: "pointer" }} />
                <FaTwitter className="icon-hover" style={{ cursor: "pointer" }} />
                <FaInstagram className="icon-hover" style={{ cursor: "pointer" }} />
                <FaYoutube className="icon-hover" style={{ cursor: "pointer" }} />
              </div>
            </div>
          </div>
          <hr className="bg-secondary" />
          <div className="text-center">
            <p className="mb-0 text-white-50">&copy; 2026 Dress On Me</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Cart;