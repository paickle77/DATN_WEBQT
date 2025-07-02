// src/Screens/OrderManagement/OrderManagement.jsx
import React, { useState, useEffect } from 'react';
import './OrderManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

// --- Thêm import cho jsPDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    return a
      ? `${a.detail_address}, ${a.ward}${a.district ? `, ${a.district}` : ''}`
      : '';
  };
  const lookupVoucher = id => vouchers.find(v=>v._id===id)?.code || '—';

  // --- Thêm hàm in packing slip
  const printPackingSlip = async (orderId) => {
    try {
      // 1) Cache-buster query param để luôn fetch dữ liệu mới
      const res = await api.get(`/orders/${orderId}?_=${Date.now()}`);
      const order = res.data.data;

      // 2) Log ra console để kiểm tra order và items
      console.log('PackingSlip order payload:', order);
      console.log('PackingSlip items array :', order.items);

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Packing Slip - Đơn ${order._id}`, 14, 20);

      // Chuẩn bị dữ liệu bảng
      const tableData = (order.items || []).map((item, idx) => [
        idx + 1,
        item.productName,
        item.quantity,
        item.unitPrice.toLocaleString('vi-VN'),
        (item.quantity * item.unitPrice).toLocaleString('vi-VN')
      ]);

      autoTable(doc, {
        head: [['#','Tên sản phẩm','SL','Đơn giá','Thành tiền']],
        body: tableData,
        startY: 30,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      doc.save(`PackingSlip_${order._id}.pdf`);
    } catch (err) {
      console.error('printPackingSlip error:', err);
      alert('Không thể tạo packing slip. Vui lòng thử lại.');
    }
  };

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
          {/* ...form rows unchanged... */}
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
                  <button
                    className="btn-print"
                    onClick={() => printPackingSlip(o._id)}
                  >
                    In packing slip
                  </button>
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
