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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
