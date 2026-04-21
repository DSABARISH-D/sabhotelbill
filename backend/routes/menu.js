const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/menu
router.get('/', protect, async (req, res) => {
  try {
    const { category, available } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.isAvailable = available === 'true';
    const items = await Menu.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/menu
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const item = await Menu.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Menu item added', item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/menu/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, price, description, isVeg, isAvailable, gstRate } = req.body;
    const updateData = { updatedAt: new Date() };
    if (name !== undefined)        updateData.name        = name;
    if (category !== undefined)    updateData.category    = category;
    if (price !== undefined)       updateData.price       = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (isVeg !== undefined)       updateData.isVeg       = isVeg;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (gstRate !== undefined)     updateData.gstRate     = parseFloat(gstRate);

    const item = await Menu.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }   // no runValidators — avoids enum issues on partial updates
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Menu item updated', item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/menu/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/menu/:id/toggle
router.put('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, message: `Item ${item.isAvailable ? 'available' : 'unavailable'}`, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seed sample menu data
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    const sampleItems = [
      { name: 'Paneer Tikka', category: 'Starter', price: 280, isVeg: true, description: 'Grilled cottage cheese with spices', gstRate: 5 },
      { name: 'Chicken 65', category: 'Starter', price: 320, isVeg: false, description: 'Spicy fried chicken', gstRate: 5 },
      { name: 'Veg Spring Rolls', category: 'Starter', price: 180, isVeg: true, description: 'Crispy spring rolls with veggies', gstRate: 5 },
      { name: 'Butter Chicken', category: 'Main Course', price: 380, isVeg: false, description: 'Creamy tomato based chicken curry', gstRate: 5 },
      { name: 'Paneer Butter Masala', category: 'Main Course', price: 320, isVeg: true, description: 'Rich creamy paneer curry', gstRate: 5 },
      { name: 'Dal Makhani', category: 'Main Course', price: 260, isVeg: true, description: 'Slow cooked black lentils', gstRate: 5 },
      { name: 'Chicken Biryani', category: 'Rice & Biryani', price: 350, isVeg: false, description: 'Aromatic basmati rice with chicken', gstRate: 5 },
      { name: 'Veg Fried Rice', category: 'Rice & Biryani', price: 220, isVeg: true, description: 'Stir fried rice with vegetables', gstRate: 5 },
      { name: 'Butter Naan', category: 'Breads', price: 60, isVeg: true, description: 'Soft leavened bread', gstRate: 5 },
      { name: 'Garlic Naan', category: 'Breads', price: 70, isVeg: true, description: 'Naan with garlic butter', gstRate: 5 },
      { name: 'Mango Lassi', category: 'Beverages', price: 120, isVeg: true, description: 'Sweet mango yogurt drink', gstRate: 5 },
      { name: 'Masala Chai', category: 'Beverages', price: 60, isVeg: true, description: 'Spiced Indian tea', gstRate: 5 },
      { name: 'Cold Coffee', category: 'Beverages', price: 140, isVeg: true, description: 'Chilled coffee with ice cream', gstRate: 5 },
      { name: 'Gulab Jamun', category: 'Desserts', price: 120, isVeg: true, description: 'Soft milk dumplings in sugar syrup', gstRate: 5 },
      { name: 'Ice Cream (2 scoops)', category: 'Desserts', price: 150, isVeg: true, description: 'Choice of vanilla, chocolate, or strawberry', gstRate: 5 },
      { name: 'Tomato Soup', category: 'Soups', price: 140, isVeg: true, description: 'Classic creamy tomato soup', gstRate: 5 },
      { name: 'Chicken Corn Soup', category: 'Soups', price: 180, isVeg: false, description: 'Thick sweet corn chicken soup', gstRate: 5 },
    ];
    await Menu.deleteMany({});
    const items = await Menu.insertMany(sampleItems.map(i => ({ ...i, createdBy: req.user._id })));
    res.json({ success: true, message: `${items.length} menu items seeded`, count: items.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
