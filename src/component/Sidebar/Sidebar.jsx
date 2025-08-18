import React, { useState } from 'react';
import './Sidebar.scss';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaChartLine, FaBoxOpen, FaShoppingCart, FaUsers, FaTicketAlt, FaLeaf, FaBell, FaClipboardList, FaUndo, FaChartPie, FaCalendarDay, FaCalendarAlt, FaCalendar, FaTruck, FaChevronDown, FaUserTie } from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';

const Sidebar = () => {
  const navigate = useNavigate();
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openStatistic, setOpenStatistic] = useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.Home)}>
        <FaHome />
        <span>Trang chủ Admin</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.ProductManagement)}>
        <FaBoxOpen />
        <span>Quản lý sản phẩm</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.BillManagement)}>
        <FaShoppingCart />
        <span>Quản lý đơn hàng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.RefundManagement)}>
        <FaUndo />
        <span>Hoàn trả</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.ShipmentManagement)}>
        <FaTruck />
        <span>Quản lý giao hàng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.ShipperManagement)}>
        <FaUserTie />
        <span>Quản lý shipper</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.CustomerManagement)}>
        <FaUsers />
        <span>Quản lý khách hàng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.VoucherManagement)}>
        <FaTicketAlt />
        <span>Quản lý voucher</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.VoucherUserManagement)}>
        <FaUsers />
        <span>Quản lý voucher người dùng</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.SupplierManagement)}>
        <FaLeaf />
        <span>Quản lý nhà cung cấp</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.NotificationManagement)}>
        <FaBell />
        <span>Quản lý thông báo</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.LogManagement)}>
        <FaClipboardList />
        <span>Nhật ký kiểm toán</span>
      </div>
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.AnalyticsDashboard)}>
        <FaChartPie />
        <span>Thống kê & Báo cáo</span>
      </div>
    </div>
  );
};

export default Sidebar;