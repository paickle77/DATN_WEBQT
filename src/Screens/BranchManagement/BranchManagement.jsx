import React, { useState, useEffect } from 'react';
import './BranchManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyBranch = { name:'', address:'', phone:'' };

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyBranch);
  const [editingId, setEditingId] = useState(null);

  // Chỉ có 1 useEffect đúng:
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () =>
    api.get('/branches')
       .then(r => setBranches(r.data.data))
       .catch(console.error);

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyBranch);
    setShowForm(true);
  };
  const handleEdit = b => {
    setEditingId(b._id);
    setFormData({ name: b.name, address: b.address, phone: b.phone });
    setShowForm(true);
  };
  const handleDelete = id => {
    if (window.confirm('Xóa chi nhánh?')) api.delete(`/branches/${id}`).then(fetchAll);
  };
  const handleSubmit = e => {
    e.preventDefault();
    const req = editingId
      ? api.put(`/branches/${editingId}`, formData)
      : api.post('/branches', formData);
    req.then(() => {
      fetchAll();
      setShowForm(false);
    }).catch(err => alert(err.message));
  };

  return (
    <div className="branch-management">
      <TabBarr />
      <h2>Quản lý chi nhánh</h2>
      <div className="top-bar">
        <input
          placeholder="Tìm chi nhánh..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={handleAdd}>+ Thêm chi nhánh</button>
      </div>
      {showForm && (
        <form className="branch-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</h3>
          {['name','address','phone'].map(key => (
            <div className="form-row" key={key}>
              <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                required
                value={formData[key]}
                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="form-actions">
            <button type="submit">{editingId ? 'Lưu' : 'Tạo'}</button>
            <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Address</th><th>Phone</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => (
              <tr key={b._id}>
                <td>{i+1}</td>
                <td>{b.name}</td>
                <td>{b.address}</td>
                <td>{b.phone}</td>
                <td>
                  <button onClick={() => handleEdit(b)}>Sửa</button>
                  <button onClick={() => handleDelete(b._id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchManagement;
