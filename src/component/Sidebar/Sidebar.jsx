import React, { useState } from 'react';
import './Sidebar.scss';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCaretDown, FaList, FaUserCog, FaCogs, FaPen, FaTh, FaGlobe  } from 'react-icons/fa';

const Sidebar = () => {
        const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState(false);


    const gotohome=()=>{
        console.log('click')
        //   navigate('/');
    }
     const gotoRevenueByDate=()=>{
        console.log('click')
          navigate('/RevenueByDate');
    }
    const gotoRevenueByMonth=()=>{
        console.log('click')
          navigate('/RevenueByMonth');
    }
    const gotoProductmanager=()=>{
        console.log('click')
          navigate('/ProductManagement');
    }
     const gotoOdermanager=()=>{
        console.log('click')
          navigate('/OrderManagement');
    }
    const gotoStaticReport=()=>{
          console.log('click')
          navigate('/StatisticReport');
    }
     const gotoCustomer=()=>{
          console.log('click')
          navigate('/CustomerManagement');
    }


  return (
    <div className="sidebar">
      <div className="sidebar-item">
        <FaHome /> <span>Trang chủ Admin</span>
      </div>

      <div className="sidebar-item" onClick={() => setOpenCategory(!openCategory)}>
        <FaList /> <span>Doanh thu</span>
        <FaCaretDown className={`dropdown-icon ${openCategory ? 'rotate' : ''}`} />
      </div>
      {openCategory && (
        <div className="sidebar-sub">
          <div className="sidebar-sub-item" onClick={gotoRevenueByDate}>Doanh thu theo ngày</div>
          <div className="sidebar-sub-item" onClick={gotoRevenueByMonth} >Doanh thu theo tháng</div>
          <div className="sidebar-sub-item">Doanh thu theo năm</div>
        </div>
      )}

      <div className="sidebar-item" onClick={gotoProductmanager}>
        <FaTh /> <span >Quản lý sản phẩm</span>
      </div>
      <div className="sidebar-item" onClick={gotoOdermanager}>
        <FaCogs /> <span>Quản lý đơn hàng</span>
      </div>
      <div className="sidebar-item" onClick={gotoCustomer}>
        <FaGlobe /> <span>Quản lý khách hàng</span>
      </div>
      <div className="sidebar-item"  onClick={gotoStaticReport}>
        <FaUserCog /> <span>Thông kê và báo cáo</span>
      </div>
      <div className="sidebar-item">
        <FaPen /> <span> Quản lý khuyến mãi / mã giảm giá</span>
      </div>
    </div>
  );
};

export default Sidebar;
