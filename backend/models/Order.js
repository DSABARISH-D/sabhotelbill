const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  gstRate: { type: Number, default: 5 },
  subtotal: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  tableNumber: { type: String, required: true },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerPhone: { type: String, default: '' },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['UPI', 'Cash', 'Card', 'Pending'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  upiTransactionId: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  notes: { type: String, default: '' },
  invoicePath: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const date = new Date();
    this.orderNumber = `ORD-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${String(count + 1).padStart(4,'0')}`;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
