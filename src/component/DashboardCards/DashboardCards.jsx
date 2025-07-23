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
  const [branches, setBranches]   = useState([]);
  const [vouchers, setVouchers]   = useState([]);
  const [lockedUsers, setLockedUsers] = useState([]);
  const [activeList, setActiveList]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/branches'),
      api.get('/vouchers'),
    ]).then(([uRes, bRes, vRes]) => {
      const allUsers = uRes.data.data;
      setEmployees(allUsers);
      setLockedUsers(allUsers.filter(u => u.is_lock));
      setBranches(bRes.data.data);
      setVouchers(vRes.data.data);
    });
  }, []);

  const cards = [
    // {
    //   key: 'employees',
    //   count: employees.length,
    //   label: 'Nhân viên',
    //   color: 'blue',
    //   columns: ['name','email','phone'],
    //   icon: <FaUserTie />
    // },
    {
      key: 'accounts',
      count: employees.length,
      label: 'Người dùng',
      color: 'blue',
      columns: ['name','email','phone'],
      icon: <FaUser />
    },
    {
      key: 'branches',
      count: branches.length,
      label: 'Cơ sở',
      color: 'orange',
      columns: ['name','address','phone'],
      icon: <FaWarehouse />
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
    // {
    //   key: 'salary',
    //   count: '',
    //   label: 'Bảng lương',
    //   color: 'green',
    //   icon: <FaMoneyBillWave />
    // },
  ];

  const dataMap = { employees, branches, accounts: employees, lockedUsers, vouchers };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {cards.map(card => (
          <div
            key={card.key}
            className={`card ${card.color}`}
            onClick={() => {
              if (card.key === 'excel') {
                navigate(ENUM_PAGE.StatisticReport);
              } else {
                setActiveList(card.key);
              }
            }}
          >
            <div className="card-icon">{card.icon}</div>
            {card.count !== '' && <div className="count">{card.count}</div>}
            <div className="label">{card.label}</div>
            <button className="card-button">
              {card.key === 'excel'
                ? 'Xuất báo cáo'
                : card.key === 'salary'
                  ? 'Xem bảng lương'
                  : `Danh sách ${card.label.toLowerCase()}`}
            </button>
          </div>
        ))}
      </div>

      {/* Hiển thị bảng chỉ với các card có columns */}
      {activeList && cards.find(c => c.key === activeList)?.columns && (
        <div className="list-container">
          <h3>Dữ liệu: {cards.find(c => c.key === activeList).label}</h3>
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
