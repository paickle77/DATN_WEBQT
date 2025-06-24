// src/component/DashboardCards/DashboardCards.jsx
import React, { useState, useEffect } from 'react';
import './DashboardCards.scss';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { ENUM_PAGE }   from '../ENUM/enum.ts';  // hoặc .ts nếu bạn chưa đổi sang .js

const DashboardCards = () => {
  const [employees, setEmployees]   = useState([]);
  const [branches, setBranches]     = useState([]);
  const [vouchers, setVouchers]     = useState([]);
  const [activeList, setActiveList] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/branches'),
      api.get('/vouchers')
    ]).then(([uRes, bRes, vRes]) => {
      setEmployees(uRes.data.data);
      setBranches(bRes.data.data);
      setVouchers(vRes.data.data);
    });
  }, []);

  const cards = [
    { key: 'employees', count: employees.length,    label: 'Nhân viên',          color: 'blue',   columns: ['name','email','phone'] },
    { key: 'branches',  count: branches.length,     label: 'Cơ Sở',              color: 'orange', columns: ['name','address','phone'] },
    { key: 'accounts',  count: employees.length,    label: 'Tài khoản người dùng',color: 'amber',  columns: ['name','email','phone'] },
    { key: 'vouchers',  count: vouchers.length,     label: 'Khuyến mãi',         color: 'green',  columns: ['code','description','discount_percent'] },
    { key: 'excel',     count: '',                  label: 'EXCEL',              color: 'red' },
    { key: 'salary',    count: '',                  label: 'Lương nhân viên',    color: 'purple' },
  ];

  const dataMap = {
    employees,
    branches,
    accounts: employees,
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
                // điều hướng sang trang Báo cáo
                navigate(ENUM_PAGE.StatisticReport);
              } else {
                // vẫn giữ lại hành vi cũ với các card khác
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

      {/* Phần hiển thị danh sách cột chỉ với những card có columns */}
      {activeList && cards.find(c => c.key === activeList)?.columns && (
        <div className="list-container">
          <h3>Dữ liệu: {cards.find(c => c.key === activeList).label}</h3>
          <table>
            <thead>
              <tr>
                {cards
                  .find(c => c.key === activeList)
                  .columns.map(col => (
                    <th key={col}>
                      {col.replace(/_/g, ' ')
                         .replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {dataMap[activeList].map(item => (
                <tr key={item._id}>
                  {cards
                    .find(c => c.key === activeList)
                    .columns.map(col => (
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
