import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BillManagement.scss';
import TabBarr from '../../component/tabbar/TabBar.jsx';
import api from '../../utils/api.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RobotoRegular from '../../fonts/RobotoRegular.js';

import StatusBadge from '../../component/StatusBadge.jsx';
import BillDetailModal from '../../component/BillDetailModal.jsx';

// 🎯 CHỈ QUẢN LÝ CÁC TRẠNG THÁI TRƯỚC KHI GIAO HÀNG
const BILL_STATUS = {
  PENDING: 'pending',      // Khách hàng đặt hàng
  CONFIRMED: 'confirmed',  // Admin xác nhận hóa đơn và đóng gói chuẩn bị đơn
  READY: 'ready',         // Admin chuẩn bị hóa đơn xong đợi chuyển sang giao hàng
  CANCELLED: 'cancelled', // Khách hủy hóa đơn
};

// Mapping hiển thị trạng thái tiếng Việt
const STATUS_LABELS = {
  [BILL_STATUS.PENDING]: 'Chờ xác nhận',
  [BILL_STATUS.CONFIRMED]: 'Đã xác nhận',
  [BILL_STATUS.READY]: 'Sẵn sàng giao',
  [BILL_STATUS.CANCELLED]: 'Đã hủy',
};

// Logic chuyển đổi trạng thái cho phép
const ALLOWED_TRANSITIONS = {
  [BILL_STATUS.PENDING]: [BILL_STATUS.CONFIRMED, BILL_STATUS.CANCELLED],
  [BILL_STATUS.CONFIRMED]: [BILL_STATUS.READY, BILL_STATUS.CANCELLED],
  [BILL_STATUS.READY]: [BILL_STATUS.CANCELLED], // Chỉ có thể hủy, không thể chuyển sang shipping ở đây
  [BILL_STATUS.CANCELLED]: [], // Không thể chuyển đổi từ đã hủy
};

// Màu sắc cho từng trạng thái
const STATUS_COLORS = {
  [BILL_STATUS.PENDING]: '#f59e0b',      // Vàng
  [BILL_STATUS.CONFIRMED]: '#3b82f6',    // Xanh dương
  [BILL_STATUS.READY]: '#8b5cf6',        // Tím
  [BILL_STATUS.CANCELLED]: '#ef4444',    // Đỏ
};

