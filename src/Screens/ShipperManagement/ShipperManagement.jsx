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
  FaCircle,
  FaImage,
  FaUser,
  FaEnvelope,
  FaLock,
  FaUnlock,
  FaBan
} from 'react-icons/fa';

const ShipperManagement = () => {
  const [shippers, setShippers] = useState([]);
  const [filteredShippers, setFilteredShippers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState(null);
  const [formData, setFormData] = useState({
    // Account fields - CHỈ TẠO MỚI
    email: '',
    password: '',
    // Shipper fields  
    full_name: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    is_online: false,
    //image: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlineFilter, setOnlineFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);

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
        
        const token = localStorage.getItem('token');
        const shippersRes = await api.get('/shippers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ Shippers response:', shippersRes.data);
        
        if (shippersRes.data && shippersRes.data.data) {
          // ✅ Populate account thông tin cho mỗi shipper
          const shippersWithAccounts = await Promise.all(
            shippersRes.data.data.map(async (shipper) => {
              if (shipper.account_id) {
                try {
                  const accountRes = await api.get(`/accounts/${shipper.account_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  
                  console.log(`📧 Account for shipper ${shipper.full_name}:`, accountRes.data.data);
                  
                  return {
                    ...shipper,
                    account: accountRes.data.data || null
                  };
                } catch (accountError) {
                  console.warn(`⚠️ Không thể lấy thông tin account cho shipper ${shipper.full_name}:`, accountError);
                  return { 
                    ...shipper, 
                    account: null 
                  };
                }
              }
              return { 
                ...shipper, 
                account: null 
              };
            })
          );
          
          console.log('📊 Final shippers with accounts:', shippersWithAccounts);
          setShippers(shippersWithAccounts);
        } else {
          console.warn('⚠️ No shipper data found');
          setShippers([]);
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
      shipper.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipper.account?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const getAccountEmail = (shipper) => {
    if (shipper.account && shipper.account.email) {
      return shipper.account.email;
    }
    return 'Chưa có tài khoản';
  };

  // ✅ Hiển thị ảnh shipper - SỬA LỖI HIỂN THỊ
  const renderShipperImage = (shipper, size = 'small') => {
    const sizeClass = size === 'large' ? 'shipper-image-large' : 'shipper-image-small';
    
    if (!shipper.image) {
      return (
        <div className={`no-image ${sizeClass}`}>
          <FaUser />
        </div>
      );
    }

    // ✅ Xử lý các định dạng ảnh khác nhau
    let imageSrc = '';
    
    if (shipper.image.startsWith('data:image/')) {
      // Base64 image
      imageSrc = shipper.image;
    } else if (shipper.image.startsWith('/uploads/')) {
      // File path from server
      imageSrc = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${shipper.image}`;
    } else if (shipper.image.startsWith('http')) {
      // Full URL
      imageSrc = shipper.image;
    } else {
      // Filename only
      imageSrc = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/uploads/${shipper.image}`;
    }

    return (
      <div className="image-wrapper">
        <img 
          src={imageSrc}
          alt={shipper.full_name}
          className={`shipper-image ${sizeClass}`}
          onError={(e) => {
            console.log('Image load error for:', imageSrc);
            e.target.style.display = 'none';
            e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'flex');
          }}
          onLoad={(e) => {
            if (e.target.nextSibling?.style) {
              e.target.nextSibling.style.display = 'none';
            }
          }}
        />
        <div className={`no-image ${sizeClass}`} style={{display: 'none'}}>
          <FaUser />
        </div>
      </div>
    );
  };

  const handleAddNew = () => {
    setFormData({
      // Account fields - CHỈ DÀNH CHO TẠO MỚI
      email: '',
      password: '',
      // Shipper fields
      full_name: '',
      phone: '',
      license_number: '',
      vehicle_type: '',
      is_online: false,
      image: null
    });
    setPreviewImage(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (shipper) => {
    // ✅ KHI EDIT: Chỉ cho phép sửa thông tin shipper, KHÔNG sửa account
    setFormData({
      // Không có email, password khi edit
      full_name: shipper.full_name,
      phone: shipper.phone,
      license_number: shipper.license_number || '',
      vehicle_type: shipper.vehicle_type || '',
      is_online: shipper.is_online === true,
      image: null // File sẽ được set riêng
    });
    
    // ✅ Set preview image hiện tại
    if (shipper.image) {
      if (shipper.image.startsWith('data:image/')) {
        setPreviewImage(shipper.image);
      } else if (shipper.image.startsWith('/uploads/')) {
        setPreviewImage(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${shipper.image}`);
      } else if (shipper.image.startsWith('http')) {
        setPreviewImage(shipper.image);
      } else {
        setPreviewImage(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/uploads/${shipper.image}`);
      }
    } else {
      setPreviewImage(null);
    }
    
    setSelectedShipper(shipper);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleViewDetail = (shipper) => {
    setSelectedShipper(shipper);
    setShowDetailModal(true);
  };

    const handleDelete = async (shipperId) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa shipper này? Hành động này sẽ xóa cả tài khoản liên quan và không thể hoàn tác.')) {
        try {
          const token = localStorage.getItem('token');
          
          // Tìm shipper để lấy account_id
          const shipperToDelete = shippers.find(s => s._id === shipperId);
          console.log('🗑️ Deleting shipper:', shipperToDelete);
          
          if (shipperToDelete && shipperToDelete.account_id) {
            // Xóa account trước
            try {
              console.log('🗑️ Deleting account:', shipperToDelete.account_id);
              await api.delete(`/accounts/${shipperToDelete.account_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('✅ Đã xóa account:', shipperToDelete.account_id);
            } catch (accountError) {
              console.error('❌ Lỗi khi xóa account:', accountError);
              
              // Nếu lỗi 404 (account không tồn tại) thì vẫn tiếp tục xóa shipper
              if (accountError.response?.status !== 404) {
                alert('Có lỗi xảy ra khi xóa tài khoản. Vui lòng thử lại!');
                return;
              }
              console.warn('⚠️ Account không tồn tại, tiếp tục xóa shipper');
            }
          }
          
          // Xóa shipper
          console.log('🗑️ Deleting shipper:', shipperId);
          await api.delete(`/shippers/${shipperId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log('✅ Đã xóa shipper thành công');
          alert('Xóa shipper và tài khoản thành công!');
          
          // Reload dữ liệu
          await fetchData();
          
        } catch (error) {
          console.error('❌ Error deleting shipper:', error);
          if (error.response?.data?.message) {
            alert(`Có lỗi xảy ra: ${error.response.data.message}`);
          } else {
            alert('Có lỗi xảy ra khi xóa shipper!');
          }
        }
      }
    };

  // ✅ THÊM: Chức năng khóa/mở khóa tài khoản shipper
  const handleToggleLockAccount = async (shipper) => {
    if (!shipper.account || !shipper.account_id) {
      alert('Shipper này không có tài khoản để khóa/mở khóa');
      return;
    }

    const isLocked = shipper.account.is_lock;
    const action = isLocked ? 'mở khóa' : 'khóa';
    
    if (window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản của shipper "${shipper.full_name}"?`)) {
      try {
        const token = localStorage.getItem('token');
        const endpoint = isLocked ? 'unlock' : 'lock';
        
        await api.put(`/accounts/${shipper.account_id}/${endpoint}`, {
          reason: isLocked ? undefined : 'Admin khóa tài khoản shipper'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản thành công!`);
        fetchData();
      } catch (error) {
        console.error(`Error ${action} account:`, error);
        alert(`Có lỗi xảy ra khi ${action} tài khoản!`);
      }
    }
  };


const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const token = localStorage.getItem('token');
    
    // ✅ Validation
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      alert('Vui lòng điền đầy đủ tên và số điện thoại');
      setLoading(false);
      return;
    }

    if (!isEditing) {
      // ✅ KHI TẠO MỚI: Bắt buộc có email và password
      if (!formData.email.trim() || !formData.password.trim()) {
        alert('Vui lòng điền đầy đủ email và mật khẩu cho tài khoản shipper');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert('Email không đúng định dạng');
        setLoading(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự');
        setLoading(false);
        return;
      }
    }

    // ✅ THAY ĐỔI: Gửi JSON thay vì FormData (bỏ ảnh)
    const dataToSend = {
      // Thông tin account (chỉ khi tạo mới)
      ...((!isEditing) && {
        email: formData.email.trim(),
        password: formData.password
      }),
      
      // Thông tin shipper
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      license_number: formData.license_number || '',
      vehicle_type: formData.vehicle_type || '',
      is_online: formData.is_online
      // Bỏ image - shipper sẽ tự thêm sau
    };

    console.log('📤 Submitting JSON data:', dataToSend);

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' // Thay đổi từ multipart/form-data
      }
    };

    if (isEditing) {
      // ✅ CẬP NHẬT: Chỉ cập nhật thông tin shipper
      await api.put(`/shippers/${selectedShipper._id}`, dataToSend, config);
      alert('Cập nhật thông tin shipper thành công!');
    } else {
      // ✅ TẠO MỚI: Tạo cả account và shipper
      await api.post('/shippers/create-with-account', dataToSend, config);
      alert('Tạo tài khoản và shipper thành công!');
    }
    
    setShowModal(false);
    setPreviewImage(null);
    
    // 🔧 Reload lại data
    await fetchData();
  } catch (error) {
    console.error('Error saving shipper:', error);
    
    if (error.response) {
      const errorMsg = error.response.data?.message || error.response.data?.error || 'Có lỗi xảy ra';
      
      // ✅ Xử lý lỗi cụ thể
      if (errorMsg.includes('Email đã tồn tại')) {
        alert('Email này đã được sử dụng. Vui lòng chọn email khác.');
      } else if (errorMsg.includes('E11000') && errorMsg.includes('email')) {
        alert('Email này đã được sử dụng. Vui lòng chọn email khác.');
      } else {
        alert(`Lỗi: ${errorMsg}`);
      }
    } else {
      alert('Có lỗi xảy ra khi lưu thông tin shipper!');
    }
  } finally {
    setLoading(false);
  }
};

// 🔧 SỬA: Logic hiển thị button khóa/mở khóa trong table
// Trong phần render table, sửa điều kiện hiển thị button:

// ✅ HIỂN THỊ NÚT KHÓA CHỈ KHI CÓ ACCOUNT VÀ ACCOUNT_ID (đã có trong phần render table)

// 🔧 SỬA: Hàm getAccountEmail để hiển thị chính xác
// (Đã khai báo ở trên, xóa duplicate)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getStatusDisplay = (shipper) => {
    if (shipper.is_online === 'busy') {
      return { text: 'Đang giao hàng', class: 'busy' };
    } else if (shipper.is_online === true || shipper.is_online === 'true') {
      return { text: 'Online', class: 'online' };
    } else {
      return { text: 'Offline', class: 'offline' };
    }
  };

  const getOnlineCount = () => {
    return shippers.filter(s => s.is_online === true || s.is_online === 'true').length;
  };

  const getOfflineCount = () => {
    return shippers.filter(s => 
      s.is_online !== true && 
      s.is_online !== 'true' && 
      s.is_online !== 'busy'
    ).length;
  };

  const getBusyCount = () => {
    return shippers.filter(s => s.is_online === 'busy').length;
  };

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
              placeholder="Tìm kiếm theo tên, SĐT, biển số, email..."
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
                  <th>Ảnh</th>
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
                      <td className="image-cell">
                        {renderShipperImage(shipper, 'small')}
                      </td>
                      <td className="name-cell">
                        <strong>{shipper.full_name}</strong>
                      </td>
                      <td>
                        <div className="account-info">
                          <FaEnvelope className="icon" />
                          {getAccountEmail(shipper)}
                          {shipper.account?.is_lock && (
                            <FaLock className="lock-icon" title="Tài khoản bị khóa" />
                          )}
                        </div>
                      </td>
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
                        {/* <button 
                          className="btn edit" 
                          onClick={() => handleEdit(shipper)}
                          title="Chỉnh sửa thông tin shipper"
                        >
                          <FaEdit />
                        </button> */}
                        
                        {/* ✅ CHỈ HIỂN THỊ NÚT KHÓA KHI CÓ ACCOUNT VÀ ACCOUNT_ID */}
                        {shipper.account_id && shipper.account && (
                          <button 
                            className={`btn lock ${shipper.account.is_lock ? 'unlock' : 'lock'}`}
                            onClick={() => handleToggleLockAccount(shipper)}
                            title={shipper.account.is_lock ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          >
                            {shipper.account.is_lock ? <FaUnlock /> : <FaLock />}
                          </button>
                        )}
                        
                        {/* ✅ NÚT XÓA LUÔN HIỂN THỊ */}
                        <button 
                          className="btn delete delete-btn-red" 
                          onClick={() => handleDelete(shipper._id)}
                          title="Xóa shipper và tài khoản"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredShippers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="no-data">
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
                <h3>{isEditing ? 'Chỉnh Sửa Thông Tin Shipper' : 'Tạo Shipper và Tài Khoản Mới'}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} encType="multipart/form-data">
                {/* ✅ CHỈ HIỂN THỊ EMAIL/PASSWORD KHI TẠO MỚI */}
                {!isEditing && (
                  <>
                    <div className="account-section">
                      <h4 className="section-title">
                        <FaEnvelope /> Thông Tin Tài Khoản
                      </h4>
                      <div className="form-group">
                        <label>Email Đăng Nhập: *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="Nhập email để shipper đăng nhập"
                        />
                        <span className="form-note">
                          Email này sẽ được dùng để shipper đăng nhập vào ứng dụng
                        </span>
                      </div>

                      <div className="form-group">
                        <label>Mật Khẩu: *</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                          minLength={6}
                        />
                        <span className="form-note">
                          Mật khẩu tạm thời, shipper có thể đổi sau khi đăng nhập
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* ✅ HIỂN THỊ THÔNG TIN ACCOUNT KHI EDIT (CHỈ ĐỌC) */}
                {isEditing && selectedShipper?.account && (
                  <div className="account-info-display">
                    <h4 className="section-title">
                      <FaEnvelope /> Thông Tin Tài Khoản (Chỉ đọc)
                    </h4>
                    <div className="account-display">
                      <div className="display-row">
                        <span className="label">Email:</span>
                        <span className="value">{selectedShipper.account.email}</span>
                      </div>
                      <div className="display-row">
                        <span className="label">Trạng thái:</span>
                        <span className={`value ${selectedShipper.account.is_lock ? 'locked' : 'active'}`}>
                          {selectedShipper.account.is_lock ? (
                            <>
                              <FaLock className="icon" /> Bị khóa
                            </>
                          ) : (
                            <>
                              <FaUnlock className="icon" /> Hoạt động
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="form-note">
                      <strong>Lưu ý:</strong> Chỉ có thể sửa thông tin cá nhân shipper. 
                      Email/mật khẩu do shipper tự quản lý. 
                      Sử dụng nút khóa/mở khóa để quản lý trạng thái tài khoản.
                    </div>
                  </div>
                )}

                {/* ✅ THÔNG TIN SHIPPER */}
                <div className="shipper-section">
                  <h4 className="section-title">
                    <FaUser /> Thông Tin Shipper
                  </h4>

                  {/* ✅ Thông báo về ảnh */}
                  <div className="form-note-section">
                    <div className="form-note">
                      <FaImage className="icon" />
                      <strong>Lưu ý về ảnh đại diện:</strong> Shipper sẽ tự cập nhật ảnh đại diện sau khi đăng nhập vào ứng dụng di động.
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tên Shipper: *</label>
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
                    <label>Số Điện Thoại: *</label>
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
                        checked={formData.is_online === true}
                        onChange={handleInputChange}
                      />
                      Trạng thái Online ban đầu
                    </label>
                    <span className="form-note">
                      Shipper sẽ tự quản lý trạng thái của mình sau khi đăng nhập
                    </span>
                  </div>
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
                    {loading ? 'Đang xử lý...' : (isEditing ? 'Cập Nhật Thông Tin' : 'Tạo Shipper')}
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
                {/* ✅ Hiển thị ảnh lớn trong detail modal */}
                <div className="detail-image">
                  <div className="image-container-large">
                    {renderShipperImage(selectedShipper, 'large')}
                  </div>
                </div>
                
                <div className="detail-row">
                  <span className="label">Tên Shipper:</span>
                  <span className="value">{selectedShipper.full_name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email Tài Khoản:</span>
                  <span className="value">
                    {getAccountEmail(selectedShipper)}
                    {selectedShipper.account?.is_lock && ' (Bị khóa)'}
                  </span>
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
                {selectedShipper.account && (
                  <div className="detail-row">
                    <span className="label">Trạng Thái Tài Khoản:</span>
                    <span className={`value ${selectedShipper.account.is_lock ? 'locked' : 'active'}`}>
                      {selectedShipper.account.is_lock ? (
                        <>
                          <FaLock className="icon" /> Bị khóa
                        </>
                      ) : (
                        <>
                          <FaUnlock className="icon" /> Hoạt động
                        </>
                      )}
                    </span>
                  </div>
                )}
                {selectedShipper.account && (
                  <div className="detail-row">
                    <span className="label">Role Tài Khoản:</span>
                    <span className="value">{selectedShipper.account.role}</span>
                  </div>
                )}
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