// src/component/DashboardCards/DashboardCards.jsx
import React, { useState, useEffect } from 'react';
import './DashboardCards.scss';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { ENUM_PAGE } from '../ENUM/enum.ts';

const DashboardCards = () => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches]   = useState([]);
  const [vouchers, setVouchers]   = useState([]);
  const [lockedUsers, setLockedUsers] = useState([]);              // thêm state
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
      setLockedUsers(allUsers.filter(u => u.is_lock));            // lọc tài khoản bị khoá
      setBranches(bRes.data.data);
      setVouchers(vRes.data.data);
    });
  }, []);

  const cards = [
    { key: 'employees',   count: employees.length,    label: 'Nhân viên',          color: 'blue',   columns: ['name','email','phone'] },
    { key: 'branches',    count: branches.length,     label: 'Cơ Sở',              color: 'orange', columns: ['name','address','phone'] },
    { key: 'accounts',    count: employees.length,    label: 'Tài khoản người dùng',color: 'amber',  columns: ['name','email','phone'] },
    { key: 'lockedUsers', count: lockedUsers.length,  label: 'Tài khoản bị khóa',   color: 'red',   columns: ['name','email','phone'] },
    { key: 'vouchers',    count: vouchers.length,     label: 'Khuyến mãi',         color: 'green',  columns: ['code','description','discount_percent'] },
    { key: 'excel',       count: '',                  label: 'EXCEL',              color: 'red' },
    { key: 'salary',      count: '',                  label: 'Lương nhân viên',    color: 'purple' },
  ];

  const dataMap = {
    employees,
    branches,
    accounts: employees,
    lockedUsers,
    vouchers
  };

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
            {card.count !== '' && <div className="count">{card.count}</div>}
            <div className="label">{card.label}</div>
            <button className="card-button">
              {card.key === 'excel'
                ? 'Xuất báo cáo'
                : card.key === 'salary'
                  ? 'Bảng lương'
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
