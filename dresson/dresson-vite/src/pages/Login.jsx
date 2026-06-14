import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import * as bootstrap from "bootstrap";
import "../styles/Login.css";
import loginpic from "../assets/loginn.jpg";
import { useAuth } from "../context/AuthContext";

import { verifyOTP, forgotPassword, resetPassword } from "../api/api";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const { login, completeLogin, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Visibility State
  const [showMainPassword, setShowMainPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/profile");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      if (showOtp) {
        // Verify OTP
        const res = await verifyOTP(email, otp);
        await completeLogin(res.access || res.access_token, res.refresh || res.refresh_token);
        navigate("/profile");
      } else {
        // Login Request
        const res = await login(email, password);
        if (res && res.otp_required) {
          setShowOtp(true);
          setMessage(res.detail || "Please enter the OTP sent to your email.");
        } else {
          navigate("/profile");
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please check your inputs.");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setIsSubmitting(true);
    
    try {
      if (forgotStep === 1) {
        const res = await forgotPassword(forgotEmail);
        setForgotMessage(res.detail || "OTP sent to your email.");
        setForgotStep(2);
      } else {
        const res = await resetPassword(forgotEmail, forgotOtp, newPassword);
        setForgotMessage(res.detail || "Password reset successfully. You can now login.");
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep(1);
          setForgotEmail("");
          setForgotOtp("");
          setNewPassword("");
        }, 3000);
      }
    } catch (err) {
      setForgotError(err.response?.data?.detail || "Failed to process request. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="login-container"
      style={{
        backgroundImage: `url(${loginpic})`,
      }}
    >
      {/* Form Box */}
      <div className="login-form-box">
        <h2
          style={{
            marginBottom: "30px",
            fontWeight: "700",
            color: "#6a0202e2",
          }}
        >
          Start your journey!
        </h2>

        <form onSubmit={handleSubmit}>
          {!showOtp ? (
            <>
              <div className="mb-3 text-start" style={{ color: "#000000" }}>
                <label htmlFor="email" className="form-label fw-semibold">
                  Email address
                </label>
                <input
                  type="email"
                  className="form-control shadow-sm"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3 text-start" style={{ color: "#000000" }}>
                <label htmlFor="password" className="form-label fw-semibold mb-0">
                  Password
                </label>
                <div className="position-relative mt-2">
                  <input
                    type={showMainPassword ? "text" : "password"}
                    className="form-control shadow-sm pe-5"
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span 
                    className="position-absolute top-50 translate-middle-y" 
                    style={{ right: "10px", cursor: "pointer", color: "#6a0202e2" }}
                    onClick={() => setShowMainPassword(!showMainPassword)}
                  >
                    {showMainPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                <div className="text-end mt-1">
                  <span 
                    style={{ color: "#6a0202e2", fontSize: "0.85rem", cursor: "pointer", fontWeight: "600" }}
                    onClick={() => {
                      setForgotMessage("");
                      setForgotError("");
                      setForgotStep(1);
                      setForgotEmail("");
                      setForgotOtp("");
                      setNewPassword("");
                      setShowForgotModal(true);
                    }}
                  >
                    Forgot Password?
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-3 text-start" style={{ color: "#000000" }}>
              <label htmlFor="otp" className="form-label fw-semibold">
                OTP Code
              </label>
              <input
                type="text"
                className="form-control shadow-sm"
                id="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
          )}

          {message && <div style={{ color: "green", marginBottom: "10px", textAlign: "left" }}>{message}</div>}
          {error && <div style={{ color: "red", marginBottom: "10px", textAlign: "left" }}>{error}</div>}

          <button
            type="submit"
            style={{
              backgroundColor: "#6a0202e2",
              color: "#fff",
              fontWeight: "600",
              padding: "10px",
              width: "100%",
              borderRadius: "10px",
              marginTop: "15px",
            }}
            onMouseOver={(e) =>
              (e.target.style.backgroundColor = "#000000")
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor = "#6a0202e2")
            }
          >
            Login
          </button>
        </form>

        <p style={{ marginTop: "20px", color: "#555" }}>
          Don't have an account?{" "}
          <Link to="/choose-role" style={{ color: "#6c63ff" }}>
            Sign Up
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-labelledby="forgotPasswordModalLabel" aria-hidden="true" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content shadow-lg border-0 rounded-4" style={{ backgroundColor: "#ffffff" }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold" id="forgotPasswordModalLabel" style={{ color: "#6a0202e2" }}>
                    {forgotStep === 1 ? "Reset Your Password" : "Enter OTP & New Password"}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowForgotModal(false)}></button>
                </div>
                <div className="modal-body">
                  {forgotMessage && <div className="alert alert-success py-2">{forgotMessage}</div>}
                  {forgotError && <div className="alert alert-danger py-2">{forgotError}</div>}
                  
                  <form onSubmit={handleForgotSubmit}>
                    {forgotStep === 1 ? (
                      <div className="mb-3 text-start">
                        <label className="form-label text-dark fw-semibold">Email Address</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          placeholder="Enter your registered email" 
                          value={forgotEmail} 
                          onChange={(e) => setForgotEmail(e.target.value)} 
                          required 
                        />
                        <small className="text-muted mt-1 d-block">We will send a 6-digit OTP to your email.</small>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 text-start">
                          <label className="form-label text-dark fw-semibold">OTP Code</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Enter 6-digit code" 
                            value={forgotOtp} 
                            onChange={(e) => setForgotOtp(e.target.value)} 
                            autoComplete="off"
                            required 
                          />
                        </div>
                        <div className="mb-4 text-start">
                          <label className="form-label text-dark fw-semibold">New Password</label>
                          <div className="position-relative">
                            <input 
                              type={showResetPassword ? "text" : "password"} 
                              className="form-control pe-5" 
                              placeholder="Enter new password" 
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)} 
                              autoComplete="new-password"
                              required 
                            />
                            <span 
                              className="position-absolute top-50 translate-middle-y" 
                              style={{ right: "10px", cursor: "pointer", color: "#6a0202e2" }}
                              onClick={() => setShowResetPassword(!showResetPassword)}
                            >
                              {showResetPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <button 
                      type="submit" 
                      className="btn w-100 fw-bold" 
                      disabled={isSubmitting}
                      style={{ backgroundColor: "#6a0202e2", color: "#fff", borderRadius: "10px", padding: "10px" }}
                    >
                      {isSubmitting ? "Processing..." : (forgotStep === 1 ? "Send Reset OTP" : "Reset Password")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Login;