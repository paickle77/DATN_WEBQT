import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

// Định nghĩa trạng thái shipment
const SHIPMENT_STATUS = {
  SHIPPING: 'shipping',     // Đang giao hàng
  DELIVERED: 'delivered',   // Đã giao hàng
  FAILED: 'failed',         // Giao hàng thất bại  
  RETURNED: 'returned'      // Hoàn trả
};

const SHIPMENT_STATUS_LABELS = {
  [SHIPMENT_STATUS.SHIPPING]: 'Đang giao hàng',
  [SHIPMENT_STATUS.DELIVERED]: 'Đã giao hàng',
  [SHIPMENT_STATUS.FAILED]: 'Giao hàng thất bại',
  [SHIPMENT_STATUS.RETURNED]: 'Hoàn trả'
};

// Định nghĩa trạng thái bill để lọc các đơn sẵn sàng giao
const ORDER_STATUS = {
  READY: 'ready'
};

export default function ShipmentManagement() {
  const [shipments, setShipments] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [bills, setBills] = useState([]);
  const [readyBills, setReadyBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state cho việc tạo shipment từ bill sẵn sàng
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReadyBill, setSelectedReadyBill] = useState(null);

  useEffect(() => {
    fetchData();
    loadRelatedData();
  }, []);

  const fetchData = () =>
    api.get('/shipments')
       .then(r => setShipments(r.data.data || []))
       .catch(() => toast.error('Không tải được danh sách giao hàng'));

  const loadRelatedData = () => {
    Promise.all([
      api.get('/shippers'),
      api.get('/bills'),
      api.get('/users'),
      api.get('/addresses')
    ]).then(([shippersRes, billsRes, usersRes, addressesRes]) => {
      const allShippers = shippersRes.data.data || [];
      const allBills = billsRes.data.data || [];
      const allUsers = usersRes.data.data || [];
      const allAddresses = addressesRes.data.data || [];
      
      setShippers(allShippers);
      setBills(allBills);
      setUsers(allUsers);
      setAddresses(allAddresses);
      
      // Lọc các bill có trạng thái READY và chưa có shipment
      const existingShipmentBillIds = (shipments || []).map(s => s.bill_id?._id || s.bill_id);
      const readyBillsNotShipped = allBills.filter(bill => 
        bill.status === ORDER_STATUS.READY && 
        !existingShipmentBillIds.includes(bill._id)
      );
      setReadyBills(readyBillsNotShipped);
    }).catch(() => {
      toast.error('Không tải được dữ liệu phụ trợ');
    });
  };

  const updateShipment = (id, payload) => {
    api.put(`/shipments/${id}`, payload)
       .then(() => {
         toast.success('Cập nhật thành công');
         fetchData();
         
         // Cập nhật trạng thái bill tương ứng nếu cần
         if (payload.status === SHIPMENT_STATUS.DELIVERED) {
           const shipment = shipments.find(s => s._id === id);
           if (shipment && shipment.bill_id) {
             api.put(`/bills/${shipment.bill_id._id || shipment.bill_id}`, { 
               status: 'delivered' 
             }).catch(console.error);
           }
         }
       })
       .catch(() => toast.error('Lỗi khi cập nhật'));
  };

  // Tạo shipment mới từ bill ready
  const createShipmentFromBill = async (billId, shipperId) => {
    try {
      const shipmentData = {
        bill_id: billId,
        assigned_shipper: shipperId,
        status: SHIPMENT_STATUS.SHIPPING,
        shippedDate: new Date().toISOString(),
        trackingCode: generateTrackingCode(),
        carrier: 'CakeShop Delivery'
      };

      await api.post('/shipments', shipmentData);

      // Cập nhật bill status thành shipping
      await api.put(`/bills/${billId}`, { 
        status: 'shipping',
        assigned_shipper: shipperId
      });

      toast.success('Tạo shipment thành công!');
      setShowCreateModal(false);
      fetchData();
      loadRelatedData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tạo shipment');
    }
  };

  // Generate tracking code
  const generateTrackingCode = () => {
    return 'CSD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5).toUpperCase();
  };

  // Filter shipments
  const filteredShipments = shipments.filter(s => {
    // Filter theo trạng thái
    if (filterStatus !== 'all' && s.status !== filterStatus) {
      return false;
    }
    
    // Filter theo search term (bill ID hoặc tracking code)
    if (searchTerm) {
      const billId = s.bill_id?._id || s.bill_id || '';
      const trackingCode = s.trackingCode || '';
      const searchLower = searchTerm.toLowerCase();
      
      return billId.toLowerCase().includes(searchLower) || 
             trackingCode.toLowerCase().includes(searchLower);
    }
    
    return true;
  });

  // Lấy thông tin customer từ bill
  const getCustomerInfo = (shipment) => {
    const billId = shipment.bill_id?._id || shipment.bill_id;
    const bill = bills.find(b => b._id === billId);
    
    if (!bill) return { name: 'N/A', address: 'N/A' };
    
    const user = users.find(u => u._id === bill.user_id);
    const address = addresses.find(a => a._id === bill.address_id);
    
    const customerName = user?.name || 'N/A';
    const addressStr = address 
      ? `${address.detail_address}, ${address.ward}${address.district ? `, ${address.district}` : ''}`
      : 'N/A';
      
    return { name: customerName, address: addressStr };
  };

  // Lấy thông tin customer cho ready bill
  const getCustomerInfoForBill = (bill) => {
    const user = users.find(u => u._id === bill.user_id);
    const address = addresses.find(a => a._id === bill.address_id);
    
    const customerName = user?.name || 'N/A';
    const addressStr = address 
      ? `${address.detail_address}, ${address.ward}${address.district ? `, ${address.district}` : ''}`
      : 'N/A';
      
    return { name: customerName, address: addressStr };
  };

  // Lấy thông tin shipper
  const getShipperInfo = (shipperId) => {
    const shipper = shippers.find(s => s._id === shipperId);
    return shipper ? {
      name: shipper.full_name,
      phone: shipper.phone,
      isOnline: shipper.is_online
    } : { name: 'N/A', phone: 'N/A', isOnline: false };
  };

  // Reassign shipper cho shipment
  const reassignShipper = (shipmentId, newShipperId) => {
    api.put(`/shipments/${shipmentId}`, { 
      assigned_shipper: newShipperId,
      reassignedAt: new Date().toISOString()
    })
    .then(() => {
      toast.success('Đã gán lại shipper thành công');
      fetchData();
    })
    .catch(() => toast.error('Lỗi khi gán lại shipper'));
  };

  // Mở modal tạo shipment
  const openCreateModal = (bill) => {
    setSelectedReadyBill(bill);
    setShowCreateModal(true);
  };

  return (
    <div className="shipment-management">
      <TabBarr />
      
      <div className="shipment-content">
        <div className="header-section">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8H20L23 12V17H21C21 18.66 19.66 20 18 20S15 18.66 15 17H9C9 18.66 7.66 20 6 20S3 18.66 3 17H1V6C1 4.9 1.9 4 3 4H17V8Z" fill="currentColor"/>
            </svg>
          </div>
          <h1>Quản lý Giao hàng & Tracking</h1>
          <p className="subtitle">Theo dõi và quản lý tình trạng giao hàng hiệu quả</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.length}</span>
              <span className="stat-label">Tổng giao hàng</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-shipping">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8H20L23 12V17H21C21 18.66 19.66 20 18 20S15 18.66 15 17H9C9 18.66 7.66 20 6 20S3 18.66 3 17H1V6C1 4.9 1.9 4 3 4H17V8Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.filter(s => s.status === SHIPMENT_STATUS.SHIPPING).length}</span>
              <span className="stat-label">Đang giao</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-done">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.filter(s => s.status === SHIPMENT_STATUS.DELIVERED).length}</span>
              <span className="stat-label">Đã giao xong</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-failed">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shipments.filter(s => s.status === SHIPMENT_STATUS.FAILED).length}</span>
              <span className="stat-label">Giao thất bại</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-ready">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{readyBills.length}</span>
              <span className="stat-label">Sẵn sàng giao</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon stat-icon-online">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-number">{shippers.filter(s => s.is_online).length}</span>
              <span className="stat-label">Shipper online</span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Đơn hàng sẵn sàng giao */}
        {readyBills.length > 0 && (
          <div className="quick-actions">
            <h3>🚀 Đơn hàng sẵn sàng giao ({readyBills.length})</h3>
            <div className="ready-bills">
              {readyBills.map(bill => {
                const customerInfo = getCustomerInfoForBill(bill);
                return (
                  <div key={bill._id} className="ready-bill-card">
                    <div className="bill-info">
                      <div className="bill-id">#{bill._id}</div>
                      <div className="customer-name">{customerInfo.name}</div>
                      <div className="bill-total">{(bill.total || 0).toLocaleString('vi-VN')} đ</div>
                    </div>
                    <button
                      className="create-shipment-btn"
                      onClick={() => openCreateModal(bill)}
                    >
                      Tạo giao hàng
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Trạng thái:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              {Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tìm kiếm:</label>
            <input
              type="text"
              placeholder="Bill ID hoặc Tracking Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách giao hàng đang thực hiện</h3>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"/>
                      </svg>
                      Hóa đơn
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                      </svg>
                      Khách hàng
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z"/>
                      </svg>
                      Địa chỉ
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                      </svg>
                      Shipper
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                      </svg>
                      Tracking Code
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                      </svg>
                      Trạng thái
                    </div>
                  </th>
                  <th>
                    <div className="th-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8C13.1 8 14 7.1 14 6S13.1 4 12 4 10 4.9 10 6 10.9 8 12 8ZM12 10C10.9 10 10 10.9 10 12S10.9 14 12 14 14 13.1 14 12 13.1 10 12 10ZM12 16C10.9 16 10 16.9 10 18S10.9 20 12 20 14 19.1 14 18 13.1 16 12 16Z"/>
                      </svg>
                      Hành động
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s, i) => {
                  const billId = s.bill_id?._id || s.bill_id || '';
                  const customerInfo = getCustomerInfo(s);
                  const shipperInfo = getShipperInfo(s.assigned_shipper);

                  return (
                    <tr key={s._id} className="table-row">
                      <td className="row-number">{i + 1}</td>
                      <td className="bill-info">
                        <div className="bill-id">
                          <span className="bill-label">#{billId}</span>
                        </div>
                      </td>
                      <td className="customer-info">
                        <span className="customer-name">{customerInfo.name}</span>
                      </td>
                      <td className="address-info">
                        <span className="address-text" title={customerInfo.address}>
                          {customerInfo.address.length > 50 ? customerInfo.address.substring(0, 50) + '...' : customerInfo.address}
                        </span>
                      </td>
                      <td className="shipper-info">
                        <div className="shipper-display">
                          <div className="shipper-main">
                            <span className="shipper-name">{shipperInfo.name}</span>
                            <span className="shipper-phone">{shipperInfo.phone}</span>
                          </div>
                          <div className="shipper-actions">
                            <span className={`online-status ${shipperInfo.isOnline ? 'online' : 'offline'}`}>
                              {shipperInfo.isOnline ? '🟢' : '🔴'}
                            </span>
                            <select
                              value={s.assigned_shipper || ''}
                              onChange={(e) => reassignShipper(s._id, e.target.value)}
                              className="reassign-select"
                              title="Gán lại shipper"
                            >
                              <option value="">— Chọn shipper —</option>
                              {shippers.map(shipper => (
                                <option key={shipper._id} value={shipper._id}>
                                  {shipper.full_name} {shipper.is_online ? '🟢' : '🔴'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="tracking-info">
                        <div className="tracking-display">
                          <span className="tracking-code">{s.trackingCode || 'Chưa có'}</span>
                          <span className="carrier">{s.carrier || 'CakeShop Delivery'}</span>
                        </div>
                      </td>
                      <td className="status-cell">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          {/* Nút cập nhật trạng thái dựa trên trạng thái hiện tại */}
                          {s.status === SHIPMENT_STATUS.SHIPPING && (
                            <>
                              <button
                                className="action-btn btn-delivered"
                                onClick={() => updateShipment(s._id, { 
                                  status: SHIPMENT_STATUS.DELIVERED,
                                  deliveredDate: new Date().toISOString()
                                })}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                                </svg>
                                Đã giao xong
                              </button>
                              
                              <button
                                className="action-btn btn-failed"
                                onClick={() => updateShipment(s._id, { 
                                  status: SHIPMENT_STATUS.FAILED,
                                  failedReason: 'Không liên lạc được khách hàng',
                                  failedDate: new Date().toISOString()
                                })}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                                </svg>
                                Giao thất bại
                              </button>
                            </>
                          )}
                          
                          {s.status === SHIPMENT_STATUS.FAILED && (
                            <button
                              className="action-btn btn-retry"
                              onClick={() => updateShipment(s._id, { 
                                status: SHIPMENT_STATUS.SHIPPING,
                                retryDate: new Date().toISOString()
                              })}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12S7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12S8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"/>
                              </svg>
                              Thử lại
                            </button>
                          )}
                          
                          {/* Nút tracking luôn hiển thị */}
                          <button
                            className="action-btn btn-track"
                            onClick={() => {
                              if (s.trackingCode) {
                                navigator.clipboard.writeText(s.trackingCode);
                                toast.success('Đã copy tracking code');
                              } else {
                                toast.info('Chưa có tracking code');
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2Z"/>
                            </svg>
                            Copy Tracking
                          </button>

                          {/* Nút liên hệ shipper */}
                          {shipperInfo.phone !== 'N/A' && (
                            <button
                              className="action-btn btn-contact"
                              onClick={() => {
                                window.open(`tel:${shipperInfo.phone}`, '_self');
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                              </svg>
                              Gọi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredShipments.length === 0 && (
                  <tr>
                    <td colSpan="8" className="no-data">
                      Không có dữ liệu giao hàng phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal tạo shipment từ bill ready */}
      {showCreateModal && selectedReadyBill && (
        <div className="modal-overlay">
          <div className="create-shipment-modal">
            <div className="modal-header">
              <h3>Tạo giao hàng - Đơn hàng #{selectedReadyBill._id}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="order-info">
                <h4>Thông tin đơn hàng:</h4>
                <p><strong>Khách hàng:</strong> {getCustomerInfoForBill(selectedReadyBill).name}</p>
                <p><strong>Địa chỉ:</strong> {getCustomerInfoForBill(selectedReadyBill).address}</p>
                <p><strong>Tổng tiền:</strong> {(selectedReadyBill.total ?? 0).toLocaleString('vi-VN')} đ</p>
                <p><strong>Trạng thái:</strong> <span className="status-ready">Sẵn sàng giao</span></p>
              </div>
              
              <div className="shipper-selection">
                <h4>Chọn Shipper:</h4>
                {shippers.filter(s => s.is_online).length > 0 ? (
                  <div className="shipper-list">
                    {shippers.filter(s => s.is_online).map(shipper => (
                      <div key={shipper._id} className="shipper-item">
                        <div className="shipper-info">
                          <span className="shipper-name">{shipper.full_name}</span>
                          <span className="shipper-phone">{shipper.phone}</span>
                          <span className="shipper-status online">🟢 Online</span>
                        </div>
                        <button
                          className="assign-btn"
                          onClick={() => createShipmentFromBill(selectedReadyBill._id, shipper._id)}
                        >
                          Gán & Tạo giao hàng
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-shipper-available">
                    <p>Không có shipper nào đang online</p>
                    <p className="suggestion">Vui lòng thử lại sau hoặc liên hệ shipper để online</p>
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