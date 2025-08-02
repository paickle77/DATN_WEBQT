// src/Screens/LogManagement/LogManagement.jsx
import React, { useState, useEffect } from 'react';
import './LogManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const LogManagement = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLoading(true);
    api.get('/logs')
      .then(res => {
        setLogs(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Helper function to get action class
  const getActionClass = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('add')) return 'action-create';
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'action-update';
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'action-delete';
    if (actionLower.includes('login') || actionLower.includes('auth')) return 'action-login';
    return 'action-view';
  };

  // Helper function to get log level class
  const getLogLevelClass = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('error') || actionLower.includes('delete')) return 'log-error';
    if (actionLower.includes('warning') || actionLower.includes('warn')) return 'log-warning';
    if (actionLower.includes('success') || actionLower.includes('create')) return 'log-success';
    return 'log-info';
  };

  // Filter logs based on search criteria
  const filteredLogs = logs.filter(log => {
    const matchUser = !searchUser || 
      log.user_id.toLowerCase().includes(searchUser.toLowerCase());
    
    const matchAction = !searchAction || 
      log.action.toLowerCase().includes(searchAction.toLowerCase());
    
    const matchDate = !dateFilter || 
      log.created_at.startsWith(dateFilter);
    
    return matchUser && matchAction && matchDate;
  });

  // Calculate stats
  const stats = {
    total: logs.length,
    today: logs.filter(log => {
      const today = new Date().toISOString().split('T')[0];
      return log.created_at.startsWith(today);
    }).length,
    users: new Set(logs.map(log => log.user_id)).size,
    actions: new Set(logs.map(log => log.action)).size
  };

  return (
    <div className="log-management">
      <TabBar />
      <h2>Audit Trail</h2>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-label">Tổng số logs</div>
          <div className="stat-value">{stats.total.toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-label">Hôm nay</div>
          <div className="stat-value">{stats.today.toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-label">Người dùng</div>
          <div className="stat-value">{stats.users.toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-label">Hành động</div>
          <div className="stat-value">{stats.actions.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Bộ lọc và tìm kiếm</h3>
        </div>
        
        <div className="filters-row">
          <div className="filter-group">
            <label>👤 Tìm theo User ID</label>
            <input
              type="text"
              placeholder="Nhập User ID..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>⚡ Tìm theo hành động</label>
            <input
              type="text"
              placeholder="Nhập tên hành động..."
              value={searchAction}
              onChange={e => setSearchAction(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>📅 Lọc theo ngày</label>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          
          <button 
            className="refresh-btn" 
            onClick={loadLogs}
            disabled={loading}
          >
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div className="loading-text">Đang tải dữ liệu audit trail...</div>
        </div>
      ) : filteredLogs.length > 0 ? (
        <table className="log-table">
          <thead>
            <tr>
              <th>📊 #</th>
              <th>👤 User ID</th>
              <th>⚡ Hành động</th>
              <th>🕒 Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr 
                key={log._id} 
                className={getLogLevelClass(log.action)}
              >
                <td>{index + 1}</td>
                <td>
                  <span className="user-id">{log.user_id}</span>
                </td>
                <td>
                  <span className={`action-text ${getActionClass(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td>
                  <span className="timestamp">
                    {formatDate(log.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">Không có dữ liệu</div>
          <div className="empty-text">
            {logs.length === 0 
              ? "Chưa có log nào được ghi lại trong hệ thống"
              : "Không tìm thấy log nào phù hợp với bộ lọc hiện tại"
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default LogManagement;