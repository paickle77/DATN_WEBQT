// src/Screens/OrderManagement/OrderManagement.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './OrderManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';  // import function
import RobotoRegular from '../../fonts/RobotoRegular.js';

import StatusBadge from '../../component/StatusBadge';
import OrderDetailModal from '../../component/OrderDetailModal';

const OrderManagement = () => {
  const [orders, setOrders]           = useState([]);
  const [users, setUsers]             = useState([]);
  const [addresses, setAddresses]     = useState([]);
  const [vouchers, setVouchers]       = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fromDate, setFromDate]       = useState(null);
  const [toDate, setToDate]           = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  function fetchAll() {
    api.get('/orders').then(r => setOrders(r.data.data));
    api.get('/users').then(r => setUsers(r.data.data));
    api.get('/addresses').then(r => setAddresses(r.data.data));
    api.get('/vouchers').then(r => setVouchers(r.data.data));
  }

  const lookupUser = id => users.find(u => u._id === id)?.name || '';
  const lookupAddress = id => {
    const a = addresses.find(x => x._id === id);
    return a ? `${a.detail_address}, ${a.ward}${a.district ? `, ${a.district}` : ''}` : '';
  };
  const lookupVoucher = id => vouchers.find(v => v._id === id)?.code || '—';

  const filtered = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (searchTerm && !lookupUser(o.user_id).toLowerCase().includes(searchTerm.toLowerCase())) return false;
    const d = new Date(o.created_at);
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  });

  // fetch full order (với items) rồi mở modal
  const openModal = async o => {
    try {
      const { data: res } = await api.get(`/orders/${o._id}?_=${Date.now()}`);
      const order = res.data;
      const userName   = lookupUser(order.user_id);
      const addressStr = lookupAddress(order.address_id);
      const voucherCode   = lookupVoucher(order.voucher_id);
      // Giả sử API trả về order.voucher_amount là số tiền được giảm
      const discountAmount = order.voucher_amount || 0;
            setCurrentOrder({
        ...order,
        userName,
        addressStr,
       voucherCode,
       discountAmount
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert('Không thể tải chi tiết đơn hàng.');
    }
  };

  const printPackingSlip = async orderId => {
    try {
      const { data: res } = await api.get(`/orders/${orderId}?_=${Date.now()}`);
       const order       = res.data;
       const customer    = lookupUser(order.user_id);
       const addressText = lookupAddress(order.address_id);
     // --- THÊM: tính subtotal, discount, finalTotal và voucherCode ---
     const subtotal    = (order.items || []).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
     const discount    = order.voucher_amount || 0;
     const finalTotal  = order.total_price;
     const voucherCode = lookupVoucher(order.voucher_id);

      const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });

      // Load và set font Unicode
      doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
      doc.addFont('Roboto-Regular.ttf','Roboto','normal');
      doc.setFont('Roboto','normal');
      doc.setFontSize(14);
      doc.text(`ID hóa đơn: ${order._id}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Khách hàng: ${customer}`, 14, 28);
      doc.text(`Địa chỉ: ${addressText}`, 14, 34);
      
     // --- THÊM: in voucher và giảm giá nếu có ---
     doc.text(`Voucher: ${voucherCode}`, 14, 46);
     if (discount > 0) {
       doc.text(`Giảm giá: -${discount.toLocaleString('vi-VN')} đ`, 14, 52);
     }

     // --- CHỈNH: động hóa vị trí startY cho bảng ---
     const startY = discount > 0 ? 58 : 52;
      const tableData = (order.items || []).map((it, i) => [
        i + 1,
        it.productName,
        it.quantity,
        it.unitPrice.toLocaleString('vi-VN'),
        (it.quantity * it.unitPrice).toLocaleString('vi-VN')
      ]);
        autoTable(doc, {
          head: [['#','Tên sản phẩm','SL','Đơn giá','Thành tiền']],
          body: tableData,
          startY,
          styles: {
            font: 'Roboto',
            fontStyle: 'normal',
            fontSize: 10,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [41,128,185],
            font: 'Roboto',
            fontStyle: 'normal'
          }
        });


    // --- THÊM: in Tạm tính và Tổng thanh toán ngay dưới bảng ---
    const yAfterTable = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    // Dòng Tạm tính
    doc.text(
      `Tạm tính: ${subtotal.toLocaleString('vi-VN')} đ`,
      14,
      yAfterTable
    );
    // Dòng Tổng thanh toán, cách Tạm tính 6px
    doc.text(
      `Tổng thanh toán: ${finalTotal.toLocaleString('vi-VN')} đ`,
      14,
      yAfterTable + 6
    );

      doc.save(`PackingSlip_${order._id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo packing slip. Vui lòng thử lại.');
    }
  };

      // --- Mới: hàm xóa đơn hàng ---
      const deleteOrder = async orderId => {
        if (!window.confirm('Bạn có chắc muốn xóa đơn hàng này?')) return;
        try {
          await api.delete(`/orders/${orderId}`);
          alert('Xóa đơn hàng thành công.');
          fetchAll();
        } catch (err) {
          console.error(err);
          alert('Xóa đơn hàng thất bại. Vui lòng thử lại.');
        }
      };

  return (
    <div className="order-management">
      <TabBarr />
      <h2>Quản lý đơn hàng</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Tìm theo tên khách..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="Đang xử lý">Đang xử lý</option>
          <option value="Đã xác nhận">Đã xác nhận</option>
          <option value="Đang giao">Đang giao</option>
          <option value="Đã nhận hàng">Đã nhận hàng</option>
          <option value="Đã hủy">Đã hủy</option>
          <option value="Đã trả hàng">Đã trả hàng</option>
        </select>
        <DatePicker
          selected={fromDate}
          onChange={setFromDate}
          placeholderText="Từ ngày"
          dateFormat="dd/MM/yyyy"
        />
        <DatePicker
          selected={toDate}
          onChange={setToDate}
          placeholderText="Đến ngày"
          dateFormat="dd/MM/yyyy"
        />
        <button onClick={fetchAll}>Lọc</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Khách hàng</th>
              <th>Ngày tạo</th>
              <th>Địa chỉ</th>
              <th>Voucher</th>
              <th>Tổng giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o._id}>
                <td>{i + 1}</td>
                <td>{lookupUser(o.user_id)}</td>
                <td>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                <td>{lookupAddress(o.address_id)}</td>
                <td>{lookupVoucher(o.voucher_id)}</td>
                <td>{o.total_price.toLocaleString('vi-VN')} đ</td>
                <td><StatusBadge status={o.status} /></td>
                <td>
                  <button onClick={() => openModal(o)}>Chi tiết</button>
                  <button onClick={() => printPackingSlip(o._id)}>In PDF</button>
                  <button onClick={() => deleteOrder(o._id)}>Xóa</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="8">Không có đơn hàng phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && currentOrder && (
        <OrderDetailModal
          order={currentOrder}
          onClose={() => setShowModal(false)}
          onPrint={() => printPackingSlip(currentOrder._id)}
        />
      )}
    </div>
  );
};

export default OrderManagement;
