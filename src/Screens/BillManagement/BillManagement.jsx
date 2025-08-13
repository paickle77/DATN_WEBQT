// 🔥 OPTIMIZED BillManagement - Thu gọn bảng và đưa chi tiết vào modal
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

// 🎯 QUẢN LÝ CÁC TRẠNG THÁI TRƯỚC KHI GIAO HÀNG
const BILL_STATUS = {
  PENDING: 'pending',      
  CONFIRMED: 'confirmed',  
  READY: 'ready',         
  CANCELLED: 'cancelled', 
};

const STATUS_LABELS = {
  [BILL_STATUS.PENDING]: 'Chờ xác nhận',
  [BILL_STATUS.CONFIRMED]: 'Đã xác nhận',
  [BILL_STATUS.READY]: 'Sẵn sàng giao',
  [BILL_STATUS.CANCELLED]: 'Đã hủy',
};

const ALLOWED_TRANSITIONS = {
  [BILL_STATUS.PENDING]: [BILL_STATUS.CONFIRMED, BILL_STATUS.CANCELLED],
  [BILL_STATUS.CONFIRMED]: [BILL_STATUS.READY, BILL_STATUS.CANCELLED],
  [BILL_STATUS.READY]: [BILL_STATUS.CANCELLED], 
  [BILL_STATUS.CANCELLED]: [], 
};

