// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/api',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - thêm token vào header
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    console.log('🔑 Request interceptor - Token:', token ? 'exists' : 'missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý lỗi và redirect
api.interceptors.response.use(
  response => {
    console.log('✅ API Response success:', response.config.url);
    return response;
  },
  error => {
    console.error('❌ API Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    
    // Nếu lỗi 401 (Unauthorized) - token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401) {
      console.warn('🚨 Token expired or invalid - redirecting to login');
      localStorage.removeItem('token');
      
      // Redirect về login (tùy thuộc vào routing của bạn)
      window.location.href = '/login';
      // Hoặc nếu dùng React Router:
      // window.location.pathname = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;