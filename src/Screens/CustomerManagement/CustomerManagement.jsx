// src/Screens/CustomerManagement/CustomerManagement.jsx
import React, { useState, useEffect } from 'react';
import './CustomerManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
// Excel export
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../../utils/api';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [customerStats, setCustomerStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // ✅ Chỉ giữ lại modal xem chi tiết, không cho sửa
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomersWithDetails();
    fetchAddresses();
    fetchCustomerStats();
  }, [currentPage, searchTerm]);

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

  // ✅ Cải tiến chức năng xuất Excel với format đẹp hơn
  const exportToExcel = async () => {
    try {
      setLoading(true);
      
      // Lấy tất cả khách hàng để xuất
      const response = await api.get('/users/with-accounts', {
        params: { limit: 1000 }
      });
      
      const allCustomers = response.data.data.customers;
      
      const workbook = new ExcelJS.Workbook();
      
      // Thông tin workbook
      workbook.creator = 'Hệ thống quản lý';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      const sheet = workbook.addWorksheet('Danh Sách Khách Hàng', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });

      // ✅ Tạo tiêu đề báo cáo
      sheet.mergeCells('A1:M1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BÁO CÁO DANH SÁCH KHÁCH HÀNG';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FF1f2937' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFe0e7ff' }
      };
      titleCell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      // Thông tin thời gian và thống kê
      sheet.mergeCells('A2:D2');
      sheet.getCell('A2').value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`;
      sheet.getCell('A2').font = { italic: true };
      
      sheet.mergeCells('E2:H2');
      sheet.getCell('E2').value = `Tổng số KH: ${customerStats.totalCustomers || allCustomers.length}`;
      sheet.getCell('E2').font = { bold: true };
      
      sheet.mergeCells('I2:M2');
      sheet.getCell('I2').value = `Tổng doanh thu: ${formatCurrency(customerStats.totalRevenue)}`;
      sheet.getCell('I2').font = { bold: true, color: { argb: 'FF059669' } };

      // ✅ Header với styling đẹp hơn
      const headers = [
        { key: 'stt', header: 'STT', width: 8 },
        { key: 'name', header: 'Họ và Tên', width: 25 },
        { key: 'email', header: 'Email', width: 30 },
        { key: 'phone', header: 'Số điện thoại', width: 15 },
        { key: 'gender', header: 'Giới tính', width: 12 },
        { key: 'age', header: 'Tuổi', width: 8 },
        { key: 'address', header: 'Địa chỉ', width: 40 },
        { key: 'account_type', header: 'Loại tài khoản', width: 15 },
        { key: 'total_orders', header: 'Tổng đơn', width: 12 },
        { key: 'total_spent', header: 'Tổng chi tiêu', width: 18 },
        { key: 'last_order', header: 'Đơn cuối', width: 15 },
        { key: 'status', header: 'Trạng thái', width: 15 },
        { key: 'created_date', header: 'Ngày tạo', width: 15 }
      ];

      const headerRow = sheet.getRow(4);
      headers.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: 'FFffffff' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667eea' }
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getColumn(index + 1).width = col.width;
      });

      headerRow.height = 25;

      // ✅ Dữ liệu với format đẹp và đầy đủ thông tin
      let rowIndex = 5;
      for (const [index, customer] of allCustomers.entries()) {
        const row = sheet.getRow(rowIndex);
        
        // Màu xen kẽ
        const fillColor = index % 2 === 0 ? 'FFf8fafc' : 'FFffffff';
        
        const cellData = [
          index + 1,
          customer.name || 'Chưa cập nhật',
          customer.email || 'Chưa có',
          customer.phone || 'Chưa có',
          customer.gender === 'male' ? 'Nam' : 
          customer.gender === 'female' ? 'Nữ' : 
          customer.gender === 'other' ? 'Khác' : 'Chưa xác định',
          customer.age ? `${customer.age} tuổi` : 'N/A',
          customer.address_detail?.full_address || 'Chưa cập nhật',
          customer.provider === 'local' ? 'Tài khoản thường' : 
          customer.provider === 'google' ? 'Google' : 
          customer.provider === 'facebook' ? 'Facebook' : 'Khác',
          customer.total_orders || 0,
          customer.total_spent || 0,
          customer.last_order_date ? formatDate(customer.last_order_date) : 'Chưa có',
          customer.is_lock ? 'Đã khóa' : 'Hoạt động',
          formatDate(customer.created_at)
        ];

        cellData.forEach((value, cellIndex) => {
          const cell = row.getCell(cellIndex + 1);
          cell.value = value;
          
          // Styling cho từng cell
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor }
          };
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
            bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
            left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
            right: { style: 'thin', color: { argb: 'FFe2e8f0' } }
          };
          
          cell.alignment = { 
            horizontal: cellIndex === 1 || cellIndex === 2 || cellIndex === 6 ? 'left' : 'center',
            vertical: 'middle' 
          };

          // Format đặc biệt cho một số cột
          if (cellIndex === 9) { // Cột tổng chi tiêu
            cell.numFmt = '#,##0" đ"';
            cell.font = { bold: true, color: { argb: 'FF059669' } };
          }
          
          if (cellIndex === 12) { // Cột trạng thái
            cell.font = { 
              bold: true, 
              color: { argb: customer.is_lock ? 'FFef4444' : 'FF10b981' }
            };
          }
        });
        
        row.height = 20;
        rowIndex++;
      }

      // ✅ Thêm footer với thống kê
      const footerRow = rowIndex + 1;
      sheet.mergeCells(`A${footerRow}:M${footerRow}`);
      const footerCell = sheet.getCell(`A${footerRow}`);
      footerCell.value = `Báo cáo được tạo tự động bởi hệ thống quản lý - ${new Date().toLocaleString('vi-VN')}`;
      footerCell.font = { italic: true, size: 10 };
      footerCell.alignment = { horizontal: 'center' };
      
      // Thêm thống kê tóm tắt
      const summaryStartRow = footerRow + 2;
      const summaryData = [
        ['THỐNG KÊ TỔNG QUAN', '', '', ''],
        ['Tổng số khách hàng:', allCustomers.length, 'Đang hoạt động:', allCustomers.filter(c => !c.is_lock).length],
        ['Đã khóa:', allCustomers.filter(c => c.is_lock).length, 'Có đơn hàng:', allCustomers.filter(c => c.total_orders > 0).length],
        ['Doanh thu tổng:', formatCurrency(allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0)), '', '']
      ];

      summaryData.forEach((rowData, index) => {
        const row = sheet.getRow(summaryStartRow + index);
        rowData.forEach((value, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          cell.value = value;
          if (index === 0) {
            cell.font = { bold: true, size: 12 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe0e7ff' } };
          } else {
            cell.font = { bold: colIndex % 2 === 0 };
          }
        });
      });

      // Xuất file với tên có timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const fileName = `DanhSachKhachHang_${timestamp}.xlsx`;
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
      
      alert(`✅ Xuất Excel thành công!\nFile: ${fileName}\nSố KH: ${allCustomers.length}`);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('❌ Lỗi khi xuất Excel: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Thay đổi từ xóa thành vô hiệu hóa tài khoản
  const handleDeactivateAccount = async (id, customerName) => {
    const reason = prompt(`Vô hiệu hóa tài khoản "${customerName}"?\nVui lòng nhập lý do:`);
    if (!reason) {
      alert('Vui lòng nhập lý do vô hiệu hóa');
      return;
    }

    if (window.confirm(`Xác nhận vô hiệu hóa tài khoản "${customerName}"?\nLý do: ${reason}`)) {
      try {
        await api.put(`/users/${id}/deactivate`, { reason });
        fetchCustomersWithDetails();
        alert('✅ Vô hiệu hóa tài khoản thành công!');
      } catch (error) {
        console.error('Lỗi khi vô hiệu hóa:', error);
        alert('❌ Lỗi khi vô hiệu hóa tài khoản');
      }
    }
  };

  // ✅ Khóa/Mở khóa tài khoản với lý do rõ ràng
  const handleToggleLock = async (userId, currentLockStatus, customerName) => {
    const action = currentLockStatus ? 'mở khóa' : 'khóa';
    let reason = '';
    
    if (!currentLockStatus) {
      reason = prompt(`Khóa tài khoản "${customerName}"?\nVui lòng nhập lý do khóa:`);
      if (!reason) {
        alert('Vui lòng nhập lý do khóa tài khoản');
        return;
      }
    }

    if (window.confirm(`Xác nhận ${action} tài khoản "${customerName}"?${reason ? `\nLý do: ${reason}` : ''}`)) {
      try {
        await api.put(`/users/${userId}/toggle-lock`, {
          is_lock: !currentLockStatus,
          reason: reason,
          admin_note: `${action} bởi admin lúc ${new Date().toLocaleString('vi-VN')}`
        });
        
        fetchCustomersWithDetails();
        alert(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản thành công!`);
      } catch (error) {
        console.error(`Lỗi khi ${action}:`, error);
        alert(`❌ Lỗi khi ${action} tài khoản`);
      }
    }
  };

  // ✅ Chỉ xem chi tiết, không cho sửa
  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="customer-management">
      <TabBarr />
      <h2>Quản lý khách hàng</h2>

      {/* Thống kê tổng quan */}
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
          {/* ✅ Bỏ nút thêm khách hàng - KH tự đăng ký */}
          <button className="btn-success" onClick={exportToExcel} disabled={loading}>
            {loading ? '⏳ Đang xuất...' : '📊 Xuất Excel'}
          </button>
        </div>
      </div>

      {/* ✅ Modal xem chi tiết (chỉ đọc) */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="customer-detail">
              <h3>👤 Chi tiết khách hàng</h3>
              <div className="detail-grid">
                <div className="detail-row">
                  <label>Tên:</label>
                  <span>{selectedCustomer.name || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-row">
                  <label>Email:</label>
                  <span>{selectedCustomer.email || 'Chưa có'}</span>
                </div>
                <div className="detail-row">
                  <label>Số điện thoại:</label>
                  <span>{selectedCustomer.phone || 'Chưa có'}</span>
                </div>
                <div className="detail-row">
                  <label>Giới tính:</label>
                  <span>
                    {selectedCustomer.gender === 'male' ? 'Nam' : 
                     selectedCustomer.gender === 'female' ? 'Nữ' : 
                     selectedCustomer.gender === 'other' ? 'Khác' : 'Chưa xác định'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Tuổi:</label>
                  <span>{selectedCustomer.age ? `${selectedCustomer.age} tuổi` : 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>Địa chỉ:</label>
                  <span>{selectedCustomer.address_detail?.full_address || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-row">
                  <label>Loại tài khoản:</label>
                  <span>
                    {selectedCustomer.provider === 'local' ? 'Tài khoản thường' : 
                     selectedCustomer.provider === 'google' ? 'Google' : 
                     selectedCustomer.provider === 'facebook' ? 'Facebook' : 'Khác'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Tổng đơn hàng:</label>
                  <span>{selectedCustomer.total_orders || 0} đơn</span>
                </div>
                <div className="detail-row">
                  <label>Tổng chi tiêu:</label>
                  <span className="currency">{formatCurrency(selectedCustomer.total_spent)}</span>
                </div>
                <div className="detail-row">
                  <label>Ngày tạo:</label>
                  <span>{formatDate(selectedCustomer.created_at)}</span>
                </div>
                <div className="detail-row">
                  <label>Trạng thái:</label>
                  <span className={selectedCustomer.is_lock ? 'status-locked' : 'status-active'}>
                    {selectedCustomer.is_lock ? '🔒 Đã khóa' : '✅ Hoạt động'}
                  </span>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowDetailModal(false)}>
                  ❌ Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
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
                    {/* ✅ Chỉ xem chi tiết, không sửa */}
                    <button 
                      className="btn-view"
                      onClick={() => handleViewDetail(c)}
                      title="Xem chi tiết"
                    >
                      👁️
                    </button>
                    
                    {/* ✅ Khóa/mở khóa với lý do */}
                    <button 
                      className={c.is_lock ? "btn-unlock" : "btn-lock"}
                      onClick={() => handleToggleLock(c._id, c.is_lock, c.name)}
                      title={c.is_lock ? "Mở khóa" : "Khóa tài khoản"}
                    >
                      {c.is_lock ? '🔓' : '🔒'}
                    </button>
                    
                    {/* ✅ Vô hiệu hóa thay vì xóa */}
                    {!c.is_lock && (
                      <button 
                        className="btn-deactivate"
                        onClick={() => handleDeactivateAccount(c._id, c.name)}
                        title="Vô hiệu hóa tài khoản"
                      >
                        🚫
                      </button>
                    )}
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

      {/* Phân trang */}
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