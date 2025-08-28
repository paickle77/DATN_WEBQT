// src/component/tabbar/TabBar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCog } from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';
import './TabBar.scss';
import logo from '../../IMAGE/logocake.png';

const TabBar = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHomeClick = () => {
    navigate(ENUM_PAGE.Home);
  };

  const handleSettingsClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    try {
      // Close dropdown first
      setShowDropdown(false);
      
      // Remove token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Navigate to login page using ENUM_PAGE
      navigate(ENUM_PAGE.Login, { replace: true });
      
      console.log('Đăng xuất thành công!');
      
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      // Force reload if navigation fails
      window.location.href = ENUM_PAGE.Login;
    }
  };

  return (
    <div className="tab-bar">
      <div className="tab-icon" onClick={handleHomeClick}>
        <FaHome size={26} />
      </div>

      <div className="tab-logo">
        <img src={logo} alt="Logo Cake Shop" />
      </div>

      <div className="tab-icon settings-container" ref={dropdownRef}>
        <FaCog size={26} onClick={handleSettingsClick} />
        
        {showDropdown && (
          <div className="settings-dropdown">
            <div className="dropdown-item" onClick={handleLogout}>
              <span className="dropdown-icon">🚪</span>
              <span className="dropdown-text">Đăng xuất</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default TabBar;