import React, { useState, useEffect } from 'react';
import './SupplierManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptySupplier = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  tax_code: '',
  payment_terms: '',
  status: 'active',
  rating: 5,
  contract_start_date: '',
  contract_end_date: '',
  notes: '',
  updated_at: null
};

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = () => api.get('/suppliers').then(r=>setSuppliers(r.data.data)).catch(console.error);
  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => { 
    setEditingId(null); 
    setFormData({
      ...emptySupplier,
      contract_start_date: new Date().toISOString().split('T')[0]
    }); 
    setShowForm(true); 
  };
  
  const handleEdit = supplier => { 
    setEditingId(supplier._id); 
    setFormData({ 
      ...supplier, 
      contract_start_date: supplier.contract_start_date ? new Date(supplier.contract_start_date).toISOString().split('T')[0] : '',
      contract_end_date: supplier.contract_end_date ? new Date(supplier.contract_end_date).toISOString().split('T')[0] : '',
      updated_at: new Date(supplier.updated_at) 
    }); 
    setShowForm(true); 
  };
  
  const handleDelete = id => { 
    if(window.confirm('Xóa nhà phân phối này?')) 
      api.delete(`/suppliers/${id}`).then(fetchAll); 
  };
  
  const handleSubmit = e => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      rating: Number(formData.rating),
      contract_start_date: formData.contract_start_date ? new Date(formData.contract_start_date) : null,
      contract_end_date: formData.contract_end_date ? new Date(formData.contract_end_date) : null,
      updated_at: new Date() 
    };
    const req = editingId
      ? api.put(`/suppliers/${editingId}`, payload)
      : api.post('/suppliers', payload);
    req.then(()=>{ fetchAll(); setShowForm(false); }).catch(err=>alert(err.message));
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? 
      <span className="status-badge active">
        <div className="status-indicator"></div>
        Hoạt động
      </span> : 
      <span className="status-badge inactive">
        <div className="status-indicator"></div>
        Ngừng hoạt động
      </span>;
  };

  const getRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="supplier-management">
      <TabBarr />
      
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1>Quản lý nhà phân phối</h1>
            <p className="subtitle">Quản lý thông tin và quan hệ đối tác</p>
          </div>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-number">{suppliers.length}</div>
              <div className="stat-label">Tổng số nhà phân phối</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{suppliers.filter(s => s.status === 'active').length}</div>
              <div className="stat-label">Đang hoạt động</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        <div className="toolbar">
          <div className="search-section">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                placeholder="Tìm kiếm nhà phân phối..." 
                value={searchTerm} 
                onChange={e=>setSearchTerm(e.target.value)} 
                className="search-input"
              />
            </div>
          </div>
          <button className="add-button" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Thêm nhà phân phối
          </button>
        </div>
        
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>{editingId ? 'Chỉnh sửa nhà phân phối' : 'Thêm nhà phân phối mới'}</h2>
                <button className="close-button" onClick={()=>setShowForm(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              
              <form className="modern-form" onSubmit={handleSubmit}>
                <div className="form-sections">
                  <div className="form-section">
                    <h3 className="section-title">Thông tin cơ bản</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tên nhà phân phối *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e=>setFormData({...formData, name: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Người liên hệ *</label>
                        <input
                          type="text"
                          required
                          value={formData.contact_person}
                          onChange={e=>setFormData({...formData, contact_person: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Số điện thoại *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={e=>setFormData({...formData, phone: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e=>setFormData({...formData, email: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Mã số thuế</label>
                        <input
                          type="text"
                          value={formData.tax_code}
                          onChange={e=>setFormData({...formData, tax_code: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select
                          value={formData.status}
                          onChange={e=>setFormData({...formData, status: e.target.value})}
                          className="form-select"
                        >
                          <option value="active">Hoạt động</option>
                          <option value="inactive">Ngừng hoạt động</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Đánh giá</label>
                        <select
                          value={formData.rating}
                          onChange={e=>setFormData({...formData, rating: Number(e.target.value)})}
                          className="form-select"
                        >
                          {[5,4,3,2,1].map(num => (
                            <option key={num} value={num}>{num} sao ({'★'.repeat(num)})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">Thông tin hợp đồng</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Ngày bắt đầu hợp đồng</label>
                        <input
                          type="date"
                          value={formData.contract_start_date}
                          onChange={e=>setFormData({...formData, contract_start_date: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Ngày kết thúc hợp đồng</label>
                        <input
                          type="date"
                          value={formData.contract_end_date}
                          onChange={e=>setFormData({...formData, contract_end_date: e.target.value})}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">Thông tin chi tiết</h3>
                    <div className="form-group full-width">
                      <label>Địa chỉ *</label>
                      <textarea
                        required
                        rows="3"
                        value={formData.address}
                        onChange={e=>setFormData({...formData, address: e.target.value})}
                        className="form-textarea"
                      />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Điều kiện thanh toán</label>
                      <input
                        type="text"
                        placeholder="VD: Thanh toán trong 30 ngày"
                        value={formData.payment_terms}
                        onChange={e=>setFormData({...formData, payment_terms: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Ghi chú</label>
                      <textarea
                        rows="4"
                        value={formData.notes}
                        onChange={e=>setFormData({...formData, notes: e.target.value})}
                        className="form-textarea"
                        placeholder="Nhập ghi chú về nhà phân phối..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={()=>setShowForm(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="submit-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    {editingId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách nhà phân phối ({filtered.length})</h3>
          </div>
          
          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Nhà phân phối</th>
                  <th>Liên hệ</th>
                  <th>Thông tin</th>
                  <th>Địa chỉ</th>
                  <th>Trạng thái</th>
                  <th>Đánh giá</th>
                  <th>Hợp đồng</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier,i)=>(
                  <tr key={supplier._id} className="table-row">
                    <td className="row-number">{i+1}</td>
                    <td className="supplier-info">
                      <div className="supplier-name">{supplier.name}</div>
                      {supplier.tax_code && <div className="tax-code">MST: {supplier.tax_code}</div>}
                    </td>
                    <td className="contact-info">
                      <div className="contact-person">{supplier.contact_person}</div>
                      <div className="contact-details">
                        <div className="phone">{supplier.phone}</div>
                        {supplier.email && <div className="email">{supplier.email}</div>}
                      </div>
                    </td>
                    <td className="additional-info">
                      {supplier.payment_terms && (
                        <div className="payment-terms" title={supplier.payment_terms}>
                          {supplier.payment_terms.length > 20 ? supplier.payment_terms.substring(0, 20) + '...' : supplier.payment_terms}
                        </div>
                      )}
                    </td>
                    <td className="address-cell" title={supplier.address}>
                      {supplier.address.length > 40 ? supplier.address.substring(0, 40) + '...' : supplier.address}
                    </td>
                    <td>{getStatusBadge(supplier.status)}</td>
                    <td className="rating-cell">
                      <div className="rating-display">
                        <span className="stars">{getRatingStars(supplier.rating)}</span>
                        <span className="rating-number">({supplier.rating}/5)</span>
                      </div>
                    </td>
                    <td className="contract-info">
                      {supplier.contract_start_date && (
                        <div className="contract-dates">
                          <div className="start-date">
                            <span className="label">Từ:</span>
                            <span className="date">{new Date(supplier.contract_start_date).toLocaleDateString('vi-VN')}</span>
                          </div>
                          {supplier.contract_end_date && (
                            <div className="end-date">
                              <span className="label">Đến:</span>
                              <span className="date">{new Date(supplier.contract_end_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="update-date">{new Date(supplier.updated_at).toLocaleDateString('vi-VN')}</td>
                    <td className="actions">
                      <button className="edit-btn" onClick={()=>handleEdit(supplier)} title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="delete-btn" onClick={()=>handleDelete(supplier._id)} title="Xóa">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="m19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filtered.length === 0 && (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>Không tìm thấy nhà phân phối</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc thêm nhà phân phối mới</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;