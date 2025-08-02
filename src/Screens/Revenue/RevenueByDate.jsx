// src/Screens/Revenue/RevenueByDate.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueCommon.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const fmtDate = d => d.toISOString().split('T')[0];

const RevenueByDate = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [bills, setBills] = useState([]);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    api.get('/bills').then(r => setBills(r.data.data));
    api.get('/billdetails').then(r => setDetails(r.data.data));
  }, []);

  const billsInDate = selectedDate
    ? bills.filter(b => fmtDate(new Date(b.created_at)) === fmtDate(selectedDate))
    : [];
  const idSet = new Set(billsInDate.map(b => b._id));
  const detInDate = details.filter(d => idSet.has(d.bill_id));
  const total = detInDate.reduce((sum,d) => sum + d.quantity*d.price, 0);

  return (
    <div className="revenue-container">
      <TabBarr />
      
      <div className="revenue-wrapper">
        <div className="revenue-header">
          <div className="header-content">
            <div className="header-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
            </div>
            <div className="header-text">
              <h2>Doanh thu theo ngày</h2>
              <p>Xem chi tiết doanh thu trong ngày cụ thể</p>
            </div>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-card">
            <div className="filter-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="21 21l-4.35-4.35"/>
              </svg>
              <span>Lọc dữ liệu</span>
            </div>
            <div className="filter-content">
              <div className="date-picker-group">
                <label>Chọn ngày:</label>
                <div className="date-picker-wrapper">
                  <DatePicker
                    selected={selectedDate}
                    onChange={setSelectedDate}
                    placeholderText="Chọn ngày cần xem"
                    dateFormat="dd/MM/yyyy"
                    className="modern-date-input"
                  />
                  <div className="date-picker-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="result-section">
            <div className="result-card">
              <div className="result-header">
                <div className="result-title">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <line x1="9" y1="9" x2="15" y2="9"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                  </svg>
                  <h3>Ngày: {fmtDate(selectedDate)}</h3>
                </div>
                <div className="result-stats">
                  <div className="stat-item">
                    <span className="stat-label">Số hóa đơn</span>
                    <span className="stat-value">{billsInDate.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sản phẩm bán</span>
                    <span className="stat-value">{detInDate.length}</span>
                  </div>
                </div>
              </div>
              
              {detInDate.length > 0 ? (
                <div className="table-container">
                  <div className="table-wrapper">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Mã hóa đơn</th>
                          <th>Số lượng</th>
                          <th>Đơn giá</th>
                          <th>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detInDate.map((d,i) => (
                          <tr key={i} className="table-row">
                            <td className="row-number">{i+1}</td>
                            <td className="bill-id">{d.bill_id}</td>
                            <td className="quantity">{d.quantity}</td>
                            <td className="price">{d.price.toLocaleString('vi-VN')} ₫</td>
                            <td className="total">{(d.quantity*d.price).toLocaleString('vi-VN')} ₫</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="total-summary">
                    <div className="total-card">
                      <div className="total-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M16 8l-4 4-4-4"/>
                        </svg>
                      </div>
                      <div className="total-content">
                        <span className="total-label">Tổng doanh thu</span>
                        <span className="total-amount">{total.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <h4>Không có dữ liệu</h4>
                  <p>Không có giao dịch nào trong ngày đã chọn</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueByDate;