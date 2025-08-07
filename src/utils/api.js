// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/api', // Thay đổi port thành 3002 như trong file của bạn
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm token vào header nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔑 Request interceptor - Token:', token ? 'exists' : 'missing');
    console.log('📡 API Request:', config.method?.toUpperCase(), config.url);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Xử lý response
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    
    // Nếu token hết hạn, redirect về login
    if (error.response?.status === 401) {
      console.warn('🚨 Token expired or invalid - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    
    return Promise.reject(error);
  }
);

export default api;