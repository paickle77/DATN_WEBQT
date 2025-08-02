import React, { useState, useEffect } from 'react';
import './VoucherManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';

// ─── Helper kiểm tra voucher còn hiệu lực hay không ───
const isVoucherValid = v => {
  const now = new Date();
  return v.start_date && v.end_date
    ? now >= new Date(v.start_date) && now <= new Date(v.end_date)
    : false;
};

const emptyVoucher = {
  code: '',
  description: '',
  discount_percent: 0,
  start_date: null,
  end_date: null
};

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyVoucher);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    api.get('/vouchers')
      .then(res => setVouchers(res.data.data))
      .catch(console.error);
  };

  const handleDelete = id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) {
      api.delete(`/vouchers/${id}`)
        .then(fetchAll)
        .catch(console.error);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyVoucher);
    setShowForm(true);
  };

  const handleEdit = v => {
    setEditingId(v._id);
    setFormData({
      code: v.code,
      description: v.description,
      discount_percent: v.discount_percent,
      start_date: v.start_date ? new Date(v.start_date) : null,
      end_date: v.end_date ? new Date(v.end_date) : null
    });
    setShowForm(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      code: formData.code,
      description: formData.description,
      discount_percent: formData.discount_percent,
      start_date: formData.start_date,
      end_date: formData.end_date
    };
    const req = editingId
      ? api.put(`/vouchers/${editingId}`, payload)
      : api.post('/vouchers', payload);

    req.then(() => {
      fetchAll();
      setShowForm(false);
    })
    .catch(err => {
      alert(err.response?.data?.msg || err.message);
    });
  };

  const filtered = vouchers.filter(v =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count statistics
  const validVouchers = vouchers.filter(isVoucherValid).length;
  const expiredVouchers = vouchers.length - validVouchers;

  return (
    <div className="voucher-management">
      <TabBarr />
      
      <div className="voucher-container">
        <div className="header-section">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9L15 15" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
            </svg>
          </div>
          <h1>Quản lý khuyến mãi & Mã giảm giá</h1>
          <p className="subtitle">Tạo và quản lý các chương trình khuyến mãi cho khách hàng</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{vouchers.length}</span>
              <span className="stat-label">Tổng voucher</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-valid">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM9.29 16.29L5.7 12.7C5.31 12.31 5.31 11.68 5.7 11.29S6.68 10.9 7.07 11.29L10 14.17L16.93 7.24C17.32 6.85 17.95 6.85 18.34 7.24S18.73 8.22 18.34 8.61L10.71 16.24C10.32 16.63 9.68 16.63 9.29 16.24V16.29Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{validVouchers}</span>
              <span className="stat-label">Còn hiệu lực</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-expired">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM15.5 14.5L14.5 15.5L12 13L9.5 15.5L8.5 14.5L11 12L8.5 9.5L9.5 8.5L12 11L14.5 8.5L15.5 9.5L13 12L15.5 14.5Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{expiredVouchers}</span>
              <span className="stat-label">Hết hạn</span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="content-header">
            <h3>Danh sách voucher</h3>
            <div className="top-bar">
              <div className="search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="21 21L16.65 16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc mô tả..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="add-button" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Thêm khuyến mãi
              </button>
            </div>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-box">
                <div className="modal-header">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
                    </svg>
                    {editingId ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
                  </h3>
                  <button className="close-btn" onClick={() => setShowForm(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                    </svg>
                  </button>
                </div>
                
                <form className="voucher-form" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
                        </svg>
                        Mã code
                      </label>
                      <input 
                        required
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        placeholder="Nhập mã voucher"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                        </svg>
                        Mô tả
                      </label>
                      <input 
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Mô tả voucher"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9Z"/>
                        </svg>
                        % Giảm giá
                      </label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        max="100"
                        value={formData.discount_percent}
                        onChange={e => setFormData({...formData, discount_percent: +e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                        </svg>
                        Ngày bắt đầu
                      </label>
                      <DatePicker
                        selected={formData.start_date}
                        onChange={date => setFormData({...formData, start_date: date})}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Chọn ngày bắt đầu"
                        className="modern-datepicker"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                        </svg>
                        Ngày kết thúc
                      </label>
                      <DatePicker
                        selected={formData.end_date}
                        onChange={date => setFormData({...formData, end_date: date})}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Chọn ngày kết thúc"
                        className="modern-datepicker"
                      />
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                      </svg>
                      {editingId ? 'Lưu thay đổi' : 'Tạo voucher'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                      </svg>
                      Hủy bỏ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
                      </svg>
                      Code
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"/>
                      </svg>
                      Mô tả
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
                      </svg>
                      Giảm giá (%)
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                      </svg>
                      Ngày bắt đầu
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"/>
                      </svg>
                      Ngày kết thúc
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2Z"/>
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
                {filtered.length > 0 ? filtered.map((v, i) => {
                  const valid = isVoucherValid(v);
                  return (
                    <tr key={v._id} className={valid ? 'valid-row' : 'expired-row'}>
                      <td className="row-number">{i + 1}</td>
                      <td className="code-cell">
                        <span className="voucher-code">{v.code}</span>
                      </td>
                      <td className="description-cell">{v.description}</td>
                      <td className="discount-cell">
                        <span className="discount-badge">{v.discount_percent}%</span>
                      </td>
                      <td className="date-cell">
                        {v.start_date ? new Date(v.start_date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="date-cell">
                        {v.end_date ? new Date(v.end_date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${valid ? 'status-valid' : 'status-expired'}`}>
                          {valid ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                              </svg>
                              Còn hạn
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                              </svg>
                              Hết hạn
                            </>
                          )}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(v)}
                            disabled={!valid}
                            title="Sửa voucher"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04V7.04Z"/>
                            </svg>
                            Sửa
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(v._id)}
                            disabled={!valid}
                            title="Xóa voucher"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                            </svg>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      <div className="no-data-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                        </svg>
                        <p>Không tìm thấy voucher nào</p>
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

export default VoucherManagement;