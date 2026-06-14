import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Home.css";

// الصور
import heroImg from "../assets/hero.jpg";
import featureImg from "../assets/featurre.jpg";
import backImg from "../assets/backk.jpg";
import eleganceImg from "../assets/elegance.jpg";
import vanImg from "../assets/sherry.jpg";
import confidenceImg from "../assets/confidence.jpg";
import innovationImg from "../assets/innovation.jpg";
import yassImg from "../assets/yass.jpg";
import mmImg from "../assets/mm.jpg";
import soadImg from "../assets/soad.jpg";
import individualityImg from "../assets/individuality.jpg";
import bannerImg from "../assets/banner.jpg";
import bannerrImg from "../assets/noor.jpg";
import elegancceImg from "../assets/roushdy.jpg";
import individdualityImg from "../assets/omar2.jpg";
import confiddenceImg from "../assets/kareem.jpg";
import innovattionImg from "../assets/haleem.jpg";
import shou from "../assets/shoukry.jpg";
import nourImg from "../assets/nour.jpg";
import ezzImg from "../assets/Ahmedezz.jpg";
import aserImg from "../assets/aser.jpg";
import omaar from "../assets/omar.jpg";
import malekImg from "../assets/malek.jpg";


// أيقونات
import {
  FaFacebookF, FaInstagram, FaTwitter, FaYoutube,
  FaShoppingCart, FaUserCircle, FaRobot, FaGlobe,
} from "react-icons/fa";
import { GiClothes } from "react-icons/gi";

// ─── باسورد الـ Dashboard ───────────────────────────────────────
const DASHBOARD_PASSWORD = "7894561230+789456120$5";

