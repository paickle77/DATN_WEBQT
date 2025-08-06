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

// Định nghĩa các trạng thái hóa đơn theo luồng mới
const BILL_STATUS = {
  PENDING: 'pending',      // Khách hàng đặt hàng
  CONFIRMED: 'confirmed',  // Admin xác nhận hóa đơn và đóng gói chuẩn bị đơn
  READY: 'ready',         // Admin chuẩn bị hóa đơn xong đợi shipper nhận đơn
  SHIPPING: 'shipping',   // Shipper nhận đơn và thành đang giao
  DONE: 'done',           // Shipper giao hàng thành công và khách nhận hàng
  CANCELLED: 'cancelled', // Khách hủy hóa đơn
  FAILED: 'failed'        // Khách bỏ đơn không nhận, shipper hoàn hàng
};

// Mapping hiển thị trạng thái tiếng Việt
const STATUS_LABELS = {
  [BILL_STATUS.PENDING]: 'Chờ xác nhận',
  [BILL_STATUS.CONFIRMED]: 'Đã xác nhận đơn hàng',
  [BILL_STATUS.READY]: 'Đã sẵn sàng giao',
  [BILL_STATUS.SHIPPING]: 'Đang giao',
  [BILL_STATUS.DONE]: 'Giao hàng thành công',
  [BILL_STATUS.CANCELLED]: 'Hủy đơn hàng',
  [BILL_STATUS.FAILED]: 'Giao hàng thất bại'
};

// Logic chuyển đổi trạng thái cho phép
const ALLOWED_TRANSITIONS = {
  [BILL_STATUS.PENDING]: [BILL_STATUS.CONFIRMED, BILL_STATUS.CANCELLED],
  [BILL_STATUS.CONFIRMED]: [BILL_STATUS.READY, BILL_STATUS.CANCELLED],
  [BILL_STATUS.READY]: [BILL_STATUS.SHIPPING, BILL_STATUS.CANCELLED],
  [BILL_STATUS.SHIPPING]: [BILL_STATUS.DONE, BILL_STATUS.FAILED],
  [BILL_STATUS.DONE]: [], // Không thể chuyển đổi từ đã giao
  [BILL_STATUS.CANCELLED]: [], // Không thể chuyển đổi từ đã hủy
  [BILL_STATUS.FAILED]: [BILL_STATUS.SHIPPING] // Có thể giao lại từ thất bại
};

// Màu sắc cho từng trạng thái
const STATUS_COLORS = {
  [BILL_STATUS.PENDING]: '#f59e0b',      // Vàng
  [BILL_STATUS.CONFIRMED]: '#3b82f6',    // Xanh dương
  [BILL_STATUS.READY]: '#8b5cf6',        // Tím
  [BILL_STATUS.SHIPPING]: '#06b6d4',     // Xanh ngọc
  [BILL_STATUS.DONE]: '#10b981',         // Xanh lá
  [BILL_STATUS.CANCELLED]: '#ef4444',    // Đỏ
  [BILL_STATUS.FAILED]: '#f97316'        // Cam
};

