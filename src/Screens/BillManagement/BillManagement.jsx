// 🔥 FIXED BillManagement - Sửa logic tài chính đồng bộ với dữ liệu MongoDB
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './BillManagement.scss';
import TabBarr from '../../component/tabbar/TabBar.jsx';
import api from '../../utils/api.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RobotoRegular from '../../fonts/RobotoRegular.js';
import { ENUM_PAGE } from '../../component/ENUM/enum.ts';

import StatusBadge from '../../component/StatusBadge.jsx';
import BillDetailModal from '../../component/BillDetailModal.jsx';

// 🆕 THÊM TẤT CẢ TRẠNG THÁI BILLS
const BILL_STATUS = {
  PENDING: 'pending',      
  CONFIRMED: 'confirmed',  
  READY: 'ready',         
  SHIPPING: 'shipping',    // 🆕 THÊM
  DONE: 'done',            // 🆕 THÊM  
  FAILED: 'failed',        // 🆕 THÊM
  CANCELLED: 'cancelled',
  RETURNED: 'returned',    // 🆕 THÊM
  REFUND_PENDING: 'refund_pending', // 🆕 THÊM
  REFUNDED: 'refunded'     // 🆕 THÊM
};

const STATUS_LABELS = {
  [BILL_STATUS.PENDING]: 'Chờ xác nhận',
  [BILL_STATUS.CONFIRMED]: 'Đã xác nhận',
  [BILL_STATUS.READY]: 'Sẵn sàng giao',
  [BILL_STATUS.SHIPPING]: 'Đang giao hàng',      // 🆕 THÊM
  [BILL_STATUS.DONE]: 'Hoàn thành',              // 🆕 THÊM
  [BILL_STATUS.FAILED]: 'Giao thất bại',         // 🆕 THÊM
  [BILL_STATUS.CANCELLED]: 'Đã hủy',
  [BILL_STATUS.RETURNED]: 'Đã hoàn trả',         // 🆕 THÊM
  [BILL_STATUS.REFUND_PENDING]: 'Chờ hoàn tiền', // 🆕 THÊM
  [BILL_STATUS.REFUNDED]: 'Đã hoàn tiền'         // 🆕 THÊM
};

// 🔥 CẬP NHẬT LUỒNG CHUYỂN TRẠNG THÁI - BỎ CHỨC NĂNG HỦY
const ALLOWED_TRANSITIONS = {
  [BILL_STATUS.PENDING]: [BILL_STATUS.CONFIRMED], // BỎ CANCELLED
  [BILL_STATUS.CONFIRMED]: [BILL_STATUS.READY], // BỎ CANCELLED
  [BILL_STATUS.READY]: [], // BỎ CANCELLED - chuyển sang shipping thông qua nút riêng
  [BILL_STATUS.CANCELLED]: [], // Đơn đã hủy không thể thay đổi
};

// 🆕 THÊM MÀU CHO TẤT CẢ TRẠNG THÁI
const STATUS_COLORS = {
  [BILL_STATUS.PENDING]: '#f59e0b',           // Vàng - chờ xác nhận
  [BILL_STATUS.CONFIRMED]: '#3b82f6',         // Xanh dương - đã xác nhận  
  [BILL_STATUS.READY]: '#8b5cf6',             // Tím - sẵn sàng giao
  [BILL_STATUS.SHIPPING]: '#06b6d4',          // 🆕 Cyan - đang giao hàng
  [BILL_STATUS.DONE]: '#10b981',              // 🆕 Xanh lá - hoàn thành
  [BILL_STATUS.FAILED]: '#ef4444',            // 🆕 Đỏ - giao thất bại
  [BILL_STATUS.CANCELLED]: '#6b7280',         // Xám - đã hủy
  [BILL_STATUS.RETURNED]: '#f97316',          // 🆕 Cam - đã hoàn trả
  [BILL_STATUS.REFUND_PENDING]: '#eab308',    // 🆕 Vàng đậm - chờ hoàn tiền
  [BILL_STATUS.REFUNDED]: '#84cc16'           // 🆕 Xanh lá nhạt - đã hoàn tiền
};

// 🔐 USER ROLE FUNCTIONS
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

