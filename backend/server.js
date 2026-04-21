require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for invoices
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// Connect to MongoDB
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_billing';

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Fail fast if no connection
    });
    isConnected = db.connections[0].readyState;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
};

// Vercel Serverless needs middleware to ensure DB is connected for every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/payment', require('./routes/payment'));

// Google Sheets Integration (from Step 5)
const axios = require('axios');
app.post('/save-bill', async (req, res) => {
  if (!process.env.GOOGLE_SHEETS_WEBHOOK || process.env.GOOGLE_SHEETS_WEBHOOK === 'YOUR_GOOGLE_SCRIPT_URL') {
    return res.status(500).send("Please update GOOGLE_SHEETS_WEBHOOK in .env");
  }
  try {
    await axios.post(process.env.GOOGLE_SHEETS_WEBHOOK, req.body);
    res.send("Saved to Google Sheets");
  } catch (err) {
    console.error("Google Sheets Error:", err.message);
    res.status(500).send("Error saving to Google Sheets");
  }
});



if (process.env.NODE_ENV !== 'production') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  });
}

module.exports = app;
