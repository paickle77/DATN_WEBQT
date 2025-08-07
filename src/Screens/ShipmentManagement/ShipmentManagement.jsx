import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

// 🎯 CHỈ QUẢN LÝ CÁC TRẠNG THÁI GIAO HÀNG
const SHIPMENT_STATUS = {
  READY: 'ready',           // Từ bill management chuyển sang (sẵn sàng giao)
  SHIPPING: 'shipping',     // Đang giao hàng
  DELIVERED: 'delivered',   // Đã giao thành công (hoặc 'done' từ bill)
  FAILED: 'failed',         // Giao hàng thất bại
  RETURNED: 'returned'      // Hoàn trả về shop
};

const STATUS_LABELS = {
  [SHIPMENT_STATUS.READY]: 'Sẵn sàng giao',
  [SHIPMENT_STATUS.SHIPPING]: 'Đang giao hàng',
  [SHIPMENT_STATUS.DELIVERED]: 'Đã giao xong',
  [SHIPMENT_STATUS.FAILED]: 'Giao thất bại',
  [SHIPMENT_STATUS.RETURNED]: 'Đã hoàn trả'
};

const STATUS_COLORS = {
  [SHIPMENT_STATUS.READY]: '#8b5cf6',        // Tím
  [SHIPMENT_STATUS.SHIPPING]: '#06b6d4',     // Xanh cyan
  [SHIPMENT_STATUS.DELIVERED]: '#10b981',    // Xanh lá
  [SHIPMENT_STATUS.FAILED]: '#ef4444',       // Đỏ
  [SHIPMENT_STATUS.RETURNED]: '#f97316'      // Cam
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
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal state cho việc gán shipper
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/GetAllBills'),
      api.get('/shippers'), 
      api.get('/users'),
      api.get('/addresses')
    ]).then(([billsRes, shippersRes, usersRes, addressesRes]) => {
      const allBills = billsRes.data.data || [];
      const allShippers = shippersRes.data.data || [];
      const allUsers = usersRes.data.data || [];
      const allAddresses = addressesRes.data.data || [];
      
      // 🎯 CHỈ LẤY BILLS CÓ TRẠNG THÁI LIÊN QUAN ĐẾN GIAO HÀNG
      const shippingBills = allBills.filter(bill => 
        ['ready', 'shipping', 'done', 'failed', 'returned'].includes(bill.status)
      );
      
      setBills(shippingBills);
      setShippers(allShippers);
      setUsers(allUsers);
      setAddresses(allAddresses);
      setLoading(false);
    }).catch(err => {
      console.error('Load data error:', err);
      toast.error('Không tải được dữ liệu');
      setLoading(false);
    });
  };

  // Update bill status và shipper
  const updateBillStatus = (billId, newStatus, shipperId = null) => {
    const updateData = { status: newStatus };
    if (shipperId) {
      updateData.shipper_id = shipperId;
      updateData.assigned_shipper = shipperId;
    }
    
    api.put(`/bills/${billId}`, updateData)
       .then(() => {
         toast.success('Cập nhật thành công');
         loadData();
       })
       .catch(err => {
         console.error(err);
         toast.error('Lỗi khi cập nhật: ' + (err.response?.data?.message || err.message));
       });
  };

  // Gán shipper cho bill
  const assignShipper = (billId, shipperId) => {
    updateBillStatus(billId, 'shipping', shipperId);
    setShowAssignModal(false);
  };

  // Lấy thông tin customer từ bill
  const getCustomerInfo = (bill) => {
    let customerName = 'N/A';
    let addressStr = 'N/A';

    // Lấy customer name
    if (bill.user_id && typeof bill.user_id === 'object' && bill.user_id.full_name) {
      customerName = bill.user_id.full_name || bill.user_id.name || bill.user_id.username;
    } else if (bill.user_id) {
      const user = users.find(u => u._id === (typeof bill.user_id === 'object' ? bill.user_id._id : bill.user_id));
      customerName = user?.full_name || user?.name || user?.username || 'N/A';
    }

    // Lấy address
    if (bill.address_id && typeof bill.address_id === 'object') {
      const addr = bill.address_id;
      if (addr.full_address) {
        addressStr = addr.full_address;
      } else {
        const parts = [
          addr.detail_address || addr.address || addr.street,
          addr.ward || addr.ward_name,
          addr.district || addr.district_name, 
          addr.city || addr.province || addr.province_name
        ].filter(Boolean);
        addressStr = parts.length > 0 ? parts.join(', ') : 'Địa chỉ không đầy đủ';
      }
    } else if (bill.address_id) {
      const address = addresses.find(a => a._id === (typeof bill.address_id === 'object' ? bill.address_id._id : bill.address_id));
      if (address) {
        if (address.full_address) {
          addressStr = address.full_address;
        } else {
          const parts = [
            address.detail_address || address.address || address.street,
            address.ward || address.ward_name,
            address.district || address.district_name, 
            address.city || address.province || address.province_name
          ].filter(Boolean);
          addressStr = parts.length > 0 ? parts.join(', ') : 'Địa chỉ không đầy đủ';
        }
      }
    }
      
    return { name: customerName, address: addressStr };
  };

  // Lấy thông tin shipper
  const getShipperInfo = (bill) => {
    let shipperId = null;
    
    // Check populated shipper data
    if (bill.shipper_id && typeof bill.shipper_id === 'object' && bill.shipper_id.full_name) {
      return {
        name: bill.shipper_id.full_name || bill.shipper_id.name || bill.shipper_id.username || 'N/A',
        phone: bill.shipper_id.phone || 'N/A',
        isOnline: bill.shipper_id.is_online || false,
        id: bill.shipper_id._id
      };
    } else {
      shipperId = bill.shipper_id || bill.assigned_shipper;
    }

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
      const searchLower = searchTerm.toLowerCase();
      
      return billId.toLowerCase().includes(searchLower) || 
             customerInfo.name.toLowerCase().includes(searchLower);
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
            <h1>Quản lý Giao hàng</h1>
            <p className="subtitle">Quản lý các đơn hàng trong quá trình giao hàng</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: STATUS_COLORS.ready }}>📦</div>
            <div className="stat-info">
              <span className="stat-number">{stats.ready}</span>
              <span className="stat-label">Sẵn sàng giao</span>
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
              placeholder="Mã đơn hàng hoặc tên khách hàng..."
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
                  <th>📍 Địa chỉ giao hàng</th>
                  <th>👨‍💼 Shipper</th>
                  <th>📊 Trạng thái</th>
                  <th>⚙️ Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, i) => {
                  const customerInfo = getCustomerInfo(bill);
                  const shipperInfo = getShipperInfo(bill);
                  const displayStatus = BILL_TO_SHIPMENT_STATUS[bill.status] || bill.status;

                  return (
                    <tr key={bill._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      
                      <td className="bill-info">
                        <div className="bill-details">
                          <div className="bill-id">#{bill._id.slice(-8)}</div>
                          <div className="bill-total">
                            {(Number(bill.total) || 0).toLocaleString('vi-VN')} đ
                          </div>
                          <div className="bill-date">
                            {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="customer-info">
                        <span className="customer-name">{customerInfo.name}</span>
                      </td>
                      
                      <td className="address-info">
                        <span className="address-text" title={customerInfo.address}>
                          {customerInfo.address.length > 60 
                            ? customerInfo.address.substring(0, 60) + '...' 
                            : customerInfo.address}
                        </span>
                      </td>
                      
                      <td className="shipper-info">
                        <div className="shipper-display">
                          <div className="shipper-main">
                            <span className="shipper-name">
                              {shipperInfo.name}
                              {shipperInfo.name !== 'Chưa gán shipper' && (
                                <span className={`online-status ${shipperInfo.isOnline ? 'online' : 'offline'}`}>
                                  {shipperInfo.isOnline ? ' 🟢' : ' 🔴'}
                                </span>
                              )}
                            </span>
                            {shipperInfo.phone !== 'N/A' && (
                              <span className="shipper-phone">{shipperInfo.phone}</span>
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
                      </td>
                      
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {/* Hành động dựa trên trạng thái */}
                          {displayStatus === SHIPMENT_STATUS.READY && (
                            <button
                              className="action-btn btn-assign"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowAssignModal(true);
                              }}
                              style={{ backgroundColor: '#06b6d4' }}
                            >
                              👨‍💼 Gán shipper
                            </button>
                          )}
                          
                          {displayStatus === SHIPMENT_STATUS.SHIPPING && (
                            <>
                              <button
                                className="action-btn btn-delivered"
                                onClick={() => updateBillStatus(bill._id, 'done')}
                                style={{ backgroundColor: '#10b981' }}
                              >
                                ✅ Đã giao xong
                              </button>
                              
                              <button
                                className="action-btn btn-failed"
                                onClick={() => updateBillStatus(bill._id, 'failed')}
                                style={{ backgroundColor: '#ef4444' }}
                              >
                                ❌ Giao thất bại
                              </button>
                            </>
                          )}
                          
                          {displayStatus === SHIPMENT_STATUS.FAILED && (
                            <>
                              <button
                                className="action-btn btn-retry"
                                onClick={() => updateBillStatus(bill._id, 'shipping')}
                                style={{ backgroundColor: '#06b6d4' }}
                              >
                                🔄 Thử giao lại
                              </button>
                              
                              <button
                                className="action-btn btn-return"
                                onClick={() => updateBillStatus(bill._id, 'returned')}
                                style={{ backgroundColor: '#f97316' }}
                              >
                                📦 Hoàn trả
                              </button>
                            </>
                          )}

                          {/* Gán lại shipper */}
                          {[SHIPMENT_STATUS.SHIPPING, SHIPMENT_STATUS.FAILED].includes(displayStatus) && (
                            <select
                              value={shipperInfo.id || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateBillStatus(bill._id, bill.status, e.target.value);
                                }
                              }}
                              className="reassign-select"
                              style={{ 
                                padding: '4px 8px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px'
                              }}
                            >
                              <option value="">Đổi shipper</option>
                              {shippers.filter(s => s.is_online).map(shipper => (
                                <option key={shipper._id} value={shipper._id}>
                                  {shipper.full_name} 🟢
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {/* Liên hệ shipper */}
                          {shipperInfo.phone !== 'N/A' && (
                            <button
                              className="action-btn btn-contact"
                              onClick={() => window.open(`tel:${shipperInfo.phone}`, '_self')}
                              style={{ backgroundColor: '#8b5cf6' }}
                            >
                              📞 Gọi
                            </button>
                          )}

                          {/* Xem chi tiết */}
                          <button
                            className="action-btn btn-detail"
                            onClick={() => window.open(`/admin/bills/${bill._id}`, '_blank')}
                            style={{ backgroundColor: '#667eea' }}
                          >
                            👁️ Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan="7" className="no-data">
                      <div className="no-data-content">
                        <span style={{ fontSize: '48px', opacity: 0.3 }}>📦</span>
                        <p>Không có đơn hàng nào đang trong quá trình giao hàng</p>
                        <small>Các đơn hàng sẽ xuất hiện ở đây khi chuyển từ trạng thái "Sẵn sàng giao"</small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal gán shipper */}
      {showAssignModal && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="assign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Gán shipper - Đơn hàng #{selectedBill._id.slice(-8)}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowAssignModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="order-info">
                <h4>Thông tin đơn hàng:</h4>
                <p><strong>Khách hàng:</strong> {getCustomerInfo(selectedBill).name}</p>
                <p><strong>Địa chỉ:</strong> {getCustomerInfo(selectedBill).address}</p>
                <p><strong>Tổng tiền:</strong> {(selectedBill.total || 0).toLocaleString('vi-VN')} đ</p>
              </div>
              
              <div className="shipper-selection">
                <h4>Chọn Shipper đang online:</h4>
                {shippers.filter(s => s.is_online).length > 0 ? (
                  <div className="shipper-list">
                    {shippers.filter(s => s.is_online).map(shipper => (
                      <div key={shipper._id} className="shipper-item">
                        <div className="shipper-info">
                          <span className="shipper-name">{shipper.full_name || shipper.name}</span>
                          <span className="shipper-phone">{shipper.phone}</span>
                          <span className="shipper-status online">🟢 Online</span>
                        </div>
                        <button
                          className="assign-btn"
                          onClick={() => assignShipper(selectedBill._id, shipper._id)}
                        >
                          Gán shipper
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-shipper-available">
                    <p>Không có shipper nào đang online</p>
                    <p className="suggestion">Vui lòng thử lại sau</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}