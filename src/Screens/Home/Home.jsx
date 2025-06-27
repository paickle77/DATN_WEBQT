import React, { useState, useEffect } from 'react';
import './Home.scss';
import TabBar from '../../component/tabbar/TabBar';
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';
import api from '../../utils/api';

const Home = () => {
  const [lockedUsers, setLockedUsers] = useState([]);

  useEffect(() => {
    // Tải về toàn bộ users rồi lọc ra những user đang bị khóa
    api.get('/users')
      .then(res => {
        const all = res.data.data || [];
        setLockedUsers(all.filter(u => u.is_lock));
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="home-container">
      <div className="home-header">
        <TabBar />
      </div>
      <div className="home-body">
        <div className="home-left">
          <Sidebar />
        </div>
        <div className="home-right">
          {/* Phần dashboard cards */}
          <DashboardCards />

          
        </div>
      </div>
    </div>
  );
};

export default Home;
