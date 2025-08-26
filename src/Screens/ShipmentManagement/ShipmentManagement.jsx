// 🔥 FIXED ShipmentManagement - Chỉ giám sát 3 trạng thái: ready, shipping, delivered
// Loại bỏ failed và returned vì đã chuyển sang RefundManagement

import React, { useEffect, useState } from 'react';
import './ShipmentManagement.scss';
import api from '../../utils/api';
import TabBar from '../../component/tabbar/TabBar';

// 🎯 QUẢN LÝ CÁC TRẠNG THÁI GIAO HÀNG - Chỉ giám sát
const SHIPMENT_STATUS = {
  READY: 'ready',           // Sẵn sàng cho shipper nhận
  SHIPPING: 'shipping',     // Shipper đã nhận và đang giao
  DELIVERED: 'delivered'    // Đã giao thành công 
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.READY]: 'Chờ shipper nhận',
  [SHIPMENT_STATUS.SHIPPING]: 'Đang giao hàng',
  [SHIPMENT_STATUS.DELIVERED]: 'Đã giao xong'
};

const STATUS_COLORS = {
  [SHIPMENT_STATUS.READY]: '#f59e0b',        // Vàng - chờ nhận
  [SHIPMENT_STATUS.SHIPPING]: '#06b6d4',     // Xanh cyan - đang giao
  [SHIPMENT_STATUS.DELIVERED]: '#10b981'     // Xanh lá - hoàn thành
};

