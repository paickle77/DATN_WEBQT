// src/Screens/ShipperManagement/ShipperManagement.jsx
import React, { useState, useEffect } from 'react';
import './ShipperManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaPhone,
  FaIdCard,
  FaMotorcycle,
  FaCircle
} from 'react-icons/fa';

const ShipperManagement = () => {
  const [shippers, setShippers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filteredShippers, setFilteredShippers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState(null);
  const [formData, setFormData] = useState({
    account_id: '',
    full_name: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    is_online: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlineFilter, setOnlineFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterShippers();
  }, [searchTerm, shippers, onlineFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching shippers...');
      
      // Chỉ fetch shippers, bỏ accounts để tránh lỗi
      const shippersRes = await api.get('/shippers');

      console.log('✅ Shippers response:', shippersRes.data);
      
      if (shippersRes.data && shippersRes.data.data) {
        setShippers(shippersRes.data.data);
        console.log('📊 Loaded shippers:', shippersRes.data.data.length);
      } else {
        console.warn('⚠️ No shipper data found');
        setShippers([]);
      }

      // Thử fetch accounts nhưng không làm crash app nếu fail
      try {
        const accountsRes = await api.get('/accounts');
        if (accountsRes.data && accountsRes.data.data) {
          // Lọc chỉ user accounts
          const userAccounts = accountsRes.data.data.filter(acc => 
            acc.role === 'user' && !acc.is_lock
          );
          setAccounts(userAccounts);
          console.log('📊 Loaded user accounts:', userAccounts.length);
        }
      } catch (accountError) {
        console.warn('⚠️ Could not load accounts, using empty array');
        setAccounts([]);
      }

    } catch (error) {
      console.error('❌ Error fetching shippers:', error);
      alert('Có lỗi xảy ra khi tải dữ liệu shipper!');
      setShippers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterShippers = () => {
    let filtered = shippers.filter(shipper =>
      shipper.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipper.phone?.includes(searchTerm) ||
      shipper.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (onlineFilter !== 'all') {
      if (onlineFilter === 'online') {
        filtered = filtered.filter(shipper => shipper.is_online === true);
      } else if (onlineFilter === 'offline') {
        filtered = filtered.filter(shipper => shipper.is_online === false);
      } else if (onlineFilter === 'busy') {
        filtered = filtered.filter(shipper => shipper.is_online === 'busy');
      }
    }

    setFilteredShippers(filtered);
  };

  const getAccountEmail = (accountId) => {
    if (!accountId) return 'Không có tài khoản';
    
    const account = accounts.find(acc => acc._id === accountId);
    return account ? account.email : accountId;
  };

  const handleAddNew = () => {
    setFormData({
      account_id: '',
      full_name: '',
      phone: '',
      license_number: '',
      vehicle_type: '',
      is_online: false
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (shipper) => {
    setFormData({
      account_id: shipper.account_id || '',
      full_name: shipper.full_name,
      phone: shipper.phone,
      license_number: shipper.license_number || '',
      vehicle_type: shipper.vehicle_type || '',
      is_online: shipper.is_online
    });
    setSelectedShipper(shipper);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleViewDetail = (shipper) => {
    setSelectedShipper(shipper);
    setShowDetailModal(true);
  };

  const handleDelete = async (shipperId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa shipper này?')) {
      try {
        await api.delete(`/shippers/${shipperId}`);
        alert('Xóa shipper thành công!');
        fetchData();
      } catch (error) {
        console.error('Error deleting shipper:', error);
        alert('Có lỗi xảy ra khi xóa shipper!');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Nếu không có account_id, tạo shipper không cần account
      const submitData = {
        ...formData,
        account_id: formData.account_id || null
      };

      if (isEditing) {
        await api.put(`/shippers/${selectedShipper._id}`, submitData);
        alert('Cập nhật shipper thành công!');
      } else {
        await api.post('/shippers', submitData);
        alert('Thêm shipper thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving shipper:', error);
      alert('Có lỗi xảy ra khi lưu shipper!');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getAvailableAccounts = () => {
    if (accounts.length === 0) {
      return [];
    }
    
    return accounts.filter(account => {
      // Nếu đang edit, cho phép giữ account hiện tại
      if (isEditing && account._id === selectedShipper?.account_id) {
        return true;
      }
      
      // Chỉ hiển thị accounts chưa được gán
      const isNotAssigned = !shippers.some(shipper => shipper.account_id === account._id);
      return isNotAssigned;
    });
  };

  const getStatusDisplay = (shipper) => {
    if (shipper.is_online === 'busy') {
      return { text: 'Đang giao hàng', class: 'busy' };
    } else if (shipper.is_online === true) {
      return { text: 'Online', class: 'online' };
    } else {
      return { text: 'Offline', class: 'offline' };
    }
  };

  const getOnlineCount = () => {
    return shippers.filter(s => s.is_online === true).length;
  };

  const getOfflineCount = () => {
    // Tính tất cả trạng thái không phải online hoặc busy
    return shippers.filter(s => s.is_online !== true && s.is_online !== 'busy').length;
  };

  const getBusyCount = () => {
    return shippers.filter(s => s.is_online === 'busy').length;
  };

  // Debug function để kiểm tra dữ liệu
  const debugShipperStatus = () => {
    console.log('🔍 Debug Shipper Status:');
    shippers.forEach((shipper, index) => {
      console.log(`${index + 1}. ${shipper.full_name}: is_online =`, shipper.is_online, typeof shipper.is_online);
    });
    
    const onlineShippers = shippers.filter(s => s.is_online === true);
    const offlineShippers = shippers.filter(s => s.is_online !== true && s.is_online !== 'busy');
    const busyShippers = shippers.filter(s => s.is_online === 'busy');
    
    console.log('📊 Counts:', {
      total: shippers.length,
      online: onlineShippers.length,
      offline: offlineShippers.length,
      busy: busyShippers.length,
      sum: onlineShippers.length + offlineShippers.length + busyShippers.length
    });
  };

  // Gọi debug khi có dữ liệu
  useEffect(() => {
    if (shippers.length > 0) {
      debugShipperStatus();
    }
  }, [shippers]);

  return (
    <>
      <TabBar />
      <div className="shipper-management">
        <div className="header">
          <h2>Quản lý Shipper</h2>
          <button className="add-btn" onClick={handleAddNew}>
            <FaPlus /> Thêm Shipper
          </button>
        </div>

        <div className="filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, SĐT, biển số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-filter">
            <select 
              value={onlineFilter} 
              onChange={(e) => setOnlineFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="online">Đang online</option>
              <option value="offline">Đang offline</option>
              <option value="busy">Đang giao hàng</option>
            </select>
          </div>
        </div>

        <div className="stats">
          <div className="stat-card total">
            <h3>{shippers.length}</h3>
            <p>Tổng Shipper</p>
          </div>
          <div className="stat-card online">
            <h3>{getOnlineCount()}</h3>
            <p>Đang Online</p>
          </div>
          <div className="stat-card offline">
            <h3>{getOfflineCount()}</h3>
            <p>Offline/Khác</p>
          </div>
          <div className="stat-card busy">
            <h3>{getBusyCount()}</h3>
            <p>Đang Giao Hàng</p>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading">Đang tải dữ liệu...</div>
          ) : (
            <table className="shipper-table">
              <thead>
                <tr>
                  <th>Tên Shipper</th>
                  <th>Email Tài Khoản</th>
                  <th>Số Điện Thoại</th>
                  <th>Biển Số Xe</th>
                  <th>Loại Xe</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredShippers.map((shipper) => {
                  const statusInfo = getStatusDisplay(shipper);
                  
                  return (
                    <tr key={shipper._id}>
                      <td className="name-cell">
                        <strong>{shipper.full_name}</strong>
                      </td>
                      <td>{getAccountEmail(shipper.account_id)}</td>
                      <td>
                        <FaPhone className="icon" /> {shipper.phone}
                      </td>
                      <td>
                        {shipper.license_number && (
                          <>
                            <FaIdCard className="icon" /> {shipper.license_number}
                          </>
                        )}
                      </td>
                      <td>
                        {shipper.vehicle_type && (
                          <>
                            <FaMotorcycle className="icon" /> {shipper.vehicle_type}
                          </>
                        )}
                      </td>
                      <td>
                        <div className={`status ${statusInfo.class}`}>
                          <FaCircle className="status-icon" />
                          {statusInfo.text}
                        </div>
                      </td>
                      <td className="actions">
                        <button 
                          className="btn view" 
                          onClick={() => handleViewDetail(shipper)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className="btn edit" 
                          onClick={() => handleEdit(shipper)}
                          title="Chỉnh sửa"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="btn delete" 
                          onClick={() => handleDelete(shipper._id)}
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredShippers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" className="no-data">
                      Không tìm thấy shipper nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>{isEditing ? 'Chỉnh Sửa Shipper' : 'Thêm Shipper Mới'}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Tài Khoản (Tùy chọn):</label>
                  <select
                    name="account_id"
                    value={formData.account_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Không liên kết tài khoản</option>
                    {getAvailableAccounts().map(account => (
                      <option key={account._id} value={account._id}>
                        {account.email}
                      </option>
                    ))}
                  </select>
                  <span className="form-note">
                    Có thể tạo shipper mà không cần liên kết với tài khoản user
                  </span>
                </div>

                <div className="form-group">
                  <label>Tên Shipper:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập tên đầy đủ của shipper"
                  />
                </div>

                <div className="form-group">
                  <label>Số Điện Thoại:</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label>Biển Số Xe:</label>
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    placeholder="VD: 29AB-91999"
                  />
                </div>

                <div className="form-group">
                  <label>Loại Xe:</label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleInputChange}
                  >
                    <option value="">Chọn loại xe</option>
                    <option value="Xe Máy">Xe Máy</option>
                    <option value="Xe Ô Tô">Xe Ô Tô</option>
                    <option value="Xe Đạp">Xe Đạp</option>
                  </select>
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="is_online"
                      checked={formData.is_online}
                      onChange={handleInputChange}
                    />
                    Trạng thái Online
                  </label>
                  <span className="form-note">
                    Admin chỉ có thể đặt trạng thái ban đầu. Shipper sẽ tự quản lý trạng thái của mình
                  </span>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? 'Đang lưu...' : (isEditing ? 'Cập Nhật' : 'Thêm Mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedShipper && (
          <div className="modal-overlay">
            <div className="modal detail-modal">
              <div className="modal-header">
                <h3>Chi Tiết Shipper</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowDetailModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="detail-content">
                <div className="detail-row">
                  <span className="label">Tên Shipper:</span>
                  <span className="value">{selectedShipper.full_name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email Tài Khoản:</span>
                  <span className="value">{getAccountEmail(selectedShipper.account_id)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Số Điện Thoại:</span>
                  <span className="value">{selectedShipper.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Biển Số Xe:</span>
                  <span className="value">{selectedShipper.license_number || 'Chưa có'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Loại Xe:</span>
                  <span className="value">{selectedShipper.vehicle_type || 'Chưa có'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Trạng Thái:</span>
                  <span className={`value status ${getStatusDisplay(selectedShipper).class}`}>
                    <FaCircle className="status-icon" />
                    {getStatusDisplay(selectedShipper).text}
                  </span>
                </div>
                {selectedShipper.updatedAt && (
                  <div className="detail-row">
                    <span className="label">Cập Nhật Cuối:</span>
                    <span className="value">
                      {new Date(selectedShipper.updatedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ShipperManagement;