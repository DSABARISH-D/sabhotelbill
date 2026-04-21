// ========== REAL-TIME LIVE ORDER POLLING ENGINE ==========
// Polls the server every 5 seconds when logged in as admin.
// When staff place new orders, the admin panel updates automatically.

let _pollInterval = null;
let _lastOrderCount = 0;
let _lastOrderIds = new Set();
let _isPolling = false;

// Start polling (called after admin login)
function startLivePolling() {
  if (_isPolling) return;
  _isPolling = true;
  console.log('🔴 Live polling started');
  _pollInterval = setInterval(_pollOrders, 5000);
  _pollOrders(); // immediate first call
}

// Stop polling (called on logout)
function stopLivePolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  _isPolling = false;
  _lastOrderCount = 0;
  _lastOrderIds = new Set();
  console.log('⬛ Live polling stopped');
}

// Core poll function
async function _pollOrders() {
  if (currentUser?.role !== 'admin') return;
  try {
    const data = await api.get('/orders?status=Active&limit=50');
    const orders = data.orders || [];

    // Detect NEW orders (IDs not seen before)
    const newOrders = orders.filter(o => !_lastOrderIds.has(o._id));
    const isFirstLoad = _lastOrderIds.size === 0;

    // Update tracked IDs
    _lastOrderIds = new Set(orders.map(o => o._id));

    // If new orders found after first load, notify admin
    if (!isFirstLoad && newOrders.length > 0) {
      _onNewOrders(newOrders);
    }

    // Always refresh the live feed in dashboard if that section exists
    _renderLiveFeed(orders);

    // Update "Active Orders" count badge in nav
    _updateLiveBadge(orders.length);

  } catch (err) {
    console.warn('Poll error:', err.message);
  }
}

// Called when brand-new orders are detected
function _onNewOrders(newOrders) {
  const count = newOrders.length;
  const staffName = newOrders[0]?.createdBy?.name || 'Staff';
  const table = newOrders[0]?.tableNumber || '';
  const amount = newOrders[0]?.totalAmount?.toFixed(2) || '0';

  // Toast notification
  showToast(
    `🆕 New order by ${staffName} – ${table} – ₹${amount}`,
    'success'
  );

  // Pulse the live dot
  const dot = document.getElementById('liveDot');
  if (dot) {
    dot.classList.remove('pulse-once');
    void dot.offsetWidth; // reflow to restart animation
    dot.classList.add('pulse-once');
  }

  // Play a soft beep (silent if browser blocks it)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}

  // Refresh dashboard stats if visible
  const dashPage = document.getElementById('dashboardPage');
  if (dashPage && dashPage.classList.contains('active')) {
    loadDashboard();
  }

  // Refresh orders table if on orders page
  const ordersPage = document.getElementById('ordersPage');
  if (ordersPage && ordersPage.classList.contains('active')) {
    loadOrders();
  }
}

// Renders live feed panel in admin dashboard
function _renderLiveFeed(orders) {
  const feedEl = document.getElementById('liveOrdersFeed');
  if (!feedEl) return;

  if (!orders.length) {
    feedEl.innerHTML = `
      <div class="live-empty">
        <i class="fas fa-check-circle" style="color:var(--success)"></i>
        <span>No active orders right now</span>
      </div>`;
    return;
  }

  feedEl.innerHTML = orders.map(order => {
    const isNew = _isRecentOrder(order.createdAt, 120); // highlight if < 2 min old
    const staffName = order.createdBy?.name || 'Staff';
    const timeAgo = _timeAgo(order.createdAt);
    return `
      <div class="live-order-row ${isNew ? 'live-order-new' : ''}" onclick="viewOrderDetail('${order._id}');navigateTo('orders')">
        <div class="live-order-left">
          ${isNew ? '<span class="new-tag">NEW</span>' : ''}
          <div class="live-order-num">${order.orderNumber}</div>
          <div class="live-order-meta">
            <i class="fas fa-chair"></i> ${order.tableNumber}
            &nbsp;·&nbsp;
            <i class="fas fa-user"></i> <strong>${staffName}</strong>
            &nbsp;·&nbsp;
            <i class="fas fa-clock"></i> ${timeAgo}
          </div>
          <div class="live-order-items">${order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</div>
        </div>
        <div class="live-order-right">
          <div class="live-order-amount">₹${order.totalAmount.toFixed(2)}</div>
          <span class="status-badge badge-${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span>
        </div>
      </div>`;
  }).join('');
}

function _updateLiveBadge(count) {
  const badge = document.getElementById('liveOrdersBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function _isRecentOrder(dateStr, seconds) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  return diff < seconds;
}

function _timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}
