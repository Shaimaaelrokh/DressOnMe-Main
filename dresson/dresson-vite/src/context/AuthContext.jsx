import React, { createContext, useContext, useState, useEffect } from "react";
import { getUserProfile, loginUser, logoutUser } from "../api/api";
import axios from 'axios';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const profileData = await getUserProfile();
          setUser(profileData);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      // If backend uses OTP, it returns { otp_required: true, email: ... }
      if (data.otp_required) {
        return data; // Return to Login component to show OTP field
      }

      // If no OTP (fallback), set tokens directly
      return completeLogin(data.access || data.access_token, data.refresh || data.refresh_token);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const completeLogin = async (accessToken, refreshToken) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    // Fetch user profile immediately after login
    const profileData = await getUserProfile();
    setUser(profileData);
    return true;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch (error) {
        console.error("Failed to blacklist token during logout:", error);
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, completeLogin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
