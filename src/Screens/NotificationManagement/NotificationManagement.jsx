import React, { useState, useEffect } from 'react';
import './NotificationManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import { toast } from 'react-toastify';

const NotificationManagement = () => {
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [sendType, setSendType] = useState('personal'); // 'personal' hoặc 'broadcast'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [content, setContent] = useState('');
  
  // Filter states
  const [filterRead, setFilterRead] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchContent, setSearchContent] = useState('');
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 🔥 Sử dụng endpoints riêng cho web admin
      const [notesRes, usersRes, statsRes] = await Promise.all([
        api.get('/notifications/admin/all'), // Endpoint riêng cho web admin
        api.get('/users'),
        api.get('/notifications/admin/stats') // Endpoint riêng cho thống kê
      ]);
      
      setNotes(notesRes.data.data || []);
      // Chỉ lấy user chưa bị khóa
      setUsers((usersRes.data.data || []).filter(u => !u.is_lock));
      setStats(statsRes.data.data || {});
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo');
      return;
    }

    if (content.length > 500) {
      toast.error('Nội dung không được quá 500 ký tự');
      return;
    }

    if (sendType === 'personal' && !selectedUserId) {
      toast.error('Vui lòng chọn người nhận');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (sendType === 'broadcast') {
        // Gửi broadcast - sử dụng endpoint riêng cho admin
        response = await api.post('/notifications/admin/broadcast', { 
          content: content.trim() 
        });
        toast.success(response.data.msg);
      } else {
        // Gửi cá nhân
        response = await api.post('/notifications', {
          user_id: selectedUserId,
          content: content.trim(),
          type: 'personal'
        });
        toast.success('Đã gửi thông báo cá nhân');
      }
      
      // Reset form và reload data
      setContent('');
      setSelectedUserId('');
      await loadData();
      
    } catch (error) {
      console.error('Send notification error:', error);
      toast.error(error.response?.data?.msg || 'Gửi thông báo thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}`, { is_read: true });
      toast.success('Đã đánh dấu đã đọc');
      loadData();
    } catch (error) {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const response = await api.put('/notifications/admin/bulk/mark-read', {
        notification_ids: selectedIds
      });
      toast.success(response.data.msg);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      return;
    }
    
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Đã xóa thông báo');
      loadData();
    } catch (error) {
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} thông báo đã chọn?`)) {
      return;
    }
    
    try {
      const response = await api.delete('/notifications/admin/bulk/delete', {
        data: { notification_ids: selectedIds }
      });
      toast.success(response.data.msg);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredNotes.map(n => n._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // Filter logic
  const filteredNotes = notes.filter(n => {
    // Filter by read status
    if (filterRead === 'read' && !n.is_read) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    
    // Filter by type
    if (filterType === 'global' && n.type !== 'global') return false;
    if (filterType === 'personal' && n.type !== 'personal') return false;
    
    // Filter by search content
    if (searchContent && !n.content.toLowerCase().includes(searchContent.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', { 
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="notification-management">
        <TabBar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-management">
      <TabBar />
      
      <div className="header-section">
        <h2>Quản lý thông báo</h2>
        
        {/* Statistics Cards */}
        <div className="stats-cards">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-number">{stats.total || 0}</div>
              <div className="stat-label">Tổng thông báo</div>
            </div>
          </div>
          
          <div className="stat-card unread">
            <div className="stat-icon">🔔</div>
            <div className="stat-info">
              <div className="stat-number">{stats.unread || 0}</div>
              <div className="stat-label">Chưa đọc</div>
            </div>
          </div>
          
          <div className="stat-card global">
            <div className="stat-icon">🌐</div>
            <div className="stat-info">
              <div className="stat-number">{stats.global || 0}</div>
              <div className="stat-label">Thông báo chung</div>
            </div>
          </div>
          
          <div className="stat-card personal">
            <div className="stat-icon">👤</div>
            <div className="stat-info">
              <div className="stat-number">{stats.personal || 0}</div>
              <div className="stat-label">Thông báo cá nhân</div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Notification Form */}
      <form className="notify-form" onSubmit={handleSendNotification}>
        <div className="form-header">
          <h3>📨 Gửi thông báo mới</h3>
        </div>
        
        <div className="form-content">
          {/* Send Type Selection */}
          <div className="send-type-selection">
            <div className="radio-group">
              <label className={`radio-option ${sendType === 'personal' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="personal"
                  checked={sendType === 'personal'}
                  onChange={(e) => setSendType(e.target.value)}
                />
                <span className="radio-custom"></span>
                <div className="option-content">
                  <span className="option-icon">👤</span>
                  <span className="option-text">Gửi cá nhân</span>
                </div>
              </label>
              
              <label className={`radio-option ${sendType === 'broadcast' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="broadcast"
                  checked={sendType === 'broadcast'}
                  onChange={(e) => setSendType(e.target.value)}
                />
                <span className="radio-custom"></span>
                <div className="option-content">
                  <span className="option-icon">🌐</span>
                  <span className="option-text">Gửi tất cả ({users.length} người dùng)</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-row">
            {/* User Selection - chỉ hiện khi gửi cá nhân */}
            {sendType === 'personal' && (
              <div className="input-group">
                <label>👥 Chọn người nhận</label>
                <select 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn người nhận --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email || `User ${user._id}`}
                      {user.phone && ` - ${user.phone}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="input-group flex-grow">
              <label>
                💬 Nội dung thông báo 
                <span className="char-count">({content.length}/500)</span>
              </label>
              <textarea
                placeholder={sendType === 'broadcast' 
                  ? `Nhập thông báo sẽ gửi đến tất cả ${users.length} người dùng...`
                  : "Nhập nội dung thông báo cá nhân..."
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                rows={3}
                required
              />
            </div>
            
            <div className="submit-section">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>⏳ Đang gửi...</>
                ) : (
                  <>🚀 {sendType === 'broadcast' ? 'Gửi tất cả' : 'Gửi ngay'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input 
              placeholder="Tìm kiếm nội dung thông báo..." 
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)} 
            />
          </div>
          
          <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)}>
            <option value="all">📋 Tất cả trạng thái</option>
            <option value="unread">🔔 Chưa đọc ({stats.unread || 0})</option>
            <option value="read">✅ Đã đọc ({stats.read || 0})</option>
          </select>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">📂 Tất cả loại</option>
            <option value="global">🌐 Thông báo chung</option>
            <option value="personal">👤 Thông báo cá nhân</option>
          </select>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="bulk-actions">
            <button onClick={handleBulkMarkRead} disabled={loading}>
              ✅ Đánh dấu đã đọc
              <span className="count-badge">{selectedIds.length}</span>
            </button>
            <button onClick={handleBulkDelete} disabled={loading}>
              🗑️ Xóa
              <span className="count-badge">{selectedIds.length}</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications Table */}
      {filteredNotes.length > 0 ? (
        <div className="table-container">
          <table className="notify-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input 
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedIds.length === filteredNotes.length && filteredNotes.length > 0}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredNotes.length}
                  />
                </th>
                <th>📊 STT</th>
                <th>👤 Người nhận</th>
                <th>💬 Nội dung</th>
                <th>📂 Loại</th>
                <th>📅 Thời gian</th>
                <th>📖 Trạng thái</th>
                <th>⚙️ Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((notification, index) => (
                <tr 
                  key={notification._id} 
                  className={`${notification.is_read ? 'read' : 'unread'} ${notification.type}`}
                >
                  <td className="checkbox-col">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(notification._id)}
                      onChange={(e) => handleSelectOne(notification._id, e.target.checked)}
                    />
                  </td>
                  <td className="index-col">{index + 1}</td>
                  <td className="user-info">
                    <div className="user-details">
                      <div className="user-name">
                        {notification.user_id?.name || 
                         notification.user_id?.email || 
                         'Người dùng không xác định'}
                      </div>
                      {notification.user_id?.email && notification.user_id?.name && (
                        <div className="user-email">{notification.user_id.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="content-col">
                    <div className="content-text" title={notification.content}>
                      {notification.content}
                    </div>
                    {notification.title && notification.title !== notification.content && (
                      <div className="content-title">📌 {notification.title}</div>
                    )}
                  </td>
                  <td className="type-col">
                    <span className={`type-badge ${notification.type}`}>
                      {notification.type === 'global' ? (
                        <>🌐 Chung</>
                      ) : (
                        <>👤 Cá nhân</>
                      )}
                    </span>
                  </td>
                  <td className="date-col">
                    {formatDateTime(notification.created_at)}
                  </td>
                  <td className="status-col">
                    <span className={`status-indicator ${notification.is_read ? 'read' : 'unread'}`}>
                      {notification.is_read ? (
                        <>✅ Đã đọc</>
                      ) : (
                        <>🔔 Chưa đọc</>
                      )}
                    </span>
                  </td>
                  <td className="action-col">
                    <div className="action-buttons">
                      {!notification.is_read && (
                        <button 
                          className="mark-read-btn" 
                          onClick={() => handleMarkRead(notification._id)}
                          title="Đánh dấu đã đọc"
                        >
                          ✅
                        </button>
                      )}
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(notification._id)}
                        title="Xóa thông báo"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            {searchContent || filterRead !== 'all' || filterType !== 'all' ? '🔍' : '📭'}
          </div>
          <div className="empty-text">
            {searchContent || filterRead !== 'all' || filterType !== 'all' 
              ? 'Không tìm thấy thông báo phù hợp với bộ lọc'
              : 'Chưa có thông báo nào'
            }
          </div>
          {(searchContent || filterRead !== 'all' || filterType !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchContent('');
                setFilterRead('all');
                setFilterType('all');
              }}
            >
              🗑️ Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;