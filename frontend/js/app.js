// ========== MAIN APP MODULE ==========

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.className = `toast show ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// Modal helpers
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Navigation
const pageTitles = {
  dashboard: 'Dashboard',
  billing: 'New Bill',
  menu: 'Menu Management',
  orders: 'Orders',
  users: 'Staff Management'
};

function navigateTo(page) {
  if (page === 'users' && currentUser?.role !== 'admin') return;
  if (page === 'dashboard' && currentUser?.role !== 'admin') return;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // Update page title
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Show/hide content pages
  document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`${page}Page`);
  if (pageEl) pageEl.classList.add('active');

  // Load page-specific data
  if (page === 'dashboard') loadDashboard();
  if (page === 'billing') loadMenuItems();
  if (page === 'menu') loadMenuManagement();
  if (page === 'orders') loadOrders();
  if (page === 'users') loadUsers();

  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

// Sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// Time display
function updateTime() {
  const now = new Date();
  document.getElementById('topbarTime').textContent = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

// Initialize app after login
async function logout() {
  stopLivePolling();
  sessionStorage.removeItem('hotel_token');
  sessionStorage.removeItem('hotel_user');
  currentUser = null;
  const appWrapper = document.getElementById('appWrapper');
  appWrapper.style.display = 'none';
  appWrapper.classList.add('hidden');
  document.getElementById('loginPage').classList.add('active');
  document.body.classList.remove('is-admin');
  cart = [];
  updateCartUI();
  showToast('Logged out successfully', 'info');
}

async function initApp() {
  const isAuth = await checkAuth();
  if (!isAuth) {
    document.getElementById('loginPage').classList.add('active');
    return;
  }

  // Hide login, show app
  document.getElementById('loginPage').classList.remove('active');
  const appWrapper = document.getElementById('appWrapper');
  appWrapper.classList.remove('hidden');
  appWrapper.style.display = 'flex';

  // Setup user info
  const roleLabels = { admin: 'Administrator', staff: 'Staff', cook: 'Cook', master: 'Master', servent: 'Servent' };
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = roleLabels[currentUser.role] || 'Staff';
  document.getElementById('sidebarAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

  // Admin-only features
  if (currentUser.role === 'admin') {
    document.body.classList.add('is-admin');
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
    });
    // Start real-time live order polling for admin
    startLivePolling();
    // Show LIVE indicator
    const liveInd = document.getElementById('liveIndicator');
    if (liveInd) liveInd.style.display = 'flex';
  }

  // Start clock
  updateTime();
  setInterval(updateTime, 1000);

  // Load dashboard by default (admins) or billing (staff)
  navigateTo(currentUser.role === 'admin' ? 'dashboard' : 'billing');
}

// Restore session on page load (sessionStorage persists inside tabs and across reloads)
window.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('hotel_token');
  if (token) {
    await initApp();
  }
  // Clear autofill on login form
  setTimeout(() => {
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
  }, 100);
});

// App Hard Reset (Admin Only)
async function resetApp() {
  if (!currentUser || currentUser.role !== 'admin') {
    return showToast('Only administrators can reset the app', 'error');
  }
  const pwd = prompt('SECURITY CHECK: Enter your Admin Password to Hard Reset the Application:');
  if (!pwd) return;

  try {
    // Verify the admin password locally against the backend securely
    await api.post('/auth/login', {
      email: currentUser.name,
      password: pwd
    });
    
    // Password is correct, perform factory reset
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  } catch (err) {
    showToast('Incorrect password. Reset blocked for security.', 'error');
  }
}

