// src/component/tabbar/TabBar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCog } from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';
import './TabBar.scss';
import logo from '../../IMAGE/logocake.png'; // Đổi tên file ảnh nếu cần

const TabBar = () => {
  const navigate = useNavigate();

  return (
    <div className="tab-bar">
      <div className="tab-icon" onClick={() => navigate(ENUM_PAGE.Home)}>
        <FaHome size={26} />
      </div>

      <div className="tab-logo">
        <img src={logo} alt="Logo Cake Shop" />
      </div>

      <div className="tab-icon" onClick={() => navigate(ENUM_PAGE.Home)}>
        <FaCog size={26} />
      </div>
    </div>
  );
};

export default TabBar;