const STATUS_COLORS = {
  [BILL_STATUS.PENDING]: '#f59e0b',      
  [BILL_STATUS.CONFIRMED]: '#3b82f6',    
  [BILL_STATUS.READY]: '#8b5cf6',        
  [BILL_STATUS.CANCELLED]: '#ef4444',    
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
    console.log('📊 Starting fetchAll...');
    setLoading(true);
    setError(null);
    
    // 🔥 CHỈ FETCH ENRICHED BILLS
    api.get('/GetAllBills?enrich=true')
       .then((billsRes) => {
         console.log('📊 API Results:');
         console.log('📋 Bills:', billsRes.data.data?.length || 0);
         
         const billData = billsRes.data.data || [];
         
         console.log('🔍 Sample bill data:', billData[0]);
         
         const managementBills = billData.filter(bill => 
           ['pending', 'confirmed', 'ready', 'cancelled'].includes(bill.status)
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

  // 🔧 FIXED: Cải thiện logic lấy giá sản phẩm
  const getItemPrice = (item) => {
    // Thử các field khác nhau theo thứ tự ưu tiên
    const priceFields = ['unitPrice', 'price', 'unit_price', 'itemPrice', 'productPrice'];
    
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

  // ✅ CẬP NHẬT TRẠNG THÁI
  const updateBillStatus = async (billId, newStatus) => {
    const bill = bills.find(b => b._id === billId);
    if (!bill) return;

    if (userRole === 'staff' && newStatus === BILL_STATUS.CANCELLED) {
      alert('❌ Staff không có quyền hủy hóa đơn. Vui lòng liên hệ Manager/Admin.');
      return;
    }

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

  // 🔧 FIXED: PDF đơn giản, ổn định - Không gặp lỗi font
  const printBillSlip = async billId => {
    try {
      console.log('🖨️ Printing PDF for bill:', billId);
      const { data: res } = await api.get(`/bills/${billId}?enrich=true&_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const bill = res.data;
      console.log('📄 PDF data:', bill);
      
      const items = Array.isArray(bill.items) ? bill.items : [];
      const customerInfo = getCustomerInfo(bill);
      const deliveryInfo = getDeliveryInfo(bill);

      // 📄 TẠO PDF ĐỚN GIẢN, KHÔNG LỖI FONT
      const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
      
      // 🔧 SỬ DỤNG FONT AN TOÀN
      let fontLoaded = false;
      try {
        doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto', 'normal');
        fontLoaded = true;
      } catch (fontErr) {
        console.warn('⚠️ Roboto font failed, using default:', fontErr);
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setFontSize(16);
      doc.text('CAKESHOP - HOA DON', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Ma hoa don: ${bill._id}`, 14, 30);
      doc.text(`Khach hang: ${customerInfo.name}`, 14, 36);
      doc.text(`SDT khach hang: ${customerInfo.phone}`, 14, 42);
      doc.text(`Nguoi nhan: ${deliveryInfo.name}`, 14, 48);
      doc.text(`SDT nguoi nhan: ${deliveryInfo.phone}`, 14, 54);
      doc.text(`Dia chi giao hang: ${deliveryInfo.address}`, 14, 60);
      doc.text(`Trang thai: ${bill.statusDisplay || STATUS_LABELS[bill.status] || bill.status}`, 14, 66);
      doc.text(`Phuong thuc giao hang: ${getShippingMethod(bill)}`, 14, 72);
      doc.text(`Phuong thuc thanh toan: ${getPaymentMethod(bill)}`, 14, 78);
      doc.text(`Voucher: ${getVoucherCode(bill)}`, 14, 84);
      doc.text(`Ngay tao: ${bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleString('vi-VN') : 'N/A')}`, 14, 90);
      
      const startY = 96;
      const tableData = items.map((item, i) => {
        const itemPrice = getItemPrice(item);
        const itemQty = Number(item?.quantity || 0);
        const itemTotal = itemPrice * itemQty;
        
        return [
          i + 1,
          item?.productName || item?.name || 'San pham khong ro',
          itemQty,
          itemPrice.toLocaleString('vi-VN') + ' d',
          itemTotal.toLocaleString('vi-VN') + ' d'
        ];
      });
      
      autoTable(doc, {
        head: [['#', 'Ten san pham', 'SL', 'Don gia', 'Thanh tien']],
        body: tableData,
        startY,
        styles: {
          font: fontLoaded ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          font: fontLoaded ? 'Roboto' : 'helvetica',
          fontStyle: 'normal'
        }
      });
      
      const yAfterTable = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      
      doc.text(`Tien hang: ${bill.subtotal_formatted || (Number(bill.subtotal) || 0).toLocaleString('vi-VN')} d`, 14, yAfterTable);
      doc.text(`Phi van chuyen: ${bill.shipping_fee_formatted || (Number(bill.shippingFee) || 0).toLocaleString('vi-VN')} d`, 14, yAfterTable + 6);
      
      if (bill.discountAmount && bill.discountAmount > 0) {
        doc.text(`Giam gia: -${bill.discount_formatted || (Number(bill.discountAmount)).toLocaleString('vi-VN')} d`, 14, yAfterTable + 12);
        doc.text(`TONG THANH TOAN: ${bill.total_formatted || (Number(bill.total) || 0).toLocaleString('vi-VN')} d`, 14, yAfterTable + 18);
      } else {
        doc.text(`TONG THANH TOAN: ${bill.total_formatted || (Number(bill.total) || 0).toLocaleString('vi-VN')} d`, 14, yAfterTable + 12);
      }
      
      doc.setFontSize(10);
      doc.text('Cam on quy khach da tin tuong CakeShop!', 14, yAfterTable + 30);
      
      const fileName = `HoaDon_${bill._id.slice(-8)}_${STATUS_LABELS[bill.status] || bill.status}.pdf`;
      doc.save(fileName);

      logAction('PRINT_PDF', billId, `In hóa đơn PDF - ${fileName}`);
      
      alert(`✅ Đã tạo PDF thành công!\n\n📄 File: ${fileName}\n💰 Tổng tiền: ${bill.total_formatted || (Number(bill.total) || 0).toLocaleString('vi-VN')} đ`);

    } catch (err) {
      console.error('❌ PDF Error:', err);
      if (!handleAuthError(err)) {
        alert('❌ Không thể tạo PDF: ' + (err.response?.data?.msg || err.message));
      }
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
            🖨️ PDF
          </button>
          
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
              🚚 Giao hàng
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
        
        <div className="stat-card cancelled">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.CANCELLED).length}</span>
            <span className="stat-label">Đã hủy</span>
          </div>
        </div>
      </div>

      {/* 🔥 BẢNG MỚI THU GỌN - CHỈ NHỮNG CỘT QUAN TRỌNG */}
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
                        {bill.total_formatted || (Number(bill.total) || 0).toLocaleString('vi-VN')} đ
                      </span>
                      {bill.discountAmount && bill.discountAmount > 0 && (
                        <span className="discount-badge">
                          Giảm: {bill.discount_formatted || (Number(bill.discountAmount)).toLocaleString('vi-VN')} đ
                        </span>
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