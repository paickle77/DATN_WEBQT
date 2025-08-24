// 🔥 FIXED ShipmentManagement - Sửa quyền Admin và logic nghiệp vụ chặt chẽ
import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

// 🎯 QUẢN LÝ CÁC TRẠNG THÁI GIAO HÀNG - Shipper tự nhận đơn
const SHIPMENT_STATUS = {
  READY: 'ready',           // Sẵn sàng cho shipper nhận
  SHIPPING: 'shipping',     // Shipper đã nhận và đang giao
  DELIVERED: 'delivered',   // Đã giao thành công 
  FAILED: 'failed',         // Giao hàng thất bại
  RETURNED: 'returned'      // Hoàn trả về shop
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.READY]: 'Chờ shipper nhận',
  [SHIPMENT_STATUS.SHIPPING]: 'Đang giao hàng',
  [SHIPMENT_STATUS.DELIVERED]: 'Đã giao xong',
  [SHIPMENT_STATUS.FAILED]: 'Giao thất bại',
  [SHIPMENT_STATUS.RETURNED]: 'Đã hoàn trả'
};

const STATUS_COLORS = {
  [SHIPMENT_STATUS.READY]: '#f59e0b',        // Vàng - chờ nhận
  [SHIPMENT_STATUS.SHIPPING]: '#06b6d4',     // Xanh cyan - đang giao
  [SHIPMENT_STATUS.DELIVERED]: '#10b981',    // Xanh lá - hoàn thành
  [SHIPMENT_STATUS.FAILED]: '#ef4444',       // Đỏ - thất bại
  [SHIPMENT_STATUS.RETURNED]: '#f97316'      // Cam - hoàn trả
};

// Map trạng thái bill sang shipment để hiển thị
const BILL_TO_SHIPMENT_STATUS = {
  'ready': SHIPMENT_STATUS.READY,
  'shipping': SHIPMENT_STATUS.SHIPPING,
  'done': SHIPMENT_STATUS.DELIVERED,
  'failed': SHIPMENT_STATUS.FAILED,
  'returned': SHIPMENT_STATUS.RETURNED
};

