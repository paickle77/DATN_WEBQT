// src/component/tabbar/TabBar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCog } from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';      // ← import enum
import './TabBar.scss';
import image from '../../IMAGE/image.png';

const TabBar = () => {
  const navigate = useNavigate();

  return (
    <div className="tab-bar">
      {/* Home icon */}
      <div
        className="tab-icon"
        onClick={() => navigate(ENUM_PAGE.Home)}
      >
        <FaHome size={24} />
      </div>

      {/* Logo */}
      <div className="tab-logo">
        <img src={image} alt="Logo Cake Shop" />
      </div>

      {/* Settings icon */}
      <div
        className="tab-icon"
        onClick={() => navigate(ENUM_PAGE.Home)}  // hoặc route settings nếu có
      >
        <FaCog size={24} />
      </div>
    </div>
  );
};

export default TabBar;
