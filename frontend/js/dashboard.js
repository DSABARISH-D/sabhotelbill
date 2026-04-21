// ========== DASHBOARD MODULE ==========
let revenueChart = null;
let paymentChart = null;

async function loadDashboard() {
  try {
    const data = await api.get('/dashboard/stats');
    const { stats } = data;

    // Update stat cards
    document.getElementById('statTodayRevenue').textContent = `₹${stats.today.revenue.toFixed(2)}`;
    document.getElementById('statTodayOrders').textContent = stats.today.orders;
    document.getElementById('statPending').textContent = stats.today.pending;
    document.getElementById('statMonthRevenue').textContent = `₹${stats.month.revenue.toFixed(2)}`;

    // Revenue chart
    const ctx1 = document.getElementById('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: stats.last7Days.map(d => d.date),
        datasets: [
          {
            label: 'Revenue (₹)',
            data: stats.last7Days.map(d => d.revenue),
            backgroundColor: 'rgba(108,99,255,0.6)',
            borderColor: 'rgba(108,99,255,1)',
            borderWidth: 2,
            borderRadius: 8,
          },
          {
            label: 'Orders',
            data: stats.last7Days.map(d => d.orders),
            backgroundColor: 'rgba(0,200,150,0.4)',
            borderColor: 'rgba(0,200,150,1)',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8888a8', font: { family: 'Inter' } } }
        },
        scales: {
          x: { ticks: { color: '#8888a8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8888a8', callback: v => '₹' + v }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y1: {
            position: 'right',
            ticks: { color: '#8888a8' },
            grid: { display: false }
          }
        }
      }
    });

    // Payment chart (doughnut)
    const ctx2 = document.getElementById('paymentChart').getContext('2d');
    if (paymentChart) paymentChart.destroy();
    const payColors = { UPI: '#6c63ff', Cash: '#00c896', Card: '#00b4d8', Pending: '#ffb800' };
    if (stats.paymentBreakdown.length) {
      paymentChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: stats.paymentBreakdown.map(p => p._id),
          datasets: [{
            data: stats.paymentBreakdown.map(p => p.revenue),
            backgroundColor: stats.paymentBreakdown.map(p => payColors[p._id] || '#8888a8'),
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#8888a8', font: { family: 'Inter' }, padding: 12 } }
          }
        }
      });
    } else {
      ctx2.canvas.parentElement.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px;font-size:13px">No payment data yet</div>';
    }

    // Top items
    document.getElementById('topItemsList').innerHTML = stats.topItems.length
      ? stats.topItems.map((item, i) => `
          <div class="top-item">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="width:22px;height:22px;background:rgba(108,99,255,0.15);color:var(--primary-light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${i+1}</span>
              <span class="top-item-name">${item._id}</span>
            </div>
            <span class="top-item-qty">${item.totalQty} units</span>
          </div>`)
        .join('')
      : '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px">No orders yet</div>';

    // Active orders
    document.getElementById('activeOrdersList').innerHTML = stats.activeOrders.length
      ? stats.activeOrders.map(order => `
          <div class="order-mini-item" onclick="viewOrderDetail('${order._id}');navigateTo('orders')" style="cursor:pointer">
            <div class="order-mini-left">
              <div class="order-mini-id">${order.orderNumber}</div>
              <div class="order-mini-table"><i class="fas fa-chair"></i> ${order.tableNumber} · ${order.customerName}</div>
            </div>
            <div class="order-mini-amount">₹${order.totalAmount.toFixed(2)}</div>
          </div>`)
        .join('')
      : '<div style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px"><i class="fas fa-check-circle" style="color:var(--success)"></i> No active orders</div>';

  } catch (err) {
    // Silently fail on dashboard if API is down
    console.warn('Dashboard load error:', err.message);
  }
}

function exportPayments() {
  const token = sessionStorage.getItem('hotel_token');
  if (!token) return showToast('Please login first', 'error');
  // Open the export URL directly in a new tab to trigger CSV download
  window.open(`http://localhost:5000/api/dashboard/export?token=${token}`, '_blank');
}

// ===================== DAILY REPORT → GOOGLE SHEETS =====================
const DAILY_REPORT_SCRIPT = 'https://script.google.com/macros/s/AKfycbzA6fQ9q9-DcSVRO4ZD-cWabm7xPIW-P2cATWjQorMlluayfDeN04L-tvquIKwouKWU/exec';

async function saveDailyReport() {
  const btn = document.getElementById('dailyReportBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  try {
    // Fetch today's real stats from backend (MongoDB)
    const data = await api.get('/dashboard/stats');
    const { stats } = data;

    // Payment breakdown: extract Cash and UPI from today's paid orders
    const cashEntry = stats.paymentBreakdown.find(p => p._id === 'Cash');
    const upiEntry  = stats.paymentBreakdown.find(p => p._id === 'UPI');
    const cardEntry = stats.paymentBreakdown.find(p => p._id === 'Card');

    // Note: paymentBreakdown is all-time; for today's breakdown fetch today's orders
    const todayData  = await api.get('/orders?status=Completed&limit=200');
    const todayStr   = new Date().toLocaleDateString('en-IN');
    const todayPaid  = (todayData.orders || []).filter(o => {
      return o.paymentStatus === 'Paid' &&
             new Date(o.createdAt).toLocaleDateString('en-IN') === todayStr;
    });

    let cashTotal = 0, upiTotal = 0, cardTotal = 0;
    todayPaid.forEach(o => {
      if (o.paymentMethod === 'Cash') cashTotal += o.totalAmount;
      if (o.paymentMethod === 'UPI')  upiTotal  += o.totalAmount;
      if (o.paymentMethod === 'Card') cardTotal += o.totalAmount;
    });

    const total    = stats.today.revenue;
    const expenses = 0; // Can be extended with an expenses input later
    const profit   = total - expenses;

    // Update preview boxes on the dashboard card
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = `₹${val.toFixed(2)}`; };
    set('rptCash',  cashTotal);
    set('rptUpi',   upiTotal);
    set('rptCard',  cardTotal);
    set('rptTotal', total);

    const payload = {
      cash:     parseFloat(cashTotal.toFixed(2)),
      upi:      parseFloat(upiTotal.toFixed(2)),
      expenses: expenses,
      total:    parseFloat(total.toFixed(2)),
      profit:   parseFloat(profit.toFixed(2))
    };

    console.log('📊 Sending Daily Report:', payload);

    // Send to Google Sheets (no-cors required for Google Scripts from browser)
    await fetch(DAILY_REPORT_SCRIPT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      mode:    'no-cors'
    });

    showToast(`✅ Daily Report Saved! Cash: ₹${cashTotal.toFixed(2)} | UPI: ₹${upiTotal.toFixed(2)} | Total: ₹${total.toFixed(2)}`, 'success');

  } catch (err) {
    console.error('Daily Report Error:', err);
    showToast('❌ Failed to save report: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-file-export"></i> Save Daily Report';
    }
  }
}
