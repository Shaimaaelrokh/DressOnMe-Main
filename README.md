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

## 💾 Backup & Restore Guide (How to delete and bring it back)

### 1. What to Backup BEFORE Deleting
Since GitHub does not store heavy AI models or secret files, you **MUST** save these to Google Drive before deleting the project from your device.

> **🔗 Google Drive Link for AI Models:** [PUT_YOUR_DRIVE_LINK_HERE]

- `.env` (Contains your secret keys)
- `db.sqlite3` (Your database with all users and products)
- `media/` folder (If you have uploaded product images)
- **AI Models**: Any `.pth`, `.pt`, `.h5` or large model files you have in your AI folders.

### 2. How to Restore & Install Everything

#### Step A: Download Code & Files
1. Clone the repository from GitHub:
   ```bash
   git clone <your-github-repo-link>
   ```
2. Download `.env`, `db.sqlite3`, `media/`, and **AI Models** from Google Drive and place them in their original folders.

#### Step B: Backend & AI Setup (Python)
1. Create and activate a virtual environment (Windows):
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
2. Install all required backend and AI libraries:
   *You can install everything at once using:*
   ```bash
   pip install -r requirements.txt
   ```
   *For your reference, here are the core AI and Backend libraries being installed:*
   ```bash
   # Core Backend
   pip install django>=5.0 djangorestframework djangorestframework-simplejwt django-cors-headers python-dotenv psycopg2-binary
   
   # AI & Image Processing (The heavy libraries)
   pip install torch torchvision diffusers transformers accelerate
   pip install mediapipe==0.10.9 opencv-python==4.9.0.80 opencv-contrib-python==4.9.0.80 Pillow numpy<2.0.0
   
   # WebSockets & Others
   pip install channels daphne stripe drf-spectacular requests django-filter
   ```
3. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

#### Step C: Frontend Setup (React/Vite)
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd dresson/dresson-vite
   ```
2. Install frontend dependencies (React, Vite, GSAP, Framer Motion, AI SDKs):
   ```bash
   npm install
   ```
   *This automatically installs libraries like: `@google/generative-ai`, `@anthropic-ai/sdk`, `framer-motion`, `gsap`, `axios`, `bootstrap`, `react-router-dom`.*
3. Run the website:
   ```bash
   npm run dev
   ```

## 📄 License
This project is for educational and portfolio purposes.

