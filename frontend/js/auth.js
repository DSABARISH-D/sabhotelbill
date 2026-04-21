// ========== AUTH MODULE ==========
let currentUser = null;

function switchAuthTab(tab) {
  document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
  document.getElementById('registerTabBtn').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
  hideAuthMessage();
}

function showAuthMessage(msg, type) {
  const el = document.getElementById('authMessage');
  el.textContent = msg;
  el.className = `auth-message ${type}`;
}
function hideAuthMessage() {
  document.getElementById('authMessage').className = 'auth-message';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
  try {
    const data = await api.post('/auth/login', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    });
    sessionStorage.setItem('hotel_token', data.token);
    sessionStorage.setItem('hotel_user', JSON.stringify(data.user));
    currentUser = data.user;
    showAuthMessage('Login successful! Loading...', 'success');
    setTimeout(initApp, 800);
  } catch (err) {
    showAuthMessage(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

async function handleAdminAddUser(e) {
  e.preventDefault();
  try {
    const data = await api.post('/auth/register', {
      name: document.getElementById('adminRegName').value,
      email: document.getElementById('adminRegEmail').value,
      password: document.getElementById('adminRegPassword').value,
      role: document.getElementById('adminRegRole').value
    });
    
    showToast('Staff member added successfully!', 'success');
    closeModal('addUserModal');
    e.target.reset(); // clear form
    loadUsers(); // refresh staff grid
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function togglePassword(id) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// logout() is defined in app.js

async function checkAuth() {
  const token = sessionStorage.getItem('hotel_token');
  const storedUser = sessionStorage.getItem('hotel_user');
  if (!token || !storedUser) return false;
  try {
    const data = await api.get('/auth/me');
    currentUser = data.user;
    return true;
  } catch {
    sessionStorage.removeItem('hotel_token');
    sessionStorage.removeItem('hotel_user');
    return false;
  }
}

async function loadUsers() {
  try {
    const data = await api.get('/auth/users');
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = data.users.map(u => `
      <div class="user-card">
        <div class="user-card-header">
          <div class="user-card-avatar">${u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="user-card-name">${u.name}</div>
            <div class="user-card-email">${u.email}</div>
          </div>
        </div>
        <div class="user-card-meta">
          <span class="role-badge role-${u.role}">${
            u.role === 'admin' ? '👑 Admin' : 
            u.role === 'cook' ? '👨‍🍳 Cook' : 
            u.role === 'master' ? '👨‍🔧 Master' : 
            u.role === 'servent' ? '🧑‍💼 Servent' : '👤 Staff'
          }</span>
          <span class="status-badge ${u.isActive ? 'active-badge' : 'inactive-badge'}">${u.isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">
          <i class="fas fa-clock"></i> Joined: ${new Date(u.createdAt).toLocaleDateString('en-IN')}
          ${u.lastLogin ? `<br><i class="fas fa-sign-in-alt"></i> Last seen: ${new Date(u.lastLogin).toLocaleString('en-IN')}` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn-secondary" onclick="toggleUserStatus('${u._id}', this)" style="font-size:12px;padding:6px 12px;flex:1">
            <i class="fas fa-${u.isActive ? 'ban' : 'check'}"></i> ${u.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-primary" onclick="openEditUser('${u._id}','${u.name}','${u.email}','${u.role}')" style="font-size:12px;padding:6px 12px;flex:1">
            <i class="fas fa-edit"></i> Edit
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleUserStatus(id, btn) {
  try {
    await api.put(`/auth/users/${id}/toggle`);
    loadUsers();
    showToast('User status updated', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditUser(id, name, email, role) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUserName').value = name;
  document.getElementById('editUserEmail').value = email;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserPassword').value = '';
  openModal('editUserModal');
}

async function saveEditUser(e) {
  e.preventDefault();
  const id = document.getElementById('editUserId').value;
  const payload = {
    name: document.getElementById('editUserName').value,
    email: document.getElementById('editUserEmail').value,
    role: document.getElementById('editUserRole').value,
  };
  const newPass = document.getElementById('editUserPassword').value;
  if (newPass) payload.password = newPass;

  try {
    await api.put(`/auth/users/${id}/edit`, payload);
    showToast('Staff details updated!', 'success');
    closeModal('editUserModal');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

