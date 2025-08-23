// 🔥 FIXED ShipmentManagement - Sửa logic tài chính đồng bộ với MongoDB
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

  // 🔥 XỬ LÝ ẢNH MINH CHỨNG GIAO HÀNG (ăn đủ: array / JSON array string / single base64 string)
  const handleViewProofImages = (bill) => {
    const images = getProofImageList(bill);
    if (!images.length) return toast.warning('Đơn hàng này chưa có ảnh minh chứng');
    setSelectedProofImages(images);
    setSelectedBillId(bill._id);
    setShowProofModal(true);
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

  // 🔥 FIXED: Tính toán tài chính chính xác từ dữ liệu MongoDB - ĐỒNG BỘ VỚI BillManagement
  const calculateFinancialInfo = (bill) => {
    // 1. TIỀN HÀNG: Ưu tiên original_total từ MongoDB (chính xác nhất)
    const itemsSubtotal = Number(bill.original_total) || 0;

    // 2. PHI SHIP: Từ MongoDB
    const shippingFee = Number(bill.shipping_fee) || 0;

    // 3. GIẢM GIÁ: Từ MongoDB 
    const discountAmount = Number(bill.discount_amount) || 0;

    // 4. TỔNG TIỀN: Từ MongoDB (đã tính sẵn)
    const finalTotal = Number(bill.total) || 0;

    // 5. VERIFICATION: Kiểm tra công thức
    const calculatedTotal = itemsSubtotal + shippingFee - discountAmount;
    const isFormulaCorrect = Math.abs(calculatedTotal - finalTotal) < 1;

    console.log(`💰 Shipment financial calculation for bill ${bill._id.slice(-8)}:`, {
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

  // 🔥 KIỂM TRA CÓ ẢNH MINH CHỨNG KHÔNG
  const hasProofImages = (bill) => {
    const v = bill?.proof_images;
    if (!v) return false;
    // Mảng
    if (Array.isArray(v)) return v.length > 0;
    // String
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return false;
      if (s.startsWith('[')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) && arr.length > 0;
        } catch { return false; }
      }
      if (s.startsWith('data:image')) return true; // single base64
      if (s.includes(',')) {
        const arr = s.split(',').map(x => x.trim()).filter(Boolean);
        return arr.length > 0;
      }
    }
    return false;
  };

  // Lấy danh sách ảnh (array) từ bill.proof_images – dùng chung cho thumbnail & modal
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
    onlineShippers: shippers.filter(s => s.is_online).length,
    withProof: bills.filter(b => ['done', 'failed'].includes(b.status) && hasProofImages(b)).length, // 🔥 BAO GỒM CẢ ĐƠN THẤT BẠI // 🔥 THÊM STATS ẢNH MINH CHỨNG
    incorrectFormula: bills.filter(b => {
      const financialInfo = calculateFinancialInfo(b);
      return !financialInfo.isFormulaCorrect;
    }).length // 🔥 STATS CHO ĐƠN CÓ CÔNG THỨC SAI
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
            <p className="subtitle">Theo dõi các đơn hàng trong quá trình giao hàng - Logic tài chính đã được sửa</p>
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

        {/* Stats Overview - 🔥 THÊM STATS ẢNH MINH CHỨNG VÀ CÔNG THỨC SAI */}
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

          {/* 🔥 THÊM STAT CHO ẢNH MINH CHỨNG */}
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#8b5cf6' }}>📸</div>
            <div className="stat-info">
              <span className="stat-number">{stats.withProof}</span>
              <span className="stat-label">Có ảnh MC</span>
            </div>
          </div>

          {/* 🔥 THÊM STAT CHO CÔNG THỨC SAI */}
          {stats.incorrectFormula > 0 && (
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ef4444' }}>⚠️</div>
              <div className="stat-info">
                <span className="stat-number">{stats.incorrectFormula}</span>
                <span className="stat-label">Công thức sai</span>
              </div>
            </div>
          )}
        </div>

        {/* Alert cho đơn hàng chờ lâu và công thức sai */}
        {(bills.filter(b => b.status === 'ready').some(b => {
          const hours = Math.floor((new Date() - new Date(b.created_at)) / (1000 * 60 * 60));
          return hours >= 2;
        }) || stats.incorrectFormula > 0) && (
          <div className="alert-section">
            {bills.filter(b => {
              const hours = Math.floor((new Date() - new Date(b.created_at)) / (1000 * 60 * 60));
              return b.status === 'ready' && hours >= 2;
            }).length > 0 && (
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
            )}

            {stats.incorrectFormula > 0 && (
              <div className="alert-card error">
                <span className="alert-icon">🔢</span>
                <div className="alert-content">
                  <h4>Cảnh báo: Có {stats.incorrectFormula} đơn hàng tính toán sai công thức!</h4>
                  <p>
                    Các đơn hàng có dấu ⚠️ cần được kiểm tra lại tính toán tài chính.
                    Công thức đúng: <strong>Tiền hàng + Phí ship - Giảm giá = Tổng tiền</strong>
                  </p>
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

        {/* 🔥 TABLE MỚI VỚI CỘT ẢNH MINH CHỨNG VÀ LOGIC TÀI CHÍNH CHÍNH XÁC */}
        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách đơn hàng giao hàng ({filteredBills.length})</h3>
            <div className="formula-note">
              <small style={{ color: '#6b7280', fontStyle: 'italic' }}>
                💡 Công thức: <strong>Tiền hàng + Phí ship - Giảm giá = Tổng tiền</strong>
                {stats.withProof > 0 && (
                  <span style={{ marginLeft: '20px', color: '#8b5cf6' }}>
                    📸 {stats.withProof} đơn có ảnh MC (giao xong + thất bại)
                  </span>
                )}
                {stats.incorrectFormula > 0 && (
                  <span style={{ marginLeft: '20px', color: '#ef4444' }}>
                    ⚠️ {stats.incorrectFormula} đơn công thức sai
                  </span>
                )}
              </small>
            </div>
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
                  const financialInfo = calculateFinancialInfo(bill); // 🔥 SỬ DỤNG LOGIC MỚI
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

                      {/* 🔥 CÁC CỘT TÀI CHÍNH RIÊNG BIỆT - LOGIC MỚI CHÍNH XÁC */}
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
                        {financialInfo.discountAmount > 0 && (
                          <span className="discount-indicator">🎯</span>
                        )}
                      </td>

                      <td className="total-cell">
                        <span className="total-amount">
                          {financialInfo.finalTotal_formatted}
                        </span>
                        <div className="formula-validation" style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                          {(() => {
                            const calculated = financialInfo.calculatedTotal;
                            const actual = financialInfo.finalTotal;
                            const isValid = financialInfo.isFormulaCorrect;
                            return (
                              <span style={{ color: isValid ? '#10b981' : '#ef4444' }}>
                                {isValid ? '✓' : '⚠️'} {calculated.toLocaleString('vi-VN')}đ
                              </span>
                            );
                          })()}
                        </div>
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

                      {/* 🔥 CỘT ẢNH MINH CHỨNG MỚI */}
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
                              <div className="readonly-notice">
                                <small style={{ color: '#06b6d4', fontStyle: 'italic' }}>
                                  🚚 Chờ shipper xác nhận kết quả
                                </small>
                                {/* Có thể thêm nút gọi điện nếu cần */}
                                {shipperInfo.phone !== 'N/A' && (
                                  <a href={`tel:${shipperInfo.phone}`} className="action-btn btn-call">
                                    📞 Gọi shipper
                                  </a>
                                )}
                              </div>
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

                          {/* 🔥 NÚT XEM ẢNH MINH CHỨNG CHO ĐƠN ĐÃ GIAO */}
                          {allowProof && hasProof && (
                            <button
                              className="action-btn btn-proof"
                              onClick={() => handleViewProofImages(bill)}
                              style={{ backgroundColor: '#8b5cf6' }}
                              title="Xem ảnh minh chứng giao hàng"
                            >
                              📸 Xem ảnh MC
                            </button>
                          )}

                          {/* Copy thông tin giao hàng với financial info chính xác */}
                          <button
                            className="action-btn btn-copy"
                            onClick={() => {
                              const info = `Đơn hàng #${bill._id.slice(-8)}\n` +
                                         `Khách: ${customerInfo.name} - ${customerInfo.phone}\n` +
                                         `Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n` +
                                         `Địa chỉ: ${deliveryInfo.address}\n` +
                                         `💰 Tiền hàng: ${financialInfo.itemsSubtotal_formatted}\n` +
                                         `🚛 Phí ship: ${financialInfo.shippingFee_formatted}\n` +
                                         `🎯 Giảm giá: ${financialInfo.discountAmount_formatted}\n` +
                                         `💵 Tổng tiền: ${financialInfo.finalTotal_formatted}\n` +
                                         `${financialInfo.isFormulaCorrect ? '✅ Công thức đúng' : '⚠️ Công thức sai: ' + financialInfo.calculatedTotal.toLocaleString('vi-VN') + 'đ'}\n` +
                                         `📸 Minh chứng: ${hasProof ? 'Có ảnh' : 'Chưa có ảnh'}`;
                              navigator.clipboard.writeText(info);
                              toast.success('Đã copy thông tin!');
                            }}
                            style={{ backgroundColor: '#8b5cf6' }}
                            title="Copy thông tin giao hàng"
                          >
                            📋 Copy
                          </button>

                          {/* 🔥 NÚT DEBUG CHO ĐƠN CÓ CÔNG THỨC SAI */}
                          {!financialInfo.isFormulaCorrect && (
                            <button
                              className="action-btn btn-debug"
                              onClick={() => {
                                const debugInfo = `🔍 DEBUG ĐƠN #${bill._id.slice(-8)}\n\n` +
                                  `📊 Dữ liệu từ MongoDB:\n` +
                                  `• original_total: ${bill.original_total}\n` +
                                  `• shipping_fee: ${bill.shipping_fee}\n` +
                                  `• discount_amount: ${bill.discount_amount}\n` +
                                  `• total: ${bill.total}\n\n` +
                                  `🧮 Tính toán:\n` +
                                  `• ${financialInfo.itemsSubtotal} + ${financialInfo.shippingFee} - ${financialInfo.discountAmount}\n` +
                                  `• = ${financialInfo.calculatedTotal}\n` +
                                  `• Thực tế: ${financialInfo.finalTotal}\n` +
                                  `• Chênh lệch: ${Math.abs(financialInfo.calculatedTotal - financialInfo.finalTotal)}`;
                                
                                console.log('🔍 DEBUG BILL:', bill);
                                alert(debugInfo);
                              }}
                              style={{ backgroundColor: '#ef4444', fontSize: '10px', padding: '2px 6px' }}
                              title="Debug thông tin tài chính"
                            >
                              🔍 Debug
                            </button>
                          )}
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

      {/* 🔥 MODAL HIỂN THỊ ẢNH MINH CHỨNG */}
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
                        e.target.src = '/placeholder-image.png'; // Fallback image
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
              <div className="proof-note">
                <small>💡 Click vào ảnh để xem kích thước đầy đủ</small>
              </div>
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