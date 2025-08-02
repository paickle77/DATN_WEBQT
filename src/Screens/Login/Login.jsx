// src/Screens/Login/Login.jsx
import React, { useState } from 'react';
import './Login.scss';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Gọi API đăng nhập
      const res = await api.post('/login', { email, password });
      const token = res.data.data.token;
      // Lưu token để dùng cho các request sau
      localStorage.setItem('token', res.data.data.token);
      // Điều hướng về Home
      navigate('/home');
    } catch (err) {
      // Hiển thị lỗi từ server (hoặc generic)
      const msg = err.response?.data?.error || 'Đăng nhập thất bại';
      alert(msg);
    } finally {
      setLoading(false);
    }
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
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
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