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
  const [customerStats, setCustomerStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'locked'

  // Helper functions để xử lý dữ liệu từ API
  const getCustomerAddress = (customer) => {
    console.log('Customer address data:', {
      customer_id: customer._id,
      address_detail: customer.address_detail,
      raw_customer: customer
    });
    
    // FIX: Xử lý đúng cấu trúc address_detail từ backend
    if (customer.address_detail && customer.address_detail.full_address) {
      return customer.address_detail.full_address;
    }
    
    // Fallback: Tự tạo địa chỉ từ các trường riêng lẻ
    if (customer.address_detail) {
      const { street, ward, district, city } = customer.address_detail;
      const parts = [street, ward, district, city].filter(part => part && part.trim() !== '');
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return 'Chưa cập nhật địa chỉ';
  };

  const getCustomerOrderCount = (customer) => {
    console.log('Customer orders data:', {
      customer_id: customer._id,
      total_orders: customer.total_orders,
      raw_customer: customer
    });
    
    return customer.total_orders || 0;
  };

  const getCustomerTotalSpent = (customer) => {
    console.log('Customer spending data:', {
      customer_id: customer._id,
      total_spent: customer.total_spent,
      raw_customer: customer
    });
    
    return customer.total_spent || 0;
  };

  // Modal xem chi tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomersWithDetails();
    fetchCustomerStats();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchCustomersWithDetails = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm
      };
      
      // Thêm filter theo trạng thái
      if (statusFilter === 'active') {
        params.is_lock = false;
      } else if (statusFilter === 'locked') {
        params.is_lock = true;
      }
      
      const response = await api.get('/users/with-accounts', { params });
      
      if (response.data.success) {
        console.log('API Response:', response.data);
        console.log('Customer data sample:', response.data.data.customers[0]);
        setCustomers(response.data.data.customers);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        console.error('API returned success: false');
        alert('Không thể lấy danh sách khách hàng');
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách khách hàng:', error);
      alert('Không thể lấy danh sách khách hàng: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      // Lấy tất cả khách hàng để tính toán thống kê chính xác
      const response = await api.get('/users/with-accounts', { 
        params: { limit: 1000 } // Lấy nhiều để tính đúng stats
      });
      
      if (response.data.success) {
        const allCustomers = response.data.data.customers;
        
        // Tính toán thống kê từ dữ liệu thực tế
        const stats = {
          totalCustomers: allCustomers.length,
          activeCustomers: allCustomers.filter(c => !c.is_lock).length,
          customersWithOrders: allCustomers.filter(c => getCustomerOrderCount(c) > 0).length,
          totalRevenue: allCustomers.reduce((sum, c) => sum + (getCustomerTotalSpent(c) || 0), 0)
        };
        
        setCustomerStats(stats);
        console.log('Calculated stats:', stats);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thống kê:', error);
    }
  };

  // Xuất Excel với format đẹp hơn
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

      // Tạo tiêu đề báo cáo
      sheet.mergeCells('A1:K1');
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
      
      sheet.mergeCells('I2:K2');
      sheet.getCell('I2').value = `Tổng doanh thu: ${formatCurrency(customerStats.totalRevenue)}`;
      sheet.getCell('I2').font = { bold: true, color: { argb: 'FF059669' } };

      // Header với styling đẹp hơn
      const headers = [
        { key: 'stt', header: 'STT', width: 8 },
        { key: 'name', header: 'Họ và Tên', width: 25 },
        { key: 'email', header: 'Email', width: 30 },
        { key: 'phone', header: 'Số điện thoại', width: 15 },
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

      // Dữ liệu với format đẹp
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
          getCustomerAddress(customer),
          customer.provider === 'local' ? 'Tài khoản thường' : 
          customer.provider === 'google' ? 'Google' : 
          customer.provider === 'facebook' ? 'Facebook' : 'Khác',
          getCustomerOrderCount(customer),
          getCustomerTotalSpent(customer),
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
            horizontal: cellIndex === 1 || cellIndex === 2 || cellIndex === 4 ? 'left' : 'center',
            vertical: 'middle' 
          };

          // Format đặc biệt cho một số cột
          if (cellIndex === 7) { // Cột tổng chi tiêu
            cell.numFmt = '#,##0" đ"';
            cell.font = { bold: true, color: { argb: 'FF059669' } };
          }
          
          if (cellIndex === 9) { // Cột trạng thái
            cell.font = { 
              bold: true, 
              color: { argb: customer.is_lock ? 'FFef4444' : 'FF10b981' }
            };
          }
        });
        
        row.height = 20;
        rowIndex++;
      }

      // Thêm footer với thống kê
      const footerRow = rowIndex + 1;
      sheet.mergeCells(`A${footerRow}:K${footerRow}`);
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
      
      alert(`Xuất Excel thành công!\nFile: ${fileName}\nSố KH: ${allCustomers.length}`);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Lỗi khi xuất Excel: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Khóa/Mở khóa tài khoản
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
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản thành công!`);
      } catch (error) {
        console.error(`Lỗi khi ${action}:`, error);
        alert(`Lỗi khi ${action} tài khoản: ` + (error.response?.data?.message || error.message));
      }
    }
  };

  // Xem chi tiết khách hàng
  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
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
        
        {/* Filter theo trạng thái */}
        <div className="filter-container">
          <select 
            value={statusFilter} 
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </div>
        
        <div className="action-buttons">
          <button className="btn-success" onClick={exportToExcel} disabled={loading}>
            {loading ? '⏳ Đang xuất...' : '📊 Xuất Excel'}
          </button>
        </div>
      </div>

      {/* Modal xem chi tiết */}
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
                  <label>Địa chỉ:</label>
                  <span>{getCustomerAddress(selectedCustomer)}</span>
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
                  <span>{getCustomerOrderCount(selectedCustomer)} đơn</span>
                </div>
                <div className="detail-row">
                  <label>Tổng chi tiêu:</label>
                  <span className="currency">{formatCurrency(getCustomerTotalSpent(selectedCustomer))}</span>
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
                      <span>{c.name || 'Chưa cập nhật'}</span>
                    </div>
                  </td>
                  <td>{c.email || 'Chưa có'}</td>
                  <td>{c.phone || 'Chưa có'}</td>
                  <td className="address-cell">
                    {getCustomerAddress(c)}
                  </td>
                  <td>
                    <span className={`provider-badge provider-${c.provider}`}>
                      {c.provider === 'local' ? '🔐 Local' : 
                       c.provider === 'google' ? '🌐 Google' :
                       c.provider === 'facebook' ? '📘 Facebook' : '❓'}
                    </span>
                  </td>
                  <td>{getCustomerOrderCount(c)} đơn</td>
                  <td className="currency">{formatCurrency(getCustomerTotalSpent(c))}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    {c.is_lock ? (
                      <span className="status-locked">🔒 Đã khóa</span>
                    ) : (
                      <span className="status-active">✅ Hoạt động</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {/* Xem chi tiết */}
                    <button 
                      className="btn-view"
                      onClick={() => handleViewDetail(c)}
                      title="Xem chi tiết"
                    >
                      👁️
                    </button>
                    
                    {/* Khóa/mở khóa */}
                    <button 
                      className={c.is_lock ? "btn-unlock" : "btn-lock"}
                      onClick={() => handleToggleLock(c._id, c.is_lock, c.name)}
                      title={c.is_lock ? "Mở khóa" : "Khóa tài khoản"}
                    >
                      {c.is_lock ? '🔓' : '🔒'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="empty-state">
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