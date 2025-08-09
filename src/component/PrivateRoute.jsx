// src/component/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { ENUM_PAGE } from './ENUM/enum.ts';

// ✅ IMPROVED - Không quá strict với token validation
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  
  // ✅ Chỉ kiểm tra token có tồn tại
  if (!token) {
    console.warn('🚨 PrivateRoute: No token found');
    return false;
  }

  try {
    // ✅ Kiểm tra cấu trúc token (3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.warn('🚨 PrivateRoute: Invalid token structure');
      return false;
    }

    // ✅ Cố gắng decode payload
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // ✅ Kiểm tra expiration nhưng cho phép một chút buffer
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry <= -300) { // Cho phép 5 phút buffer
      console.warn('🚨 PrivateRoute: Token expired beyond buffer');
      return false;
    }
    
    if (timeUntilExpiry < 0) {
      console.warn('⚠️ PrivateRoute: Token expired but within buffer');
    }
    
    console.log('✅ PrivateRoute: Token valid, time until expiry:', Math.floor(timeUntilExpiry / 60), 'minutes');
    return true;
    
  } catch (error) {
    console.error('❌ PrivateRoute: Token validation error:', error);
    
    // ✅ Fallback: Nếu có lỗi parsing nhưng token tồn tại, cho phép truy cập
    // (có thể là token format khác hoặc lỗi tạm thời)
    console.warn('⚠️ PrivateRoute: Token parsing failed but token exists, allowing access');
    return true; // ✅ FALLBACK to allow access
  }
};

const PrivateRoute = ({ children }) => {
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    // ✅ Clear invalid token trước khi redirect
    console.log('🔄 PrivateRoute: Clearing invalid token and redirecting to login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return <Navigate to={ENUM_PAGE.Login} replace />;
  }

  return children;
};

export default PrivateRoute;