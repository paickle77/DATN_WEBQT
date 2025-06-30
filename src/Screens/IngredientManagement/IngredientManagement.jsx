import React, { useState, useEffect } from 'react';
import './IngredientManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyIngredient = {
  name: '',
  unit: '',
  stock_quantity: 0,
  price_per_unit: 0,
  updated_at: null
};

const IngredientManagement = () => {
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyIngredient);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll = () => api.get('/ingredients').then(r=>setIngredients(r.data.data)).catch(console.error);
  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAdd = () => { setEditingId(null); setFormData(emptyIngredient); setShowForm(true); };
  const handleEdit = ing => { setEditingId(ing._id); setFormData({ ...ing, updated_at: new Date(ing.updated_at) }); setShowForm(true); };
  const handleDelete = id => { if(window.confirm('Xóa nguyên liệu?')) api.delete(`/ingredients/${id}`).then(fetchAll); };
  const handleSubmit = e => {
    e.preventDefault();
    const payload = { ...formData, updated_at: new Date() };
    const req = editingId
      ? api.put(`/ingredients/${editingId}`, payload)
      : api.post('/ingredients', payload);
    req.then(()=>{ fetchAll(); setShowForm(false); }).catch(err=>alert(err.message));
  };

  return (
    <div className="ingredient-management">
      <TabBarr />
      <h2>Quản lý nguyên liệu</h2>
      <div className="top-bar">
        <input placeholder="Tìm nguyên liệu..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        <button onClick={handleAdd}>+ Thêm nguyên liệu</button>
      </div>
      {showForm && (
        <form className="ingredient-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'}</h3>
          {['name','unit','stock_quantity','price_per_unit'].map(key=> (
            <div className="form-row" key={key}>
              <label>{key.replace(/_/g,' ')}</label>
              <input
                type={['stock_quantity','price_per_unit'].includes(key)?'number':'text'}
                required
                value={formData[key]}
                onChange={e=>setFormData({...formData,[key]: ['stock_quantity','price_per_unit'].includes(key)?+e.target.value:e.target.value })}
              />
            </div>
          ))}
          <div className="form-actions">
            <button type="submit">{editingId? 'Lưu':'Tạo'}</button>
            <button type="button" onClick={()=>setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}
      <div className="table-wrapper">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Unit</th><th>Stock</th><th>Price/unit</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map((ing,i)=>(
            <tr key={ing._id}>
              <td>{i+1}</td>
              <td>{ing.name}</td>
              <td>{ing.unit}</td>
              <td>{ing.stock_quantity}</td>
              <td>{ing.price_per_unit.toLocaleString()}</td>
              <td>{new Date(ing.updated_at).toLocaleDateString()}</td>
              <td>
                <button onClick={()=>handleEdit(ing)}>Sửa</button>
                <button onClick={()=>handleDelete(ing._id)}>Xóa</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default IngredientManagement;