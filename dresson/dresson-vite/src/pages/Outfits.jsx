import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Outfits.css";
import { 
  FaArrowLeft, 
  FaArrowRight, 
  FaFacebookF, 
  FaTwitter, 
  FaInstagram, 
  FaYoutube 
} from "react-icons/fa";

/* ========= صور الـ Hero ========= */
import model1 from "../assets/download (35).jpg";
import model2 from "../assets/download (41).jpg";
import model3 from "../assets/77 (12).jpg";
import model4 from "../assets/77 (11).jpg";
import model5 from "../assets/77 (9).jpg";
import model6 from "../assets/77 (6).jpg";
import model7 from "../assets/77 (8).jpg";
import model8 from "../assets/77 (18).jpg";
import model9 from "../assets/download (30).jpg";
import model10 from "../assets/77 (7).jpg";

/* ========= صور المنتجات ========= */
import ringImg from "../assets/download (37).jpg";
import bracelet1 from "../assets/52.jpg";
import necklace from "../assets/download (38).jpg";
import bracelet2 from "../assets/download (39).jpg";
import earrings from "../assets/777.jpg";
import ringImgg from "../assets/77 (16).jpg";
import bracelet11 from "../assets/77 (20).jpg";
import necklace11 from "../assets/77 (17).jpg";
import bracelet22 from "../assets/77 (14).jpg";
import earrings11 from "../assets/77 (10).jpg";
import ringImggg from "../assets/77 (5).jpg";
import bracelet111 from "../assets/123.jpg";
import necklace111 from "../assets/77 (7).jpg";
import bracelet222 from "../assets/444.jpg";
import earrings111 from "../assets/77 (177).jpg";
import necklace2222 from "../assets/sss.jpg";
import bracelet24444 from "../assets/632.jpg";
import earrings7777 from "../assets/aaa.jpg";

/* ========= صور الأقسام ========= */
import boxImg from "../assets/77 (21).jpg";
import faceImg from "../assets/77 (77).jpg";

export default function Outfits() {
  const heroImages = [
    model1, model2, model3, model4, model5,
    model6, model7, model8, model9, model10,
  ];

  const [sliderImages, setSliderImages] = useState(heroImages);

  const slideLeft = () => {
    setSliderImages((prev) => {
      const arr = [...prev];
      const last = arr.pop();
      arr.unshift(last);
      return arr;
    });
  };

  const slideRight = () => {
    setSliderImages((prev) => {
      const arr = [...prev];
      const first = arr.shift();
      arr.push(first);
      return arr;
    });
  };

  const products = [
    { id: 1, name: "HER", price: "$669", img: ringImg },
    { id: 2, name: "HIM", price: "$250", img: bracelet1 },
    { id: 3, name: "THEM", price: "$399", img: necklace },
    { id: 4, name: "THEM", price: "$220", img: bracelet2 },
    { id: 5, name: "THEM", price: "$180", img: earrings },
    { id: 6, name: "THEM", price: "$669", img: ringImgg },
    { id: 7, name: "HIM", price: "$250", img: bracelet11 },
    { id: 8, name: "HER", price: "$399", img: necklace11 },
    { id: 9, name: "HER", price: "$220", img: bracelet22 },
    { id: 10, name: "HER", price: "$180", img: earrings11 },
    { id: 11, name: "HIM", price: "$669", img: ringImggg },
    { id: 12, name: "HER", price: "$250", img: bracelet111 },
    { id: 13, name: "HER", price: "$399", img: necklace111 },
    { id: 14, name: "HER", price: "$220", img: bracelet222 },
    { id: 15, name: "HER", price: "$180", img: earrings111 },
    { id: 16, name: "HER", price: "$669", img: necklace2222 },
    { id: 17, name: "HER", price: "$250", img: bracelet24444 },
    { id: 18, name: "HER", price: "$399", img: earrings7777 },
  ];

  return (
    <div className="outfits-page-container">
      <nav className="outfits-top-nav">
        <Link to="/Home" className="outfits-home-btn">Home</Link>
        <h1 className="outfits-brand-title">DRESS ON ME</h1>
        <div className="outfits-nav-spacer"></div>
      </nav>

      <section className="outfits-hero-section">
        <div className="outfits-slider-wrapper">
          {sliderImages.map((img, index) => (
            <img src={img} alt={`Model ${index}`} key={index} />
          ))}
        </div>
        <div className="outfits-slider-arrows">
          <FaArrowLeft onClick={slideLeft} />
          <FaArrowRight onClick={slideRight} />
        </div>
      </section>

      <section className="container text-center my-5">
        <h2 className="outfits-section-title">
          From Classic to Contemporary—
          <br />
          <span>Your Perfect Piece Awaits</span>
        </h2>
      </section>

      <section className="container">
        <div className="row g-4 justify-content-center">
          {products.map((item) => (
            <div className="col-6 col-md-4 col-lg-3" key={item.id}>
              <div className="outfits-product-card">
                <div className="outfits-product-img-container">
                  <img src={item.img} alt={item.name} />
                </div>
                <h6>{item.name}</h6>
                <p>{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="outfits-elegance-section container my-5">
        <div className="row align-items-center">
          <div className="col-md-6 outfits-text-section">
            <h3>Elegance in <br /> Every Details</h3>
          </div>
          <div className="col-md-6 text-center">
            <img src={boxImg} className="img-fluid outfits-elegance-img" alt="Elegance" />
          </div>
        </div>
      </section>

      <section className="outfits-about-section container my-5">
        <div className="row align-items-center">
          <div className="col-md-4">
            <img src={faceImg} className="img-fluid rounded" alt="About Us" />
          </div>
          <div className="col-md-8">
            <div className="outfits-about-box">
              <h4>About Us</h4>
              <p>
                We are here to bring your dreams to life. We set you on the right path toward the world of fashion..We are the New Era..
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="outfits-footer-section">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-4">
              <h4>Contact</h4>
              <p><strong>Phone:</strong> +201029924884</p>
              <p><strong>Address:</strong> Autostrad El Maadi, Cairo</p>
              <p><strong>Hours:</strong> 10:00 - 18:00, Mon - Sat</p>
            </div>
            <div className="col-md-4 mb-4">
              <h4>About</h4>
              <ul className="list-unstyled">
                <li><a href="#!">About us</a></li>
                <li><a href="#!">Delivery Info</a></li>
                <li><a href="#!">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="col-md-4 mb-4">
              <h4>Follow Us</h4>
              <div className="d-flex gap-3 fs-4">
                <FaFacebookF className="outfits-icon-hover" />
                <FaTwitter className="outfits-icon-hover" />
                <FaInstagram className="outfits-icon-hover" />
                <FaYoutube className="outfits-icon-hover" />
              </div>
            </div>
          </div>
          <hr />
          <div className="text-center">
            <p>&copy; 2026 Dress On Me</p>
          </div>
        </div>
      </footer>
    </div>
  );
}