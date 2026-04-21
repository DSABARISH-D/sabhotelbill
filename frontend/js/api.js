// ========== API LAYER ==========
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE = '/api';

const api = {
  getHeaders() {
    const token = sessionStorage.getItem('hotel_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: this.getHeaders(),
      cache: 'no-store'
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw err;
    }
  },

  get: (ep) => api.request('GET', ep),
  post: (ep, body) => api.request('POST', ep, body),
  put: (ep, body) => api.request('PUT', ep, body),
  del: (ep) => api.request('DELETE', ep),
};

