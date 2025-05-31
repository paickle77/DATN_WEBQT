import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TabBar.scss';
import { FaHome, FaCog } from 'react-icons/fa'; // dùng react-icons
import image from '../../IMAGE/image.png'
const TabBarr = () => {
    const navigate = useNavigate();

  const gotohome=()=>{
      navigate('/home');
  }
   
  return (
    <div onClick={gotohome} className="tab-bar">
      <div className="tab-icon">
        <FaHome size={24} />
      </div>

      <div className="tab-logo">
        <img  src={image} alt="Logo" />
      </div>

      <div className="tab-icon">
        <FaCog size={24} />

      </div>
    </div>
  );
};

export default TabBarr;
