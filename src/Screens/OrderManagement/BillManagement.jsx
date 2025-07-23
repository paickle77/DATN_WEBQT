import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BillManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RobotoRegular from '../../fonts/RobotoRegular.js';

import StatusBadge from '../../component/StatusBadge';
import BillDetailModal from '../../component/BillDetailModal';
import ReplaceBillModal from './component/ReplaceBillModal';

// Bạn có thể giữ ALLOWED_STATUSES dùng cho nút “Đổi hàng”
const ALLOWED_STATUSES = ['Chờ xác nhận'];

const BillManagement = () => {
  // State chính
  const [bills, setBills]             = useState([]);
  const [users, setUsers]             = useState([]);
  const [addresses, setAddresses]     = useState([]);
  const [vouchers, setVouchers]       = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fromDate, setFromDate]       = useState(null);
  const [toDate, setToDate]           = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  // Đổi hàng
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceBillData, setReplaceBillData]   = useState(null);

  const openReplaceModal = async (bill) => {
    try {
      const { data: res } = await api.get(`/bills/${bill._id}?_=${Date.now()}`);
      setReplaceBillData(res.data);
      setShowReplaceModal(true);
    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu hóa đơn để đổi hàng.');
    }
  };

  const handleSaveReplace = async (editedPayload) => {
    try {
      await api.post(`/bills/${replaceBillData._id}/replace`, editedPayload);
      alert('Tạo hóa đơn thay thế thành công');
      setShowReplaceModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo hóa đơn thay thế.');
    }
  };
  // ----- END: state & handlers cho Đổi hàng -----

  useEffect(() => { fetchAll(); }, []);

  function fetchAll() {
    api.get('/bills').then(r => setBills(r.data.data));
    api.get('/users').then(r => setUsers(r.data.data));
    api.get('/addresses').then(r => setAddresses(r.data.data));
    api.get('/vouchers').then(r => setVouchers(r.data.data));
  }

  const lookupUser    = id => users.find(u => u._id === id)?.name || '';
  const lookupAddress = id => {
    const a = addresses.find(x => x._id === id);
    return a
      ? `${a.detail_address}, ${a.ward}${a.district ? `, ${a.district}` : ''}`
      : '';
  };
  const lookupVoucher = id => vouchers.find(v => v._id === id)?.code || '—';

  // ==== CHỈNH LẠI FILTER: chỉ show status = 'doing' và các filter khác ====  
  const filtered = bills.filter(b => {
    // Chỉ show hóa đơn trạng thái doing
    if (b.status !== 'doing') return false;
    // filterStatus = 'all' => show tất cả doing, nếu khác và không khớp thì bỏ
    if (filterStatus !== 'all' && b.status !== filterStatus) {
      return false;
    }
    // tìm theo tên
    if (searchTerm && !lookupUser(b.user_id).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // filter theo khoảng ngày (dùng createdAt)
    const d = new Date(b.createdAt);
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  });
  // ==== END FILTER ====  

  // fetch full bill (với items) rồi mở modal
  const openModal = async b => {
    try {
      const { data: res } = await api.get(`/bills/${b._id}?_=${Date.now()}`);
      const bill = res.data;
      const items = bill.items || [];
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const v = vouchers.find(v => v._id === bill.voucher_id);
      const discountPercent = v?.discount_percent || 0;
      const discountAmount  = Math.round(subtotal * discountPercent / 100);
      const finalTotal      = subtotal - discountAmount;
      const userName        = lookupUser(bill.user_id);
      const addressStr      = lookupAddress(bill.address_id);
      const voucherCode     = lookupVoucher(bill.voucher_id);

      setCurrentBill({
        ...bill,
        items,
        userName,
        addressStr,
        voucherCode,
        subtotal,
        discountAmount,
        finalTotal
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert('Không thể tải chi tiết hóa đơn.');
    }
  };

  const printPackingSlip = async billId => {
    try {
      const { data: res } = await api.get(`/bills/${billId}?_=${Date.now()}`);
      const bill = res.data;
      const items = bill.items || [];
      const subtotal       = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const v              = vouchers.find(v => v._id === bill.voucher_id);
      const discountAmount = Math.round(subtotal * (v?.discount_percent || 0) / 100);
      const finalTotal     = subtotal - discountAmount;
      const customer       = lookupUser(bill.user_id);
      const addressText    = lookupAddress(bill.address_id);
      const voucherCode    = lookupVoucher(bill.voucher_id);

      const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
      doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
      doc.addFont('Roboto-Regular.ttf','Roboto','normal');
      doc.setFont('Roboto','normal');
      doc.setFontSize(14);
      doc.text(`ID hóa đơn: ${bill._id}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Khách hàng: ${customer}`, 14, 28);
      doc.text(`Địa chỉ: ${addressText}`, 14, 34);
      doc.text(`Voucher: ${voucherCode}`, 14, 46);
      if (discountAmount > 0) {
        doc.text(`Giảm giá: -${discountAmount.toLocaleString('vi-VN')} đ`, 14, 52);
      }
      const startY = discountAmount > 0 ? 58 : 52;
      const tableData = items.map((it, i) => [
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
      const yAfterTable = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Tạm tính: ${subtotal.toLocaleString('vi-VN')} đ`, 14, yAfterTable);
      doc.text(`Tổng thanh toán: ${finalTotal.toLocaleString('vi-VN')} đ`, 14, yAfterTable + 6);
      doc.save(`PackingSlip_${bill._id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo packing slip. Vui lòng thử lại.');
    }
  };

  const deleteBill = async billId => {
    if (!window.confirm('Bạn có chắc muốn xóa hóa đơn này?')) return;
    try {
      await api.delete(`/bills/${billId}`);
      alert('Xóa hóa đơn thành công.');
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('Xóa hóa đơn thất bại. Vui lòng thử lại.');
    }
  };

  // ===== START: Xác nhận giao hàng từ doing sang shipping =====
  const handleConfirm = async billId => {
    if (!window.confirm('Bạn có chắc muốn xác nhận giao hàng cho hóa đơn này?')) return;
    try {
      // Cập nhật hóa đơn sang shipping
      await api.put(`/bills/${billId}`, { status: 'shipping' });
      // Tạo bản ghi shipment mới
      await api.post('/shipments', {
        bill_id: billId,
        status: 'shipping',
        shippedDate: new Date().toISOString()
      });
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('Xác nhận giao hàng thất bại. Vui lòng thử lại.');
    }
  };
  // ===== END: Xác nhận giao hàng =====

  return (
    <div className="bill-management">
      <TabBarr />
      <h2>Quản lý hóa đơn</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Tìm theo tên khách..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="Chờ xác nhận">Chờ xác nhận</option>
          <option value="Chờ giao hàng">Chờ giao hàng</option>
          <option value="Đã giao">Đã giao</option>
          <option value="Đã hủy">Đã hủy</option>
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
            {filtered.map((b, i) => (
              <tr key={b._id}>
                <td>{i + 1}</td>
                <td>{lookupUser(b.user_id)}</td>
                <td>{new Date(b.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>{lookupAddress(b.address_id)}</td>
                <td>{lookupVoucher(b.voucher_id)}</td>
                <td>{(b.total ?? 0).toLocaleString('vi-VN')} đ</td>
                <td><StatusBadge status={b.status} /></td>
                <td>
                  <button onClick={() => openModal(b)}>Chi tiết</button>
                  <button onClick={() => printPackingSlip(b._id)}>In PDF</button>
                  <button onClick={() => deleteBill(b._id)}>Xóa</button>
                  {b.status === 'doing' && (
                    <button onClick={() => handleConfirm(b._id)}>Xác nhận giao hàng</button>
                  )}
                  {ALLOWED_STATUSES.includes(b.status) && (
                    <button onClick={() => openReplaceModal(b)}>Đổi hàng</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>
                  Không có hóa đơn phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Chi tiết */}
      {showModal && currentBill && (
        <BillDetailModal
          bill={currentBill}
          onClose={() => setShowModal(false)}
          onPrint={() => printPackingSlip(currentBill._id)}
        />
      )}

      {/* Modal Đổi hàng */}
      {showReplaceModal && replaceBillData && (
        <ReplaceBillModal
          bill={replaceBillData}
          onClose={() => setShowReplaceModal(false)}
          onSave={handleSaveReplace}
        />
      )}
    </div>
  );
};

export default BillManagement;
