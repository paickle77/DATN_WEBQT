// src/Screens/VoucherUserManagement/VoucherUserManagement.jsx
import React, { useState, useEffect } from 'react';
import './VoucherUserManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';

const STATUSES = ['active','used','expired'];

const VoucherUserManagement = () => {
  const [data, setData]           = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [editing, setEditing]           = useState(null); // chứa bản ghi đang edit

  useEffect(() => { fetchAll(); }, []);

  function fetchAll() {
  // nếu bạn đang ở màn admin, hãy gọi endpoint admin:
  api.get('/admin/voucher_users')
     .then(r => setData(r.data.data))
     .catch(console.error);
}


  const filtered = data.filter(vu => {
    if (filterStatus !== 'all' && vu.status !== filterStatus) return false;
    const term = searchTerm.toLowerCase();
    return vu.user_id?.name.toLowerCase().includes(term)
        || vu.voucher_id?.code.toLowerCase().includes(term);
  });

  const saveStatus = (id, status) => {
    api.put(`/voucher_users/${id}`, { status })
       .then(fetchAll)
       .catch(err => alert(err.message));
  };

  const del = id => {
    if (!window.confirm('Xóa voucher user này?')) return;
    api.delete(`/voucher_users/${id}`)
       .then(fetchAll)
       .catch(err => alert(err.message));
  };

  return (
    <div className="voucher-user-management">
      <TabBar />
      <h2>Quản lý Voucher của User</h2>

      <div className="controls">
        <input
          placeholder="Search user or code..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={fetchAll}>Làm mới</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Voucher Code</th>
              <th>Discount</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Ngày dùng</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vu,i) => (
              <tr key={vu._id}>
                <td>{i+1}</td>
                <td>{vu.user_id?.name} ({vu.user_id?.email})</td>
                <td>{vu.voucher_id?.code}</td>
                <td>{vu.voucher_id?.discount_percent}%</td>
                <td>{new Date(vu.start_date).toLocaleDateString()}</td>
                <td>
                  <select
                    value={vu.status}
                    onChange={e => saveStatus(vu._id, e.target.value)}
                  >
                    {STATUSES.map(s =>
                      <option key={s} value={s}>{s}</option>
                    )}
                  </select>
                </td>
                <td>
                  {vu.used_date
                    ? new Date(vu.used_date).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  <button onClick={() => del(vu._id)}>Xóa</button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr>
                <td colSpan="8" style={{ textAlign:'center' }}>
                  Không tìm thấy...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VoucherUserManagement;