const BillManagement = () => {
  const [bills, setBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('=== BILL MANAGEMENT DEBUG ===');
    
    // Token validation logic giữ nguyên
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = Date.now() >= payload.exp * 1000;
        console.log('⏰ Token expires at:', new Date(payload.exp * 1000));
        console.log('⏰ Token expired:', isExpired);
        
        if (isExpired) {
          console.warn('🚨 Token đã hết hạn!');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
      } catch (e) {
        console.error('❌ Token decode error:', e);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
    } else {
      console.warn('🚨 Không có token - redirect to login');
      window.location.href = '/login';
      return;
    }
    
    console.log('✅ Token valid - fetching data...');
    fetchAll();
  }, []);

  function fetchAll() {
    console.log('📊 Starting fetchAll...');
    setLoading(true);
    setError(null);
    
    const possibleAddressEndpoints = [
      '/addresses',
      '/address',
      '/user-addresses', 
      '/customer-addresses',
      '/shipping-addresses',
      '/delivery-addresses',
      '/bill-addresses'
    ];

    const findAddressEndpoint = async () => {
      for (const endpoint of possibleAddressEndpoints) {
        try {
          console.log(`🔍 Trying address endpoint: ${endpoint}`);
          const response = await api.get(endpoint);
          console.log(`✅ Address endpoint ${endpoint} works!`, response.data?.data?.length || 0, 'records');
          return response;
        } catch (err) {
          console.log(`❌ Address endpoint ${endpoint} failed:`, err.response?.status);
        }
      }
      
      console.log('⚠️ No address endpoint found, trying to extract from bills...');
      return { data: { data: [] }, error: 'no-address-endpoint' };
    };

    const apiCalls = [
      api.get('/GetAllBills').catch(err => ({ data: { data: [] }, error: 'bills', details: err })),
      api.get('/users').catch(err => ({ data: { data: [] }, error: 'users', details: err })),
      api.get('/vouchers').catch(err => ({ data: { data: [] }, error: 'vouchers', details: err }))
    ];

    Promise.all([
      ...apiCalls,
      findAddressEndpoint()
    ]).then(([billsRes, usersRes, vouchersRes, addressesRes]) => {
      
      console.log('📊 API Results:');
      console.log('📋 Bills:', billsRes.error ? 'ERROR' : 'OK', billsRes.data.data?.length || 0);
      console.log('👥 Users:', usersRes.error ? 'ERROR' : 'OK', usersRes.data.data?.length || 0);
      console.log('🎫 Vouchers:', vouchersRes.error ? 'ERROR' : 'OK', vouchersRes.data.data?.length || 0);
      console.log('📍 Addresses:', addressesRes.error ? 'ERROR' : 'OK', addressesRes.data.data?.length || 0);
      
      const billData = billsRes.data.data || [];
      const userData = usersRes.data.data || [];
      
      console.log('🔍 Sample bill data:', billData[0]);
      console.log('🔍 Sample user data:', userData[0]);
      
      // 🎯 CHỈ LẤY BILLS CÓ TRẠNG THÁI QUẢN LÝ ĐƠN HÀNG (TRƯỚC GIAO HÀNG)
      const managementBills = billData.filter(bill => 
        ['pending', 'confirmed', 'ready', 'cancelled'].includes(bill.status)
      );
      
      let addressData = addressesRes.data.data || [];
      
      if (addressData.length === 0 && billData.length > 0) {
        console.log('🔧 Extracting addresses from bills...');
        const extractedAddresses = [];
        billData.forEach(bill => {
          if (bill.delivery_address) {
            extractedAddresses.push({
              _id: bill.address_id || `addr_${bill._id}`,
              detail_address: bill.delivery_address.street || bill.delivery_address.detail || '',
              ward: bill.delivery_address.ward || '',
              district: bill.delivery_address.district || '',
              city: bill.delivery_address.city || bill.delivery_address.province || '',
              user_id: bill.user_id
            });
          } else if (bill.shipping_address) {
            extractedAddresses.push({
              _id: bill.address_id || `addr_${bill._id}`,
              full_address: bill.shipping_address,
              user_id: bill.user_id
            });
          }
        });
        addressData = extractedAddresses;
        console.log('✅ Extracted', addressData.length, 'addresses from bills');
      }

      setBills(managementBills);
      setUsers(userData);
      setVouchers(vouchersRes.data.data || []);
      setAddresses(addressData);

      const criticalErrors = [];
      if (billsRes.error) criticalErrors.push('Không thể tải danh sách hóa đơn');
      if (usersRes.error) criticalErrors.push('Không thể tải danh sách khách hàng');
      
      if (criticalErrors.length > 0) {
        setError(criticalErrors.join(', '));
        console.error('❌ Critical errors:', criticalErrors);
      }

      const warnings = [];
      if (addressesRes.error) warnings.push('Không thể tải địa chỉ - sẽ hiển thị "N/A"');
      if (vouchersRes.error) warnings.push('Không thể tải voucher - sẽ hiển thị "—"');
      
      if (warnings.length > 0) {
        console.warn('⚠️ Non-critical warnings:', warnings);
      }

      setLoading(false);
    }).catch(error => {
      console.error('❌ fetchAll error:', error);
      setError('Lỗi khi tải dữ liệu: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    });
  }

  // Lookup functions giữ nguyên
  const lookupUser = (bill) => {
    if (bill.user_id && typeof bill.user_id === 'object' && bill.user_id.full_name) {
      return bill.user_id.full_name || bill.user_id.name || bill.user_id.username || 'Khách hàng không rõ';
    }
    
    if (!bill.user_id || !users.length) return 'Khách hàng không rõ';
    
    const userId = typeof bill.user_id === 'object' ? bill.user_id._id : bill.user_id;
    const user = users.find(u => u._id === userId.toString());
    
    if (!user) {
      console.warn(`⚠️ User not found for ID: ${userId}`);
      return `User ID: ${userId.toString().slice(-8)}`;
    }
    
    return user.full_name || user.name || user.username || 'Khách hàng không rõ';
  };

  const lookupAddress = (bill) => {
    if (bill.address_id && typeof bill.address_id === 'object') {
      const addr = bill.address_id;
      if (addr.full_address) return addr.full_address;
      
      const parts = [
        addr.detail_address || addr.address || addr.street,
        addr.ward || addr.ward_name,
        addr.district || addr.district_name, 
        addr.city || addr.province || addr.province_name
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(', ') : 'Địa chỉ không đầy đủ';
    }
    
    if (!bill.address_id || !addresses.length) return 'Chưa có địa chỉ giao hàng';
    
    const addressId = typeof bill.address_id === 'object' ? bill.address_id._id : bill.address_id;
    const address = addresses.find(x => x._id === addressId);
    
    if (!address) return `Địa chỉ ID: ${addressId.toString().slice(-8)}`;
    
    if (address.full_address) {
      return address.full_address;
    }
    
    const parts = [
      address.detail_address || address.address || address.street,
      address.ward || address.ward_name,
      address.district || address.district_name, 
      address.city || address.province || address.province_name
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Địa chỉ không đầy đủ';
  };

  const lookupVoucher = bill => {
    if (!bill.voucher_code && !bill.voucher_id) return '—';
    if (bill.voucher_code) return bill.voucher_code;
    const voucher = vouchers.find(v => v._id === bill.voucher_id);
    return voucher?.code || '—';
  };

  // Filter hóa đơn
  const filtered = bills.filter(bill => {
    if (filterStatus !== 'all' && bill.status !== filterStatus) {
      return false;
    }
    if (searchTerm) {
      const customerName = lookupUser(bill).toLowerCase();
      const billId = (bill._id || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      if (!customerName.includes(searchLower) && !billId.includes(searchLower)) {
        return false;
      }
    }
    if (bill.createdAt) {
      const d = new Date(bill.createdAt);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
    }
    return true;
  });

  // Cập nhật trạng thái hóa đơn
  const updateBillStatus = async (billId, newStatus) => {
    try {
      await api.put(`/bills/${billId}`, { status: newStatus });
      
      const statusEmoji = {
        [BILL_STATUS.CONFIRMED]: '✅',
        [BILL_STATUS.READY]: '📦',
        [BILL_STATUS.CANCELLED]: '❌',
      };

      alert(`${statusEmoji[newStatus]} Đã cập nhật trạng thái thành: ${STATUS_LABELS[newStatus]}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi khi cập nhật trạng thái hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const canTransitionTo = (currentStatus, targetStatus) => {
    return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
  };

  const openModal = async bill => {
    try {
      console.log('🔍 Fetching bill details for:', bill._id);
      const { data: res } = await api.get(`/bills/${bill._id}?_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const billData = res.data;
      console.log('📋 Bill data received:', billData);
      
      const items = Array.isArray(billData.items) ? billData.items : [];
      
      const subtotal = items.reduce((sum, item) => {
        const price = Number(item?.unitPrice || 0);
        const qty = Number(item?.quantity || 0);
        return sum + (price * qty);
      }, 0);
      
      const v = vouchers.find(v => v._id === billData.voucher_id);
      const discountPercent = Number(v?.discount_percent || 0);
      const discountAmount = Math.round(subtotal * discountPercent / 100);
      const finalTotal = subtotal - discountAmount;
      
      const userName = lookupUser(billData);
      const addressStr = lookupAddress(billData);
      const voucherCode = lookupVoucher(billData);

      setCurrentBill({
        ...billData,
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
      console.error('❌ Error opening modal:', err);
      alert('❌ Không thể tải chi tiết hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const printBillSlip = async billId => {
    try {
      console.log('🖨️ Printing PDF for bill:', billId);
      const { data: res } = await api.get(`/bills/${billId}?_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const bill = res.data;
      console.log('📄 PDF data:', bill);
      
      const items = Array.isArray(bill.items) ? bill.items : [];
      
      const subtotal = items.reduce((sum, item) => {
        const price = Number(item?.unitPrice || 0);
        const qty = Number(item?.quantity || 0);
        return sum + (price * qty);
      }, 0);
      
      const v = vouchers.find(v => v._id === bill.voucher_id);
      const discountAmount = Math.round(subtotal * ((Number(v?.discount_percent) || 0) / 100));
      const finalTotal = subtotal - discountAmount;
      const customer = lookupUser(bill);
      const addressText = lookupAddress(bill);
      const voucherCode = lookupVoucher(bill);

      const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
      doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');
      
      doc.setFontSize(16);
      doc.text('🧁 CAKESHOP - HÓA ĐƠN', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`📄 Mã hóa đơn: ${bill._id}`, 14, 30);
      doc.text(`👤 Khách hàng: ${customer}`, 14, 36);
      doc.text(`📍 Địa chỉ: ${addressText}`, 14, 42);
      doc.text(`📊 Trạng thái: ${STATUS_LABELS[bill.status] || bill.status}`, 14, 48);
      doc.text(`🎫 Voucher: ${voucherCode}`, 14, 54);
      doc.text(`📅 Ngày tạo: ${bill.createdAt ? new Date(bill.createdAt).toLocaleString('vi-VN') : 'N/A'}`, 14, 60);
      
      if (discountAmount > 0) {
        doc.text(`💰 Giảm giá: -${discountAmount.toLocaleString('vi-VN')} đ`, 14, 66);
      }
      
      const startY = discountAmount > 0 ? 72 : 66;
      const tableData = items.map((item, i) => [
        i + 1,
        item?.productName || item?.name || 'Sản phẩm không rõ',
        Number(item?.quantity || 0),
        (Number(item?.unitPrice || 0)).toLocaleString('vi-VN') + ' đ',
        ((Number(item?.quantity || 0)) * (Number(item?.unitPrice || 0))).toLocaleString('vi-VN') + ' đ'
      ]);
      
      autoTable(doc, {
        head: [['#', 'Tên sản phẩm', 'SL', 'Đơn giá', 'Thành tiền']],
        body: tableData,
        startY,
        styles: {
          font: 'Roboto',
          fontStyle: 'normal',
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          font: 'Roboto',
          fontStyle: 'normal'
        }
      });
      
      const yAfterTable = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`💵 Tạm tính: ${subtotal.toLocaleString('vi-VN')} đ`, 14, yAfterTable);
      doc.text(`💳 Tổng thanh toán: ${finalTotal.toLocaleString('vi-VN')} đ`, 14, yAfterTable + 6);
      
      doc.setFontSize(10);
      doc.text('Cảm ơn quý khách đã tin tưởng CakeShop! 🎂', 14, yAfterTable + 20);
      
      doc.save(`HoaDon_${bill._id.slice(-8)}_${STATUS_LABELS[bill.status] || bill.status}.pdf`);
    } catch (err) {
      console.error('❌ PDF Error:', err);
      alert('❌ Không thể tạo PDF: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteBill = async billId => {
    if (!window.confirm('⚠️ Bạn có chắc muốn xóa hóa đơn này?')) return;
    try {
      await api.delete(`/bills/${billId}`);
      alert('✅ Xóa hóa đơn thành công.');
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('❌ Xóa hóa đơn thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  // Render action buttons cho từng trạng thái
  const renderActionButtons = (bill) => {
    const currentStatus = bill.status;
    const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];

    return (
      <td className="actions-cell">
        <div className="action-buttons">
          <button onClick={() => openModal(bill)} className="btn-detail">
            👁️ Chi tiết
          </button>
          <button onClick={() => printBillSlip(bill._id)} className="btn-print">
            🖨️ In PDF
          </button>
          
          {/* Nút chuyển đổi trạng thái */}
          {allowedNextStates.map(nextStatus => (
            <button
              key={nextStatus}
              onClick={() => updateBillStatus(bill._id, nextStatus)}
              className={`btn-status btn-${nextStatus}`}
              title={`Chuyển sang: ${STATUS_LABELS[nextStatus]}`}
              style={{ backgroundColor: STATUS_COLORS[nextStatus] }}
            >
              {getStatusButtonLabel(nextStatus)}
            </button>
          ))}
          
          {/* Nút chuyển sang màn giao hàng cho trạng thái READY */}
          {currentStatus === BILL_STATUS.READY && (
            <button
              onClick={() => {
                // Chuyển đến màn quản lý giao hàng để xử lý
                if (window.confirm('🚚 Chuyển đơn hàng này sang màn quản lý giao hàng?')) {
                  window.location.href = '/admin/shipments';
                }
              }}
              className="btn-move-to-shipping"
              title="Chuyển sang màn quản lý giao hàng để gán shipper"
              style={{ backgroundColor: '#06b6d4' }}
            >
              🚚 Chuyển giao hàng
            </button>
          )}
          
          {/* Nút xóa (chỉ cho hóa đơn chưa xử lý hoặc đã hủy) */}
          {[BILL_STATUS.PENDING, BILL_STATUS.CANCELLED].includes(currentStatus) && (
            <button onClick={() => deleteBill(bill._id)} className="btn-delete">
              🗑️ Xóa
            </button>
          )}
        </div>
      </td>
    );
  };

  const getStatusButtonLabel = (status) => {
    const labels = {
      [BILL_STATUS.CONFIRMED]: '✅ Xác nhận',
      [BILL_STATUS.READY]: '📦 Chuẩn bị xong',
      [BILL_STATUS.CANCELLED]: '❌ Hủy đơn',
    };
    return labels[status] || STATUS_LABELS[status];
  };

  // Loading và error states giữ nguyên
  if (loading) {
    return (
      <div className="bill-management">
        <TabBarr />
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span style={{ fontSize: '48px' }}>⏳</span>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bill-management">
        <TabBarr />
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span style={{ fontSize: '48px' }}>❌</span>
          <p style={{ color: '#ef4444', fontSize: '18px' }}>{error}</p>
          <button onClick={fetchAll} style={{ 
            padding: '12px 24px', 
            background: '#667eea', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '20px'
          }}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bill-management">
      <TabBarr />
      
      <div className="management-header">
        <div className="header-icon">
          <span style={{ fontSize: '48px' }}>📋</span>
        </div>
        <div className="header-content">
          <h2>Quản lý Đơn hàng</h2>
          <p>Xử lý đơn hàng từ khi đặt hàng đến sẵn sàng giao</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>🔍 Tìm kiếm:</label>
          <input
            type="text"
            placeholder="Tên khách hàng hoặc mã hóa đơn..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>📊 Trạng thái:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📅 Từ ngày:</label>
          <DatePicker
            selected={fromDate}
            onChange={setFromDate}
            placeholderText="Chọn ngày bắt đầu"
            dateFormat="dd/MM/yyyy"
          />
        </div>
        
        <div className="filter-group">
          <label>📅 Đến ngày:</label>
          <DatePicker
            selected={toDate}
            onChange={setToDate}
            placeholderText="Chọn ngày kết thúc"
            dateFormat="dd/MM/yyyy"
          />
        </div>
        
        <button onClick={fetchAll} className="filter-btn">🔄 Làm mới</button>
      </div>

      {/* Thống kê chỉ cho trạng thái quản lý đơn hàng */}
      <div className="quick-stats">
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.PENDING).length}</span>
            <span className="stat-label">Chờ xác nhận</span>
          </div>
        </div>
        
        <div className="stat-card confirmed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.CONFIRMED).length}</span>
            <span className="stat-label">Đã xác nhận</span>
          </div>
        </div>
        
        <div className="stat-card ready">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.READY).length}</span>
            <span className="stat-label">Sẵn sàng giao</span>
          </div>
        </div>
        
        <div className="stat-card cancelled">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.CANCELLED).length}</span>
            <span className="stat-label">Đã hủy</span>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="bills-table">
          <thead>
            <tr>
              <th>#</th>
              <th>👤 Khách hàng</th>
              <th>📅 Ngày tạo</th>
              <th>📍 Địa chỉ</th>
              <th>🎫 Voucher</th>
              <th>💰 Tổng tiền</th>
              <th>📊 Trạng thái</th>
              <th>⚙️ Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bill, i) => (
              <tr key={bill._id} className={`bill-row status-${bill.status}`}>
                <td className="row-number">{i + 1}</td>
                <td className="customer-cell">
                  <div className="customer-info">
                    <span className="customer-name">{lookupUser(bill)}</span>
                    <span className="bill-id">#{(bill._id || '').slice(-8)}</span>
                  </div>
                </td>
                <td className="date-cell">
                  {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  <br />
                  <small>{bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('vi-VN') : ''}</small>
                </td>
                <td className="address-cell" title={lookupAddress(bill)}>
                  {lookupAddress(bill).length > 50 
                    ? lookupAddress(bill).substring(0, 50) + '...'
                    : lookupAddress(bill)
                  }
                </td>
                <td className="voucher-cell">{lookupVoucher(bill)}</td>
                <td className="total-cell">
                  <span className="total-amount">
                    {(Number(bill.total) || 0).toLocaleString('vi-VN')} đ
                  </span>
                </td>
                <td className="status-cell">
                  <div 
                    className="status-badge" 
                    style={{ backgroundColor: STATUS_COLORS[bill.status] || '#6b7280' }}
                  >
                    {STATUS_LABELS[bill.status] || bill.status}
                  </div>
                </td>
                {renderActionButtons(bill)}
              </tr>
            ))}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="no-data">
                    <span style={{ fontSize: '48px' }}>📭</span>
                    <p>Không có đơn hàng phù hợp</p>
                    <small>Thử thay đổi bộ lọc để xem kết quả khác</small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Chi tiết hóa đơn */}
      {showModal && currentBill && (
        <BillDetailModal
          bill={currentBill}
          onClose={() => setShowModal(false)}
          onPrint={() => printBillSlip(currentBill._id)}
        />
      )}
    </div>
  );
};

export default BillManagement;