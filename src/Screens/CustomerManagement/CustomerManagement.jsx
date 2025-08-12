// src/Screens/CustomerManagement/CustomerManagement.jsx
import React, { useState, useEffect } from 'react';
import './CustomerManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
// Excel export
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../../utils/api';

const emptyCustomer = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  birth_date: '',
  is_lock: false,
  address_id: ''
};

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [customerStats, setCustomerStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCustomersWithDetails();
    fetchAddresses();
    fetchCustomerStats();
  }, [currentPage, searchTerm]);

  // ✅ Sử dụng API mới để lấy khách hàng với thông tin đầy đủ
  const fetchCustomersWithDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/with-accounts', {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm
        }
      });
      
      if (response.data.success) {
        setCustomers(response.data.data.customers);
        setTotalPages(response.data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách khách hàng:', error);
      alert('Không thể lấy danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Lấy thống kê khách hàng
  const fetchCustomerStats = async () => {
    try {
      const response = await api.get('/users/stats');
      if (response.data.success) {
        setCustomerStats(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await api.get('/addresses');
      if (response.data.success) {
        setAddresses(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy địa chỉ:', error);
    }
  };

  // ✅ Xuất Excel với thông tin đầy đủ
  const exportToExcel = async () => {
    try {
      setLoading(true);
      // Lấy tất cả khách hàng để xuất
      const response = await api.get('/users/with-accounts', {
        params: { limit: 1000 }
      });
      
      const allCustomers = response.data.data.customers;
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Khách hàng');

      // Header với thông tin đầy đủ
      const headers = [
        '#', 'Tên', 'Email', 'SĐT', 'Giới tính', 'Tuổi', 
        'Địa chỉ', 'Trạng thái', 'Loại TK', 'Tổng đơn hàng', 
        'Tổng chi tiêu', 'Ngày tạo'
      ];
      sheet.addRow(headers);
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Dữ liệu
      allCustomers.forEach((c, i) => {
        sheet.addRow([
          i + 1,
          c.name || '',
          c.email || '',
          c.phone || '',
          c.gender === 'male' ? 'Nam' : c.gender === 'female' ? 'Nữ' : 'Khác',
          c.age || '',
          c.address_detail?.full_address || '',
          c.is_lock ? 'Đã khóa' : 'Hoạt động',
          c.provider === 'local' ? 'Tài khoản thường' : 
          c.provider === 'google' ? 'Google' : 
          c.provider === 'facebook' ? 'Facebook' : '',
          c.total_orders || 0,
          c.total_spent ? c.total_spent.toLocaleString('vi-VN') + ' đ' : '0 đ',
          c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''
        ]);
      });

      // Tự động điều chỉnh độ rộng cột
      sheet.columns.forEach(col => {
        let maxLen = 10;
        col.eachCell({ includeEmpty: true }, cell => {
          const cellValue = cell.value?.toString() || '';
          if (cellValue.length > maxLen) maxLen = cellValue.length;
        });
        col.width = Math.min(maxLen + 2, 50);
      });

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `KhachHang_${new Date().toISOString().slice(0,10)}.xlsx`);
      
      alert('Xuất Excel thành công!');
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Lỗi khi xuất Excel');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Xóa khách hàng
  const handleDelete = async (id) => {
    if (window.confirm('Xóa khách hàng này? Hành động này không thể hoàn tác!')) {
      try {
        await api.delete(`/users/${id}`);
        fetchCustomersWithDetails();
        alert('Xóa khách hàng thành công!');
      } catch (error) {
        console.error('Lỗi khi xóa:', error);
        alert('Lỗi khi xóa khách hàng');
      }
    }
  };

  // ✅ Khóa/Mở khóa tài khoản - sử dụng API mới
  const handleToggleLock = async (userId, currentLockStatus) => {
    const action = currentLockStatus ? 'mở khóa' : 'khóa';
    const reason = currentLockStatus ? '' : prompt('Nhập lý do khóa tài khoản:');
    
    if (!currentLockStatus && !reason) {
      alert('Vui lòng nhập lý do khóa tài khoản');
      return;
    }

    if (window.confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) {
      try {
        await api.put(`/users/${userId}/toggle-lock`, {
          is_lock: !currentLockStatus,
          reason: reason
        });
        
        fetchCustomersWithDetails();
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản thành công!`);
      } catch (error) {
        console.error(`Lỗi khi ${action}:`, error);
        alert(`Lỗi khi ${action} tài khoản`);
      }
    }
  };

  // ✅ Thêm/Sửa khách hàng
  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyCustomer);
    setShowForm(true);
  };
  
  const handleEdit = (c) => {
    setEditingId(c._id);
    setFormData({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      gender: c.gender || '',
      birth_date: c.birth_date ? c.birth_date.split('T')[0] : '',
      is_lock: c.is_lock || false,
      address_id: c.address_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, formData);
        alert('Cập nhật thông tin thành công!');
      } else {
        await api.post('/users', formData);
        alert('Thêm khách hàng thành công!');
      }
      
      fetchCustomersWithDetails();
      setShowForm(false);
    } catch (error) {
      console.error('Lỗi khi lưu:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // ✅ Tìm kiếm với debounce
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset về trang đầu khi search
  };

  // ✅ Format giá tiền VND
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  // ✅ Format ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // ✅ Tính tuổi
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="customer-management">
      <TabBarr />
      <h2>Quản lý khách hàng</h2>

      {/* ✅ Thống kê tổng quan */}
      {Object.keys(customerStats).length > 0 && (
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{customerStats.totalCustomers || 0}</div>
            <div className="stat-label">Tổng khách hàng</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{customerStats.activeCustomers || 0}</div>
            <div className="stat-label">Đang hoạt động</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{customerStats.customersWithOrders || 0}</div>
            <div className="stat-label">Đã mua hàng</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{formatCurrency(customerStats.totalRevenue)}</div>
            <div className="stat-label">Tổng doanh thu</div>
          </div>
        </div>
      )}

      <div className="top-bar">
        <div className="search-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <button className="btn-primary" onClick={handleAdd}>
            ➕ Thêm khách hàng
          </button>
          <button className="btn-success" onClick={exportToExcel} disabled={loading}>
            {loading ? '⏳ Đang xuất...' : '📊 Xuất Excel'}
          </button>
        </div>
      </div>

      {/* ✅ Form thêm/sửa với các trường đầy đủ */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <form className="customer-form" onSubmit={handleSubmit}>
              <h3>{editingId ? '✏️ Sửa khách hàng' : '➕ Thêm khách hàng'}</h3>
              
              <div className="form-grid">
                <div className="form-row">
                  <label>👤 Tên:</label>
                  <input required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nhập tên khách hàng"
                  />
                </div>
                
                <div className="form-row">
                  <label>📧 Email:</label>
                  <input type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Nhập email"
                  />
                </div>
                
                <div className="form-row">
                  <label>📱 Số điện thoại:</label>
                  <input required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                
                <div className="form-row">
                  <label>⚥ Giới tính:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="">--Chọn giới tính--</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                
                <div className="form-row">
                  <label>🎂 Ngày sinh:</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>
                
                <div className="form-row">
                  <label>🏠 Địa chỉ:</label>
                  <select
                    value={formData.address_id}
                    onChange={(e) => setFormData({...formData, address_id: e.target.value})}
                  >
                    <option value="">--Chọn địa chỉ--</option>
                    {addresses.map((a) => (
                      <option key={a._id} value={a._id}>
                        {`${a.street || ''}, ${a.ward || ''}, ${a.district || ''}, ${a.city || ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row checkbox-row">
                <label>🔒 Khóa tài khoản:</label>
                <input
                  type="checkbox"
                  checked={formData.is_lock}
                  onChange={(e) => setFormData({...formData, is_lock: e.target.checked})}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? '⏳' : (editingId ? '💾 Lưu' : '✅ Tạo')}
                </button>
                <button type="button" onClick={() => setShowForm(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Bảng với thông tin đầy đủ */}
      <div className="table-wrapper">
        {loading && <div className="loading-overlay">⏳ Đang tải...</div>}
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>👤 Tên</th>
              <th>📧 Email</th>
              <th>📱 SĐT</th>
              <th>⚥ GT</th>
              <th>🎂 Tuổi</th>
              <th>🏠 Địa chỉ</th>
              <th>🔑 Loại TK</th>
              <th>📊 Đơn hàng</th>
              <th>💰 Tổng chi</th>
              <th>📅 Ngày tạo</th>
              <th>📊 Trạng thái</th>
              <th>⚙️ Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? (
              customers.map((c, i) => (
                <tr key={c._id} className={c.is_lock ? 'locked-row' : ''}>
                  <td>{(currentPage - 1) * 20 + i + 1}</td>
                  <td>
                    <div className="customer-info">
                      <img 
                        src={c.display_avatar} 
                        alt="avatar" 
                        className="customer-avatar"
                        onError={(e) => {e.target.src = '/default-avatar.png'}}
                      />
                      <span>{c.name || 'Chưa cập nhật'}</span>
                    </div>
                  </td>
                  <td>{c.email || 'Chưa có'}</td>
                  <td>{c.phone || 'Chưa có'}</td>
                  <td>
                    {c.gender === 'male' ? '👨 Nam' : 
                     c.gender === 'female' ? '👩 Nữ' : 
                     c.gender === 'other' ? '🤷 Khác' : '❓'}
                  </td>
                  <td>{c.age ? `${c.age} tuổi` : '❓'}</td>
                  <td className="address-cell">
                    {c.address_detail?.full_address || 'Chưa cập nhật'}
                  </td>
                  <td>
                    <span className={`provider-badge provider-${c.provider}`}>
                      {c.provider === 'local' ? '🔐 Local' : 
                       c.provider === 'google' ? '🌐 Google' :
                       c.provider === 'facebook' ? '📘 Facebook' : '❓'}
                    </span>
                  </td>
                  <td>{c.total_orders || 0} đơn</td>
                  <td className="currency">{formatCurrency(c.total_spent)}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    {c.is_lock ? (
                      <span className="status-locked">🔒 Đã khóa</span>
                    ) : (
                      <span className="status-active">✅ Hoạt động</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEdit(c)}
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(c._id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                    <button 
                      className={c.is_lock ? "btn-unlock" : "btn-lock"}
                      onClick={() => handleToggleLock(c._id, c.is_lock)}
                      title={c.is_lock ? "Mở khóa" : "Khóa tài khoản"}
                    >
                      {c.is_lock ? '🔓' : '🔒'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="empty-state">
                  {loading ? '⏳ Đang tải dữ liệu...' : '📋 Không tìm thấy khách hàng nào'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Phân trang */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Trước
          </button>
          
          <span className="page-info">
            Trang {currentPage} / {totalPages}
          </span>
          
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;