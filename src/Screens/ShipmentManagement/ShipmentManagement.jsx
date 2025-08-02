import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

export default function ShipmentManagement() {
  const [shipments, setShipments] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetchData();
    api.get('/users').then(r => {
      setStaff(r.data.data.filter(u => u.role === 'shipper'));
    });
  }, []);

  const fetchData = () =>
    api.get('/shipments')
       .then(r => setShipments(r.data.data))
       .catch(() => toast.error('Không tải được danh sách giao hàng'));

  const updateShipment = (id, payload) => {
    api.put(`/shipments/${id}`, payload)
       .then(() => {
         toast.success('Cập nhật thành công');
         fetchData();
       })
       .catch(() => toast.error('Lỗi khi cập nhật'));
  };

  return (
    <div className="shipment-management">
      <TabBarr />
      
      <div className="shipment-content">
        <div className="header-section">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <h1>Quản lý Giao hàng & Tracking</h1>
          <p className="subtitle">Theo dõi và quản lý tình trạng giao hàng hiệu quả</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.length}</span>
              <span className="stat-label">Tổng đơn hàng</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-shipping">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8H20L23 12V17H21C21 18.66 19.66 20 18 20S15 18.66 15 17H9C9 18.66 7.66 20 6 20S3 18.66 3 17H1V6C1 4.9 1.9 4 3 4H17V8ZM18 18.5C18.83 18.5 19.5 17.83 19.5 17S18.83 15.5 18 15.5 16.5 16.17 16.5 17 17.17 18.5 18 18.5ZM6 18.5C6.83 18.5 7.5 17.83 7.5 17S6.83 15.5 6 15.5 4.5 16.17 4.5 17 5.17 18.5 6 18.5Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.filter(s => s.status === 'shipping').length}</span>
              <span className="stat-label">Đang giao</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-done">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.filter(s => s.status === 'done').length}</span>
              <span className="stat-label">Hoàn thành</span>
            </div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách đơn hàng</h3>
            <div className="table-actions">
              <div className="search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="21 21L16.65 16.65"/>
                </svg>
                <input type="text" placeholder="Tìm kiếm đơn hàng..." />
              </div>
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
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                      </svg>
                      Hóa đơn
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                      </svg>
                      Shipper
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17 12H12V17H10V12H7L12 7L17 12Z"/>
                      </svg>
                      Ngày gửi
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2ZM4 15.5L5.5 17L4 18.5L2.5 17L4 15.5ZM6.5 18L12 22L17.5 18V14L12 10L6.5 14V18Z"/>
                      </svg>
                      Tracking
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                      </svg>
                      Trạng thái
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
                {shipments.map((s, i) => {
                  return (
                    <tr key={s._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      <td className="bill-info">
                        <div className="bill-id">
                          <span className="bill-label">#{s.bill_id?._id || '-'}</span>
                        </div>
                      </td>
                      <td className="shipper-select">
                        <select
                          value={s.assignedTo || ''}
                          onChange={(e) => updateShipment(s._id, { assignedTo: e.target.value })}
                          className="modern-select"
                        >
                          <option value="">— Chọn shipper —</option>
                          {staff.map(u => (
                            <option key={u._id} value={u._id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="date-info">
                        <div className="date-display">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17 12H12V17H10V12H7L12 7L17 12Z"/>
                          </svg>
                          {new Date(s.shippedDate).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="tracking-info">
                        <div className="tracking-display">
                          <span className="carrier">{s.carrier}</span>
                          <span className="tracking-code">{s.trackingCode}</span>
                        </div>
                      </td>
                      <td className="status-cell">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {['shipping','done'].map(st => {
                            let disabled = false;
                            if (st === 'shipping') {
                              disabled = s.status !== 'shipping' && s.status !== 'doing';
                            } else {
                              disabled = s.status !== 'shipping';
                            }
                            if (s.status === st) disabled = true;

                            const label = st === 'shipping' ? 'Đang giao' : 'Hoàn thành';
                            const icon = st === 'shipping' ? 
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 8H20L23 12V17H21C21 18.66 19.66 20 18 20S15 18.66 15 17H9C9 18.66 7.66 20 6 20S3 18.66 3 17H1V6C1 4.9 1.9 4 3 4H17V8Z"/>
                              </svg> :
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                              </svg>;

                            return (
                              <button
                                key={st}
                                className={`action-btn ${st === 'shipping' ? 'btn-shipping' : 'btn-done'}`}
                                disabled={disabled}
                                onClick={() => updateShipment(s._id, { status: st })}
                              >
                                {icon}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}