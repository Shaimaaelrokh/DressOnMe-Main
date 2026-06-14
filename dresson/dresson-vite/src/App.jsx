import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CartProvider from "./context/CartContext";
import AuthProvider, { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import Login from "./pages/Login";
import ChooseRole from "./pages/ChooseRole";

// Lazy load components that use APIs
const Profile = lazy(() => import("./pages/Profile"));
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Contact = lazy(() => import("./pages/Contact"));
const Chat = lazy(() => import("./pages/chat"));
const Outfits = lazy(() => import("./pages/Outfits"));
const Vichat = lazy(() => import("./pages/vichat"));
const Blog = lazy(() => import("./pages/Blog"));
const DressOnMeDashboard = lazy(() => import("./pages/DressOnMeDashboard"));
const MakeupHistory = lazy(() => import("./pages/MakeupHistory"));

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>

          {/* Login */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Choose Role */}
          <Route path="/choose-role" element={<ChooseRole />} />

          {/* Profile */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Home */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* Shop */}
          <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />

          {/* Cart */}
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />

          {/* Wishlist */}
          <Route path="/wish" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />

          {/* Contact */}
          <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />

          {/* Chat */}
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

          {/* AI Chat */}
          <Route path="/vichat" element={<ProtectedRoute><Vichat /></ProtectedRoute>} />

          {/* Outfits */}
          <Route path="/outfits" element={<ProtectedRoute><Outfits /></ProtectedRoute>} />

          {/* Blog */}
          <Route path="/blog" element={<ProtectedRoute><Blog /></ProtectedRoute>} />

          {/* Dress On Me Dashboard */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DressOnMeDashboard /></ProtectedRoute>}
          />

          {/* Makeup History */}
          <Route path="/makeup-history" element={<ProtectedRoute><MakeupHistory /></ProtectedRoute>} />

          </Routes>
        </Suspense>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;