const BillManagement = () => {
  const [bills, setBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal gán shipper
  const [showShipperModal, setShowShipperModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    console.log('=== BILL MANAGEMENT DEBUG ===');
    
    // 1. Kiểm tra token
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    
    // 2. Kiểm tra token hết hạn
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
    
    // 3. Nếu token OK thì fetch data
    console.log('✅ Token valid - fetching data...');
    fetchAll();
  }, []);

  // ✅ Sửa function fetchAll để handle API endpoints chính xác
  function fetchAll() {
    console.log('📊 Starting fetchAll...');
    setLoading(true);
    setError(null);
    
    // 🔥 QUAN TRỌNG: Thử tất cả các endpoint có thể có cho addresses
    const possibleAddressEndpoints = [
      '/addresses',
      '/address',
      '/user-addresses', 
      '/customer-addresses',
      '/shipping-addresses',
      '/delivery-addresses',
      '/bill-addresses'
    ];

    // Helper function để thử tìm endpoint addresses
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
      
      // Nếu không có endpoint nào hoạt động, thử lấy addresses từ bills
      console.log('⚠️ No address endpoint found, trying to extract from bills...');
      return { data: { data: [] }, error: 'no-address-endpoint' };
    };

    // Danh sách API calls chính
    const apiCalls = [
      api.get('/bills').catch(err => ({ data: { data: [] }, error: 'bills', details: err })),
      api.get('/users').catch(err => ({ data: { data: [] }, error: 'users', details: err })),
      api.get('/vouchers').catch(err => ({ data: { data: [] }, error: 'vouchers', details: err })),
      api.get('/shippers').catch(err => ({ data: { data: [] }, error: 'shippers', details: err }))
    ];

    Promise.all([
      ...apiCalls,
      findAddressEndpoint()
    ]).then(([billsRes, usersRes, vouchersRes, shippersRes, addressesRes]) => {
      
      // Log kết quả
      console.log('📊 API Results:');
      console.log('📋 Bills:', billsRes.error ? 'ERROR' : 'OK', billsRes.data.data?.length || 0);
      console.log('👥 Users:', usersRes.error ? 'ERROR' : 'OK', usersRes.data.data?.length || 0);
      console.log('🎫 Vouchers:', vouchersRes.error ? 'ERROR' : 'OK', vouchersRes.data.data?.length || 0);
      console.log('🚚 Shippers:', shippersRes.error ? 'ERROR' : 'OK', shippersRes.data.data?.length || 0);
      console.log('📍 Addresses:', addressesRes.error ? 'ERROR' : 'OK', addressesRes.data.data?.length || 0);
      
      // 🔥 GIẢI PHÁP: Nếu không có endpoint addresses, extract từ bills
      let addressData = addressesRes.data.data || [];
      const billData = billsRes.data.data || [];
      
      if (addressData.length === 0 && billData.length > 0) {
        console.log('🔧 Extracting addresses from bills...');
        const extractedAddresses = [];
        billData.forEach(bill => {
          if (bill.delivery_address) {
            // Nếu có delivery_address object trong bill
            extractedAddresses.push({
              _id: bill.address_id || `addr_${bill._id}`,
              detail_address: bill.delivery_address.street || bill.delivery_address.detail || '',
              ward: bill.delivery_address.ward || '',
              district: bill.delivery_address.district || '',
              city: bill.delivery_address.city || bill.delivery_address.province || '',
              user_id: bill.user_id
            });
          } else if (bill.shipping_address) {
            // Nếu có shipping_address string trong bill
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

      // Cập nhật state
      setBills(billData);
      setUsers(usersRes.data.data || []);
      setVouchers(vouchersRes.data.data || []);
      setShippers(shippersRes.data.data || []);
      setAddresses(addressData);

      // Kiểm tra lỗi quan trọng
      const criticalErrors = [];
      if (billsRes.error) criticalErrors.push('Không thể tải danh sách hóa đơn');
      if (usersRes.error) criticalErrors.push('Không thể tải danh sách khách hàng');
      
      if (criticalErrors.length > 0) {
        setError(criticalErrors.join(', '));
        console.error('❌ Critical errors:', criticalErrors);
      }

      // Cảnh báo các lỗi không quan trọng
      const warnings = [];
      if (addressesRes.error) warnings.push('Không thể tải địa chỉ - sẽ hiển thị "N/A"');
      if (vouchersRes.error) warnings.push('Không thể tải voucher - sẽ hiển thị "—"');
      if (shippersRes.error) warnings.push('Không thể tải danh sách shipper');
      
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

    // ✅ Cải thiện lookup functions để handle missing data tốt hơn
    const lookupUser = id => {
      if (!id || !users.length) return 'Khách hàng không rõ';
      const user = users.find(u => u._id === id.toString());
      return user ? (user.full_name || user.name || user.username || 'Khách hàng không rõ') : 'Khách hàng không rõ';
    };
  const lookupAddress = id => {
    if (!id || !addresses.length) return 'Chưa có địa chỉ giao hàng';
    
    const address = addresses.find(x => x._id === id);
    if (!address) return `Địa chỉ ID: ${id.slice(-8)}`;
    
    // Nếu có full_address (từ bills)
    if (address.full_address) {
      return address.full_address;
    }
    
    // Nếu có các field riêng lẻ
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
      if (bill.voucher_code) return bill.voucher_code; // Ưu tiên voucher_code từ bill
      const voucher = vouchers.find(v => v._id === bill.voucher_id);
      return voucher?.code || '—';
    };

  // Filter hóa đơn
  const filtered = bills.filter(bill => {
    // Filter theo trạng thái
    if (filterStatus !== 'all' && bill.status !== filterStatus) {
      return false;
    }
    // Tìm theo tên khách hàng hoặc ID hóa đơn
    if (searchTerm) {
      const customerName = lookupUser(bill.user_id).toLowerCase();
      const billId = (bill._id || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      if (!customerName.includes(searchLower) && !billId.includes(searchLower)) {
        return false;
      }
    }
    // Filter theo khoảng ngày
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
      
      // Thông báo thành công với emoji
      const statusEmoji = {
        [BILL_STATUS.CONFIRMED]: '✅',
        [BILL_STATUS.READY]: '📦',
        [BILL_STATUS.SHIPPING]: '🚚',
        [BILL_STATUS.DONE]: '🎉',
        [BILL_STATUS.CANCELLED]: '❌',
        [BILL_STATUS.FAILED]: '⚠️'
      };

      alert(`${statusEmoji[newStatus]} Đã cập nhật trạng thái thành: ${STATUS_LABELS[newStatus]}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi khi cập nhật trạng thái hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  // Gán shipper và chuyển sang shipping
  const assignShipperAndStartShipping = async (billId, shipperId) => {
    try {
      // 1. Thử tạo shipment (có thể endpoint này chưa có)
      try {
        const shipmentData = {
          bill_id: billId,
          assigned_shipper: shipperId,
          status: 'shipping',
          shippedDate: new Date().toISOString(),
          trackingCode: generateTrackingCode(),
          carrier: 'CakeShop Delivery'
        };
        await api.post('/shipments', shipmentData);
        console.log('✅ Shipment created successfully');
      } catch (shipmentError) {
        console.warn('⚠️ Không thể tạo shipment (có thể endpoint chưa có):', shipmentError.response?.status);
        // Tiếp tục mà không dừng lại
      }

      // 2. Cập nhật trạng thái hóa đơn sang shipping
      await api.put(`/bills/${billId}`, { 
        status: BILL_STATUS.SHIPPING,
        assigned_shipper: shipperId
      });
      fetchAll();

      alert('🚚 Đã gán shipper và bắt đầu giao hàng thành công!');
      setShowShipperModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi khi gán shipper: ' + (err.response?.data?.message || err.message));
    }
  };

  // Generate tracking code
  const generateTrackingCode = () => {
    return 'CSD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();
  };

  // Kiểm tra xem có thể chuyển đổi trạng thái không
  const canTransitionTo = (currentStatus, targetStatus) => {
    return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;
  };

  // Mở modal gán shipper
  const openShipperModal = (bill) => {
    if (bill.status !== BILL_STATUS.READY) {
      alert('⚠️ Chỉ có thể gán shipper cho hóa đơn ở trạng thái "Đã sẵn sàng giao"');
      return;
    }
    setSelectedBill(bill);
    setShowShipperModal(true);
  };

  // 🔥 SỬA CHÍNH: Mở modal chi tiết với error handling tốt hơn
  const openModal = async bill => {
    try {
      console.log('🔍 Fetching bill details for:', bill._id);
      const { data: res } = await api.get(`/bills/${bill._id}?_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const billData = res.data;
      console.log('📋 Bill data received:', billData);
      
      // ✅ HANDLE NULL/UNDEFINED ITEMS SAFELY
      const items = Array.isArray(billData.items) ? billData.items : [];
      
      // ✅ SAFE CALCULATION
      const subtotal = items.reduce((sum, item) => {
        const price = Number(item?.unitPrice || 0);
        const qty = Number(item?.quantity || 0);
        return sum + (price * qty);
      }, 0);
      
      const v = vouchers.find(v => v._id === billData.voucher_id);
      const discountPercent = Number(v?.discount_percent || 0);
      const discountAmount = Math.round(subtotal * discountPercent / 100);
      const finalTotal = subtotal - discountAmount;
      
      const userName = lookupUser(billData.user_id);
      const addressStr = lookupAddress(billData.address_id);
      const voucherCode = lookupVoucher(billData.voucher_id);

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

  // 🔥 SỬA CHÍNH: In PDF hóa đơn với error handling tốt hơn
  const printBillSlip = async billId => {
    try {
      console.log('🖨️ Printing PDF for bill:', billId);
      const { data: res } = await api.get(`/bills/${billId}?_=${Date.now()}`);
      
      if (!res || !res.data) {
        throw new Error('Không có dữ liệu hóa đơn');
      }
      
      const bill = res.data;
      console.log('📄 PDF data:', bill);
      
      // ✅ HANDLE NULL/UNDEFINED ITEMS SAFELY
      const items = Array.isArray(bill.items) ? bill.items : [];
      
      const subtotal = items.reduce((sum, item) => {
        const price = Number(item?.unitPrice || 0);
        const qty = Number(item?.quantity || 0);
        return sum + (price * qty);
      }, 0);
      
      const v = vouchers.find(v => v._id === bill.voucher_id);
      const discountAmount = Math.round(subtotal * ((Number(v?.discount_percent) || 0) / 100));
      const finalTotal = subtotal - discountAmount;
      const customer = lookupUser(bill.user_id);
      const addressText = lookupAddress(bill.address_id);
      const voucherCode = lookupVoucher(bill.voucher_id);

      const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
      doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');
      
      // Header
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
      
      // Footer
      doc.setFontSize(10);
      doc.text('Cảm ơn quý khách đã tin tưởng CakeShop! 🎂', 14, yAfterTable + 20);
      
      doc.save(`HoaDon_${bill._id.slice(-8)}_${STATUS_LABELS[bill.status] || bill.status}.pdf`);
    } catch (err) {
      console.error('❌ PDF Error:', err);
      alert('❌ Không thể tạo PDF: ' + (err.response?.data?.message || err.message));
    }
  };

  // Xóa hóa đơn
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

  // Render nút hành động dựa trên trạng thái
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
          {allowedNextStates.map(nextStatus => {
            // Nếu chuyển từ READY sang SHIPPING, hiển thị nút "Gán Shipper"
            if (currentStatus === BILL_STATUS.READY && nextStatus === BILL_STATUS.SHIPPING) {
              return (
                <button
                  key="assign-shipper"
                  onClick={() => openShipperModal(bill)}
                  className="btn-assign-shipper"
                  title="Gán shipper và bắt đầu giao hàng"
                  style={{ backgroundColor: STATUS_COLORS[BILL_STATUS.SHIPPING] }}
                >
                  🚚 Gán Shipper
                </button>
              );
            }
            
            // Các trạng thái khác
            return (
              <button
                key={nextStatus}
                onClick={() => updateBillStatus(bill._id, nextStatus)}
                className={`btn-status btn-${nextStatus}`}
                title={`Chuyển sang: ${STATUS_LABELS[nextStatus]}`}
                style={{ backgroundColor: STATUS_COLORS[nextStatus] }}
              >
                {getStatusButtonLabel(nextStatus)}
              </button>
            );
          })}
          
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

  // Label cho nút chuyển đổi trạng thái
  const getStatusButtonLabel = (status) => {
    const labels = {
      [BILL_STATUS.CONFIRMED]: '✅ Xác nhận',
      [BILL_STATUS.READY]: '📦 Chuẩn bị xong',
      [BILL_STATUS.SHIPPING]: '🚚 Bắt đầu giao',
      [BILL_STATUS.DONE]: '🎉 Hoàn thành',
      [BILL_STATUS.CANCELLED]: '❌ Hủy đơn',
      [BILL_STATUS.FAILED]: '⚠️ Thất bại'
    };
    return labels[status] || STATUS_LABELS[status];
  };

      // Lấy tên shipper được gán
    const getAssignedShipperName = (bill) => {
      // Chỉ hiển thị tên shipper nếu trạng thái là 'shipping' hoặc 'done'
      if (!bill.shipper_id || !shippers.length || (bill.status !== 'shipping' && bill.status !== 'done')) {
        return '—';
      }
      const shipper = shippers.find(s => s._id.toString() === bill.shipper_id.toString());
      return shipper?.full_name || shipper?.name || shipper?.username || '—';
    };

  // ✅ Thêm loading và error states
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
          <span style={{ fontSize: '48px' }}>🛒</span>
        </div>
        <div className="header-content">
          <h2>Quản lý Hóa đơn</h2>
          <p>Theo dõi và xử lý hóa đơn từ đặt hàng đến giao hàng thành công</p>
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

      {/* Thống kê nhanh với biểu tượng */}
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
        
        <div className="stat-card shipping">
          <div className="stat-icon">🚚</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.SHIPPING).length}</span>
            <span className="stat-label">Đang giao</span>
          </div>
        </div>
        
        <div className="stat-card done">
          <div className="stat-icon">🎉</div>
          <div className="stat-content">
            <span className="stat-number">{bills.filter(b => b.status === BILL_STATUS.DONE).length}</span>
            <span className="stat-label">Hoàn thành</span>
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
              <th>🚚 Shipper</th>
              <th>⚙️ Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bill, i) => (
              <tr key={bill._id} className={`bill-row status-${bill.status}`}>
                <td className="row-number">{i + 1}</td>
                <td className="customer-cell">
                  <div className="customer-info">
                    <span className="customer-name">{lookupUser(bill.user_id)}</span>
                    <span className="bill-id">#{(bill._id || '').slice(-8)}</span>
                  </div>
                </td>
                <td className="date-cell">
                  {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  <br />
                  <small>{bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('vi-VN') : ''}</small>
                </td>
                <td className="address-cell" title={lookupAddress(bill.address_id)}>
                  {lookupAddress(bill.address_id).length > 50 
                    ? lookupAddress(bill.address_id).substring(0, 50) + '...'
                    : lookupAddress(bill.address_id)
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
                <td className="shipper-cell">
                  <span className={`shipper-name ${bill.assigned_shipper ? 'assigned' : 'unassigned'}`}>
                    {getAssignedShipperName(bill)}
                  </span>
                </td>
                {renderActionButtons(bill)}
              </tr>
            ))}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="no-data">
                    <span style={{ fontSize: '48px' }}>📭</span>
                    <p>Không có hóa đơn phù hợp</p>
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

      {/* Modal Gán Shipper */}
      {showShipperModal && selectedBill && (
        <div className="modal-overlay">
          <div className="shipper-modal">
            <div className="modal-header">
              <h3>🚚 Gán Shipper - Hóa đơn #{(selectedBill._id || '').slice(-8)}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowShipperModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="bill-info">
                <p><strong>👤 Khách hàng:</strong> {lookupUser(selectedBill.user_id)}</p>
                <p><strong>📍 Địa chỉ:</strong> {lookupAddress(selectedBill.address_id)}</p>
                <p><strong>💰 Tổng tiền:</strong> {(Number(selectedBill.total) || 0).toLocaleString('vi-VN')} đ</p>
                <p><strong>📊 Trạng thái:</strong> <span style={{ color: STATUS_COLORS[selectedBill.status] }}>📦 {STATUS_LABELS[selectedBill.status]}</span></p>
              </div>
              
              <div className="shipper-list">
                <h4>🚚 Chọn Shipper:</h4>
                {shippers.filter(s => s.is_online).length > 0 ? (
                  shippers.filter(s => s.is_online).map(shipper => (
                    <div key={shipper._id} className="shipper-item">
                      <div className="shipper-info">
                        <div className="shipper-details">
                          <span className="shipper-name">👤 {shipper.full_name || shipper.name || shipper.username}</span>
                          <span className="shipper-phone">📞 {shipper.phone || 'N/A'}</span>
                        </div>
                        <span className="online-status online">
                          🟢 Online
                        </span>
                      </div>
                      <button
                        className="assign-btn"
                        onClick={() => assignShipperAndStartShipping(selectedBill._id, shipper._id)}
                      >
                        🚀 Gán & Giao hàng
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="no-shipper">
                    <span style={{ fontSize: '48px' }}>😴</span>
                    <p>Không có shipper nào đang online</p>
                    <small>Vui lòng thử lại sau hoặc liên hệ shipper để online</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillManagement;