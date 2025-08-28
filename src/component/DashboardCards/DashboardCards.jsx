// src/component/DashboardCards/DashboardCards.jsx
import React, { useState, useEffect } from 'react';
import './DashboardCards.scss';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { ENUM_PAGE } from '../ENUM/enum.ts';
import {
  FaUserTie,
  FaWarehouse,
  FaUser,
  FaLock,
  FaTicketAlt,
  FaFileExcel,
  FaMoneyBillWave
} from 'react-icons/fa';

const DashboardCards = () => {
  const [employees, setEmployees] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [shippers, setShippers] = useState([]); // Thêm state cho shippers
  const [lockedUsers, setLockedUsers] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/vouchers'),
      api.get('/shippers'), // Thêm API call cho shippers
    ]).then(([uRes, vRes, sRes]) => {
      const allUsers = uRes.data.data;
      setEmployees(allUsers);
      setLockedUsers(allUsers.filter(u => u.is_lock));
      setVouchers(vRes.data.data);
      setShippers(sRes.data.data || []); // Set shippers data
    }).catch(error => {
      console.error('Error fetching data:', error);
      // Nếu API shippers chưa có, set empty array
      if (error.response?.status === 404) {
        setShippers([]);
      }
    });
  }, []);

  const cards = [
    {
      key: 'accounts',
      count: employees.length,
      label: 'Người dùng',
      color: 'blue',
      columns: ['name','email','phone'],
      icon: <FaUser />
    },
    {
      key: 'lockedUsers',
      count: lockedUsers.length,
      label: 'Khóa tài khoản',
      color: 'red',
      columns: ['name','email','phone'],
      icon: <FaLock />
    },
    {
      key: 'shippers', // Thêm card cho shippers
      count: shippers.length,
      label: 'Shipper',
      color: 'orange',
      columns: ['full_name','phone','license_number','vehicle_type'],
      icon: <FaUserTie />
    },
    {
      key: 'vouchers',
      count: vouchers.length,
      label: 'Khuyến mãi',
      color: 'green',
      columns: ['code','description','discount_percent'],
      icon: <FaTicketAlt />
    },
    {
      key: 'excel',
      count: '',
      label: 'Báo cáo Excel',
      color: 'purple',
      icon: <FaFileExcel />
    },
  ];

  // Thêm shippers vào dataMap
  const dataMap = { employees, accounts: employees, lockedUsers, vouchers, shippers };

  const handleCardClick = (card) => {
    if (card.key === 'excel') {
      navigate(ENUM_PAGE.StatisticReport);
    } else if (card.key === 'shippers') {
      // Điều hướng đến trang quản lý shipper thay vì hiển thị bảng
      navigate(ENUM_PAGE.ShipperManagement);
    } else {
      setActiveList(card.key);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {cards.map(card => (
          <div
            key={card.key}
            className={`card ${card.color}`}
            onClick={() => handleCardClick(card)}
          >
            <div className="card-icon">{card.icon}</div>
            {card.count !== '' && <div className="count">{card.count}</div>}
            <div className="label">{card.label}</div>
            <button className="card-button">
              {card.key === 'excel'
                ? 'Xuất báo cáo'
                : card.key === 'shippers'
                  ? 'Quản lý shipper'
                  : card.key === 'salary'
                    ? 'Xem bảng lương'
                    : `Danh sách ${card.label.toLowerCase()}`}
            </button>
          </div>
        ))}
      </div>

      {/* Hiển thị bảng chỉ với các card có columns (trừ shippers vì đã điều hướng) */}
      {activeList && activeList !== 'shippers' && cards.find(c => c.key === activeList)?.columns && (
        <div className="list-container">
          <div className="list-header">
            <h3>Dữ liệu: {cards.find(c => c.key === activeList).label}</h3>
            <button 
              className="close-btn"
              onClick={() => setActiveList(null)}
            >
              ✕
            </button>
          </div>
          <table>
            <thead>
              <tr>
                {cards.find(c => c.key === activeList).columns.map(col => (
                  <th key={col}>
                    {col.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataMap[activeList].map(item => (
                <tr key={item._id}>
                  {cards.find(c => c.key === activeList).columns.map(col => (
                    <td key={col}>{String(item[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardCards;