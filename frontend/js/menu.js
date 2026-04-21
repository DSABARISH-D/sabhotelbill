// ========== MENU MODULE ==========
let allMenuItems = [];
let menuMgmtItems = [];
const CATEGORIES = ['All', 'Starter', 'Main Course', 'Beverages', 'Desserts', 'Breads', 'Rice & Biryani', 'Soups', 'Salads', 'Special'];

async function loadMenuItems() {
  try {
    const data = await api.get('/menu');
    allMenuItems = data.items;
    renderCategoryTabs();
    renderMenuGrid(allMenuItems.filter(i => i.isAvailable));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderCategoryTabs() {
  const tabs = document.getElementById('categoryTabs');
  const usedCats = ['All', ...new Set(allMenuItems.filter(i => i.isAvailable).map(i => i.category))];
  tabs.innerHTML = usedCats.map((cat, idx) =>
    `<button class="cat-tab ${idx === 0 ? 'active' : ''}" data-cat="${cat}" onclick="filterByCategory(this.dataset.cat, this)">${cat}</button>`
  ).join('');
}

function filterByCategory(cat, btn) {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const q = document.getElementById('menuSearch').value.toLowerCase();
  let filtered = allMenuItems.filter(i => i.isAvailable);
  if (cat !== 'All') filtered = filtered.filter(i => i.category === cat);
  if (q) filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  renderMenuGrid(filtered);
}

function filterMenu() {
  const q = document.getElementById('menuSearch').value.toLowerCase();
  const activeCat = document.querySelector('.cat-tab.active')?.textContent || 'All';
  let filtered = allMenuItems.filter(i => i.isAvailable);
  if (activeCat !== 'All') filtered = filtered.filter(i => i.category === activeCat);
  if (q) filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  renderMenuGrid(filtered);
}

function renderMenuGrid(items) {
  const grid = document.getElementById('menuGrid');
  if (!items.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-utensils" style="font-size:32px;opacity:0.3;display:block;margin-bottom:8px"></i>No items found</div>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const inCart = cart.find(c => c._id === item._id);
    return `
      <div class="menu-card ${inCart ? 'in-cart' : ''} ${!item.isAvailable ? 'unavailable' : ''}"
           onclick="addToCart('${item._id}')"
           id="menuCard-${item._id}">
        <div class="veg-badge ${item.isVeg ? 'veg' : 'non-veg'}"></div>
        <div class="menu-card-name">${item.name}</div>
        <div class="menu-card-cat">${item.category}</div>
        <div class="menu-card-price">₹${item.price}</div>
        ${inCart ? `<div class="in-cart-badge">${inCart.quantity}</div>` : ''}
      </div>`;
  }).join('');
}

// ---- Menu Management ----
async function loadMenuManagement() {
  try {
    const data = await api.get('/menu');
    menuMgmtItems = data.items;
    renderMenuTable(menuMgmtItems);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterMenuMgmt() {
  const q = document.getElementById('menuMgmtSearch').value.toLowerCase();
  const filtered = menuMgmtItems.filter(i =>
    i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
  );
  renderMenuTable(filtered);
}

function renderMenuTable(items) {
  const tbody = document.getElementById('menuTableBody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No menu items found. Click "Seed Sample Data" to get started.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td>
        <div style="font-weight:600">${item.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${item.description || ''}</div>
      </td>
      <td><span style="background:rgba(108,99,255,0.15);color:var(--primary-light);padding:3px 8px;border-radius:6px;font-size:11px">${item.category}</span></td>
      <td style="font-weight:700;color:var(--success)">₹${item.price}</td>
      <td>
        <div class="veg-badge ${item.isVeg ? 'veg' : 'non-veg'}" style="position:static;display:inline-flex"></div>
        <span style="font-size:12px;margin-left:6px">${item.isVeg ? 'Veg' : 'Non-Veg'}</span>
      </td>
      <td style="color:var(--text-muted)">${item.gstRate}%</td>
      <td><span class="status-badge ${item.isAvailable ? 'badge-completed' : 'badge-cancelled'}">${item.isAvailable ? 'Available' : 'Unavailable'}</span></td>
      <td class="admin-only">
        <div class="action-btns">
          <button class="btn-icon" onclick="openEditItemModal('${item._id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" onclick="toggleItemAvailability('${item._id}')" title="Toggle"><i class="fas fa-toggle-on"></i></button>
          <button class="btn-icon danger" onclick="deleteMenuItem('${item._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
  // Apply admin display
  if (currentUser?.role === 'admin') {
    tbody.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }
}

function openAddItemModal() {
  document.getElementById('menuModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add Menu Item';
  document.getElementById('editItemId').value = '';
  document.getElementById('menuItemForm').reset();
  document.getElementById('itemGst').value = 5;
  document.getElementById('itemIsVeg').checked = true;
  document.getElementById('itemAvailable').checked = true;
  openModal('menuItemModal');
}

function openEditItemModal(id) {
  const item = menuMgmtItems.find(i => i._id === id);
  if (!item) return;
  document.getElementById('menuModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Menu Item';
  document.getElementById('editItemId').value = item._id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemCategory').value = item.category;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemGst').value = item.gstRate;
  document.getElementById('itemDesc').value = item.description || '';
  document.getElementById('itemIsVeg').checked = item.isVeg;
  document.getElementById('itemAvailable').checked = item.isAvailable;
  openModal('menuItemModal');
}

async function saveMenuItem(e) {
  e.preventDefault();
  const id = document.getElementById('editItemId').value;
  const body = {
    name: document.getElementById('itemName').value,
    category: document.getElementById('itemCategory').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    gstRate: parseFloat(document.getElementById('itemGst').value),
    description: document.getElementById('itemDesc').value,
    isVeg: document.getElementById('itemIsVeg').checked,
    isAvailable: document.getElementById('itemAvailable').checked,
  };
  try {
    let savedItem;
    if (id) {
      const res = await api.put(`/menu/${id}`, body);
      savedItem = res.item;
      showToast('Menu item updated!', 'success');
    } else {
      const res = await api.post('/menu', body);
      savedItem = res.item;
      showToast('Menu item added!', 'success');
    }
    closeModal('menuItemModal');

    // Sync cart: if this item is already in the cart, update its gstRate and price live
    if (savedItem && typeof cart !== 'undefined') {
      cart.forEach(cartItem => {
        if (cartItem._id === savedItem._id) {
          cartItem.gstRate = savedItem.gstRate;
          cartItem.price   = savedItem.price;
          cartItem.name    = savedItem.name;
        }
      });
      updateCartUI(); // recalculate totals with new gstRate
    }

    loadMenuManagement();
    loadMenuItems(); // refresh billing menu grid
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this menu item?')) return;
  try {
    await api.del(`/menu/${id}`);
    showToast('Item deleted', 'success');
    loadMenuManagement();
    loadMenuItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleItemAvailability(id) {
  try {
    await api.put(`/menu/${id}/toggle`);
    showToast('Item status updated', 'success');
    loadMenuManagement();
    loadMenuItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function seedMenu() {
  const btn = document.getElementById('seedBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Seeding...';
  try {
    const data = await api.post('/menu/seed', {});
    showToast(`${data.count} sample items added!`, 'success');
    loadMenuManagement();
    loadMenuItems();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-database"></i> Seed Sample Data';
  }
}

