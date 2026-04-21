// ========== ORDERS MODULE ==========
async function loadOrders() {
  const status = document.getElementById('orderStatusFilter').value;
  const date = document.getElementById('orderDateFilter').value;
  let endpoint = '/orders?';
  if (status) endpoint += `status=${status}&`;
  if (date) endpoint += `date=${date}&`;

  try {
    const data = await api.get(endpoint);
    renderOrdersTable(data.orders);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">No orders found</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-weight:700;color:var(--primary-light)">${order.orderNumber}</td>
      <td><strong>${order.tableNumber}</strong></td>
      <td>${order.customerName}</td>
      <td>${order.items.length} item(s)</td>
      <td style="font-weight:700;color:var(--success)">₹${order.totalAmount.toFixed(2)}</td>
      <td><span class="status-badge badge-${order.paymentStatus.toLowerCase()}">${order.paymentMethod} · ${order.paymentStatus}</span></td>
      <td><span class="status-badge badge-${order.status.toLowerCase()}">${order.status}</span></td>
      <td style="color:var(--text-muted);font-size:12px">${new Date(order.createdAt).toLocaleString('en-IN', { hour12: true, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</td>
      <td style="font-size:12px;color:var(--primary-light);font-weight:600">${order.createdBy?.name || '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="viewOrderDetail('${order._id}')" title="View"><i class="fas fa-eye"></i></button>
          ${order.paymentStatus === 'Pending' ? `<button class="btn-icon success" onclick="quickPayOrder('${order._id}')" title="Pay"><i class="fas fa-check-circle"></i></button>` : ''}

          ${order.status === 'Active' ? `<button class="btn-icon danger" onclick="cancelOrder('${order._id}')" title="Cancel"><i class="fas fa-times-circle"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

async function viewOrderDetail(id) {
  try {
    const data = await api.get(`/orders/${id}`);
    const order = data.order;
    document.getElementById('orderDetailContent').innerHTML = `
      <div class="order-detail-grid">
        <div class="detail-group">
          <div class="detail-label">Order Number</div>
          <div class="detail-value" style="color:var(--primary-light)">${order.orderNumber}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">Table</div>
          <div class="detail-value">${order.tableNumber}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">Customer</div>
          <div class="detail-value">${order.customerName}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">Phone</div>
          <div class="detail-value">${order.customerPhone || '—'}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">Payment Method</div>
          <div class="detail-value">${order.paymentMethod}</div>
        </div>
        <div class="detail-group">
          <div class="detail-label">Status</div>
          <div class="detail-value"><span class="status-badge badge-${order.status.toLowerCase()}">${order.status}</span></div>
        </div>
        ${order.upiTransactionId ? `
        <div class="detail-group">
          <div class="detail-label">UPI Transaction ID</div>
          <div class="detail-value">${order.upiTransactionId}</div>
        </div>` : ''}
        <div class="detail-group">
          <div class="detail-label">Created By</div>
          <div class="detail-value">${order.createdBy?.name || '—'}</div>
        </div>
      </div>
      <div style="background:var(--bg-card2);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:16px">
        <table class="data-table">
          <thead><tr>
            <th>Item</th><th>Category</th><th>Price</th><th>Qty</th><th>Subtotal</th>
          </tr></thead>
          <tbody>${order.items.map(item => `
            <tr>
              <td style="font-weight:600">${item.name}</td>
              <td style="color:var(--text-muted)">${item.category || ''}</td>
              <td>₹${item.price}</td>
              <td>${item.quantity}</td>
              <td style="font-weight:700;color:var(--success)">₹${item.subtotal.toFixed(2)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div style="background:var(--bg-card2);border-radius:var(--radius-sm);padding:16px">
        <div class="bill-row"><span>Subtotal:</span><span>₹${order.subtotal.toFixed(2)}</span></div>
        <div class="bill-row"><span>GST:</span><span>₹${order.gstAmount.toFixed(2)}</span></div>
        ${order.discount > 0 ? `<div class="bill-row"><span>Discount:</span><span>-₹${order.discount.toFixed(2)}</span></div>` : ''}
        <div class="bill-row" style="font-size:18px;font-weight:800;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <span>TOTAL:</span><span style="color:var(--success)">₹${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>
      ${order.notes ? `<div style="margin-top:12px;padding:12px;background:rgba(255,184,0,0.08);border:1px solid rgba(255,184,0,0.2);border-radius:var(--radius-sm);font-size:13px;color:var(--warning)"><i class="fas fa-sticky-note"></i> ${order.notes}</div>` : ''}
    `;

    const footer = document.getElementById('orderDetailFooter');
    footer.innerHTML = '';

    if (order.paymentStatus === 'Pending' && order.status === 'Active') {
      footer.innerHTML += `<button class="btn-primary" onclick="quickPayOrder('${order._id}');closeModal('orderDetailModal')"><i class="fas fa-credit-card"></i> Process Payment</button>`;
    }
    openModal('orderDetailModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function quickPayOrder(orderId) {
  const method = prompt('Payment method? (UPI / Cash / Card)', 'Cash');
  if (!method) return;
  try {
    await api.put(`/orders/${orderId}/pay`, { paymentMethod: method });
    showToast('Payment marked as complete', 'success');
    loadOrders();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  try {
    await api.put(`/orders/${id}/cancel`);
    showToast('Order cancelled', 'info');
    loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

