import React, { useState, useEffect } from 'react';
import './BranchManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyBranch = {
  name: '',
  address: '',
  phone: ''
};

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyBranch);
  const [editingId, setEditingId] = useState(null);

  // Chỉ có 1 useEffect đúng:
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () =>
    api.get('/branches')
       .then(r => setBranches(r.data.data))
       .catch(console.error);

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyBranch);
    setShowForm(true);
  };
  const handleEdit = b => {
    setEditingId(b._id);
    setFormData({ name: b.name, address: b.address, phone: b.phone });
    setShowForm(true);
  };
  const handleDelete = id => {
    if (window.confirm('Xóa chi nhánh?')) api.delete(`/branches/${id}`).then(fetchAll);
  };
  const handleSubmit = e => {
    e.preventDefault();
    const req = editingId
      ? api.put(`/branches/${editingId}`, formData)
      : api.post('/branches', formData);
    req.then(() => {
      fetchAll();
      setShowForm(false);
    }).catch(err => alert(err.message));
  };

  return (
    <div className="branch-management">
      <TabBarr />
      
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">🏢</span>
            Quản lý chi nhánh
          </h1>
          <p className="page-subtitle">Quản lý thông tin các chi nhánh của công ty</p>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="top-controls">
          <div className="search-section">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm kiếm chi nhánh theo tên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <button onClick={handleAdd} className="add-btn">
            <span className="btn-icon">+</span>
            Thêm chi nhánh
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <form className="modern-form" onSubmit={handleSubmit}>
                <div className="form-header">
                  <h3 className="form-title">
                    {editingId ? '✏️ Sửa chi nhánh' : '➕ Thêm chi nhánh mới'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="close-btn"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="form-body">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">🏷️</span>
                      Tên chi nhánh
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="Nhập tên chi nhánh..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📍</span>
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="form-input"
                      placeholder="Nhập địa chỉ chi nhánh..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📞</span>
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                    Hủy bỏ
                  </button>
                  <button type="submit" className="submit-btn">
                    <span className="btn-icon">{editingId ? '💾' : '✨'}</span>
                    {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="data-section">
          <div className="section-header">
            <h3 className="section-title">
              Danh sách chi nhánh ({filtered.length})
            </h3>
          </div>
          
          <div className="table-container">
            <div className="table-wrapper">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th className="col-number">#</th>
                    <th className="col-name">Tên chi nhánh</th>
                    <th className="col-address">Địa chỉ</th>
                    <th className="col-phone">Số điện thoại</th>
                    <th className="col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="5">
                        <div className="empty-state">
                          <span className="empty-icon">📭</span>
                          <p>Không tìm thấy chi nhánh nào</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b, i) => (
                      <tr key={b._id} className="data-row">
                        <td className="cell-number">{i + 1}</td>
                        <td className="cell-name">
                          <div className="name-cell">
                            <span className="branch-icon">🏢</span>
                            {b.name}
                          </div>
                        </td>
                        <td className="cell-address">{b.address}</td>
                        <td className="cell-phone">
                          <a href={`tel:${b.phone}`} className="phone-link">
                            {b.phone}
                          </a>
                        </td>
                        <td className="cell-actions">
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleEdit(b)} 
                              className="edit-btn"
                              title="Chỉnh sửa"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDelete(b._id)} 
                              className="delete-btn"
                              title="Xóa"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchManagement;