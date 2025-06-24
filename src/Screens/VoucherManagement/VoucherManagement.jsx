import React, { useState, useEffect } from 'react';
import './VoucherManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';

const emptyVoucher = {
  code: '',
  description: '',
  discount_percent: 0,
  start_date: null,
  end_date: null
};

const VoucherManagement = () => {
  const [vouchers, setVouchers]     = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(emptyVoucher);
  const [editingId, setEditingId]   = useState(null);

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

  return (
    <div className="voucher-management">
      <div><TabBarr/></div>
      <h2>Quản lý khuyến mãi / Mã giảm giá</h2>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm theo mã hoặc mô tả..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={handleAdd}>+ Thêm khuyến mãi</button>
      </div>

      {showForm && (
        <form className="voucher-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</h3>
          <div className="form-row">
            <label>Mã code:</label>
            <input required
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Mô tả:</label>
            <input required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>% Giảm giá:</label>
            <input required type="number" min="0" max="100"
              value={formData.discount_percent}
              onChange={e => setFormData({...formData, discount_percent: +e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Ngày bắt đầu:</label>
            <DatePicker
              selected={formData.start_date}
              onChange={date => setFormData({...formData, start_date: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày bắt đầu"
            />
          </div>
          <div className="form-row">
            <label>Ngày kết thúc:</label>
            <DatePicker
              selected={formData.end_date}
              onChange={date => setFormData({...formData, end_date: date})}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày kết thúc"
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
              <th>#</th>
              <th>Code</th>
              <th>Description</th>
              <th>Discount (%)</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((v,i) => (
              <tr key={v._id}>
                <td>{i+1}</td>
                <td>{v.code}</td>
                <td>{v.description}</td>
                <td>{v.discount_percent}</td>
                <td>{v.start_date ? new Date(v.start_date).toLocaleDateString() : ''}</td>
                <td>{v.end_date   ? new Date(v.end_date).toLocaleDateString()   : ''}</td>
                <td>
                  <button onClick={() => handleEdit(v)}>Sửa</button>
                  <button onClick={() => handleDelete(v._id)}>Xóa</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7">Không tìm thấy khuyến mãi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VoucherManagement;
