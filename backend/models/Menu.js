const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['Starter', 'Main Course', 'Beverages', 'Desserts', 'Breads', 'Rice & Biryani', 'Soups', 'Salads', 'Special']
  },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  gstRate: { type: Number, default: 5 }, // GST percentage
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Menu', menuSchema);
