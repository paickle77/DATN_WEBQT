// src/Screens/OrderManagement/OrderManagement.jsx
import React, { useState, useEffect } from 'react';
import './OrderManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyOrder = {
  user_id: '',
  address_id: '',
  voucher_id: '',
  status: 'pending'
};

const OrderManagement = () => {
  const [orders, setOrders]         = useState([]);
  const [users, setUsers]           = useState([]);
  const [addresses, setAddresses]   = useState([]);
  const [vouchers, setVouchers]     = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(emptyOrder);
  const [editingId, setEditingId]   = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    api.get('/orders').then(r => setOrders(r.data.data));
    api.get('/users').then(r => setUsers(r.data.data));
    api.get('/addresses').then(r => setAddresses(r.data.data));
    api.get('/vouchers').then(r => setVouchers(r.data.data));
  };

  const handleDelete = id => {
    if (window.confirm('Xóa đơn hàng này?')) {
      api.delete(`/orders/${id}`)
        .then(fetchAll)
        .catch(console.error);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyOrder);
    setShowForm(true);
  };
  const handleEdit = o => {
    setEditingId(o._id);
    setFormData({
      user_id: o.user_id,
      address_id: o.address_id,
      voucher_id: o.voucher_id || '',
      status: o.status
    });
    setShowForm(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const fn = editingId
      ? api.put(`/orders/${editingId}`, formData)
      : api.post('/orders', formData);
    fn.then(() => {
      fetchAll();
      setShowForm(false);
    })
    .catch(err => alert(err.response?.data?.msg || err.message));
  };

  const filtered = orders.filter(o =>
    users.find(u=>u._id===o.user_id)?.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const lookupUser = id => users.find(u=>u._id===id)?.name || '';
  const lookupAddress = id => {
    const a = addresses.find(x=>x._id===id);
    return a ? `${a.street}, ${a.ward}` : '';
  };
  const lookupVoucher = id => vouchers.find(v=>v._id===id)?.code || '—';

  return (
    <div className="order-management">
      <div><TabBarr/></div>
      <h2>Quản lý đơn hàng</h2>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm theo tên khách..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={handleAdd}>+ Thêm đơn hàng</button>
      </div>

      {showForm && (
        <form className="order-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa đơn hàng' : 'Thêm đơn hàng'}</h3>
          <div className="form-row">
            <label>Khách hàng:</label>
            <select required
              value={formData.user_id}
              onChange={e => setFormData({...formData, user_id: e.target.value})}
            >
              <option value="">--Chọn user--</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Địa chỉ:</label>
            <select required
              value={formData.address_id}
              onChange={e => setFormData({...formData, address_id: e.target.value})}
            >
              <option value="">--Chọn address--</option>
              {addresses.map(a => (
                <option key={a._id} value={a._id}>
                  {`${a.street}, ${a.ward}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Voucher:</label>
            <select
              value={formData.voucher_id}
              onChange={e => setFormData({...formData, voucher_id: e.target.value})}
            >
              <option value="">Không dùng</option>
              {vouchers.map(v => (
                <option key={v._id} value={v._id}>{v.code}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Trạng thái:</label>
            <select
              required
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              {['pending','delivered','cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
              <th>#</th><th>Khách hàng</th><th>Ngày tạo</th>
              <th>Địa chỉ</th><th>Voucher</th><th>Trạng thái</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o,i) => (
              <tr key={o._id}>
                <td>{i+1}</td>
                <td>{lookupUser(o.user_id)}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>{lookupAddress(o.address_id)}</td>
                <td>{lookupVoucher(o.voucher_id)}</td>
                <td>{o.status}</td>
                <td>
                  <button onClick={() => handleEdit(o)}>Sửa</button>
                  <button onClick={() => handleDelete(o._id)}>Xóa</button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan="7">Không có đơn hàng phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderManagement;
