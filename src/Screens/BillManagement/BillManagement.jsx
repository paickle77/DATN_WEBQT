// 🔒 PHIÊN BẢN ĐÃ SỬA LỖI REDIRECT - TƯƠNG THÍCH NGƯỢC
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ THÊM useNavigate
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BillManagement.scss';
import TabBarr from '../../component/tabbar/TabBar.jsx';
import api from '../../utils/api.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RobotoRegular from '../../fonts/RobotoRegular.js';
import { ENUM_PAGE } from '../../component/ENUM/enum.ts'; // ✅ THÊM import ENUM_PAGE

import StatusBadge from '../../component/StatusBadge.jsx';
import BillDetailModal from '../../component/BillDetailModal.jsx';

// 🎯 CHỈ QUẢN LÝ CÁC TRẠNG THÁI TRƯỚC KHI GIAO HÀNG
const BILL_STATUS = {
  PENDING: 'pending',      
  CONFIRMED: 'confirmed',  
  READY: 'ready',         
  CANCELLED: 'cancelled', 
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
  [BILL_STATUS.READY]: [BILL_STATUS.CANCELLED], 
  [BILL_STATUS.CANCELLED]: [], 
};

// Màu sắc cho từng trạng thái
const STATUS_COLORS = {
  [BILL_STATUS.PENDING]: '#f59e0b',      
  [BILL_STATUS.CONFIRMED]: '#3b82f6',    
  [BILL_STATUS.READY]: '#8b5cf6',        
  [BILL_STATUS.CANCELLED]: '#ef4444',    
};

// ✅ PHÂN QUYỀN ĐƠN GIẢN (KHÔNG CẦN THAY ĐỔI DATABASE)
const getUserRole = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'staff';
    }
  } catch (e) {
    console.error('Error getting user role:', e);
  }
  return 'staff';
};

const getCurrentUserName = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username || payload.name || 'Unknown User';
    }
  } catch (e) {
    console.error('Error getting username:', e);
  }
  return 'Unknown User';
};

// ✅ KIỂM TRA TOKEN HỢP LỆ NHƯNG KHÔNG QUÁ STRICT
const checkTokenValidity = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    // ⚠️ Chỉ cảnh báo, không block action
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      console.warn('🕐 Token sẽ hết hạn trong', Math.floor(timeUntilExpiry / 60), 'phút');
    }
    
    return timeUntilExpiry > 0;
  } catch (e) {
    console.error('❌ Token validation error:', e);
    return false;
  }
};

// ✅ HANDLE AUTHENTICATION ERRORS - NHƯNG KHÔNG QUÁ AGGRESSIVE
const handleAuthError = (error) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    console.error('🚨 Authentication failed');
    localStorage.removeItem('token');
    alert('⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    window.location.href = '/';
    return true;
  }
  return false;
};

