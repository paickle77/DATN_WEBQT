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
         <select value={userId} onChange={e => setUserId(e.target.value)}>
           <option value="">— Gửi đến tất cả —</option>
           {users.map(u => (
             <option key={u._id} value={u._id}>
               {u.name || u.email} ({u._id})
             </option>
           ))}
         </select>
        <input
          placeholder="Nội dung"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        />
        <button type="submit">Gửi</button>
      </form>

       <div className="filter-bar">
         <input placeholder="Tìm nội dung…" value={searchContent}
           onChange={e => setSearchContent(e.target.value)} />
         <select value={filterRead} onChange={e => setFilterRead(e.target.value)}>
           <option value="all">Tất cả</option>
           <option value="unread">Chưa đọc</option>
           <option value="read">Đã đọc</option>
         </select>
         {selIds.length > 0 && (
           <div className="bulk-actions">
             <button onClick={markReadBulk}>Đánh dấu đã đọc ({selIds.length})</button>
             <button onClick={delBulk}>Xóa ({selIds.length})</button>
           </div>
         )}
       </div>

      <table className="notify-table">
        <thead>
          <tr>
             <th><input type="checkbox"
                onChange={e => setSelIds(e.target.checked ? shown.map(n=>n._id) : [])}
                checked={selIds.length === shown.length && shown.length > 0}
             /></th>
            <th>#</th>
            <th>User</th>
            <th>Content</th>
            <th>Ngày</th>
            <th>Read</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
           {shown.map((n,i)=>(
             <tr key={n._id}
                 className={n.is_read?'read':''}>
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
              <td>{n.user?.name || n.user?.email || n.user_id}</td>
              <td>{n.content}</td>
              <td>{fmtDT(n.created_at)}</td>
              <td>{n.is_read ? '✅' : '❌'}</td>
              <td>
                 {!n.is_read && <button onClick={()=>markRead(n._id)}>Đánh dấu</button>}
                 <button onClick={()=>delOne(n._id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NotificationManagement;