const checkTokenValidity = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      console.warn('🕐 Token sẽ hết hạn trong', Math.floor(timeUntilExpiry / 60), 'phút');
    }
    
    return timeUntilExpiry > 0;
  } catch (e) {
    console.error('❌ Token validation error:', e);
    return false;
  }
};

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
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
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

  useEffect(() => {
    console.log('=== BILL MANAGEMENT DEBUG ===');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('🚨 Không có token - redirect to login');
      window.location.href = '/';
      return;
    }
    
    setUserRole(getUserRole());
    setUserName(getCurrentUserName());
    
    console.log('✅ Token exists - fetching data...');
    fetchAll();
  }, []);

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
    console.log('🔊 Starting fetchAll...');
    setLoading(true);
    setError(null);
    
    api.get('/bills/enhanced?enrich=true')
      .then((billsRes) => {
        console.log('🔊 API Results:');
        console.log('📋 Bills:', billsRes.data.data?.length || 0);
        
        const billData = billsRes.data.data || [];
        
        // 🔥 CHỈ HIỂN THỊ CÁC TRẠNG THÁI QUẢN LÝ ĐƠN HÀNG BAN ĐẦU
        const managementBills = billData.filter(bill => 
          [BILL_STATUS.PENDING, BILL_STATUS.CONFIRMED, BILL_STATUS.READY].includes(bill.status)
        );
        
        setBills(managementBills);
        
        const existingLogs = JSON.parse(localStorage.getItem('bill_action_logs') || '[]');
        setActionHistory(existingLogs);

        if (!billsRes.data.success) {
          setError('Không thể tải danh sách hóa đơn');
          console.error('❌ Bills API failed');
        }

        setLoading(false);
      }).catch(error => {
        console.error('❌ fetchAll error:', error);
        if (handleAuthError(error)) return;
        setError('Lỗi khi tải dữ liệu: ' + (error.response?.data?.msg || error.message));
        setLoading(false);
      });
  }

  // 🔥 SỬ DỤNG DỮ LIỆU TỪ ENRICHED API - KHÔNG CẦN LOOKUP
  const getCustomerInfo = (bill) => ({
    name: bill.customerName || 'Khách hàng không rõ',
    phone: bill.customerPhone || ''
  });

  const getDeliveryInfo = (bill) => ({
    name: bill.deliveryName || 'Chưa có tên người nhận',
    phone: bill.deliveryPhone || 'Chưa có SĐT',
    address: bill.deliveryAddress || 'Chưa có địa chỉ giao hàng'
  });

  const getShippingMethod = (bill) => bill.shippingMethodDisplay || bill.shipping_method || 'Chưa chọn';
  const getPaymentMethod = (bill) => bill.paymentMethodDisplay || bill.payment_method || 'Chưa chọn';
  const getVoucherCode = (bill) => bill.voucherDisplayCode || '—';

  // 🔥 FIXED: Tính toán tài chính chính xác từ dữ liệu MongoDB
  const calculateFinancialInfo = (bill) => {
    // 1. TIỀN HÀNG: Tính từ items thực tế hoặc original_total từ DB
    let itemsSubtotal = 0;
    if (Array.isArray(bill.items) && bill.items.length > 0) {
      itemsSubtotal = bill.items.reduce((sum, item) => {
        const itemPrice = getItemPrice(item);
        const quantity = Number(item.quantity) || 0;
        return sum + (itemPrice * quantity);
      }, 0);
    } else {
      // Fallback: Sử dụng original_total từ MongoDB
      itemsSubtotal = Number(bill.original_total) || 0;
    }

    // 2. PHI SHIP: Từ MongoDB
    const shippingFee = Number(bill.shipping_fee) || 0;

    // 3. GIẢM GIÁ: Từ MongoDB 
    const discountAmount = Number(bill.discount_amount) || 0;

    // 4. TỔNG TIỀN: Từ MongoDB (đã tính sẵn)
    const finalTotal = Number(bill.total) || 0;

    // 5. VERIFICATION: Kiểm tra công thức
    const calculatedTotal = itemsSubtotal + shippingFee - discountAmount;
    const isFormulaCorrect = Math.abs(calculatedTotal - finalTotal) < 1;

    console.log(`💰 Financial calculation for bill ${bill._id.slice(-8)}:`, {
      itemsSubtotal,
      shippingFee,
      discountAmount,
      calculatedTotal,
      finalTotal,
      isFormulaCorrect
    });

    return {
      itemsSubtotal,
      shippingFee,
      discountAmount,
      finalTotal,
      calculatedTotal,
      isFormulaCorrect,
      // Formatted versions
      itemsSubtotal_formatted: itemsSubtotal.toLocaleString('vi-VN') + ' đ',
      shippingFee_formatted: shippingFee.toLocaleString('vi-VN') + ' đ',
      discountAmount_formatted: discountAmount.toLocaleString('vi-VN') + ' đ',
      finalTotal_formatted: finalTotal.toLocaleString('vi-VN') + ' đ'
    };
  };

  // 🔧 FIXED: Cải thiện logic lấy giá sản phẩm
  const getItemPrice = (item) => {
    // Thử các field khác nhau theo thứ tự ưu tiên
    const priceFields = ['unitPrice', 'unit_price', 'price', 'itemPrice', 'productPrice'];
    
    for (const field of priceFields) {
      if (item[field] && Number(item[field]) > 0) {
        return Number(item[field]);
      }
    }
    
    // Fallback: tính từ total/quantity nếu có
    if (item.total && item.quantity && Number(item.quantity) > 0) {
      return Number(item.total) / Number(item.quantity);
    }
    
    console.warn('⚠️ Không tìm thấy giá hợp lệ cho item:', item);
    return 0;
  };

  // Filter hóa đơn
  const filtered = bills.filter(bill => {
    if (filterStatus !== 'all' && bill.status !== filterStatus) {
      return false;
    }
    if (searchTerm) {
      const customerInfo = getCustomerInfo(bill);
      const deliveryInfo = getDeliveryInfo(bill);
      const billId = (bill._id || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      if (!customerInfo.name.toLowerCase().includes(searchLower) && 
          !deliveryInfo.name.toLowerCase().includes(searchLower) &&
          !deliveryInfo.phone.toLowerCase().includes(searchLower) &&
          !billId.includes(searchLower)) {
        return false;
      }
    }
    if (bill.created_at) {
      const d = new Date(bill.created_at);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
    }
    return true;
  });

  // ✅ CẬP NHẬT TRẠNG THÁI - BỎ LOGIC HỦY ĐƠN
  const updateBillStatus = async (billId, newStatus) => {
    const bill = bills.find(b => b._id === billId);
    if (!bill) return;

    // ❌ BỎ LOGIC HỦY ĐƠN HOÀN TOÀN
    // Chỉ cho phép chuyển trạng thái tiến bộ: pending -> confirmed -> ready

    const confirmMessage = `✅ Xác nhận chuyển trạng thái thành: ${STATUS_LABELS[newStatus]}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/bills/${billId}`, { 
        status: newStatus
      });

      logAction(
        `STATUS_CHANGE: ${bill.status} → ${newStatus}`,
        billId,
        'Cập nhật trạng thái tiến bộ'
      );

      const statusEmoji = {
        [BILL_STATUS.CONFIRMED]: '✅',
        [BILL_STATUS.READY]: '📦',
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

  // 🏪 HOÀN THÀNH ĐƠN NHẬN TẠI CỬA HÀNG
  const completePickupOrder = async (billId) => {
    const bill = bills.find(b => b._id === billId);
    if (!bill) return;

    const customerInfo = getCustomerInfo(bill);
    const financialInfo = calculateFinancialInfo(bill);
    const confirmMessage = `🏪 Xác nhận khách đã nhận hàng tại cửa hàng?\n\n` +
      `📋 Mã đơn: ${bill._id.slice(-8)}\n` +
      `👤 Khách hàng: ${customerInfo.name}\n` +
      `💰 Tổng tiền: ${financialInfo.finalTotal_formatted}\n\n` +
      `Đơn hàng sẽ được đánh dấu hoàn thành.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await api.put(`/bills/${billId}/pickup-status`, {
        status: 'done',
        admin_note: 'Khách đã nhận hàng tại cửa hàng'
      });

      if (response.data.success) {
        logAction('COMPLETE_PICKUP_ORDER', billId, 'Hoàn thành đơn nhận tại cửa hàng');
        alert('🏪 ✅ Đã hoàn thành đơn nhận tại cửa hàng!');
        fetchAll(); // Refresh danh sách
      } else {
        throw new Error(response.data.msg || 'Có lỗi xảy ra');
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error('❌ Complete pickup order error:', err);
        alert('❌ Lỗi khi hoàn thành đơn: ' + (err.response?.data?.msg || err.message));
      }
    }
  };

  // ✅ CHUYỂN SANG GIAO HÀNG
  const moveToShipment = (bill) => {
    const deliveryInfo = getDeliveryInfo(bill);
    const confirmMessage = `🚚 Chuyển đến màn quản lý giao hàng?\n\n` +
      `📋 Mã đơn: ${bill._id.slice(-8)}\n` +
      `👤 Khách hàng: ${getCustomerInfo(bill).name}\n` +
      `📍 Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n` +
      `📍 Địa chỉ: ${deliveryInfo.address}\n\n` +
      `Bạn sẽ được chuyển đến màn hình quản lý giao hàng.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      logAction('MOVE_TO_SHIPPING', bill._id, 'Chuyển sang màn quản lý giao hàng');
      
      localStorage.setItem('selected_bill_for_shipping', JSON.stringify({
        id: bill._id,
        customer: getCustomerInfo(bill).name,
        delivery: deliveryInfo,
        total: bill.total,
        timestamp: new Date().toISOString()
      }));

      console.log('🚚 Navigating to ShipmentManagement using React Router...');
      navigate(ENUM_PAGE.ShipmentManagement);
      
    } catch (err) {
      console.error('❌ Move to shipping error:', err);
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
      const { data: res } = await api.get(`/bills/${bill._id}?enrich=true&_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const billData = res.data;
      console.log('📋 Bill data received:', billData);
      
      setCurrentBill(billData);
      setShowModal(true);

      logAction('VIEW_DETAIL', bill._id, `Xem chi tiết hóa đơn`);
    } catch (err) {
      console.error('❌ Error opening modal:', err);
      if (!handleAuthError(err)) {
        alert('❌ Không thể tải chi tiết hóa đơn: ' + (err.response?.data?.msg || err.message));
      }
    }
  };

// 🎨 FIXED PDF GENERATION - Compact layout với spacing chính xác
const printBillSlip = async billId => {
  try {
    console.log('🖨️ Creating enhanced PDF for bill:', billId);
    const { data: res } = await api.get(`/bills/${billId}?enrich=true&_=${Date.now()}`);
    
    if (!res || !res.data) {
      throw new Error('Không có dữ liệu hóa đơn');
    }
    
    const bill = res.data;
    console.log('📄 PDF data:', bill);
    
    const items = Array.isArray(bill.items) ? bill.items : [];
    const customerInfo = getCustomerInfo(bill);
    const deliveryInfo = getDeliveryInfo(bill);
    const financialInfo = calculateFinancialInfo(bill); // 🔥 SỬ DỤNG LOGIC MỚI

    // 📄 TẠO PDF VỚI THIẾT KẾ COMPACT
    const doc = new jsPDF({ 
      putOnlyUsedFonts: true, 
      compress: true,
      format: 'a4'
    });
    
    // 🔧 SETUP FONT AN TOÀN CHO TIẾNG VIỆT
    let fontLoaded = false;
    try {
      doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');
      fontLoaded = true;
      console.log('✅ Roboto font loaded successfully');
    } catch (fontErr) {
      console.warn('⚠️ Roboto font failed, using Helvetica:', fontErr);
      doc.setFont('helvetica', 'normal');
    }
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 15; // Starting Y position
    
    // 🎨 HEADER SECTION - Compact
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 35, 'F'); // Giảm từ 40 xuống 35
    
    // Company info section
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); // Giảm từ 22 xuống 20
    doc.text('🧁 CAKESHOP', margin, 16);
    doc.setFontSize(9); // Giảm từ 10 xuống 9
    doc.text('Premium Cake & Bakery', margin, 23);
    doc.text('Hotline: 1900-CAKE | cakeshop.vn', margin, 29);
    
    // Bill title on the right
    doc.setFontSize(16); // Giảm từ 18 xuống 16
    const titleText = 'HOA DON BAN HANG';
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, pageWidth - margin - titleWidth, 20);
    
    // Reset position after header
    yPos = 42; // Giảm từ 50 xuống 42
    
    // 📋 BILL BASIC INFO - Compact
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F'); // Giảm từ 25 xuống 20
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'S');
    
    // Left column
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8); // Giảm từ 9 xuống 8
    doc.text('Ma hoa don:', margin + 3, yPos + 6);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9); // Giảm từ 10 xuống 9
    doc.text(`#${bill._id.slice(-8)}`, margin + 3, yPos + 12);
    
    // Middle column
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    doc.text('Ngay tao:', margin + 70, yPos + 6);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    const createDate = bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A');
    doc.text(createDate, margin + 70, yPos + 12);
    
    // Right column - Status with color
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    doc.text('Trang thai:', margin + 130, yPos + 6);
    const statusColor = STATUS_COLORS[bill.status] || '#6b7280';
    const rgb = hexToRgb(statusColor);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.setFontSize(9);
    doc.text(bill.statusDisplay || STATUS_LABELS[bill.status] || bill.status, margin + 130, yPos + 12);
    
    yPos += 25; // Giảm từ 35 xuống 25
    
    // 💳 PAYMENT & SHIPPING INFO - Compact
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F'); // Giảm từ 15 xuống 12
    
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(8);
    doc.text('Thanh toan:', margin + 3, yPos + 4);
    doc.text('Van chuyen:', margin + 70, yPos + 4);
    doc.text('Voucher:', margin + 130, yPos + 4);
    
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(8);
    doc.text(getPaymentMethod(bill), margin + 3, yPos + 9);
    doc.text(getShippingMethod(bill), margin + 70, yPos + 9);
    doc.setTextColor(16, 185, 129);
    doc.text(getVoucherCode(bill), margin + 130, yPos + 9);
    
    yPos += 17; // Giảm từ 25 xuống 17
    
    // 👤 CUSTOMER INFO - Compact
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F'); // Giảm từ 12 xuống 10
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('👤 THONG TIN KHACH HANG', margin + 3, yPos + 7);
    
    yPos += 14; // Giảm từ 18 xuống 14
    
    // Customer details in 2 columns
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    doc.text(`Ten: ${customerInfo.name}`, margin + 3, yPos);
    if (customerInfo.phone) {
      doc.text(`SDT: ${customerInfo.phone}`, margin + 100, yPos);
    }
    
    yPos += 12; // Giảm từ 15 xuống 12
    
    // 📍 DELIVERY INFO - Compact
    doc.setFillColor(139, 92, 246);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F'); // Giảm từ 12 xuống 10
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('📍 THONG TIN GIAO HANG', margin + 3, yPos + 7);
    
    yPos += 14; // Giảm từ 18 xuống 14
    
    // Delivery details
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    doc.text(`Nguoi nhan: ${deliveryInfo.name}`, margin + 3, yPos);
    if (deliveryInfo.phone !== 'Chưa có SĐT') {
      doc.text(`SDT: ${deliveryInfo.phone}`, margin + 100, yPos);
    }
    
    yPos += 6; // Giảm từ 8 xuống 6
    
    // Address with proper wrapping - Compact
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    doc.text('Dia chi:', margin + 3, yPos);
    
    const address = deliveryInfo.address;
    const maxAddressWidth = pageWidth - margin - 25;
    const addressLines = doc.splitTextToSize(address, maxAddressWidth);
    
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    addressLines.forEach((line, index) => {
      doc.text(line, margin + 3, yPos + 4 + (index * 4)); // Giảm từ 6 + index*5 xuống 4 + index*4
    });
    
    yPos += 4 + (addressLines.length * 4) + 8; // Compact spacing
    
    // 🛒 PRODUCTS TABLE
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F'); // Giảm từ 12 xuống 10
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('🛒 CHI TIET SAN PHAM', margin + 3, yPos + 7);
    
    yPos += 14; // Giảm từ 18 xuống 14
    
    // Enhanced table with precise spacing
    const tableData = items.map((item, i) => {
      const itemPrice = getItemPrice(item);
      const itemQty = Number(item?.quantity || 0);
      const itemTotal = itemPrice * itemQty;
      
      return [
        (i + 1).toString(),
        item?.productName || item?.name || 'San pham khong ro',
        itemQty.toString(),
        itemPrice.toLocaleString('vi-VN') + ' d',
        itemTotal.toLocaleString('vi-VN') + ' d'
      ];
    });
    
    autoTable(doc, {
      head: [['#', 'Ten san pham', 'SL', 'Don gia', 'Thanh tien']],
      body: tableData,
      startY: yPos,
      theme: 'striped',
      styles: {
        font: fontLoaded ? 'Roboto' : 'helvetica',
        fontStyle: 'normal',
        fontSize: 8, // Giảm từ 9 xuống 8
        cellPadding: 3, // Giảm từ 4 xuống 3
        textColor: [17, 24, 39],
        lineColor: [226, 232, 240],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 9, // Giảm từ 10 xuống 9
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 85 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 }
      },
      margin: { left: margin, right: margin }
    });
    
    // 💰 COMPACT SUMMARY SECTION - Right aligned với dữ liệu chính xác
    const yAfterTable = doc.lastAutoTable.finalY + 6;
    const summaryWidth = 60;
    const summaryX = pageWidth - margin - summaryWidth;
    
    // Calculate summary height dynamically
    const hasDiscount = financialInfo.discountAmount > 0;
    const summaryHeight = hasDiscount ? 24 : 18;
    
    // Summary background
    doc.setFillColor(249, 250, 251);
    doc.rect(summaryX, yAfterTable, summaryWidth, summaryHeight, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(summaryX, yAfterTable, summaryWidth, summaryHeight, 'S');
    
    // Summary content with tighter spacing
    let summaryY = yAfterTable + 4;
    
    // 🔥 SỬ DỤNG DỮ LIỆU TỪ calculateFinancialInfo
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text('Tien hang:', summaryX + 2, summaryY);
    doc.setTextColor(17, 24, 39);
    const subtotalWidth = doc.getTextWidth(financialInfo.itemsSubtotal_formatted);
    doc.text(financialInfo.itemsSubtotal_formatted, summaryX + summaryWidth - 2 - subtotalWidth, summaryY);
    
    summaryY += 4;
    doc.setTextColor(75, 85, 99);
    doc.text('Phi van chuyen:', summaryX + 2, summaryY);
    doc.setTextColor(17, 24, 39);
    const shippingWidth = doc.getTextWidth(financialInfo.shippingFee_formatted);
    doc.text(financialInfo.shippingFee_formatted, summaryX + summaryWidth - 2 - shippingWidth, summaryY);
    
    if (hasDiscount) {
      summaryY += 4;
      doc.setTextColor(220, 38, 38);
      doc.text('Giam gia:', summaryX + 2, summaryY);
      const discountText = '-' + financialInfo.discountAmount_formatted;
      const discountWidth = doc.getTextWidth(discountText);
      doc.text(discountText, summaryX + summaryWidth - 2 - discountWidth, summaryY);
    }
    
    summaryY += 5;
    // Total with separator line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(summaryX + 2, summaryY, summaryX + summaryWidth - 2, summaryY);
    
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('TONG CONG:', summaryX + 2, summaryY + 4);
    const totalWidth = doc.getTextWidth(financialInfo.finalTotal_formatted);
    doc.text(financialInfo.finalTotal_formatted, summaryX + summaryWidth - 2 - totalWidth, summaryY + 4);

    // 🔥 THÊM CÔNG THỨC VALIDATION VÀO PDF
    if (!financialInfo.isFormulaCorrect) {
      summaryY += 8;
      doc.setFontSize(7);
      doc.setTextColor(220, 38, 38);
      doc.text('⚠️ Cong thuc:', summaryX + 2, summaryY);
      doc.text(`${financialInfo.calculatedTotal.toLocaleString('vi-VN')}d`, summaryX + 25, summaryY);
    }
    
    // 📝 FOOTER - Positioned properly with enough space
    const footerY = yAfterTable + summaryHeight + 10;
    
    // Kiểm tra xem có đủ chỗ cho footer không
    if (footerY < pageHeight - 25) {
      // Footer separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      
      // Thank you message - centered and compact
      doc.setFontSize(10);
      doc.setTextColor(59, 130, 246);
      const thankYouText = 'Cam on quy khach da tin tuong CakeShop!';
      const thankYouWidth = doc.getTextWidth(thankYouText);
      doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, footerY + 6);
      
      // Contact info - single line, smaller font
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const contactInfo = '1900-CAKE | support@cakeshop.vn | cakeshop.vn';
      const contactWidth = doc.getTextWidth(contactInfo);
      doc.text(contactInfo, (pageWidth - contactWidth) / 2, footerY + 12);
      
      // Timestamp - bottom right, very small
      const timestamp = `In: ${new Date().toLocaleString('vi-VN')}`;
      const timestampWidth = doc.getTextWidth(timestamp);
      doc.text(timestamp, pageWidth - margin - timestampWidth, footerY + 18);
    } else {
      // Nếu không đủ chỗ, chỉ thêm thank you message ngay dưới summary
      const simpleFooterY = yAfterTable + summaryHeight + 3;
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      const thankYouText = 'Cam on quy khach!';
      const thankYouWidth = doc.getTextWidth(thankYouText);
      doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, simpleFooterY);
    }
    
    // Save PDF with descriptive filename
    const fileName = `CakeShop_HoaDon_${bill._id.slice(-8)}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '')}.pdf`;
    doc.save(fileName);

    // Log action
    logAction('PRINT_FIXED_PDF', billId, `In hóa đơn PDF đã sửa - ${fileName}`);
    
    // Success message với thông tin tài chính
    const successMessage = `✅ Đã tạo PDF thành công!\n\n` +
      `📄 File: ${fileName}\n` +
      `👤 Khách hàng: ${customerInfo.name}\n` +
      `💰 Tiền hàng: ${financialInfo.itemsSubtotal_formatted}\n` +
      `🚛 Phí ship: ${financialInfo.shippingFee_formatted}\n` +
      `🎯 Giảm giá: ${financialInfo.discountAmount_formatted}\n` +
      `💵 Tổng tiền: ${financialInfo.finalTotal_formatted}\n` +
      `${financialInfo.isFormulaCorrect ? '✅ Công thức đúng' : '⚠️ Công thức sai: ' + financialInfo.calculatedTotal.toLocaleString('vi-VN') + 'đ'}`;
    
    alert(successMessage);

  } catch (err) {
    console.error('❌ Fixed PDF Error:', err);
    if (!handleAuthError(err)) {
      alert('❌ Không thể tạo PDF: ' + (err.response?.data?.msg || err.message));
    }
  }
};