// ─── Modal Component ────────────────────────────────────────────
function DashboardModal({ onClose, onSuccess }) {
  const [pwd, setPwd]       = useState("");
  const [error, setError]   = useState("");
  const [shake, setShake]   = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = () => {
    if (pwd === DASHBOARD_PASSWORD) {
      onSuccess();
    } else {
      setError("❌ Incorrect password. Try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPwd("");
    }
  };

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg,#0a0a0a,#1a1a2e)",
          border: "1px solid rgba(100,180,255,0.25)",
          borderRadius: "20px",
          padding: "40px 36px",
          width: "360px",
          boxShadow: "0 0 60px rgba(50,130,255,0.2), 0 20px 40px rgba(0,0,0,0.6)",
          animation: shake ? "shake 0.5s ease" : "fadeIn 0.3s ease",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {/* Globe Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg,#1a6bff,#00c6ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 30px rgba(0,150,255,0.5)",
          animation: "spinGlobe 6s linear infinite",
        }}>
          <FaGlobe size={34} color="#fff" />
        </div>

        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
          Dashboard Access
        </h2>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
          Enter the admin password to continue
        </p>
        <p style={{ fontSize: "0.85rem", color: "#00c6ff", marginBottom: 24 }}>
          If you want to be one of the owners, contact us
        </p>

        {/* Input */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Enter password..."
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "12px 44px 12px 16px",
              borderRadius: 10, border: "1px solid rgba(100,180,255,0.3)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff", fontSize: "0.95rem",
              outline: "none", boxSizing: "border-box",
              transition: "border 0.2s",
            }}
          />
          {/* Show/hide toggle */}
          <span
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: "absolute", right: 14, top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer", fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
              userSelect: "none",
            }}
          >
            {showPwd ? "HIDE" : "SHOW"}
          </span>
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "#ff5e5e", fontSize: "0.82rem", marginBottom: 14 }}>
            {error}
          </p>
        )}

        {/* Buttons */}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%", padding: "12px",
            borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#1a6bff,#00c6ff)",
            color: "#fff", fontWeight: 700, fontSize: "0.95rem",
            cursor: "pointer", marginBottom: 10,
            boxShadow: "0 4px 20px rgba(0,150,255,0.3)",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
          onMouseLeave={(e) => (e.target.style.opacity = 1)}
        >
          Enter Dashboard
        </button>

        <button
          onClick={onClose}
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.35)", cursor: "pointer",
            fontSize: "0.82rem",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%,100%{ transform: translateX(0); }
          20%    { transform: translateX(-8px); }
          40%    { transform: translateX(8px); }
          60%    { transform: translateX(-5px); }
          80%    { transform: translateX(5px); }
        }
        @keyframes spinGlobe {
          from { box-shadow: 0 0 30px rgba(0,150,255,0.5), 2px 0 0 rgba(255,255,255,0.1) inset; }
          to   { box-shadow: 0 0 40px rgba(0,200,255,0.7), -2px 0 0 rgba(255,255,255,0.1) inset; }
        }
        @keyframes glowPulse {
          0%,100%{ filter: drop-shadow(0 0 4px rgba(0,180,255,0.8)); }
          50%    { filter: drop-shadow(0 0 12px rgba(0,180,255,1)); }
        }
        .earth-icon-btn {
          animation: glowPulse 2.5s ease-in-out infinite;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .earth-icon-btn:hover {
          transform: scale(1.2) rotate(15deg);
        }
      `}</style>
    </div>
  );
}



// ─── Main Component ─────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="home-page" style={{ backgroundImage: `url(${backImg})` }}>

      {/* HERO مع Navbar overlay */}
      <section className="hero-section" style={{ backgroundImage: `url(${heroImg})` }}>
        <img src={heroImg} className="hero-aspect-ratio-img" alt="" aria-hidden="true" />
        <nav className="navbar-overlay">
          <div className="navbar-left-icons">
            <button className="nav-icon-btn" onClick={() => navigate("/profile")}>
              <FaUserCircle size={26} />
            </button>
            <button className="nav-icon-btn" onClick={() => navigate("/vichat")}>
              <FaRobot size={26} />
            </button>
            <button className="nav-icon-btn" onClick={() => navigate("/cart")}>
              <FaShoppingCart size={26} style={{ color: "gold" }} />
            </button>
          </div>
          <h1 className="nav-logo-text">DRESS ON ME</h1>
          {/* زرار الهامبرجر - يمين */}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
            <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
            <span className={`ham-line ${menuOpen ? "open" : ""}`}></span>
          </button>
        </nav>

        {/* القايمة الجانبية - من اليمين */}
        <div className={`side-menu ${menuOpen ? "side-menu-open" : ""}`}>
          {/* زرار الإغلاق */}
          <button className="side-menu-close" onClick={() => setMenuOpen(false)}>✕</button>

          <div className="side-menu-inner">
            <Link to="/home" className="side-link" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/shop" className="side-link" onClick={() => setMenuOpen(false)}>Shop</Link>
            <Link to="/blog" className="side-link" onClick={() => setMenuOpen(false)}>Blog</Link>
            <button
              className="side-link side-btn"
              onClick={() => { setMenuOpen(false); window.location.href = '/makeup/index.html'; }}
            >Try On Makeup</button>
            <Link to="/contact" className="side-link" onClick={() => setMenuOpen(false)}>Contact</Link>
            <Link to="/outfits" className="side-link" onClick={() => setMenuOpen(false)}>Inspire Your Clothes</Link>

            <div className="side-divider"></div>
            <button className="side-link side-btn" onClick={() => { setMenuOpen(false); window.location.href = 'http://localhost:8501'; }}>
              <GiClothes size={18} style={{ marginRight: 8 }} />Virtual Wardrobe
            </button>
            <button className="side-link side-btn" onClick={() => { setMenuOpen(false); setShowModal(true); }}>
              <FaGlobe size={16} style={{ marginRight: 8, color: "#00c6ff" }} />Admin Dashboard
            </button>
          </div>


        </div>

        {/* Overlay لإغلاق القايمة */}
        {menuOpen && (
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)}></div>
        )}
      </section>

      {/* Password Modal */}
      {showModal && (
        <DashboardModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            navigate("/dashboard");
          }}
        />
      )}

      {/* VALUES SECTION */}
      <section className="values container py-5">
        <div className="row text-center g-4">
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${eleganceImg})` }}>
              <h5>Elegance</h5>
              <p>Timeless feminine beauty</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${confidenceImg})` }}>
              <h5>Confidence</h5>
              <p>Every style is unique</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${vanImg})` }}>
              <h5>Individuality</h5>
              <p>Wear what empowers you</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${innovationImg})` }}>
              <h5>Innovation</h5>
              <p>Modern fashion technology</p>
            </div>
          </div>
        </div>
      </section>

      {/* BANNER SECTION */}
      <section className="repair-banner banner-1" style={{ backgroundImage: `url(${bannerImg})` }}>
        <div className="banner-content text-center">
          <h6>Hurry up!</h6>
          <h2>Up to <span>70% off</span></h2>
          <button className="btn btn-light mt-3" onClick={() => navigate("/shop", { state: { filter: "sale" } })}>Explore More</button>
        </div>
      </section>

      {/* FEATURED TEXT CENTER */}
      <section className="featured container d-flex justify-content-center align-items-center py-5">
        <div className="featured-text text-center">
          <h2>Dress On Me</h2>
          <p>Created for those who appreciate femininity, elegance and modern luxury.</p>
          <button className="btn btn-outline-dark mt-3" onClick={() => navigate("/shop")}>
            Shop Now
          </button>
        </div>
      </section>

      {/* PROMOTIONS GRID SECTION 1 */}
      <section className="promotions-grid container py-5">
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="promo-card" style={{ backgroundImage: `url(${featureImg})` }}>
              <div className="promo-overlay">
                <h6 style={{ color: 'white', backgroundColor: 'darkred', display: 'inline-block', padding: '2px 5px' }}>Crazy deals</h6>
                <h3 style={{ color: '#8B0000' }}>buy 1 get 1 free</h3>
                <p style={{ color: 'white', backgroundColor: 'darkred', padding: '2px 5px' }}>
                  The best classic dress is on sale at COUTURE
                </p>
                <button className="btn btn-outline-light" onClick={() => navigate("/shop", { state: { search: "jewelry" } })}>Learn More</button>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="promo-card" style={{ backgroundImage: `url(${yassImg})` }}>
              <div className="promo-overlay">
                <h6>Spring/Summer</h6>
                <h3>Upcoming season</h3>
                <p>The best classic dress is on sale at COUTURE</p>
                <button className="btn btn-outline-light" onClick={() => navigate("/shop")}>Collection</button>
              </div>
            </div>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${individualityImg})` }}>
              <div className="promo-overlay">
                <h4>SEASONAL SALE</h4>
                <span className="red-text">Winter Collection -50% OFF</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${mmImg})` }}>
              <div className="promo-overlay">
                <h4>NEW FOOTWEAR COLLECTION</h4>
                <span className="red-text">Spring / Summer 2025</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${soadImg})` }}>
              <div className="promo-overlay">
                <h4>T-SHIRTS</h4>
                <span className="red-text">New Trendy Prints</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES MEN */}
      <section className="values container py-5">
        <div className="row text-center g-4">
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${elegancceImg})` }}>
              <h5>Elegance</h5>
              <p>Timeless men fashion</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${confiddenceImg})` }}>
              <h5>Individuality</h5>
              <p>Every style is unique</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${individdualityImg})` }}>
              <h5>Confidence</h5>
              <p>Wear what empowers you</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="value-card" style={{ backgroundImage: `url(${innovattionImg})` }}>
              <h5>Innovation</h5>
              <p>Modern fashion technology</p>
            </div>
          </div>
        </div>
      </section>

      {/* BANNER 2 */}
      <section className="repair-banner banner-2" style={{ backgroundImage: `url(${bannerrImg})` }}>
        <div className="banner-content text-center">
          <h6>Hurry up!</h6>
          <h2>Up to <span>70% off</span></h2>
          <button className="btn btn-light mt-3" onClick={() => navigate("/shop", { state: { filter: "sale" } })}>Explore More</button>
        </div>
      </section>

      {/* CREATIVE MID SECTION */}
      <section className="creative-mid-section">
        <div className="creative-mid-overlay">
          <div className="creative-mid-content">
            <p className="small-title">Hey, I'm a</p>
            <h2 className="mid-title">Creative <br /> Director</h2>
            <p className="mid-desc">
              Great design should feel invisible. Built around clarity, emotion and purpose.
            </p>
          </div>
        </div>
      </section>

      {/* PROMOTIONS GRID SECTION 2 */}
      <section className="promotions-grid container py-5">
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="promo-card" style={{ backgroundImage: `url(${shou})` }}>
              <div className="promo-overlay">
                <h6 style={{ color: 'white', backgroundColor: 'darkred', display: 'inline-block', padding: '2px 5px' }}>Crazy deals</h6>
                <h3 style={{ color: '#8B0000' }}>buy 1 get 1 free</h3>
                <p style={{ color: 'white', backgroundColor: 'darkred', padding: '2px 5px' }}>The best classic dress is on sale at COUTURE</p>
                <button className="btn btn-outline-light" onClick={() => navigate("/shop", { state: { search: "jewelry" } })}>Learn More</button>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="promo-card" style={{ backgroundImage: `url(${nourImg})` }}>
              <div className="promo-overlay">
                <h6>Spring/Summer</h6>
                <h3>Upcoming season</h3>
                <p>The best classic dress is on sale at COUTURE</p>
                <button className="btn btn-outline-light" onClick={() => navigate("/shop")}>Collection</button>
              </div>
            </div>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${aserImg})` }}>
              <div className="promo-overlay">
                <h4>SEASONAL SALE</h4>
                <span className="red-text">Winter Collection -50% OFF</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${omaar})` }}>
              <div className="promo-overlay">
                <h4>NEW FOOTWEAR COLLECTION</h4>
                <span className="red-text">Spring / Summer 2025</span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="promo-card small" style={{ backgroundImage: `url(${ezzImg})` }}>
              <div className="promo-overlay">
                <h4>T-SHIRTS</h4>
                <span className="red-text">New Trendy Prints</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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
}