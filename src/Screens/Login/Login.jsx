// src/Screens/Login/Login.jsx
import React, { useState } from 'react';
import './Login.scss';
import { useNavigate } from 'react-router-dom';
import { ENUM_PAGE } from '../../component/ENUM/enum.ts';
import api from '../../utils/api';

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gọi API đăng nhập
      const res = await api.post('/login', { email, password });
      console.log('====================================');
      console.log('🚀 ~ file: Login.jsx:22 ~ handleSubmit ~ res:', res);
      console.log('====================================');
      const token = res.data.data.accessToken;
      // Lưu token để dùng cho các request sau
      localStorage.setItem('token', res.data.data.accessToken);
      // Điều hướng về Home using ENUM_PAGE
      navigate(ENUM_PAGE.Home, { replace: true });
    } catch (err) {
      // Hiển thị lỗi từ server (hoặc generic)
      const msg = err.response?.data?.error || 'Đăng nhập thất bại';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Đăng nhập</h2>
        
        <div className="input-group">
          <div className="input-icon">📧</div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <div className="input-icon">🔒</div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="password-toggle" onClick={togglePasswordVisibility}>
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading && <div className="loading-spinner"></div>}
          {loading ? 'Đang xử lý…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;