// 🛠️ HELPER FUNCTION - Convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 107, g: 114, b: 128 }; // Default gray
}

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
      if (handleAuthError(err)) return;
      
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

  // Render action buttons cho từng trạng thái - BỎ NÚT HỦY + THÊM PICKUP LOGIC
  const renderActionButtons = (bill) => {
    const currentStatus = bill.status;
    const shippingMethod = getShippingMethod(bill);
    
    // 🏪 KIỂM TRA ĐƠN NHẬN TẠI CỬA HÀNG
    const isPickupOrder = shippingMethod === 'Nhận tại cửa hàng' || 
                         shippingMethod?.toLowerCase().includes('pickup') ||
                         shippingMethod?.toLowerCase().includes('nhận tại');

    return (
      <td className="actions-cell">
        <div className="action-buttons">
          <button onClick={() => openModal(bill)} className="btn-detail">
            👁️ Chi tiết
          </button>
          <button onClick={() => printBillSlip(bill._id)} className="btn-print">
            🖨️ PDF
          </button>
          
          {/* 🔥 LOGIC MỚI: Phân biệt pickup vs delivery */}
          {isPickupOrder ? (
            // 🏪 ĐƠN NHẬN TẠI CỬA HÀNG
            <>
              {currentStatus === BILL_STATUS.PENDING && (
                <button
                  onClick={() => updateBillStatus(bill._id, BILL_STATUS.CONFIRMED)}
                  className="btn-status btn-confirmed"
                  style={{ backgroundColor: STATUS_COLORS[BILL_STATUS.CONFIRMED] }}
                >
                  ✅ Xác nhận
                </button>
              )}
              {currentStatus === BILL_STATUS.CONFIRMED && (
                <button
                  onClick={() => completePickupOrder(bill._id)}
                  className="btn-complete-pickup"
                  style={{ backgroundColor: '#10b981' }}
                >
                  🏪 Hoàn thành đơn
                </button>
              )}
            </>
          ) : (
            // 🚚 ĐƠN GIAO HÀNG BÌNH THƯỜNG
            <>
              {ALLOWED_TRANSITIONS[currentStatus]?.map(nextStatus => (
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
              
              {currentStatus === BILL_STATUS.READY && (
                <button
                  onClick={() => moveToShipment(bill)}
                  className="btn-move-to-shipping"
                  title="Chuyển sang màn quản lý giao hàng"
                  style={{ backgroundColor: '#06b6d4' }}
                >
                  🚚 Giao hàng
                </button>
              )}
            </>
          )}

          {/* 🔥 CHỈ HIỂN THỊ TRẠNG THÁI ĐÃ HỦY, KHÔNG CHO THAO TÁC GÌ */}
          {currentStatus === BILL_STATUS.CANCELLED && (
            <span className="cancelled-notice" style={{ 
              color: '#ef4444', 
              fontSize: '12px', 
              fontStyle: 'italic',
              padding: '5px 8px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '4px'
            }}>
              Đơn hàng đã hủy
            </span>
          )}
        </div>
      </td>
    );
  };

  const getStatusButtonLabel = (status) => {
    const labels = {
      [BILL_STATUS.CONFIRMED]: '✅ Xác nhận',
      [BILL_STATUS.READY]: '📦 Chuẩn bị xong',
      // BỎ CANCELLED LABEL
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
          <p>Xử lý đơn hàng từ khi đặt hàng đến sẵn sàng giao - Logic tài chính đã được sửa</p>
          
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
            placeholder="Tên khách hàng, người nhận, SĐT hoặc mã hóa đơn..."
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
      </div>

      {/* 🔥 BẢNG MỚI THU GỌN - CHỈ NHỮNG CỘT QUAN TRỌNG VỚI LOGIC TÀI CHÍNH CHÍNH XÁC */}
      <div className="table-wrapper">
        <table className="bills-table">
          <thead>
            <tr>
              <th>#</th>
              <th>📋 Đơn hàng</th>
              <th>👤 Khách hàng</th>
              <th>📞 Liên hệ nhận hàng</th>
              <th>📍 Địa chỉ giao hàng</th>
              <th>💵 Tổng tiền</th>
              <th>📊 Trạng thái</th>
              <th>⏰ Thời gian</th>
              <th>⚙️ Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bill, i) => {
              const customerInfo = getCustomerInfo(bill);
              const deliveryInfo = getDeliveryInfo(bill);
              const financialInfo = calculateFinancialInfo(bill); // 🔥 SỬ DỤNG LOGIC MỚI
              
              return (
                <tr key={bill._id} className={`bill-row status-${bill.status}`}>
                  <td className="row-number">{i + 1}</td>
                  
                  <td className="bill-cell">
                    <div className="bill-info">
                      <span className="bill-id">#{(bill._id || '').slice(-8)}</span>
                      <span className="bill-date">
                        {bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                      </span>
                      <span className="shipping-method">{getShippingMethod(bill)}</span>
                    </div>
                  </td>

                  <td className="customer-cell">
                    <div className="customer-info">
                      <span className="customer-name">{customerInfo.name}</span>
                      {customerInfo.phone && (
                        <a href={`tel:${customerInfo.phone}`} className="customer-phone">
                          📞 {customerInfo.phone}
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="delivery-contact-cell">
                    <div className="delivery-contact">
                      <span className="delivery-name">{deliveryInfo.name}</span>
                      {deliveryInfo.phone !== 'Chưa có SĐT' && (
                        <a href={`tel:${deliveryInfo.phone}`} className="delivery-phone">
                          📞 {deliveryInfo.phone}
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="address-cell">
                    <span className="address-text" title={deliveryInfo.address}>
                      {deliveryInfo.address.length > 60 
                        ? deliveryInfo.address.substring(0, 60) + '...'
                        : deliveryInfo.address}
                    </span>
                  </td>

                  <td className="total-cell">
                    <div className="total-info">
                      <span className="total-amount">
                        {financialInfo.finalTotal_formatted}
                      </span>
                      
                      {/* 🔥 HIỂN THỊ CHI TIẾT TÀI CHÍNH CHÍNH XÁC */}
                      <div className="financial-breakdown" style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        <div>💰 Hàng: {financialInfo.itemsSubtotal_formatted}</div>
                        {financialInfo.shippingFee > 0 && (
                          <div>🚛 Ship: {financialInfo.shippingFee_formatted}</div>
                        )}
                        {financialInfo.discountAmount > 0 && (
                          <div style={{ color: '#dc2626' }}>🎯 Giảm: -{financialInfo.discountAmount_formatted}</div>
                        )}
                      </div>
                      
                      {/* 🔥 CẢNH BÁO CÔNG THỨC SAI */}
                      {!financialInfo.isFormulaCorrect && (
                        <div style={{ 
                          color: '#ef4444', 
                          fontSize: '10px', 
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          marginTop: '2px'
                        }}>
                          ⚠️ Sai CT: {financialInfo.calculatedTotal.toLocaleString('vi-VN')}đ
                        </div>
                      )}
                      
                      <span className="payment-method">
                        {getPaymentMethod(bill)}
                      </span>
                    </div>
                  </td>

                  <td className="status-cell">
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: STATUS_COLORS[bill.status] || '#6b7280' }}
                    >
                      {bill.statusDisplay || STATUS_LABELS[bill.status] || bill.status}
                    </div>
                  </td>

                  <td className="time-cell">
                    <div className="time-info">
                      <span className="date">
                        {bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                      </span>
                      <small className="time">
                        {bill.created_at ? new Date(bill.created_at).toLocaleTimeString('vi-VN') : ''}
                      </small>
                    </div>
                  </td>
                  
                  {renderActionButtons(bill)}
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
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