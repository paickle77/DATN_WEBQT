import React, { useState } from 'react';
import './Sidebar.scss';
import { useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaChartLine,
  FaBoxOpen,
  FaShoppingCart,
  FaUsers,
  FaTicketAlt,
  FaLeaf,
  FaBuilding,
  FaBell,
  FaClipboardList,
  FaUndo,
  FaChartPie,
  FaCalendarDay,
  FaCalendarAlt,
  FaCalendar,
  FaTruck,
  FaChevronDown,
  FaUserTie, // Thêm icon cho shipper
} from 'react-icons/fa';
import { ENUM_PAGE } from '../ENUM/enum.ts';

const Sidebar = () => {
  const navigate = useNavigate();
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openStatistic, setOpenStatistic] = useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-item" onClick={() => navigate(ENUM_PAGE.Home)}>
        <FaHome /> <span>Trang chủ Admin</span>
      </div>

      <div className="sidebar-item" onClick={() => setOpenRevenue(!openRevenue)}>
        <FaChartLine /> <span>Doanh thu</span>
        <FaChevronDown className={`dropdown-icon ${openRevenue ? 'rotate' : ''}`} />
      </div>
      {openRevenue && (
        <div className="sidebar-sub open">
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.RevenueByDate)}
          >
            <FaCalendarDay /> <span>Theo ngày</span>
          </div>
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.RevenueByMonth)}
          >
            <FaCalendarAlt /> <span>Theo tháng</span>
          </div>
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.RevenueByYear)}
          >
            <FaCalendar /> <span>Theo năm</span>
          </div>
        </div>
      )}

      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.ProductManagement)}
      >
        <FaBoxOpen /> <span>Quản lý sản phẩm</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.BillManagement)}
      >
        <FaShoppingCart /> <span>Quản lý đơn hàng</span>
      </div>
       <div
         className="sidebar-item"
         onClick={() => navigate(ENUM_PAGE.RefundManagement)}
       >
         <FaUndo /> <span>Quản lý hoàn trả</span>
       </div>
       <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.ShipmentManagement)}
      >
        <FaTruck /> <span>Quản lý giao hàng</span>
      </div>
      {/* Thêm menu quản lý shipper */}
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.ShipperManagement)}
      >
        <FaUserTie /> <span>Quản lý shipper</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.CustomerManagement)}
      >
        <FaUsers /> <span>Quản lý khách hàng</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.VoucherManagement)}
      >
        <FaTicketAlt /> <span>Quản lý voucher</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.VoucherUserManagement)}
      >
        <FaUsers /> <span>Quản lý voucher người dùng</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.SupplierManagement)}
      >
        <FaLeaf /> <span>Quản lý nhà cung cấp</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.NotificationManagement)}
      >
        <FaBell /> <span>Quản lý thông báo</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.LogManagement)}
      >
        <FaClipboardList /> <span>Audit Logs</span>
      </div>
      
      <div className="sidebar-item" onClick={() => setOpenStatistic(!openStatistic)}>
        <FaChartPie /> <span>Thống kê & Báo cáo</span>
        <FaChevronDown className={`dropdown-icon ${openStatistic ? 'rotate' : ''}`} />
      </div>
      {openStatistic && (
        <div className="sidebar-sub open">
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.StatisticReport)}
          >
            <FaCalendarDay /> <span>Theo ngày</span>
          </div>
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.StatisticReport)}
          >
            <FaCalendarAlt /> <span>Theo tháng</span>
          </div>
          <div
            className="sidebar-sub-item"
            onClick={() => navigate(ENUM_PAGE.StatisticReport)}
          >
            <FaCalendar /> <span>Theo năm</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;