// src/Screens/CustomerManagement/CustomerManagement.jsx
import React, { useState, useEffect } from 'react';
import './CustomerManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  is_lock: false,
  address_id: ''
};

const CustomerManagement = () => {
  const [customers, setCustomers]   = useState([]);
  const [addresses, setAddresses]   = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(emptyCustomer);
  const [editingId, setEditingId]   = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    api.get('/users').then(r => setCustomers(r.data.data));
    api.get('/addresses').then(r => setAddresses(r.data.data));
  };

  const handleDelete = id => {
    if (window.confirm('Xóa khách hàng này?')) {
      api.delete(`/users/${id}`)
        .then(fetchAll)
        .catch(console.error);
    }
  };

  const handleLock = id => {
    if (window.confirm('Khóa tài khoản này?')) {
      api.put(`/users/${id}`, { is_lock: true })
        .then(fetchAll)
        .catch(console.error);
    }
  };

  const handleUnlock = id => {
    if (window.confirm('Mở khóa tài khoản này?')) {
      api.put(`/users/${id}`, { is_lock: false })
        .then(fetchAll)
        .catch(console.error);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyCustomer);
    setShowForm(true);
  };
  const handleEdit = c => {
    setEditingId(c._id);
    setFormData({
      name:       c.name,
      email:      c.email,
      phone:      c.phone,
      is_lock:    c.is_lock,
      address_id: c.address_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const fn = editingId
      ? api.put(`/users/${editingId}`, formData)
      : api.post('/users', formData);
    fn.then(() => {
      fetchAll();
      setShowForm(false);
    })
    .catch(err => alert(err.response?.data?.msg || err.message));
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lookupAddress = id => {
    const a = addresses.find(x => x._id === id);
    return a ? `${a.street}, ${a.ward}, ${a.district}` : '';
  };

  return (
    <div className="customer-management">
      <TabBarr />
      <h2>Quản lý khách hàng</h2>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm khách hàng..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={handleAdd}>+ Thêm khách hàng</button>
      </div>

      {showForm && (
        <form className="customer-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h3>
          <div className="form-row">
            <label>Tên:</label>
            <input required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Email:</label>
            <input type="email" required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Phone:</label>
            <input required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Địa chỉ:</label>
            <select required
              value={formData.address_id}
              onChange={e => setFormData({...formData, address_id: e.target.value})}
            >
              <option value="">--Chọn địa chỉ--</option>
              {addresses.map(a => (
                <option key={a._id} value={a._id}>
                  {`${a.street}, ${a.ward}, ${a.district}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row checkbox-row">
            <label>Khóa tài khoản:</label>
            <input
              type="checkbox"
              checked={formData.is_lock}
              onChange={e => setFormData({...formData, is_lock: e.target.checked})}
            />
          </div>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Lưu' : 'Tạo'}</button>
            <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Email</th>
              <th>Phone</th><th>Địa chỉ</th><th>Trạng thái</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i) => (
              <tr key={c._id}>
                <td>{i+1}</td>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{lookupAddress(c.address_id)}</td>
                <td>
                  {c.is_lock
                    ? <span className="status-locked">Đã khóa</span>
                    : <span className="status-active">Hoạt động</span>
                  }
                </td>
                <td>
                  <button onClick={() => handleEdit(c)}>Sửa</button>
                  <button onClick={() => handleDelete(c._id)}>Xóa</button>
                  {/* Nút khóa / mở khóa */}
                  {c.is_lock
                    ? <button onClick={() => handleUnlock(c._id)}>Mở khóa</button>
                    : <button onClick={() => handleLock(c._id)}>Khóa</button>
                  }
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan="7">Không tìm thấy dữ liệu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerManagement;
