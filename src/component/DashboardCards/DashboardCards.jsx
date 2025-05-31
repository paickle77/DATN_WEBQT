import React, { useState } from 'react';
import './DashboardCards.scss';

const employeeList = [
  { name: 'Nguyễn Văn A', position: 'Kế toán' },
  { name: 'Trần Thị B', position: 'Nhân sự' },
  { name: 'Lê Văn C', position: 'IT Support' },
];

const baseList = [
  { name: 'Số 1 Trịnh Văn Bô', position: 'Quận Nam Từ Niêm-TPHN' },
  { name: 'Toàn nhà Trung Yên', position: 'Quận Cầu Giấy-TPHN' },
  
];

const useList = [
  { name: 'An Le', usename: 'anlvph48260@fpt.edu.vn' },
  { name: 'Lê Văn An', usename: 'levanan.8b@gmail.com' },
  
];

const cardsData = [
  { count: employeeList.length, label: 'Nhân viên', button: 'Danh sách nhân viên', color: 'blue' },
  { count: baseList.length, label: 'Cơ Sở', button: 'Danh sách phòng ban', color: 'orange' },
  { count: useList.length, label: 'Tài khoản người dùng', button: 'Danh sách tài khoản', color: 'amber' },
  { count: 2, label: 'Nhân viên nghỉ việc', button: 'Danh sách nghỉ việc', color: 'red' },
  { count: '', label: 'EXCEL', button: 'Xuất báo cáo', color: 'green' },
  { count: '', label: 'EXCEL', button: 'Lương nhân viên', color: 'green' },
];

const DashboardCards = () => {
  const [showEmployees, setShowEmployees] = useState(false);
  const [showBase, setShowBase] = useState(false);
  const [showUse, setShowUse] = useState(false);


  const handleCardClick = (label) => {
    if (label === 'Nhân viên') {
      setShowEmployees(!showEmployees);
    }
    if (label === 'Cơ Sở') {
      setShowBase(!showBase);
    }
    if (label === 'Tài khoản người dùng') {
      setShowUse(!showUse);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {cardsData.map((card, index) => (
          <div
            className={`card ${card.color}`}
            key={index}
            onClick={() => handleCardClick(card.label)}
          >
            {card.count !== '' && <div className="count">{card.count}</div>}
            <div className="label">{card.label}</div>
            <button className="card-button">{card.button}</button>
          </div>
        ))}
      </div>

      {/* Danh sách nhân viên */}
      {showEmployees && (
        <div className="employee-list">
          <h3>Danh sách nhân viên</h3>
          <ul>
            {employeeList.map((emp, idx) => (
              <li key={idx}>
                <strong>{emp.name}</strong> – {emp.position}
              </li>
            ))}
          </ul>
        </div>
      )}


       {/* Danh sách cơ sở */}
      {showBase && (
        <div className="employee-list">
          <h3>Danh sách cơ sở</h3>
          <ul>
            {baseList.map((base, idx) => (
              <li key={idx}>
                <strong>{base.name}</strong> – {base.position}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danh sách người dùng */}
      {showUse && (
        <div className="employee-list">
          <h3>Danh sách người dùng</h3>
          <ul>
            {useList.map((base, idx) => (
              <li key={idx}>
                <strong>{base.name}</strong> – {base.usename}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardCards;
