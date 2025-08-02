// src/Screens/NotificationManagement/NotificationManagement.jsx
import React, { useState, useEffect } from 'react';
import './NotificationManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import { toast } from 'react-toastify';

const NotificationManagement = () => {
    const [notes, setNotes] = useState([]);
    const [userId, setUserId] = useState('');
    const [content, setContent] = useState('');
    const [filterRead, setFilterRead] = useState('all');
    const [searchContent, setSearchContent] = useState('');
    const [users, setUsers] = useState([]);
    const [selIds, setSelIds] = useState([]);

  useEffect(() => { 
    load(); 
    // load active users for broadcast/autocomplete
    api.get('/users').then(r => setUsers(r.data.data)).catch(console.error);
  }, []);

  const load = () =>
    api.get('/notifications')
      .then(res => setNotes(res.data.data))
      .catch(() => toast.error('Không tải được thông báo'));

  const send = e => {
    e.preventDefault();
    if (!userId) {
      // gửi cho tất cả user chưa khóa
      const active = users.filter(u => !u.is_lock);
      Promise.all(active.map(u =>
        api.post('/notifications', { user_id: u._id, content })
      ))
      .then(() => {
        toast.success(`Đã gửi cho ${active.length} user`);
        setContent(''); load();
      })
      .catch(() => toast.error('Gửi thất bại'));
    } else {
      api.post('/notifications', { user_id: userId, content })
        .then(() => {
          toast.success('Đã gửi');
          setUserId(''); setContent(''); load();
        })
        .catch(() => toast.error('Gửi thất bại'));
    }
  };

  const markRead = id =>
    api.put(`/notifications/${id}`, { is_read: true })
      .then(load)
      .catch(() => toast.error('Thất bại'));

  // bulk mark read
  const markReadBulk = () => {
    Promise.all(selIds.map(id =>
      api.put(`/notifications/${id}`, { is_read: true })
    ))
    .then(() => { toast.success('Đã đánh dấu'); setSelIds([]); load(); })
    .catch(() => toast.error('Lỗi'));
  };    

    // delete single với confirm
    const delOne = id => {
      if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
        api.delete(`/notifications/${id}`)
          .then(load)
          .catch(() => toast.error('Xóa thất bại'));
      }
    }; 

    // bulk delete với confirm
    const delBulk = () => {
      if (!selIds.length) return;
      if (window.confirm(`Bạn có chắc chắn muốn xóa ${selIds.length} thông báo đã chọn?`)) {
        Promise.all(selIds.map(id => api.delete(`/notifications/${id}`)))
          .then(() => {
            toast.success('Đã xóa');
            setSelIds([]);
            load();
          })
          .catch(() => toast.error('Xóa lỗi'));
      }
    }; 

  // helpers
  const fmtDT = dt => new Date(dt).toLocaleString('vi-VN',{ hour12:false });

  // Filter and search logic
  const shown = notes.filter(n => {
    // Filter by read status
    if (filterRead === 'read' && !n.is_read) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    
    // Filter by search content
    if (searchContent && !n.content.toLowerCase().includes(searchContent.toLowerCase())) return false;
    
    return true;
  });

  return (
    <div className="notification-management">
      <TabBar />
      <h2>Quản lý thông báo</h2>
      
      <form className="notify-form" onSubmit={send}>
        <div className="form-header">
          <h3>Gửi thông báo mới</h3>
        </div>
        
        <div className="form-row">
          <div className="input-group">
            <label>👥 Người nhận</label>
            <select value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">🌐 Gửi đến tất cả người dùng</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  👤 {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
          
          <div className="input-group">
            <label>💬 Nội dung thông báo</label>
            <input
              placeholder="Nhập nội dung thông báo..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="submit-btn">
            🚀 Gửi ngay
          </button>
        </div>
      </form>

      <div className="filter-bar">
        <div className="filter-section">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input 
              placeholder="Tìm kiếm nội dung thông báo..." 
              value={searchContent}
              onChange={e => setSearchContent(e.target.value)} 
            />
          </div>
          
          <select value={filterRead} onChange={e => setFilterRead(e.target.value)}>
            <option value="all">📋 Tất cả</option>
            <option value="unread">🔔 Chưa đọc</option>
            <option value="read">✅ Đã đọc</option>
          </select>
        </div>
        
        {selIds.length > 0 && (
          <div className="bulk-actions">
            <button onClick={markReadBulk}>
              ✅ Đánh dấu đã đọc
              <span className="count-badge">{selIds.length}</span>
            </button>
            <button onClick={delBulk}>
              🗑️ Xóa
              <span className="count-badge">{selIds.length}</span>
            </button>
          </div>
        )}
      </div>

      {shown.length > 0 ? (
        <table className="notify-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox"
                  onChange={e => setSelIds(e.target.checked ? shown.map(n=>n._id) : [])}
                  checked={selIds.length === shown.length && shown.length > 0}
                />
              </th>
              <th>📊 #</th>
              <th>👤 Người dùng</th>
              <th>💬 Nội dung</th>
              <th>📅 Thời gian</th>
              <th>📖 Trạng thái</th>
              <th>⚙️ Hành động</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((n,i)=>(
              <tr key={n._id} className={n.is_read ? 'read' : ''}>
                <td>
                  <input type="checkbox"
                    checked={selIds.includes(n._id)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...selIds,n._id]
                        : selIds.filter(x=>x!==n._id);
                      setSelIds(next);
                    }}
                  />
                </td>
                <td>{i + 1}</td>
                <td className="user-info">
                  {n.user?.name || n.user?.email || n.user_id}
                </td>
                <td className="content-text" title={n.content}>
                  {n.content}
                </td>
                <td className="date-text">{fmtDT(n.created_at)}</td>
                <td>
                  <span className={`status-indicator ${n.is_read ? 'read' : 'unread'}`}>
                    {n.is_read ? '✅' : '🔔'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {!n.is_read && (
                      <button 
                        className="mark-read-btn" 
                        onClick={() => markRead(n._id)}
                      >
                        ✅ Đánh dấu
                      </button>
                    )}
                    <button 
                      className="delete-btn" 
                      onClick={() => delOne(n._id)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">Không có thông báo nào được tìm thấy</div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;