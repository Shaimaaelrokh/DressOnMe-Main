import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { submitContactForm } from '../api/api';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      await submitContactForm(formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // تنسيق داخلي للخطوط والألوان المستوحاة من الصورة
  const styles = {
    pageContainer: {
      backgroundColor: '#f4ede4', // لون الخلفية الكريمي
      fontFamily: '"Playfair Display", serif', // خط كلاسيكي (يفضل إضافته في index.html)
      minHeight: '100vh',
      padding: '50px 0'
    },
    heroSection: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#5d4037'
    },
    contactCard: {
      backgroundColor: '#ffffff',
      maxWidth: '700px',
      margin: '0 auto',
      padding: '40px',
      borderRadius: '0px', // الصورة حوافها حادة
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
    },
    inputField: {
      border: 'none',
      borderBottom: '1px solid #d7ccc8', // خط سفلي فقط كالموجود بالصورة
      borderRadius: '0',
      padding: '10px 0',
      marginBottom: '20px',
      backgroundColor: 'transparent'
    },
    submitBtn: {
      backgroundColor: '#8d6e63', // لون بني ترابي
      color: 'white',
      border: 'none',
      borderRadius: '0',
      padding: '12px 40px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      fontSize: '14px',
      marginTop: '20px'
    },
    backLink: {
      color: '#8d6e63',
      textDecoration: 'none',
      fontSize: '13px',
      cursor: 'pointer',
      display: 'inline-block',
      marginTop: '20px',
      borderBottom: '1px solid #8d6e63'
    }
  };

  return (
    <div style={styles.pageContainer}>
      <style>{`
        /* Laptops & Tablets */
        @media (max-width: 1024px) {
          .contact-hero-title { font-size: 2.5rem !important; }
          .contact-card-box { width: 85% !important; max-width: none !important; }
        }
        /* Mobile Devices */
        @media (max-width: 768px) {
          .contact-hero-title { font-size: 2.1rem !important; }
          .contact-card-box { padding: 30px 25px !important; width: 92% !important; margin: 0 auto !important; }
          .contact-footer-links { gap: 40px !important; }
        }
        /* Small Mobile Devices */
        @media (max-width: 480px) {
          .contact-hero-title { font-size: 1.7rem !important; }
          .contact-card-box { padding: 25px 15px !important; width: 95% !important; }
          .contact-footer-links { flex-direction: column !important; gap: 25px !important; }
        }
      `}</style>

      {/* قسم العنوان العلوي */}
      <div style={styles.heroSection}>
        <h1 className="contact-hero-title" style={{ fontSize: '3rem', fontWeight: '300', marginBottom: '10px' }}>
          Ready to slow <br /> down, tune in, and <br /> get aligned?
        </h1>
        <p style={{ letterSpacing: '1px', fontSize: '0.9rem', opacity: '0.8' }}>
          (MENTALLY, EMOTIONALLY, AND PHYSICALLY)
        </p>
      </div>

      <div className="contact-card-box" style={styles.contactCard}>
        <div className="text-center mb-5">
          <h2 style={{ fontSize: '2.5rem', fontWeight: '300' }}>Inquire Here</h2>
          <p className="text-muted small">
            Fill out the contact form below to inquire about our services. <br />
            You can expect a response within 24 hours!
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="alert alert-success text-center" role="alert">
            ✅ Your message has been sent successfully! We'll get back to you soon.
          </div>
        )}
        {submitStatus === 'error' && (
          <div className="alert alert-danger text-center" role="alert">
            ❌ Failed to send message. Please try again later.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="small text-uppercase" style={{ color: '#8d6e63' }}>Name (required)</label>
              <input type="text" name="name" className="form-control" style={styles.inputField} value={formData.name} onChange={handleChange} required />
            </div>
            <div className="col-md-6 mb-3">
              <label className="small text-uppercase" style={{ color: '#8d6e63' }}>Email (required)</label>
              <input type="email" name="email" className="form-control" style={styles.inputField} value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="mb-4">
            <label className="small text-uppercase" style={{ color: '#8d6e63' }}>Subject (required)</label>
            <input type="text" name="subject" className="form-control" style={styles.inputField} value={formData.subject} onChange={handleChange} required />
          </div>

          <div className="mb-4">
            <label className="small text-uppercase" style={{ color: '#8d6e63' }}>Message (required)</label>
            <textarea name="message" className="form-control" rows="3" style={styles.inputField} value={formData.message} onChange={handleChange} required></textarea>
          </div>

          <div className="text-center">
            <button style={{...styles.submitBtn, opacity: isSubmitting ? 0.6 : 1}} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "SENDING..." : "SUBMIT"}
            </button>
          </div>

          <div className="text-center mt-3">
             <span style={styles.backLink} onClick={() => navigate('/home')}>Back to Home</span>
             <span className="mx-2" style={{ color: '#8d6e63' }}>|</span>
             <span style={styles.backLink} onClick={() => navigate('/shop')}>Back to Store</span>
          </div>
        </form>
      </div>

      {/* الجزء السفلي (Footer المماثل للصورة) */}
      <footer className="text-center mt-5" style={{ color: '#5d4037', padding: '40px 20px' }}>
        <p className="small text-uppercase" style={{ letterSpacing: '2px' }}>Let's Connect</p>
        <div className="d-flex justify-content-center gap-5 mt-4 contact-footer-links">
          <div>
            <h5 style={{ fontWeight: '300' }}>Instagram</h5>
            <p className="small border-bottom border-secondary d-inline-block">FOLLOW ALONG</p>
          </div>
          <div>
            <h5 style={{ fontWeight: '300' }}>Pinterest</h5>
            <p className="small border-bottom border-secondary d-inline-block">GET INSPIRED</p>
          </div>
          <div>
            <h5 style={{ fontWeight: '300' }}>Email</h5>
            <p className="small border-bottom border-secondary d-inline-block">GET IN TOUCH</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;