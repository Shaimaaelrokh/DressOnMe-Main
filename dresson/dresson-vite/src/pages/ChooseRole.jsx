import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ChooseRole.css";
import customerBg from "../assets/clutch.jpg"; 
import sellerBg from "../assets/ff.jpg";    
import { registerUser, getCountries } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function ChooseRole() {
  const [isSeller, setIsSeller] = useState(false); 
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [favoriteColors, setFavoriteColors] = useState("");
  const [productType, setProductType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");

  const [countriesList, setCountriesList] = useState([]);

  useEffect(() => {
    getCountries().then(data => {
      // Handle Django paginated response if 'results' exists, else fallback to data itself
      const countriesArray = data?.results ? data.results : (data || []);
      setCountriesList(countriesArray);
    });
  }, []);

  const handleCountryChange = (e) => {
    const selectedCountry = e.target.value;
    setCountry(selectedCountry);
    const found = countriesList.find(c => c.name === selectedCountry);
    setCurrency(found ? found.currency : "");
  };

  // Brand Details Modal State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandYear, setBrandYear] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [brandIntro, setBrandIntro] = useState("");
  const [pendingRole, setPendingRole] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async (role) => {
    try {
      if (role === "seller") {
        setPendingRole(role);
        setShowBrandModal(true);
      } else {
        // Register Customer
        await registerUser({
          email,
          password,
          role: "customer",
          username: email ? email.split('@')[0] : "",
          first_name: displayName,
          age: age ? parseInt(age) : null,
          gender: gender,
          favorite_colors: favoriteColors,
          country,
          currency,
        });
        alert("Registration successful! Please login to verify your email.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        let errorMessage = "Registration failed:\n";
        for (const key in errors) {
          const val = Array.isArray(errors[key]) ? errors[key].join(" ") : errors[key];
          errorMessage += `- ${key}: ${val}\n`;
        }
        alert(errorMessage);
      } else {
        alert("Registration failed. Please check your network or inputs.");
      }
    }
  };

  const handleBrandSkip = async () => {
    try {
      await registerUser({
        email,
        password,
        role: "seller",
        username: email ? email.split('@')[0] : "",
        first_name: displayName,
        age: age ? parseInt(age) : null,
        product_type: productType,
        payment_method: paymentMethod,
        brand_name: displayName || "My Brand",
        brand_year: null,
        brand_intro: "",
        tax_number: "",
        country,
        currency,
      });
      alert("Registration successful! Please login to verify your email.");
      setShowBrandModal(false);
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        let errorMessage = "Registration failed:\n";
        for (const key in errors) {
          const val = Array.isArray(errors[key]) ? errors[key].join(" ") : errors[key];
          errorMessage += `- ${key}: ${val}\n`;
        }
        alert(errorMessage);
      } else {
        alert("Registration failed. Please check your network or inputs.");
      }
    }
  };

  const handleBrandSubmit = async () => {
    try {
      await registerUser({
        email,
        password,
        role: "seller",
        username: email ? email.split('@')[0] : "",
        first_name: displayName,
        age: age ? parseInt(age) : null,
        product_type: productType,
        payment_method: paymentMethod,
        brand_name: brandName || displayName || "My Brand",
        brand_year: brandYear ? parseInt(brandYear) : null,
        brand_intro: brandIntro,
        tax_number: taxNumber,
        country,
        currency,
      });
      alert("Registration successful! Please login to verify your email.");
      setShowBrandModal(false);
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        let errorMessage = "Registration failed:\n";
        for (const key in errors) {
          const val = Array.isArray(errors[key]) ? errors[key].join(" ") : errors[key];
          errorMessage += `- ${key}: ${val}\n`;
        }
        alert(errorMessage);
      } else {
        alert("Registration failed. Please check your network or inputs.");
      }
    }
  };

  return (
    <>
      <div className="role-body">
        <div className={`role-container ${isSeller ? "right-panel-active" : ""}`} id="container">
          
          {/* ── Seller Form ── */}
          <div className="form-container seller-container">
            <div className="form-box">
              <h1>Seller Profile</h1>
              <span>Fill in your store details</span>
              <input type="text" placeholder="Display Name" onChange={(e) => setDisplayName(e.target.value)} />
              <input type="number" placeholder="Age" onChange={(e) => setAge(e.target.value)} />
              <input type="text" placeholder="Product Type" onChange={(e) => setProductType(e.target.value)} />
              <select onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">Payment Method</option>
                <option>Cash</option>
                <option>Credit Card</option>
              </select>
              <select onChange={handleCountryChange} value={country}>
                <option value="">Select Country</option>
                {countriesList.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {currency && <span style={{fontSize: "12px", color: "#666", alignSelf: "flex-start", marginLeft: "10px"}}>Currency: {currency}</span>}
              <input type="email" placeholder="Email Address" onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
              <button className="main-btn" onClick={() => handleCreate("seller")}>Create Seller Account</button>
            </div>
          </div>

          {/* ── Customer Form ── */}
          <div className="form-container customer-container">
            <div className="form-box">
              <h1>Customer Profile</h1>
              <span>Join us as a buyer</span>
              <input type="text" placeholder="Display Name" onChange={(e) => setDisplayName(e.target.value)} />
              <input type="number" placeholder="Age" onChange={(e) => setAge(e.target.value)} />
              <select onChange={(e) => setGender(e.target.value)}>
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              <select onChange={handleCountryChange} value={country}>
                <option value="">Select Country</option>
                {countriesList.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {currency && <span style={{fontSize: "12px", color: "#666", alignSelf: "flex-start", marginLeft: "10px"}}>Currency: {currency}</span>}
              <input type="text" placeholder="Favorite Colors" onChange={(e) => setFavoriteColors(e.target.value)} />
              <input type="email" placeholder="Email Address" onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
              <button className="main-btn" onClick={() => handleCreate("customer")}>Create Customer Account</button>
            </div>
          </div>

          {/* ── Overlay ── */}
          <div className="overlay-container">
            <div className="overlay">
              <div 
                className="overlay-panel overlay-left" 
                style={{ backgroundImage: `url(${customerBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <h1 style={{ color: 'white' }}>Welcome Back!</h1>
                <p style={{ color: 'white' }}>To stay connected as a customer, please switch here</p>
                <button className="ghost-btn" onClick={() => setIsSeller(false)}>I am a Customer</button>
              </div>

              <div 
                className="overlay-panel overlay-right" 
                style={{ backgroundImage: `url(${sellerBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <h1 style={{ color: 'white' }}>Hello, Partner!</h1>
                <p style={{ color: 'white' }}>Enter your details and start your selling journey with us</p>
                <button className="ghost-btn" onClick={() => setIsSeller(true)}>I am a Seller</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Brand Details Modal ── */}
      {showBrandModal && (
        <div className="brand-modal-overlay">
          <div className="brand-modal">

            <div className="brand-modal-header">
              <div className="brand-modal-icon">🏷️</div>
              <h2>Brand Identity</h2>
              <p>Tell us about your brand so customers can know you better</p>
            </div>
            <div className="brand-modal-body">
              <div className="brand-field">
                <label>Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Luxe Studio"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div className="brand-field-row">
                <div className="brand-field">
                  <label>Founded Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2019"
                    value={brandYear}
                    onChange={(e) => setBrandYear(e.target.value)}
                  />
                </div>
                <div className="brand-field">
                  <label>Tax Registration No.</label>
                  <input
                    type="text"
                    placeholder="e.g. EG-123456789"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="brand-field">
                <label>Brand Introduction</label>
                <textarea
                  placeholder="Write a short intro about your brand, what you offer, and your story..."
                  value={brandIntro}
                  onChange={(e) => setBrandIntro(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="brand-modal-footer">
              <button className="brand-skip-btn" onClick={handleBrandSkip}>
                Skip for now
              </button>
              <button className="brand-submit-btn" onClick={handleBrandSubmit}>
                Launch My Brand ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}