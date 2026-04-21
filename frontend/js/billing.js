let cart = [];
let currentOrderId = null;
let currentPaymentMethod = null;

function selectTable(btn, tableNum) {
  document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('tableNumber').value = tableNum;
}

function addToCart(itemId) {
  const item = allMenuItems.find(i => i._id === itemId);
  if (!item || !item.isAvailable) return;

  const existing = cart.find(c => c._id === itemId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  updateCartUI();
  showToast(`${item.name} added to cart`, 'success');
}

function removeFromCart(itemId) {
  cart = cart.filter(c => c._id !== itemId);
  updateCartUI();
}

function updateQuantity(itemId, delta) {
  const item = cart.find(c => c._id === itemId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) removeFromCart(itemId);
  else updateCartUI();
}

function clearCart(force = false) {
  cart = [];
  currentOrderId = null;
  document.getElementById('tableNumber').value = '';
  document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  updateCartUI();
}

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartTotals = document.getElementById('cartTotals');
  const cartActions = document.getElementById('cartActions');
  const cartNotesSection = document.getElementById('cartNotesSection');
  const clearBtn = document.getElementById('clearCartBtn');
  const badge = document.getElementById('cartBadge');

  // Update badge
  const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
  badge.textContent = totalQty;
  badge.style.display = totalQty > 0 ? 'inline-block' : 'none';

  // Update menu card visual states
  document.querySelectorAll('.menu-card').forEach(card => {
    const id = card.id.replace('menuCard-', '');
    const inCart = cart.find(c => c._id === id);
    card.classList.toggle('in-cart', !!inCart);
    const existing = card.querySelector('.in-cart-badge');
    if (existing) existing.remove();
    if (inCart) {
      const badge = document.createElement('div');
      badge.className = 'in-cart-badge';
      badge.textContent = inCart.quantity;
      card.appendChild(badge);
    }
  });

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
        <span>Select items from the menu</span>
      </div>`;
    cartTotals.style.display = 'none';
    cartActions.style.display = 'none';
    cartNotesSection.style.display = 'none';
    clearBtn.style.display = 'none';
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-name">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">₹${item.price} each</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="updateQuantity('${item._id}', -1)"><i class="fas fa-minus"></i></button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity('${item._id}', 1)"><i class="fas fa-plus"></i></button>
      </div>
      <div class="cart-item-total">₹${(item.price * item.quantity).toFixed(2)}</div>
      <button class="cart-remove" onclick="removeFromCart('${item._id}')"><i class="fas fa-times"></i></button>
    </div>
  `).join('');

  cartTotals.style.display = 'block';
  cartActions.style.display = 'flex';
  cartNotesSection.style.display = 'block';
  clearBtn.style.display = 'inline-flex';
  updateCartTotals();
}

function getDiscountValue() {
  const el = document.getElementById('discountAmount');
  return el ? parseFloat(el.value) || 0 : 0;
}

function updateCartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = cart.reduce((sum, item) => {
    const rate = (item.gstRate != null && !isNaN(item.gstRate)) ? item.gstRate : 5;
    return sum + (item.price * item.quantity * rate) / 100;
  }, 0);
  const discount = getDiscountValue();
  const total = subtotal + gst - discount;

  // Dynamic GST label: show rate if all items share the same rate, else "GST"
  const rates = [...new Set(cart.map(i => (i.gstRate != null && !isNaN(i.gstRate)) ? i.gstRate : 5))];
  const gstLabel = rates.length === 1 ? `GST (${rates[0]}%)` : 'GST (mixed)';
  const gstLabelEl = document.querySelector('.total-row .gst-label');
  if (gstLabelEl) gstLabelEl.textContent = gstLabel;

  document.getElementById('cartSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('cartGst').textContent = `₹${gst.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `₹${Math.max(0, total).toFixed(2)}`;
}

function getCartTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = cart.reduce((sum, item) => {
    const rate = (item.gstRate != null && !isNaN(item.gstRate)) ? item.gstRate : 5;
    return sum + (item.price * item.quantity * rate) / 100;
  }, 0);
  const discount = getDiscountValue();
  return { subtotal, gst, discount, total: Math.max(0, subtotal + gst - discount) };
}

function previewBill() {
  if (!cart.length) return showToast('Cart is empty', 'warning');
  const { subtotal, gst, discount, total } = getCartTotals();
  const table = document.getElementById('tableNumber').value || 'N/A';
  const customer = document.getElementById('customerName').value || 'Walk-in Customer';
  const now = new Date().toLocaleString('en-IN');

  const rates = [...new Set(cart.map(i => (i.gstRate != null && !isNaN(i.gstRate)) ? i.gstRate : 5))];
  const gstLabel = rates.length === 1 ? `GST (${rates[0]}%)` : 'GST (mixed)';

  document.getElementById('billPreviewContent').innerHTML = `
    <div class="bill-preview">
      <div class="bill-hotel-name">🏨 SABARISH FOODS</div>
      <div class="bill-hotel-info">123 Hotel Street, City | +91 9876543210<br>GST: 27AABCU9603R1ZX</div>
      <hr class="bill-divider"/>
      <div class="bill-row"><span>Table:</span><span><strong>${table}</strong></span></div>
      <div class="bill-row"><span>Customer:</span><span>${customer}</span></div>
      <div class="bill-row"><span>Time:</span><span>${now}</span></div>
      <hr class="bill-divider"/>
      <div class="bill-items-header"><span>Item</span><span>Qty</span><span>Amt</span></div>
      ${cart.map(item => `
        <div class="bill-item-row">
           <span>${item.name}</span>
           <span style="text-align:center">${item.quantity}</span>
           <span style="text-align:right">₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `).join('')}
      <hr class="bill-divider"/>
      <div class="bill-total-section">
        <div class="bill-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        <div class="bill-row"><span>${gstLabel}</span><span>₹${gst.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="bill-row"><span>Discount</span><span style="color:var(--danger)">-₹${discount.toFixed(2)}</span></div>` : ''}
        <div class="bill-grand-total">TOTAL: ₹${total.toFixed(2)}</div>
      </div>
      <hr class="bill-divider"/>
      <div style="text-align:center;font-size:12px;color:var(--text-muted)">Thank you for dining with us! 🙏</div>
    </div>
  `;
  openModal('billPreviewModal');
}

async function placeOrder() {
  const table = document.getElementById('tableNumber').value;
  if (!table) return showToast('Please enter table number', 'warning');
  if (!cart.length) return showToast('Cart is empty', 'warning');

  const { subtotal, gst, discount, total } = getCartTotals();
  const orderData = {
    tableNumber: table,
    customerName: document.getElementById('customerName').value || 'Walk-in Customer',
    customerPhone: document.getElementById('customerPhone').value,
    items: cart.map(item => {
      const rate = (item.gstRate != null && !isNaN(item.gstRate)) ? item.gstRate : 5;
      return {
        menuItem: item._id,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        gstRate: rate,
        subtotal: item.price * item.quantity
      };
    }),
    subtotal, gstAmount: gst, discount,
    totalAmount: total,
    notes: document.getElementById('orderNotes').value
  };

  try {
    const data = await api.post('/orders', orderData);
    currentOrderId = data.order._id;
    openPaymentModal(data.order);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== PAYMENT =====================
function openPaymentModal(order) {
  const { subtotal, gst, discount, total } = getCartTotals();
  document.getElementById('paymentSummary').innerHTML = `
    <div class="summary-row"><span>Order #${order.orderNumber}</span><span>Table: ${order.tableNumber}</span></div>
    <div class="summary-row"><span>Items: ${cart.length}</span><span>Customer: ${order.customerName}</span></div>
    <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
      <div class="summary-row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>GST:</span><span>₹${gst.toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="summary-row"><span>Discount:</span><span>-₹${discount.toFixed(2)}</span></div>` : ''}
    </div>
    <div class="summary-total">Total: ₹${total.toFixed(2)}</div>
  `;
  document.getElementById('upiSection').style.display = 'none';
  document.getElementById('cashSection').style.display = 'none';
  document.getElementById('cardSection').style.display = 'none';
  document.getElementById('paymentActions').style.display = 'none';
  document.querySelectorAll('.payment-opt').forEach(b => b.classList.remove('active'));
  currentPaymentMethod = null;
  openModal('paymentModal');
}

async function selectPayment(method, btn) {
  currentPaymentMethod = method;
  document.querySelectorAll('.payment-opt').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const { total } = getCartTotals();
  const order = await api.get(`/orders/${currentOrderId}`).catch(() => null);
  const orderNum = order?.order?.orderNumber || 'ORD-XXXX';

  document.getElementById('upiSection').style.display = method === 'UPI' ? 'block' : 'none';
  document.getElementById('cashSection').style.display = method === 'Cash' ? 'block' : 'none';
  document.getElementById('cardSection').style.display = method === 'Card' ? 'block' : 'none';
  document.getElementById('paymentActions').style.display = 'block';

  if (method === 'UPI') {
    document.getElementById('upiAmount').textContent = `₹${total.toFixed(2)}`;
    try {
      const qrData = await api.post('/payment/generate-qr', {
        amount: total.toFixed(2),
        orderId: currentOrderId,
        orderNumber: orderNum
      });
      document.getElementById('qrCodeImg').src = qrData.qrCode;
      document.getElementById('upiIdText').textContent = qrData.upiId;
    } catch (err) {
      showToast('QR generation failed: ' + err.message, 'error');
    }
  } else if (method === 'Cash') {
    document.getElementById('cashAmount').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('cashReceived').value = '';
    document.getElementById('changeDisplay').innerHTML = '';
  } else if (method === 'Card') {
    document.getElementById('cardAmount').textContent = `₹${total.toFixed(2)}`;
  }
}

function calcChange() {
  const { total } = getCartTotals();
  const received = parseFloat(document.getElementById('cashReceived').value) || 0;
  const change = received - total;
  const el = document.getElementById('changeDisplay');
  if (received >= total) {
    el.innerHTML = `Change to return: <strong>₹${change.toFixed(2)}</strong>`;
    el.style.display = 'block';
  } else if (received > 0) {
    el.innerHTML = `<span style="color:var(--danger)">Still need: ₹${Math.abs(change).toFixed(2)}</span>`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

async function confirmPayment() {
  if (!currentPaymentMethod) return showToast('Select a payment method', 'warning');

  const payBody = { paymentMethod: currentPaymentMethod };
  if (currentPaymentMethod === 'UPI') {
    payBody.upiTransactionId = document.getElementById('upiTxnId').value;
  }

  try {
    const data = await api.put(`/orders/${currentOrderId}/pay`, payBody);
    closeModal('paymentModal');
    showToast('Payment successful! Saving to Google Sheets...', 'success');

    // Direct frontend → Google Sheets push (backup)
    sendBillToSheets(data.order, currentPaymentMethod);

    clearCart(true);
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== GOOGLE SHEETS DIRECT PUSH =====================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycZkwcM6SYediHCQiWZHOR0biWg2u35r7_pNC-3OiIbUssJyk79i2I--I4dRcYxuVO/exec';

function sendBillToSheets(order, paymentMethod) {
  const payload = {
    billNumber: order.orderNumber,
    cash: paymentMethod === 'Cash' ? order.totalAmount : 0,
    upi: paymentMethod === 'UPI' ? order.totalAmount : 0,
    expenses: 0,
    total: order.totalAmount
  };

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'no-cors' // Google Scripts require no-cors from browser
  })
  .then(() => {
    showToast('✅ Bill saved to Google Sheets!', 'success');
    console.log('📊 Google Sheets push sent:', payload);
  })
  .catch(err => {
    console.warn('Google Sheets push failed:', err.message);
  });
}

