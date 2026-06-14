# Fashion E-commerce with AI Virtual Try-On

A full-stack, state-of-the-art e-commerce platform for clothing, featuring a unique AI-powered virtual try-on experience, multi-vendor support, and secure Stripe payments.

> [!IMPORTANT]
> This project is a demonstration of modern web technologies, AI integration in e-commerce, and robust backend architecture.

## 🚀 Key Features

- **AI Virtual Fitting**: "Try on" clothes digitally using MediaPipe body landmarks and perspective warping.
- **Multi-Vendor Ecosystem**: Sellers can manage their own brands, inventories, and see sales analytics via a dedicated dashboard.
- **Dynamic Catalog**: Advanced filtering by Target (Men/Women/Unisex), Size (XS-XXL), and Category.
- **Secure Payments**: Fully integrated with Stripe Checkout for a seamless and safe transaction flow.
- **Airtight Inventory**: Cross-validated stock guards in both client and server prevent overselling.
- **Community Social Layer**: Users can share their style, like posts, and comment on outfits.
- **Polished UX**: Built with React 19, Vite, and Tailwind CSS 4 for a premium, fast feeling.

## 🏗️ Technical Architecture

### Backend (Django REST Framework)
- **`users`**: Auth, OTP verification, and public profiles.
- **`products`**: Catalog, multi-variant stock, and reviews.
- **`orders`**: Cart, wishlist, and Stripe fulfilling.
- **`community`**: Social feed, interactions, and media sharing.
- **`ai_tryon`**: MediaPipe + OpenCV image processing.

### Frontend (React + Vite)
- Modern SPA with Redux Toolkit for state and Tailwind 4 for styling.

## 📊 System Design
For a detailed look at the data models and relationships, check out our [UML Class Diagram](./walkthrough.md).

## 🐳 Getting Started with Docker (Recommended)

The easiest way to run the entire stack (Database, Backend, and Frontend) is using Docker Compose.

1. **Clone the repository**
2. **Build and Start**
   ```bash
   docker-compose up --build
   ```
3. **Access the application**
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Admin Panel**: [http://localhost:8000/admin](http://localhost:8000/admin)

## 🛠️ Manual Installation

### Backend Setup
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run migrations and start server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to frontend:
   ```bash
   cd frontend
   ```
2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

## 📄 License
This project is for educational and portfolio purposes.

