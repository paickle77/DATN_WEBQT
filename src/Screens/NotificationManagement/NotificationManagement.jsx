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

  useEffect(() => { load(); }, []);
  const load = () =>
    api.get('/notifications')
      .then(res => setNotes(res.data.data))
      .catch(() => toast.error('Không tải được thông báo'));

  const send = e => {
    e.preventDefault();
    api.post('/notifications', { user_id: userId, content })
      .then(() => {
        toast.success('Đã gửi');
        setUserId(''); setContent('');
        load();
      })
      .catch(() => toast.error('Gửi thất bại'));
  };

  const markRead = id =>
    api.put(`/notifications/${id}`, { is_read: true })
      .then(load)
      .catch(() => toast.error('Thất bại'));

  return (
    <div className="notification-management">
      <TabBar />
      <h2>Quản lý thông báo</h2>
      <form className="notify-form" onSubmit={send}>
        <input
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          required
        />
        <input
          placeholder="Nội dung"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        />
        <button type="submit">Gửi</button>
      </form>
      <table className="notify-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Content</th>
            <th>Ngày</th>
            <th>Read</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((n, i) => (
            <tr key={n._id} className={n.is_read ? 'read' : ''}>
              <td>{i + 1}</td>
              <td>{n.user_id}</td>
              <td>{n.content}</td>
              <td>{new Date(n.created_at).toLocaleString()}</td>
              <td>{n.is_read ? '✅' : '❌'}</td>
              <td>
                {!n.is_read && (
                  <button onClick={() => markRead(n._id)}>
                    Đánh dấu
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NotificationManagement;
