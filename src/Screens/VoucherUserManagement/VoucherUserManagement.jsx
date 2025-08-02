// src/Screens/VoucherUserManagement/VoucherUserManagement.jsx
import React, { useState, useEffect } from 'react';
import './VoucherUserManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';

const STATUSES = ['active','used','expired'];

const VoucherUserManagement = () => {
  const [data, setData] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(null); // chứa bản ghi đang edit

  useEffect(() => { fetchAll(); }, []);

  function fetchAll() {
    // nếu bạn đang ở màn admin, hãy gọi endpoint admin:
    api.get('/admin/voucher_users')
       .then(r => setData(r.data.data))
       .catch(console.error);
  }

  const filtered = data.filter(vu => {
    if (filterStatus !== 'all' && vu.status !== filterStatus) return false;
    const term = searchTerm.toLowerCase();
    return vu.user_id?.name.toLowerCase().includes(term)
        || vu.voucher_id?.code.toLowerCase().includes(term);
  });

  const saveStatus = (id, status) => {
    api.put(`/voucher_users/${id}`, { status })
       .then(fetchAll)
       .catch(err => alert(err.message));
  };

  const del = id => {
    if (!window.confirm('Xóa voucher user này?')) return;
    api.delete(`/voucher_users/${id}`)
       .then(fetchAll)
       .catch(err => alert(err.message));
  };

  // Count statistics
  const activeCount = data.filter(vu => vu.status === 'active').length;
  const usedCount = data.filter(vu => vu.status === 'used').length;
  const expiredCount = data.filter(vu => vu.status === 'expired').length;

  return (
    <div className="voucher-user-management">
      <TabBar />
      
      <div className="voucher-user-container">
        <div className="header-section">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C18.21 4 20 5.79 20 8S18.21 12 16 12 12 10.21 12 8 13.79 4 16 4ZM16 14C20.42 14 24 15.79 24 18V20H8V18C8 15.79 11.58 14 16 14Z" fill="currentColor"/>
              <path d="M6 6C7.1 6 8 6.9 8 8S7.1 10 6 10 4 9.1 4 8 4.9 6 6 6ZM6 12C8.67 12 12 13.34 12 16V18H0V16C0 13.34 3.33 12 6 12Z" fill="currentColor"/>
              <circle cx="18" cy="8" r="3" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
            </svg>
          </div>
          <h1>Quản lý Voucher của User</h1>
          <p className="subtitle">Theo dõi và quản lý voucher được phân phối cho khách hàng</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{data.length}</span>
              <span className="stat-label">Tổng voucher</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{activeCount}</span>
              <span className="stat-label">Đang hoạt động</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-used">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{usedCount}</span>
              <span className="stat-label">Đã sử dụng</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-expired">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM15.5 14.5L14.5 15.5L12 13L9.5 15.5L8.5 14.5L11 12L8.5 9.5L9.5 8.5L12 11L14.5 8.5L15.5 9.5L13 12L15.5 14.5Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{expiredCount}</span>
              <span className="stat-label">Hết hạn</span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-header">
            <h3>Danh sách voucher user</h3>
            <div className="controls">
              <div className="search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="21 21L16.65 16.65"/>
                </svg>
                <input
                  placeholder="Tìm theo tên user hoặc mã voucher..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-select">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 6L10 10V15L14 19V14L18 10V6H14Z"/>
                </svg>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <button className="refresh-btn" onClick={fetchAll}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12S7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12S8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"/>
                </svg>
                Làm mới
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                      </svg>
                      User
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
                      </svg>
                      Voucher Code
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
                      </svg>
                      Discount
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                      </svg>
                      Start Date
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2Z"/>
                      </svg>
                      Status
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                      </svg>
                      Ngày dùng
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8C13.1 8 14 7.1 14 6S13.1 4 12 4 10 4.9 10 6 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12S10.9 14 12 14 14 13.1 14 12 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18S10.9 20 12 20 14 19.1 14 18 13.1 16 12 16Z"/>
                      </svg>
                      Hành động
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vu, i) => (
                  <tr key={vu._id} className={`status-${vu.status}`}>
                    <td className="row-number">{i + 1}</td>
                    <td className="user-cell">
                      <div className="user-info">
                        <div className="user-avatar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                          </svg>
                        </div>
                        <div className="user-details">
                          <span className="user-name">{vu.user_id?.name}</span>
                          <span className="user-email">{vu.user_id?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="voucher-cell">
                      <span className="voucher-code">{vu.voucher_id?.code}</span>
                    </td>
                    <td className="discount-cell">
                      <span className="discount-badge">{vu.voucher_id?.discount_percent}%</span>
                    </td>
                    <td className="date-cell">
                      <div className="date-display">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                        </svg>
                        {new Date(vu.start_date).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="status-cell">
                      <select
                        className={`status-select status-${vu.status}`}
                        value={vu.status}
                        onChange={e => saveStatus(vu._id, e.target.value)}
                      >
                        {STATUSES.map(s =>
                          <option key={s} value={s}>{s}</option>
                        )}
                      </select>
                    </td>
                    <td className="used-date-cell">
                      <div className="date-display">
                        {vu.used_date ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                            </svg>
                            {new Date(vu.used_date).toLocaleDateString('vi-VN')}
                          </>
                        ) : (
                          <span className="no-date">-</span>
                        )}
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="delete-btn" 
                        onClick={() => del(vu._id)}
                        title="Xóa voucher user"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                        </svg>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="no-data">
                      <div className="no-data-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                        </svg>
                        <p>Không tìm thấy voucher user nào</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherUserManagement;