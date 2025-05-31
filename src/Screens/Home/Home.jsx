import React, { useState } from 'react';
import './Home.scss';
import TabBarr from '../../component/tabbar/TabBar'
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';

const Home = () => {
  

  const handleSubmit = (e) => {
  
  };

  return (
    
    <div className='home-container'>
    <div className='home-header'><TabBarr/>
    </div>
    <div className='home-body'>
    <div className='home-left'><Sidebar/></div>
    <div className='home-right'><DashboardCards/></div>
    </div>
    </div>
  );
};

export default Home;
