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
  FaCalendar
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
        <FaChartLine /> <span>Doanh thu</span>
      </div>
      {openRevenue && (
        <div className="sidebar-sub">
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
        onClick={() => navigate(ENUM_PAGE.OrderManagement)}
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
        onClick={() => navigate(ENUM_PAGE.CustomerManagement)}
      >
        <FaUsers /> <span>Quản lý khách hàng</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.VoucherManagement)}
      >
        <FaTicketAlt /> <span>Quản lý khuyến mãi</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.IngredientManagement)}
      >
        <FaLeaf /> <span>Quản lý nguyên liệu</span>
      </div>
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.BranchManagement)}
      >
        <FaBuilding /> <span>Quản lý chi nhánh</span>
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
      <div
        className="sidebar-item"
        onClick={() => navigate(ENUM_PAGE.StatisticReport)}
      >
        <FaChartPie /> <span>Thống kê & Báo cáo</span>
      </div>
    </div>
  );
};

export default Sidebar;
