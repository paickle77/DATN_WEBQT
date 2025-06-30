// src/component/Sidebar/Sidebar.jsx
import React, { useState } from 'react';
import './Sidebar.scss';
import { useNavigate } from 'react-router-dom';
import {
  FaHome, FaList, FaTh, FaCogs, FaGlobe, FaPen,
  FaWarehouse, FaBuilding, FaBell, FaHistory
} from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';

const Sidebar = () => {
  const navigate = useNavigate();
  const [openRevenue, setOpenRevenue] = useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.Home)}>
        <FaHome /> <span>Trang chủ Admin</span>
      </div>

      <div className="sidebar-item" onClick={() => setOpenRevenue(!openRevenue)}>
        <FaList /> <span>Doanh thu</span>
      </div>
      {openRevenue && (
        <div className="sidebar-sub">
          <div className="sidebar-sub-item" onClick={() => navigate(ENUM_PAGE.RevenueByDate)}>Theo ngày</div>
          <div className="sidebar-sub-item" onClick={() => navigate(ENUM_PAGE.RevenueByMonth)}>Theo tháng</div>
          <div className="sidebar-sub-item" onClick={() => navigate(ENUM_PAGE.RevenueByYear)}>Theo năm</div>
        </div>
      )}

      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.ProductManagement)}>
        <FaTh /> <span>Quản lý sản phẩm</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.OrderManagement)}>
        <FaCogs /> <span>Quản lý đơn hàng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.CustomerManagement)}>
        <FaGlobe /> <span>Quản lý khách hàng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.VoucherManagement)}>
        <FaPen /> <span>Quản lý khuyến mãi</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.IngredientManagement)}>
        <FaWarehouse /> <span>Quản lý nguyên liệu</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.BranchManagement)}>
        <FaBuilding /> <span>Quản lý chi nhánh</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.NotificationManagement)}>
        <FaBell /> <span>Quản lý thông báo</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.LogManagement)}>
        <FaHistory /> <span>Audit Logs</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.StatisticReport)}>
        <FaPen /> <span>Thống kê & Báo cáo</span>
      </div>
    </div>
  );
};

export default Sidebar;
