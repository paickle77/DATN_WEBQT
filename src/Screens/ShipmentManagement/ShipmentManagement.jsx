// 🔥 UPDATED ShipmentManagement - Sử dụng address_snapshot và breakdown tài chính
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

  // 🔒 CHỈ CHO PHÉP ADMIN CẬP NHẬT TRẠNG THÁI, KHÔNG GÁN SHIPPER
  const updateBillStatus = (billId, newStatus) => {
    // Validate trạng thái hợp lệ
    const validTransitions = {
      'ready': [], // Admin không thể thay đổi ready (chờ shipper tự nhận)
      'shipping': ['done', 'failed'], // Admin chỉ có thể xác nhận kết quả
      'done': [], // Đã hoàn thành, không thể thay đổi
      'failed': ['ready', 'returned'], // Có thể cho về ready để shipper khác nhận hoặc hoàn trả
      'returned': [] // Đã hoàn trả, không thể thay đổi
    };
    
    const currentBill = bills.find(b => b._id === billId);
    if (!currentBill) {
      toast.error('Không tìm thấy đơn hàng');
      return;
    }
    
    const validStatuses = validTransitions[currentBill.status];
    if (!validStatuses.includes(newStatus)) {
      toast.error('Không thể thay đổi trạng thái này');
      return;
    }
    
    // Xác nhận hành động quan trọng
    if (newStatus === 'returned') {
      if (!window.confirm('Bạn có chắc chắn muốn hoàn trả đơn hàng này về shop?')) {
        return;
      }
    }
    
    const updateData = { status: newStatus };
    
    api.put(`/bills/${billId}`, updateData)
       .then(() => {
         toast.success('Cập nhật trạng thái thành công');
         loadData();
       })
       .catch(err => {
         console.error(err);
         toast.error('Lỗi khi cập nhật: ' + (err.response?.data?.message || err.message));
       });
  };

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

  // Lấy thông tin shipper - CHỈ HIỂN THỊ, KHÔNG CHO CHỈNH SỬA
  const getShipperInfo = (bill) => {
    // Ưu tiên enriched data
    if (bill.shipperName) {
      return {
        name: bill.shipperName || 'Chờ shipper nhận',
        phone: bill.shipperPhone || 'N/A',
        isOnline: bill.shipper_id?.is_online || false,
        id: bill.shipper_id?._id || null
      };
    } 
    
    // Fallback nếu không enrich
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

  // 🔥 LẤY THÔNG TIN TÀI CHÍNH TỪ ENRICHED DATA
  const getFinancialInfo = (bill) => ({
    subtotal: bill.subtotal || 0,
    shippingFee: bill.shippingFee || 0,
    discountAmount: bill.discountAmount || 0,
    finalTotal: bill.finalTotal || bill.total || 0,
    subtotal_formatted: bill.subtotal_formatted || '0 đ',
    shipping_fee_formatted: bill.shipping_fee_formatted || '0 đ',
    discount_formatted: bill.discount_formatted || '0 đ',
    total_formatted: bill.total_formatted || '0 đ'
  });

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const displayStatus = BILL_TO_SHIPMENT_STATUS[bill.status] || bill.status;
    
    // Filter theo trạng thái
    if (filterStatus !== 'all' && displayStatus !== filterStatus) {
      return false;
    }
    
    // Filter theo search term
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
    onlineShippers: shippers.filter(s => s.is_online).length
  };

  // Tính thời gian đơn hàng đang pending
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
            <p className="subtitle">Theo dõi các đơn hàng trong quá trình giao hàng - Shipper tự nhận đơn</p>
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

        {/* Stats Overview */}
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
            <div className="stat-icon" style={{ backgroundColor: '#6b7280' }}>👥</div>
            <div className="stat-info">
              <span className="stat-number">{stats.onlineShippers}</span>
              <span className="stat-label">Shipper online</span>
            </div>
          </div>
        </div>

        {/* Alert cho đơn hàng chờ lâu */}
        {bills.filter(b => b.status === 'ready').some(b => {
          const hours = Math.floor((new Date() - new Date(b.created_at)) / (1000 * 60 * 60));
          return hours >= 2;
        }) && (
          <div className="alert-section">
            <div className="alert-card warning">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <h4>Cảnh báo: Có đơn hàng chờ lâu!</h4>
                <p>
                  {bills.filter(b => {
                    const hours = Math.floor((new Date() - new Date(b.created_at)) / (1000 * 60 * 60));
                    return b.status === 'ready' && hours >= 2;
                  }).length} đơn hàng đã chờ shipper nhận hơn 2 tiếng. 
                  Hãy kiểm tra lại hoặc liên hệ với các shipper.
                </p>
              </div>
            </div>
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

        {/* 🔥 TABLE MỚI VỚI BREAKDOWN TÀI CHÍNH */}
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
                  <th>📍 Địa chỉ giao hàng</th>
                  <th>💰 Tiền hàng</th>
                  <th>🚛 Phí ship</th>
                  <th>💵 Tổng tiền</th>
                  <th>👨‍💼 Shipper</th>
                  <th>📊 Trạng thái</th>
                  <th>⏰ Thời gian</th>
                  <th>⚙️ Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, i) => {
                  const customerInfo = getCustomerInfo(bill);
                  const deliveryInfo = getDeliveryInfo(bill);
                  const shipperInfo = getShipperInfo(bill);
                  const financialInfo = getFinancialInfo(bill);
                  const displayStatus = BILL_TO_SHIPMENT_STATUS[bill.status] || bill.status;
                  const orderAge = getOrderAge(bill.created_at);

                  return (
                    <tr key={bill._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      
                      <td className="bill-info">
                        <div className="bill-details">
                          <div className="bill-id">#{bill._id.slice(-8)}</div>
                          <div className="bill-date">
                            {bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                          </div>
                          <div className="shipping-method">
                            {bill.shippingMethodDisplay || bill.shipping_method || 'N/A'}
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
                        <div className="delivery-details">
                          <span className="delivery-name">{deliveryInfo.name}</span>
                          <span className="delivery-note">Người nhận hàng</span>
                        </div>
                      </td>

                      <td className="contact-info">
                        <div className="contact-details">
                          {deliveryInfo.phone !== 'Chưa có SĐT' && (
                            <a href={`tel:${deliveryInfo.phone}`} className="phone-link">
                              📞 {deliveryInfo.phone}
                            </a>
                          )}
                          {deliveryInfo.phone === 'Chưa có SĐT' && (
                            <span className="no-phone">Chưa có SĐT</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="address-info">
                        <span className="address-text" title={deliveryInfo.address}>
                          {deliveryInfo.address.length > 50 
                            ? deliveryInfo.address.substring(0, 50) + '...' 
                            : deliveryInfo.address}
                        </span>
                      </td>

                      {/* 🔥 CÁC CỘT TÀI CHÍNH RIÊNG BIỆT */}
                      <td className="subtotal-cell">
                        <span className="money-amount">
                          {financialInfo.subtotal_formatted}
                        </span>
                      </td>

                      <td className="shipping-fee-cell">
                        <span className="money-amount">
                          {financialInfo.shipping_fee_formatted}
                        </span>
                      </td>

                      <td className="total-cell">
                        <span className="total-amount">
                          {financialInfo.total_formatted}
                        </span>
                        {financialInfo.discountAmount > 0 && (
                          <span className="discount-note">
                            (Giảm: {financialInfo.discount_formatted})
                          </span>
                        )}
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
                          {bill.statusDisplay || STATUS_LABELS[displayStatus] || displayStatus}
                        </div>
                        {displayStatus === SHIPMENT_STATUS.READY && (
                          <div className="waiting-time">
                            <small style={{ color: '#f59e0b', fontWeight: '500' }}>
                              {orderAge}
                            </small>
                          </div>
                        )}
                      </td>

                      <td className="time-info">
                        <div className="time-display">
                          <div className="order-age">{orderAge}</div>
                          {bill.updated_at && bill.updated_at !== bill.created_at && (
                            <div className="last-update">
                              <small>
                                Cập nhật: {new Date(bill.updated_at).toLocaleString('vi-VN')}
                              </small>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {/* ADMIN CHỈ CÓ THỂ XÁC NHẬN KẾT QUẢ, KHÔNG GÁN SHIPPER */}
                          {displayStatus === SHIPMENT_STATUS.READY && (
                            <div className="readonly-notice">
                              <small style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                Chờ shipper tự nhận
                              </small>
                            </div>
                          )}
                          
                          {displayStatus === SHIPMENT_STATUS.SHIPPING && (
                            <>
                              <button
                                className="action-btn btn-delivered"
                                onClick={() => updateBillStatus(bill._id, 'done')}
                                style={{ backgroundColor: '#10b981' }}
                                title="Xác nhận đã giao thành công"
                              >
                                ✅ Xác nhận giao xong
                              </button>
                              
                              <button
                                className="action-btn btn-failed"
                                onClick={() => updateBillStatus(bill._id, 'failed')}
                                style={{ backgroundColor: '#ef4444' }}
                                title="Báo cáo giao hàng thất bại"
                              >
                                ❌ Báo cáo thất bại
                              </button>
                            </>
                          )}
                          
                          {displayStatus === SHIPMENT_STATUS.FAILED && (
                            <>
                              <button
                                className="action-btn btn-retry"
                                onClick={() => updateBillStatus(bill._id, 'ready')}
                                style={{ backgroundColor: '#06b6d4' }}
                                title="Đưa về trạng thái chờ để shipper khác nhận"
                              >
                                🔄 Cho shipper khác nhận
                              </button>
                              
                              <button
                                className="action-btn btn-return"
                                onClick={() => updateBillStatus(bill._id, 'returned')}
                                style={{ backgroundColor: '#f97316' }}
                                title="Hoàn trả đơn hàng về shop"
                              >
                                📦 Hoàn trả shop
                              </button>
                            </>
                          )}

                          {/* Xem chi tiết - luôn có */}
                          <button
                            className="action-btn btn-detail"
                            onClick={() => window.open(`/admin/bills/${bill._id}`, '_blank')}
                            style={{ backgroundColor: '#667eea' }}
                            title="Xem chi tiết đơn hàng"
                          >
                            👁️ Chi tiết
                          </button>

                          {/* Copy thông tin giao hàng */}
                          <button
                            className="action-btn btn-copy"
                            onClick={() => {
                              const info = `Đơn hàng #${bill._id.slice(-8)}\n` +
                                         `Khách: ${customerInfo.name} - ${customerInfo.phone}\n` +
                                         `Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n` +
                                         `Địa chỉ: ${deliveryInfo.address}\n` +
                                         `Tiền hàng: ${financialInfo.subtotal_formatted}\n` +
                                         `Phí ship: ${financialInfo.shipping_fee_formatted}\n` +
                                         `Tổng tiền: ${financialInfo.total_formatted}`;
                              navigator.clipboard.writeText(info);
                              toast.success('Đã copy thông tin!');
                            }}
                            style={{ backgroundColor: '#8b5cf6' }}
                            title="Copy thông tin giao hàng"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan="13" className="no-data">
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
    </div>
  );
}