// Map trạng thái bill sang shipment để hiển thị
const BILL_TO_SHIPMENT_STATUS = {
  'ready': SHIPMENT_STATUS.READY,
  'shipping': SHIPMENT_STATUS.SHIPPING,
  'done': SHIPMENT_STATUS.DELIVERED
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
      api.get('/bills/enhanced?enrich=true'),
      api.get('/shippers')
    ]).then(([billsRes, shippersRes]) => {
      const allBills = billsRes.data.data || [];
      const allShippers = shippersRes.data.data || [];
      
      // 🎯 CHỈ LẤY BILLS CÓ TRẠNG THÁI LIÊN QUAN ĐẾN GIAO HÀNG
      // Loại bỏ failed và returned vì đã chuyển sang RefundManagement
      const shippingBills = allBills.filter(bill => 
        ['ready', 'shipping', 'done'].includes(bill.status)
      );
      
      setBills(shippingBills);
      setShippers(allShippers);
      setLoading(false);
    }).catch(err => {
      console.error('Load data error:', err);
      alert('Không tải được dữ liệu');
      setLoading(false);
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

  const handleViewProofImages = (bill) => {
    const images = getProofImageList(bill);
    if (!images.length) {
      alert('Không có ảnh minh chứng');
      return;
    }
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
        name: bill.shipperName,
        phone: bill.shipperPhone || 'N/A',
        isOnline: true,
        id: bill.shipper_id || 'N/A'
      };
    } 
    
    const shipperId = bill.shipper_id || bill.assigned_shipper;
    if (!shipperId) {
      return { name: 'Chưa gán shipper', phone: 'N/A', isOnline: false, id: null };
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
      return s.length > 0 && s !== '[]' && s !== 'null';
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
    onlineShippers: shippers.filter(s => s.is_online).length,
    withProof: bills.filter(b => ['done'].includes(b.status) && hasProofImages(b)).length,
    shippingTooLong: bills.filter(b => b.status === 'shipping' && isShippingTooLong(b.updated_at)).length
  };

  const getOrderAge = (createdAt) => {
    if (!createdAt) return 'N/A';
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Vừa tạo';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  if (loading) {
    return (
      <div className="shipment-management">
        <TabBar />
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <span style={{ fontSize: '48px' }}>⏳</span>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shipment-management">
      <TabBar />
      
      <div className="shipment-content">
        <div className="header-section">
          <div className="header-icon">
            <span style={{ fontSize: '48px' }}>🚚</span>
          </div>
          <div className="header-content">
            <h1>Giám sát Giao hàng</h1>
            <p className="subtitle">Theo dõi các đơn hàng trong quá trình giao hàng - Admin chỉ giám sát</p>
            <div className="admin-permission-note">
              <small style={{ color: '#ef4444', fontWeight: '600' }}>
                🔒 Lưu ý: Admin chỉ giám sát 3 trạng thái: Chờ nhận → Đang giao → Đã giao xong
              </small>
              <br />
              <small style={{ color: '#6b7280' }}>
                ℹ️ Các trạng thái "failed" và "returned" đã được chuyển sang RefundManagement
              </small>
            </div>
            <div className="auto-refresh-control">
              <label>
                <input 
                  type="checkbox" 
                  checked={autoRefresh} 
                  onChange={(e) => setAutoRefresh(e.target.checked)}
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

        {/* Filters */}
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

        {/* Table */}
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
                  <th>⚙️ Admin</th>
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
                  const allowProof = [SHIPMENT_STATUS.DELIVERED].includes(displayStatus);

                  return (
                    <tr key={bill._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      
                      <td className="bill-info">
                        <div className="bill-details">
                          <div className="bill-id">#{bill._id.slice(-8)}</div>
                          <div className="bill-date">
                            {bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                          </div>
                          <div className="order-age" style={{ color: '#6b7280', fontSize: '11px' }}>
                            {orderAge}
                          </div>
                        </div>
                      </td>

                      <td className="customer-info">
                        <div className="customer-details">
                          <div className="customer-name">{customerInfo.name}</div>
                          {customerInfo.phone && (
                            <a href={`tel:${customerInfo.phone}`} className="customer-phone">
                              📞 {customerInfo.phone}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="delivery-info">
                        <div className="delivery-details">
                          <div className="delivery-name">{deliveryInfo.name}</div>
                        </div>
                      </td>

                      <td className="contact-info">
                        {deliveryInfo.phone !== 'Chưa có SĐT' && (
                          <a href={`tel:${deliveryInfo.phone}`} className="delivery-phone">
                            📞 {deliveryInfo.phone}
                          </a>
                        )}
                      </td>

                      <td className="address-info">
                        <div className="delivery-address" title={deliveryInfo.address}>
                          {deliveryInfo.address.length > 30 ? 
                            deliveryInfo.address.substring(0, 30) + '...' : 
                            deliveryInfo.address}
                        </div>
                      </td>

                      <td className="financial-info">
                        <div className="amount-display">
                          {financialInfo.itemsSubtotal_formatted}
                        </div>
                      </td>

                      <td className="financial-info">
                        <div className="amount-display">
                          {financialInfo.shippingFee_formatted}
                        </div>
                      </td>

                      <td className="financial-info">
                        <div className="amount-display" style={{ color: financialInfo.discountAmount > 0 ? '#ef4444' : '#6b7280' }}>
                          -{financialInfo.discountAmount_formatted}
                        </div>
                      </td>

                      <td className="financial-info">
                        <div className="amount-display" style={{ fontWeight: '600', color: '#059669' }}>
                          {financialInfo.finalTotal_formatted}
                        </div>
                        {!financialInfo.isFormulaCorrect && (
                          <div style={{ fontSize: '10px', color: '#ef4444' }}>⚠️ Không khớp</div>
                        )}
                      </td>

                      <td className="shipper-info">
                        <div className="shipper-details">
                          <div className="shipper-name">
                            {shipperInfo.isOnline && <span className="online-indicator">🟢</span>}
                            {shipperInfo.name}
                          </div>
                          {shipperInfo.phone !== 'N/A' && (
                            <a href={`tel:${shipperInfo.phone}`} className="shipper-phone">
                              📞 {shipperInfo.phone}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="status-info">
                        <span 
                          className="status-badge" 
                          style={{ 
                            backgroundColor: STATUS_COLORS[displayStatus] || '#6b7280',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {STATUS_LABELS[displayStatus] || displayStatus}
                        </span>
                        {displayStatus === SHIPMENT_STATUS.SHIPPING && isShippingTooLong(bill.updated_at) && (
                          <div className="shipping-warning" style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>
                            ⚠️ {getShippingDuration(bill.updated_at)}
                          </div>
                        )}
                      </td>

                      <td className="proof-info">
                        {hasProof ? (
                          <span style={{ color: '#10b981', fontSize: '12px' }}>✅ Có ảnh</span>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>❌ Không có</span>
                        )}
                      </td>

                      <td className="time-info">
                        <div className="time-details">
                          {bill.created_at && (
                            <div className="created-time">
                              <small>Tạo: {new Date(bill.created_at).toLocaleString('vi-VN')}</small>
                            </div>
                          )}
                          {bill.updated_at && (
                            <div className="updated-time">
                              <small>Cập nhật: {new Date(bill.updated_at).toLocaleString('vi-VN')}</small>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="actions-cell">
                        {/* ADMIN CHỈ ĐƯỢC QUAN SÁT */}
                        <div className="readonly-notice">
                          <small style={{ color: '#6b7280', fontStyle: 'italic' }}>
                            👁️ Chỉ quan sát
                          </small>
                        </div>

                        {/* Xem ảnh minh chứng cho đơn đã giao */}
                        {allowProof && hasProof && (
                          <button
                            className="action-btn btn-proof"
                            onClick={() => handleViewProofImages(bill)}
                            style={{ backgroundColor: '#8b5cf6', fontSize: '11px', margin: '2px', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xem ảnh minh chứng giao hàng"
                          >
                            📸 Xem ảnh
                          </button>
                        )}
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

      {/* Modal xem ảnh minh chứng */}
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
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjYzljOWM5IiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+4p2M77iPIEzhu5dpIHThuqNpIGFuaDwvdGV4dD48L3N2Zz4=';
                      }}
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                    <div className="image-actions">
                      <button 
                        className="download-btn"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = `proof_${selectedBillId.slice(-8)}_${index + 1}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
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