const BillManagement = () => {
  const navigate = useNavigate(); // ✅ THÊM useNavigate hook
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

  const [userRole, setUserRole] = useState('staff');
  const [userName, setUserName] = useState('');
  const [actionHistory, setActionHistory] = useState([]);

  // ✅ LOẠI BỎ Token validity checker aggressive
  useEffect(() => {
    console.log('=== BILL MANAGEMENT DEBUG ===');
    
    // ✅ Kiểm tra token cơ bản
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('🚨 Không có token - redirect to login');
      window.location.href = '/';
      return;
    }
    
    // ✅ Lấy thông tin user
    setUserRole(getUserRole());
    setUserName(getCurrentUserName());
    
    console.log('✅ Token exists - fetching data...');
    fetchAll();
  }, []);

  // ✅ LOG ACTION LOCALLY
  const logAction = (action, billId, details = '') => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: userName,
      role: userRole,
      action,
      billId: billId?.slice(-8) || 'N/A',
      details,
      ip: 'N/A'
    };
    
    const existingLogs = JSON.parse(localStorage.getItem('bill_action_logs') || '[]');
    const updatedLogs = [logEntry, ...existingLogs].slice(0, 100);
    localStorage.setItem('bill_action_logs', JSON.stringify(updatedLogs));
    
    setActionHistory(updatedLogs);
    console.log('📝 Action logged:', logEntry);
  };

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

    const makeApiCall = async (endpoint, errorType) => {
      try {
        return await api.get(endpoint);
      } catch (err) {
        return { data: { data: [] }, error: errorType, details: err };
      }
    };

    const apiCalls = [
      makeApiCall('/GetAllBills', 'bills'),
      makeApiCall('/users', 'users'),
      makeApiCall('/vouchers', 'vouchers')
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

      const existingLogs = JSON.parse(localStorage.getItem('bill_action_logs') || '[]');
      setActionHistory(existingLogs);

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

  // ✅ CẬP NHẬT TRẠNG THÁI KHÔNG QUÁ STRICT
  const updateBillStatus = async (billId, newStatus) => {
    const bill = bills.find(b => b._id === billId);
    if (!bill) return;

    // ✅ KIỂM TRA QUYỀN HẠN
    if (userRole === 'staff' && newStatus === BILL_STATUS.CANCELLED) {
      alert('❌ Staff không có quyền hủy hóa đơn. Vui lòng liên hệ Manager/Admin.');
      return;
    }

    // ✅ YÊU CẦU LÝ DO CHO HÀNH ĐỘNG QUAN TRỌNG
    let reason = '';
    if (newStatus === BILL_STATUS.CANCELLED) {
      reason = prompt('📝 Vui lòng nhập lý do hủy hóa đơn (bắt buộc):');
      if (!reason || reason.trim() === '') {
        alert('⚠️ Vui lòng nhập lý do hủy hóa đơn');
        return;
      }
    }

    const confirmMessage = newStatus === BILL_STATUS.CANCELLED 
      ? `⚠️ Bạn có chắc muốn HỦY hóa đơn này?\n\nLý do: ${reason}\n\nHành động này sẽ được ghi lại trong hệ thống.`
      : `✅ Xác nhận chuyển trạng thái thành: ${STATUS_LABELS[newStatus]}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/bills/${billId}`, { 
        status: newStatus
      });

      logAction(
        `STATUS_CHANGE: ${bill.status} → ${newStatus}`,
        billId,
        reason ? `Lý do: ${reason}` : ''
      );

      const statusEmoji = {
        [BILL_STATUS.CONFIRMED]: '✅',
        [BILL_STATUS.READY]: '📦',
        [BILL_STATUS.CANCELLED]: '❌',
      };

      alert(`${statusEmoji[newStatus]} Đã cập nhật trạng thái thành: ${STATUS_LABELS[newStatus]}`);
      fetchAll();
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('❌ Update status error:', err);
        alert('❌ Lỗi khi cập nhật trạng thái hóa đơn: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // ✅ FIXED - XỬ LÝ CHUYỂN GIAO HÀNG VỚI NAVIGATE THAY VÌ WINDOW.LOCATION
  const moveToShipment = (bill) => {
    const confirmMessage = `🚚 Chuyển đến màn quản lý giao hàng?\n\n` +
      `📋 Mã đơn: ${bill._id.slice(-8)}\n` +
      `👤 Khách hàng: ${lookupUser(bill)}\n` +
      `📍 Địa chỉ: ${lookupAddress(bill)}\n\n` +
      `Bạn sẽ được chuyển đến màn hình quản lý giao hàng.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // ✅ Log action trước khi chuyển trang
      logAction('MOVE_TO_SHIPPING', bill._id, 'Chuyển sang màn quản lý giao hàng');
      
      // ✅ Lưu thông tin bill vào localStorage
      localStorage.setItem('selected_bill_for_shipping', JSON.stringify({
        id: bill._id,
        customer: lookupUser(bill),
        address: lookupAddress(bill),
        total: bill.total,
        timestamp: new Date().toISOString()
      }));

      console.log('🚚 Navigating to ShipmentManagement using React Router...');
      
      // ✅ SỬ DỤNG REACT ROUTER NAVIGATE THAY VÌ WINDOW.LOCATION
      navigate(ENUM_PAGE.ShipmentManagement);
      
    } catch (err) {
      console.error('❌ Move to shipping error:', err);
      
      // ✅ FALLBACK với thông báo chi tiết hơn
      alert('⚠️ Không thể chuyển đến màn quản lý giao hàng.\n\n' +
            '🔧 Có thể do:\n' +
            '1. Route ShipmentManagement chưa được thiết lập đúng\n' +
            '2. Vấn đề với React Router\n\n' +
            '👉 Thử navigate thủ công hoặc refresh trang');
      
      logAction('SHIPPING_REDIRECT_FAILED', bill._id, `Error: ${err.message}`);
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

      logAction('VIEW_DETAIL', bill._id, `Xem chi tiết hóa đơn`);
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

      logAction('PRINT_PDF', billId, `In hóa đơn PDF`);
    } catch (err) {
      console.error('❌ PDF Error:', err);
      alert('❌ Không thể tạo PDF: ' + (err.response?.data?.message || err.message));
    }
  };

  const hideBill = async billId => {
    if (userRole !== 'admin') {
      alert('❌ Chỉ Admin mới có thể ẩn hóa đơn');
      return;
    }

    const reason = prompt('📝 Vui lòng nhập lý do ẩn hóa đơn (bắt buộc):');
    if (!reason || reason.trim() === '') {
      alert('⚠️ Vui lòng nhập lý do ẩn hóa đơn');
      return;
    }

    if (!window.confirm(`⚠️ Bạn có chắc muốn ẨN hóa đơn này?\n\nLý do: ${reason}\n\nHóa đơn sẽ không hiển thị trong danh sách nhưng vẫn còn trong database.`)) return;

    try {
      await api.put(`/bills/${billId}`, { 
        status: 'hidden',
        hidden_reason: reason,
        hidden_by: userName,
        hidden_at: new Date().toISOString()
      });

      logAction('HIDE_BILL', billId, `Ẩn hóa đơn. Lý do: ${reason}`);
      
      alert('✅ Đã ẩn hóa đơn.');
      fetchAll();
    } catch (err) {
      console.error(err);
      if (window.confirm('⚠️ Backend chưa hỗ trợ ẩn hóa đơn. Bạn có muốn XÓA VĨNH VIỄN không?\n\n⚠️ CẢNH BÁO: Hành động này có thể tạo ra rủi ro bảo mật!')) {
        try {
          await api.delete(`/bills/${billId}`);
          
          logAction('DELETE_BILL', billId, `⚠️ XÓA VĨNH VIỄN - Lý do: ${reason} - CẢNH BÁO: Có thể mất dấu vết`);
          
          alert('⚠️ Đã xóa hóa đơn (không khuyến khích).');
          fetchAll();
        } catch (deleteErr) {
          alert('❌ Không thể xóa hóa đơn: ' + deleteErr.message);
        }
      }
    }
  };

  // ✅ XEM LỊCH SỬ THAO TÁC
  const viewActionHistory = () => {
    const logs = JSON.parse(localStorage.getItem('bill_action_logs') || '[]');
    const logsText = logs.map(log => 
      `${new Date(log.timestamp).toLocaleString('vi-VN')} | ${log.user} (${log.role}) | ${log.action} | Bill: ${log.billId} | ${log.details}`
    ).join('\n');
    
    if (logs.length === 0) {
      alert('📝 Chưa có lịch sử thao tác nào.');
      return;
    }
    
    const logWindow = window.open('', 'ActionLogs', 'width=800,height=600');
    logWindow.document.write(`
      <html>
        <head>
          <title>Lịch sử thao tác - Bill Management</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { color: #667eea; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 12px; overflow-x: auto; }
            .clear-btn { background: #ef4444; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h2>📜 Lịch sử thao tác hệ thống</h2>
          <p>Tổng cộng: ${logs.length} thao tác</p>
          <button class="clear-btn" onclick="if(confirm('Xóa toàn bộ lịch sử?')) { localStorage.removeItem('bill_action_logs'); alert('Đã xóa lịch sử!'); window.close(); }">🗑️ Xóa lịch sử</button>
          <pre>${logsText}</pre>
        </body>
      </html>
    `);
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
          
          {(userRole === 'manager' || userRole === 'admin') && (
            <button onClick={viewActionHistory} className="btn-audit">
              📜 Lịch sử
            </button>
          )}
          
          {allowedNextStates.map(nextStatus => {
            if (nextStatus === BILL_STATUS.CANCELLED && userRole === 'staff') {
              return null;
            }
            
            return (
              <button
                key={nextStatus}
                onClick={() => updateBillStatus(bill._id, nextStatus)}
                className={`btn-status btn-${nextStatus}`}
                title={`Chuyển sang: ${STATUS_LABELS[nextStatus]} ${nextStatus === BILL_STATUS.CANCELLED && userRole === 'staff' ? '(Không có quyền)' : ''}`}
                style={{ backgroundColor: STATUS_COLORS[nextStatus] }}
              >
                {getStatusButtonLabel(nextStatus)}
              </button>
            );
          })}
          
          {currentStatus === BILL_STATUS.READY && (
            <button
              onClick={() => moveToShipment(bill)}
              className="btn-move-to-shipping"
              title="Chuyển sang màn quản lý giao hàng"
              style={{ backgroundColor: '#06b6d4' }}
            >
              🚚 Chuyển giao hàng
            </button>
          )}
          
          {[BILL_STATUS.PENDING, BILL_STATUS.CANCELLED].includes(currentStatus) && userRole === 'admin' && (
            <button onClick={() => hideBill(bill._id)} className="btn-hide">
              👁️‍🗨️ Ẩn
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

  // Loading và error states
  if (loading) {
    return (
      <div className="bill-management">
        <TabBarr />
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span style={{ fontSize: '48px' }}>⏳</span>
          <p>Đang tải dữ liệu...</p>
          <small style={{ color: '#718096' }}>
            Đang kiểm tra token và tải dữ liệu...
          </small>
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
          <br />
          <small style={{ color: '#718096', marginTop: '10px', display: 'block' }}>
            Nếu lỗi liên tục xảy ra, vui lòng kiểm tra kết nối mạng hoặc đăng nhập lại
          </small>
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
          
          <div className="user-info-badge" style={{
            marginTop: '10px',
            padding: '8px 15px',
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '20px',
            fontSize: '14px',
            color: '#667eea'
          }}>
            👤 <strong>{userName}</strong> | 
            🏷️ <strong>{userRole.toUpperCase()}</strong> | 
            📊 <strong>{actionHistory.length}</strong> thao tác đã thực hiện |
            🔐 <span style={{ color: checkTokenValidity() ? '#10b981' : '#ef4444' }}>
              {checkTokenValidity() ? 'Token hợp lệ' : 'Token hết hạn'}
            </span>
          </div>
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
        
        {(userRole === 'manager' || userRole === 'admin') && (
          <button onClick={viewActionHistory} className="filter-btn" style={{background: '#10b981'}}>
            📜 Lịch sử ({actionHistory.length})
          </button>
        )}
      </div>

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