# 🏨 Grand Palace Hotel — Billing System

A **full-stack hotel billing web application** with menu management, UPI payments, PDF invoices, and real-time analytics dashboard.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+) — [Download](https://nodejs.org)
- **MongoDB** — [Download](https://www.mongodb.com/try/download/community) OR use [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at: `http://localhost:5000`

### 2. Start Frontend
Open `frontend/index.html` in your browser (double-click or use Live Server).

### 3. One-Click Start (Windows)
Double-click **`START.bat`**

---

## 🔑 Demo Credentials
After registering the first user (auto-assigned as Admin):
- **Email:** admin@hotel.com
- **Password:** admin123

> ⚠️ Register this user first via the Register tab

---

## 📦 Project Structure
```
hotel bill/
├── backend/
│   ├── models/         # Mongoose schemas
│   │   ├── User.js
│   │   ├── Menu.js
│   │   └── Order.js
│   ├── routes/         # Express API routes
│   │   ├── auth.js     # JWT authentication
│   │   ├── menu.js     # Menu CRUD
│   │   ├── orders.js   # Orders + PDF invoice
│   │   ├── dashboard.js # Analytics
│   │   └── payment.js  # UPI QR generation
│   ├── middleware/
│   │   └── auth.js     # JWT middleware
│   ├── invoices/       # Generated PDF files
│   ├── .env            # Configuration
│   └── server.js       # Entry point
│
└── frontend/
    ├── css/
    │   └── style.css   # Complete styling
    ├── js/
    │   ├── api.js      # HTTP client
    │   ├── app.js      # Nav & routing
    │   ├── auth.js     # Login/Register
    │   ├── menu.js     # Menu management
    │   ├── billing.js  # Cart & billing
    │   ├── orders.js   # Orders view
    │   └── dashboard.js # Charts & stats
    └── index.html      # Single-page app
```

---

## 🎯 Features

### ✅ Authentication
- JWT-based login/register
- Role-based access (Admin vs Staff)
- Secure bcrypt password hashing

### ✅ Menu Management
- Add/Edit/Delete menu items
- Categories, pricing, GST rate, veg/non-veg
- Toggle availability
- Sample data seeder (17 items)

### ✅ Billing System
- Interactive menu with category filters & search
- Real-time cart with quantity controls
- Auto GST calculation (5%)
- Discount support
- Bill preview modal

### ✅ UPI Payment
- QR code generation using UPI deep link
- Cash payment with change calculator
- Card payment option
- Transaction ID tracking

### ✅ PDF Invoice
- Auto-generated on payment confirmation
- Professional layout with hotel branding
- GST breakdown included
- Download link provided

### ✅ Dashboard Analytics
- Today's revenue, orders, pending bills
- Monthly revenue tracker
- Last 7 days revenue bar chart (Chart.js)
- Payment method doughnut chart
- Top 5 selling items
- Live active orders

### ✅ Order Management
- Full order listing with filters
- Status tracking (Active/Completed/Cancelled)
- Order detail view
- Quick payment processing
- Invoice download

---

## ⚙️ Configuration (.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hotel_billing
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
UPI_ID=yourupi@paytm
HOTEL_NAME=Grand Palace Hotel
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/menu` | Get all menu |
| POST | `/api/menu` | Add item |
| PUT | `/api/menu/:id` | Update item |
| DELETE | `/api/menu/:id` | Delete item |
| POST | `/api/menu/seed` | Seed 17 samples |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders/:id/pay` | Mark paid + generate PDF |
| GET | `/api/dashboard/stats` | Analytics |
| POST | `/api/payment/generate-qr` | UPI QR code |

---

## 🔮 Tech Stack
- **Frontend:** HTML5, CSS3 (Glassmorphism Dark UI), Vanilla JS, Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcryptjs
- **PDF:** PDFKit
- **QR:** qrcode library