export default function ShipmentManagement() {
  const [bills, setBills] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofImages, setSelectedProofImages] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState('');
  
  // 🔥 MODAL XÁC NHẬN HOÀN TRẢ
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnBillId, setReturnBillId] = useState('');
  
  // Thêm auto refresh mỗi 30 giây để cập nhật real-time
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    
    // Auto refresh mỗi 30 giây
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/GetAllBills?enrich=true'),
      api.get('/shippers')
    ]).then(([billsRes, shippersRes]) => {
      const allBills = billsRes.data.data || [];
      const allShippers = shippersRes.data.data || [];
      
      // 🎯 CHỈ LẤY BILLS CÓ TRẠNG THÁI LIÊN QUAN ĐẾN GIAO HÀNG
      const shippingBills = allBills.filter(bill => 
        ['ready', 'shipping', 'done', 'failed', 'returned'].includes(bill.status)
      );
      
      setBills(shippingBills);
      setShippers(allShippers);
      setLoading(false);
    }).catch(err => {
      console.error('Load data error:', err);
      toast.error('Không tải được dữ liệu');
      setLoading(false);
    });
  };

  // 🔒 ADMIN CHỈ CÓ QUYỀN GIỚI HẠN - KHÔNG ĐƯỢC XÁC NHẬN KẾT QUẢ GIAO HÀNG
  const updateBillStatus = (billId, newStatus, additionalData = {}) => {
    // Validate trạng thái hợp lệ cho ADMIN
    const adminAllowedTransitions = {
      'ready': [], // Admin không thể thay đổi ready (chờ shipper tự nhận)
      'shipping': [], // 🔒 ADMIN KHÔNG ĐƯỢC XÁC NHẬN KẾT QUẢ GIAO HÀNG
      'done': [], // Đã hoàn thành, không thể thay đổi
      'failed': ['ready', 'returned'], // Có thể cho về ready để shipper khác nhận hoặc hoàn trả
      'returned': [] // Đã hoàn trả, không thể thay đổi
    };
    
    const currentBill = bills.find(b => b._id === billId);
    if (!currentBill) {
      toast.error('Không tìm thấy đơn hàng');
      return;
    }
    
    const allowedStatuses = adminAllowedTransitions[currentBill.status];
    if (!allowedStatuses.includes(newStatus)) {
      toast.error('Admin không có quyền thực hiện hành động này');
      return;
    }
    
    // 🔥 XỬ LÝ ĐẶC BIỆT CHO TỪNG TRƯỜNG HỢP
    if (newStatus === 'ready') {
      // Cho shipper khác nhận
      const confirmMsg = `Bạn có chắc chắn muốn đưa đơn hàng #${billId.slice(-8)} về trạng thái chờ?\n\n` +
                       `- Shipper hiện tại sẽ bị hủy gán\n` +
                       `- Đơn hàng sẽ chờ shipper khác tự nhận\n` +
                       `- Lý do: Giao hàng thất bại`;
      
      if (!window.confirm(confirmMsg)) return;
      
      // Xóa thông tin shipper cũ
      const updateData = {
        status: newStatus,
        shipper_id: null,
        assigned_shipper: null,
        shipperName: null,
        shipperPhone: null,
        failed_reason: additionalData.reason || 'Được chuyển lại từ trạng thái thất bại',
        admin_note: `Admin đưa về trạng thái chờ lúc ${new Date().toLocaleString('vi-VN')}`
      };
      
      api.put(`/bills/${billId}`, updateData)
         .then(() => {
           toast.success('Đã đưa đơn hàng về trạng thái chờ shipper khác nhận');
           loadData();
         })
         .catch(err => {
           console.error(err);
           toast.error('Lỗi khi cập nhật: ' + (err.response?.data?.message || err.message));
         });
         
    } else if (newStatus === 'returned') {
      // Mở modal xác nhận hoàn trả
      setReturnBillId(billId);
      setReturnReason('');
      setShowReturnModal(true);
    }
  };

  // 🔥 XỬ LÝ HOÀN TRẢ VỀ SHOP
  const handleReturnToShop = () => {
    if (!returnReason.trim()) {
      toast.error('Vui lòng nhập lý do hoàn trả');
      return;
    }
    
    const currentBill = bills.find(b => b._id === returnBillId);
    if (!currentBill) {
      toast.error('Không tìm thấy đơn hàng');
      return;
    }
    
    const updateData = {
      status: 'returned',
      return_reason: returnReason,
      return_date: new Date().toISOString(),
      admin_note: `Admin hoàn trả về shop lúc ${new Date().toLocaleString('vi-VN')}`,
      // Giữ nguyên thông tin shipper để truy xuất
      returned_from_shipper: currentBill.shipper_id,
      returned_from_status: currentBill.status
    };
    
    api.put(`/bills/${returnBillId}`, updateData)
       .then(() => {
         toast.success('Đã hoàn trả đơn hàng về shop');
         setShowReturnModal(false);
         setReturnBillId('');
         setReturnReason('');
         loadData();
         
         // 🔥 CÓ THỂ THÊM API THÔNG BÁO CHO SHOP
         // notifyShopAboutReturn(returnBillId, returnReason);
       })
       .catch(err => {
         console.error(err);
         toast.error('Lỗi khi hoàn trả: ' + (err.response?.data?.message || err.message));
       });
  };

  // 🔥 TÍNH THỜI GIAN GIAO HÀNG - DÙNG ĐỂ CẢNH BÁO
  const getShippingDuration = (shippingStartTime) => {
    if (!shippingStartTime) return 'N/A';
    const now = new Date();
    const start = new Date(shippingStartTime);
    const diffHours = Math.floor((now - start) / (1000 * 60 * 60));
    const diffMinutes = Math.floor(((now - start) % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) return `${diffMinutes} phút`;
    return `${diffHours}h ${diffMinutes}m`;
  };

  // 🚨 KIỂM TRA GIAO HÀNG QUÁ LÂU
  const isShippingTooLong = (shippingStartTime) => {
    if (!shippingStartTime) return false;
    const now = new Date();
    const start = new Date(shippingStartTime);
    const diffHours = (now - start) / (1000 * 60 * 60);
    return diffHours > 3; // Cảnh báo nếu giao hàng hơn 3 tiếng
  };

  // ... (giữ nguyên các hàm khác: handleViewProofImages, getCustomerInfo, etc.)
  
  const handleViewProofImages = (bill) => {
    const images = getProofImageList(bill);
    if (!images.length) return toast.warning('Đơn hàng này chưa có ảnh minh chứng');
    setSelectedProofImages(images);
    setSelectedBillId(bill._id);
    setShowProofModal(true);
  };

  const getCustomerInfo = (bill) => ({
    name: bill.customerName || 'Khách hàng không rõ',
    phone: bill.customerPhone || ''
  });

  const getDeliveryInfo = (bill) => ({
    name: bill.deliveryName || 'Chưa có tên người nhận',
    phone: bill.deliveryPhone || 'Chưa có SĐT',
    address: bill.deliveryAddress || 'Chưa có địa chỉ giao hàng'
  });

  const getShipperInfo = (bill) => {
    if (bill.shipperName) {
      return {
        name: bill.shipperName || 'Chờ shipper nhận',
        phone: bill.shipperPhone || 'N/A',
        isOnline: bill.shipper_id?.is_online || false,
        id: bill.shipper_id?._id || null
      };
    } 
    
    const shipperId = bill.shipper_id || bill.assigned_shipper;
    if (!shipperId) {
      return { name: 'Chờ shipper nhận', phone: 'N/A', isOnline: false, id: null };
    }

    const shipper = shippers.find(s => s._id === shipperId);
    return shipper ? {
      name: shipper.full_name || shipper.name,
      phone: shipper.phone,
      isOnline: shipper.is_online,
      id: shipper._id
    } : { name: 'N/A', phone: 'N/A', isOnline: false, id: shipperId };
  };

  const calculateFinancialInfo = (bill) => {
    const itemsSubtotal = Number(bill.original_total) || 0;
    const shippingFee = Number(bill.shipping_fee) || 0;
    const discountAmount = Number(bill.discount_amount) || 0;
    const finalTotal = Number(bill.total) || 0;
    const calculatedTotal = itemsSubtotal + shippingFee - discountAmount;
    const isFormulaCorrect = Math.abs(calculatedTotal - finalTotal) < 1;

    return {
      itemsSubtotal,
      shippingFee,
      discountAmount,
      finalTotal,
      calculatedTotal,
      isFormulaCorrect,
      itemsSubtotal_formatted: itemsSubtotal.toLocaleString('vi-VN') + ' đ',
      shippingFee_formatted: shippingFee.toLocaleString('vi-VN') + ' đ',
      discountAmount_formatted: discountAmount.toLocaleString('vi-VN') + ' đ',
      finalTotal_formatted: finalTotal.toLocaleString('vi-VN') + ' đ'
    };
  };

  const hasProofImages = (bill) => {
    const v = bill?.proof_images;
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return false;
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) && arr.length > 0;
        } catch { return false; }
      }
      if (s.startsWith('data:image')) return true;
      if (s.includes(',')) {
        const arr = s.split(',').map(x => x.trim()).filter(Boolean);
        return arr.length > 0;
      }
    }
    return false;
  };

  const getProofImageList = (bill) => {
    const v = bill?.proof_images;
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return [];
      if (s.startsWith('[')) {
        try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr.filter(Boolean) : []; }
        catch { return []; }
      }
      if (s.startsWith('data:image')) return [s];
      if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
    }
    return [];
  };

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const displayStatus = BILL_TO_SHIPMENT_STATUS[bill.status] || bill.status;
    
    if (filterStatus !== 'all' && displayStatus !== filterStatus) {
      return false;
    }
    
    if (searchTerm) {
      const billId = bill._id || '';
      const customerInfo = getCustomerInfo(bill);
      const deliveryInfo = getDeliveryInfo(bill);
      const shipperInfo = getShipperInfo(bill);
      const searchLower = searchTerm.toLowerCase();
      
      return billId.toLowerCase().includes(searchLower) || 
             customerInfo.name.toLowerCase().includes(searchLower) ||
             customerInfo.phone.toLowerCase().includes(searchLower) ||
             deliveryInfo.name.toLowerCase().includes(searchLower) ||
             deliveryInfo.phone.toLowerCase().includes(searchLower) ||
             shipperInfo.name.toLowerCase().includes(searchLower);
    }
    
    return true;
  });

  // Tính stats
  const stats = {
    ready: bills.filter(b => b.status === 'ready').length,
    shipping: bills.filter(b => b.status === 'shipping').length,
    delivered: bills.filter(b => b.status === 'done').length,
    failed: bills.filter(b => b.status === 'failed').length,
    returned: bills.filter(b => b.status === 'returned').length,
    onlineShippers: shippers.filter(s => s.is_online).length,
    withProof: bills.filter(b => ['done', 'failed'].includes(b.status) && hasProofImages(b)).length,
    shippingTooLong: bills.filter(b => b.status === 'shipping' && isShippingTooLong(b.updated_at)).length
  };

  const getOrderAge = (createdAt) => {
    if (!createdAt) return '';
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Vừa tạo';
    if (diffHours < 24) return `${diffHours}h trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  if (loading) {
    return (
      <div className="shipment-management">
        <TabBarr />
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span style={{ fontSize: '48px' }}>⏳</span>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shipment-management">
      <TabBarr />
      
      <div className="shipment-content">
        <div className="header-section">
          <div className="header-icon">
            <span style={{ fontSize: '48px' }}>🚚</span>
          </div>
          <div className="header-content">
            <h1>Giám sát Giao hàng</h1>
            <p className="subtitle">Theo dõi các đơn hàng trong quá trình giao hàng - Admin chỉ giám sát, không can thiệp</p>
            <div className="admin-permission-note">
              <small style={{ color: '#ef4444', fontWeight: '600' }}>
                🔒 Lưu ý: Admin không được xác nhận kết quả giao hàng - chỉ có Shipper mới có quyền này
              </small>
            </div>
            <div className="auto-refresh-control">
              <label>
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.value)}
                />
                🔄 Tự động cập nhật mỗi 30s
              </label>
            </div>
          </div>
        </div>

        {/* Stats với cảnh báo giao hàng quá lâu */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.ready }}>⏳</div>
            <div className="stat-info">
              <span className="stat-number">{stats.ready}</span>
              <span className="stat-label">Chờ nhận</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.shipping }}>🚚</div>
            <div className="stat-info">
              <span className="stat-number">{stats.shipping}</span>
              <span className="stat-label">Đang giao</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.delivered }}>✅</div>
            <div className="stat-info">
              <span className="stat-number">{stats.delivered}</span>
              <span className="stat-label">Đã giao xong</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.failed }}>❌</div>
            <div className="stat-info">
              <span className="stat-number">{stats.failed}</span>
              <span className="stat-label">Giao thất bại</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.returned }}>📦</div>
            <div className="stat-info">
              <span className="stat-number">{stats.returned}</span>
              <span className="stat-label">Đã hoàn trả</span>
            </div>
          </div>

          {/* 🚨 Cảnh báo giao hàng quá lâu */}
          {stats.shippingTooLong > 0 && (
            <div className="stat-card warning">
              <div className="stat-icon" style={{ backgroundColor: '#dc2626' }}>🚨</div>
              <div className="stat-info">
                <span className="stat-number">{stats.shippingTooLong}</span>
                <span className="stat-label">Giao quá lâu</span>
              </div>
            </div>
          )}
        </div>

        {/* Cảnh báo */}
        {(stats.shippingTooLong > 0 || bills.filter(b => b.status === 'ready').some(b => {
          const hours = Math.floor((new Date() - new Date(b.created_at)) / (1000 * 60 * 60));
          return hours >= 2;
        })) && (
          <div className="alert-section">
            {stats.shippingTooLong > 0 && (
              <div className="alert-card error">
                <span className="alert-icon">🚨</span>
                <div className="alert-content">
                  <h4>Cảnh báo: {stats.shippingTooLong} đơn hàng giao quá lâu!</h4>
                  <p>Các đơn hàng đang giao hơn 3 tiếng. Hãy liên hệ với shipper để kiểm tra tình hình.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters - giữ nguyên */}
        <div className="filters-section">
          <div className="filter-group">
            <label>📊 Trạng thái:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>🔍 Tìm kiếm:</label>
            <input
              type="text"
              placeholder="Mã đơn, tên khách hàng, người nhận, SĐT, tên shipper..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>

          <button onClick={loadData} className="refresh-btn">🔄 Làm mới</button>
        </div>

        {/* Table với actions được sửa */}
        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách đơn hàng giao hàng ({filteredBills.length})</h3>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>📋 Đơn hàng</th>
                  <th>👤 Khách hàng</th>
                  <th>📦 Người nhận</th>
                  <th>📞 Liên hệ</th>
                  <th>📍 Địa chỉ</th>
                  <th>💰 Tiền hàng</th>
                  <th>🚛 Phí ship</th>
                  <th>🎯 Giảm giá</th>
                  <th>💵 Tổng tiền</th>
                  <th>👨‍💼 Shipper</th>
                  <th>📊 Trạng thái</th>
                  <th>📸 Minh chứng</th>
                  <th>⏰ Thời gian</th>
                  <th>⚙️ Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, i) => {
                  const customerInfo = getCustomerInfo(bill);
                  const deliveryInfo = getDeliveryInfo(bill);
                  const shipperInfo = getShipperInfo(bill);
                  const financialInfo = calculateFinancialInfo(bill);
                  const displayStatus = BILL_TO_SHIPMENT_STATUS[bill.status] || bill.status;
                  const orderAge = getOrderAge(bill.created_at);
                  const hasProof = hasProofImages(bill);
                  const allowProof = [SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.FAILED].includes(displayStatus);

                  return (
                    <tr key={bill._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      
                      <td className="bill-info">
                        <div className="bill-details">
                          <div className="bill-id">#{bill._id.slice(-8)}</div>
                          <div className="bill-date">
                            {bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                          </div>
                        </div>
                      </td>
                      
                      <td className="customer-info">
                        <div className="customer-details">
                          <span className="customer-name">{customerInfo.name}</span>
                          {customerInfo.phone && (
                            <a href={`tel:${customerInfo.phone}`} className="customer-phone">
                              📞 {customerInfo.phone}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="delivery-info">
                        <span className="delivery-name">{deliveryInfo.name}</span>
                      </td>

                      <td className="contact-info">
                        {deliveryInfo.phone !== 'Chưa có SĐT' && (
                          <a href={`tel:${deliveryInfo.phone}`} className="phone-link">
                            📞 {deliveryInfo.phone}
                          </a>
                        )}
                      </td>
                      
                      <td className="address-info">
                        <span className="address-text" title={deliveryInfo.address}>
                          {deliveryInfo.address.length > 50 
                            ? deliveryInfo.address.substring(0, 50) + '...' 
                            : deliveryInfo.address}
                        </span>
                      </td>

                      {/* Các cột tài chính */}
                      <td className="subtotal-cell">
                        <span className="money-amount">
                          {financialInfo.itemsSubtotal_formatted}
                        </span>
                      </td>

                      <td className="shipping-fee-cell">
                        <span className="money-amount">
                          {financialInfo.shippingFee_formatted}
                        </span>
                      </td>

                      <td className="discount-cell">
                        <span className="discount-amount" style={{
                          color: financialInfo.discountAmount > 0 ? '#dc2626' : '#6b7280'
                        }}>
                          {financialInfo.discountAmount > 0 ? (
                            `-${financialInfo.discountAmount_formatted}`
                          ) : (
                            '0 đ'
                          )}
                        </span>
                      </td>

                      <td className="total-cell">
                        <span className="total-amount">
                          {financialInfo.finalTotal_formatted}
                        </span>
                      </td>
                      
                      <td className="shipper-info">
                        <div className="shipper-display">
                          <div className="shipper-main">
                            <span className="shipper-name">
                              {shipperInfo.name}
                              {shipperInfo.name !== 'Chờ shipper nhận' && (
                                <span className={`online-status ${shipperInfo.isOnline ? 'online' : 'offline'}`}>
                                  {shipperInfo.isOnline ? ' 🟢' : ' 🔴'}
                                </span>
                              )}
                            </span>
                            {shipperInfo.phone !== 'N/A' && (
                              <a href={`tel:${shipperInfo.phone}`} className="shipper-phone">
                                📞 {shipperInfo.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="status-cell">
                        <div 
                          className="status-badge" 
                          style={{ 
                            backgroundColor: STATUS_COLORS[displayStatus] || '#6b7280',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {STATUS_LABELS[displayStatus] || displayStatus}
                        </div>
                        {displayStatus === SHIPMENT_STATUS.SHIPPING && isShippingTooLong(bill.updated_at) && (
                          <div className="shipping-warning">
                            <small style={{ color: '#dc2626', fontWeight: '600' }}>
                              🚨 Giao quá lâu!
                            </small>
                          </div>
                        )}
                      </td>

                      {/* Cột ảnh minh chứng */}
                      <td className="proof-images-cell">
                        <div className="proof-display">
                          {allowProof && hasProof ? (
                            <div className="proof-inline">
                              {(() => {
                                const imgs = getProofImageList(bill);
                                const first = imgs[0];
                                return (
                                  <>
                                    <div className="thumb-wrapper" onClick={() => handleViewProofImages(bill)} title="Bấm để xem ảnh lớn">
                                      <img className="proof-thumb" src={first} alt="Thumbnail minh chứng" />
                                      {imgs.length > 1 && <span className="thumb-badge">+{imgs.length - 1}</span>}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          ) : allowProof && !hasProof ? (
                            <span className="proof-status no-proof">📷 Chưa có ảnh</span>
                          ) : (
                            <span className="proof-status pending">⏳ Chờ giao xong</span>
                          )}
                        </div>
                      </td>

                      <td className="time-info">
                        <div className="time-display">
                          <div className="order-age">{orderAge}</div>
                          {displayStatus === SHIPMENT_STATUS.SHIPPING && (
                            <div className="shipping-duration">
                              <small style={{ color: isShippingTooLong(bill.updated_at) ? '#dc2626' : '#06b6d4' }}>
                                Giao: {getShippingDuration(bill.updated_at)}
                              </small>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {/* 🔒 ADMIN CHỈ CÓ QUYỀN GIÁM SÁT - KHÔNG CAN THIỆP TRỰC TIẾP */}
                          
                          {displayStatus === SHIPMENT_STATUS.READY && (
                            <div className="readonly-notice">
                              <small style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                ⏳ Chờ shipper tự nhận
                              </small>
                            </div>
                          )}
                          
                          {displayStatus === SHIPMENT_STATUS.SHIPPING && (
                            <div className="shipping-monitor">
                              <div className="readonly-notice">
                                <small style={{ 
                                  color: isShippingTooLong(bill.updated_at) ? '#dc2626' : '#06b6d4', 
                                  fontStyle: 'italic' 
                                }}>
                                  {isShippingTooLong(bill.updated_at) ? '🚨 Giao quá lâu!' : '🚚 Shipper đang giao'}
                                </small>
                              </div>
                              
                              {/* Chỉ cho phép liên hệ shipper */}
                              {shipperInfo.phone !== 'N/A' && (
                                <a href={`tel:${shipperInfo.phone}`} className="action-btn btn-call">
                                  📞 Gọi shipper
                                </a>
                              )}
                              
                              {/* Cảnh báo nếu giao quá lâu */}
                              {isShippingTooLong(bill.updated_at) && (
                                <button
                                  className="action-btn btn-urgent"
                                  onClick={() => {
                                    const message = `Đơn hàng #${bill._id.slice(-8)} đang giao quá lâu (${getShippingDuration(bill.updated_at)})!\n` +
                                      `Shipper: ${shipperInfo.name} - ${shipperInfo.phone}\n` +
                                      `Địa chỉ giao: ${deliveryInfo.address}`;
                                    navigator.clipboard.writeText(message);
                                    toast.warning('Đã copy thông tin đơn giao quá lâu để báo cáo!');
                                  }}
                                  style={{ backgroundColor: '#dc2626', fontSize: '11px' }}
                                  title="Copy thông tin để báo cáo cấp trên"
                                >
                                  📋 Báo cáo
                                </button>
                              )}
                            </div>
                          )}

                          {displayStatus === SHIPMENT_STATUS.DELIVERED && (
                            <div className="readonly-notice">
                              <small style={{ color: '#10b981', fontStyle: 'italic' }}>
                                ✅ Đã giao thành công
                              </small>
                            </div>
                          )}
                          
                          {/* 🔥 CHỈ KHI GIAO THẤT BẠI MỚI CHO ADMIN CÓ QUYỀN HÀNH ĐỘNG */}
                          {displayStatus === SHIPMENT_STATUS.FAILED && (
                            <div className="failed-actions">
                              <div className="failed-notice">
                                <small style={{ color: '#ef4444', fontWeight: '600' }}>
                                  ❌ Giao thất bại - Cần xử lý
                                </small>
                              </div>
                              
                              <button
                                className="action-btn btn-retry"
                                onClick={() => updateBillStatus(bill._id, 'ready', { reason: 'Chuyển lại cho shipper khác' })}
                                style={{ backgroundColor: '#06b6d4', fontSize: '11px', margin: '2px' }}
                                title="Đưa về trạng thái chờ để shipper khác có thể nhận"
                              >
                                🔄 Cho shipper khác
                              </button>
                              
                              <button
                                className="action-btn btn-return"
                                onClick={() => updateBillStatus(bill._id, 'returned')}
                                style={{ backgroundColor: '#f97316', fontSize: '11px', margin: '2px' }}
                                title="Hoàn trả đơn hàng về shop"
                              >
                                📦 Hoàn trả shop
                              </button>
                            </div>
                          )}

                          {displayStatus === SHIPMENT_STATUS.RETURNED && (
                            <div className="readonly-notice">
                              <small style={{ color: '#f97316', fontStyle: 'italic' }}>
                                📦 Đã hoàn trả về shop
                              </small>
                              {bill.return_reason && (
                                <div className="return-reason" title={bill.return_reason}>
                                  <small style={{ color: '#6b7280' }}>
                                    Lý do: {bill.return_reason.length > 20 ? 
                                      bill.return_reason.substring(0, 20) + '...' : 
                                      bill.return_reason}
                                  </small>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Xem ảnh minh chứng cho đơn đã giao hoặc thất bại */}
                          {allowProof && hasProof && (
                            <button
                              className="action-btn btn-proof"
                              onClick={() => handleViewProofImages(bill)}
                              style={{ backgroundColor: '#8b5cf6', fontSize: '11px', margin: '2px' }}
                              title="Xem ảnh minh chứng giao hàng"
                            >
                              📸 Xem ảnh
                            </button>
                          )}

                          {/* Copy thông tin */}
                          <button
                            className="action-btn btn-copy"
                            onClick={() => {
                              const info = `Đơn hàng #${bill._id.slice(-8)}\n` +
                                         `Khách: ${customerInfo.name} - ${customerInfo.phone}\n` +
                                         `Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n` +
                                         `Địa chỉ: ${deliveryInfo.address}\n` +
                                         `Tổng tiền: ${financialInfo.finalTotal_formatted}\n` +
                                         `Shipper: ${shipperInfo.name}${shipperInfo.phone !== 'N/A' ? ' - ' + shipperInfo.phone : ''}\n` +
                                         `Trạng thái: ${STATUS_LABELS[displayStatus]}\n` +
                                         `${displayStatus === SHIPMENT_STATUS.SHIPPING ? 'Thời gian giao: ' + getShippingDuration(bill.updated_at) : ''}`;
                              navigator.clipboard.writeText(info);
                              toast.success('Đã copy thông tin!');
                            }}
                            style={{ backgroundColor: '#6b7280', fontSize: '10px', margin: '2px' }}
                            title="Copy thông tin đơn hàng"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan="15" className="no-data">
                      <div className="no-data-content">
                        <span style={{ fontSize: '48px', opacity: 0.3 }}>📦</span>
                        <p>Không có đơn hàng nào</p>
                        <small>Các đơn hàng sẽ xuất hiện ở đây khi có trạng thái giao hàng</small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal xác nhận hoàn trả */}
      {showReturnModal && (
        <div className="return-modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="return-modal" onClick={(e) => e.stopPropagation()}>
            <div className="return-modal-header">
              <h3>📦 Xác nhận hoàn trả về shop</h3>
              <button 
                className="close-btn"
                onClick={() => setShowReturnModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="return-modal-content">
              <div className="return-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <h4>Lưu ý quan trọng:</h4>
                  <ul>
                    <li>Đơn hàng sẽ được chuyển về shop để xử lý</li>
                    <li>Khách hàng có thể được hoàn tiền hoặc giao lại</li>
                    <li>Hành động này không thể hoàn tác</li>
                  </ul>
                </div>
              </div>

              <div className="return-form">
                <label htmlFor="return-reason">
                  <strong>Lý do hoàn trả: <span style={{color: '#ef4444'}}>*</span></strong>
                </label>
                <textarea
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Nhập lý do hoàn trả (bắt buộc)..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                
                <div className="reason-suggestions">
                  <small>Gợi ý lý do:</small>
                  <div className="suggestion-buttons">
                    {[
                      'Giao hàng thất bại nhiều lần',
                      'Khách hàng từ chối nhận hàng',
                      'Địa chỉ giao hàng không chính xác',
                      'Shipper không thể liên hệ được khách',
                      'Sản phẩm bị hỏng trong quá trình vận chuyển',
                      'Khách hàng yêu cầu hủy đơn'
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReturnReason(suggestion)}
                        className="suggestion-btn"
                        style={{
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          padding: '4px 8px',
                          margin: '2px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="return-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowReturnModal(false)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button 
                className="confirm-return-btn"
                onClick={handleReturnToShop}
                disabled={!returnReason.trim()}
                style={{
                  background: returnReason.trim() ? '#f97316' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: returnReason.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                📦 Xác nhận hoàn trả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị ảnh minh chứng */}
      {showProofModal && (
        <div className="proof-modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="proof-modal" onClick={(e) => e.stopPropagation()}>
            <div className="proof-modal-header">
              <h3>📸 Ảnh minh chứng giao hàng</h3>
              <div className="proof-modal-info">
                <span>Đơn hàng: #{selectedBillId.slice(-8)}</span>
                <span>{selectedProofImages.length} ảnh</span>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowProofModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="proof-modal-content">
              <div className="proof-images-grid">
                {selectedProofImages.map((imageUrl, index) => (
                  <div key={index} className="proof-image-item">
                    <img 
                      src={imageUrl} 
                      alt={`Ảnh minh chứng ${index + 1}`}
                      onError={(e) => {
                        e.target.src = '/placeholder-image.png';
                        e.target.alt = 'Không thể tải ảnh';
                      }}
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                    <div className="image-actions">
                      <button 
                        className="download-btn"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = `minh-chung-${selectedBillId.slice(-8)}-${index + 1}`;
                          link.click();
                        }}
                      >
                        💾 Tải về
                      </button>
                      <button 
                        className="view-btn"
                        onClick={() => window.open(imageUrl, '_blank')}
                      >
                        👁️ Xem lớn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedProofImages.length === 0 && (
                <div className="no-proof-images">
                  <span style={{ fontSize: '48px', opacity: 0.3 }}>📷</span>
                  <p>Không có ảnh minh chứng</p>
                </div>
              )}
            </div>
            
            <div className="proof-modal-footer">
              <button 
                className="close-modal-btn"
                onClick={() => setShowProofModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}