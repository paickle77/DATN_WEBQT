// src/Screens/ProductManagement/ProductManagement.jsx
import React, { useState, useEffect } from 'react';
import './ProductManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  discount_price: 0,
  image_url: '',
  branch_id: '',
  category_id: '',
  ingredient_id: '',
  stock: 0
};

const ProductManagement = () => {
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [branches, setBranches]       = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');

  // form state
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);

  // load initial data
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    api.get('/products').then(r => setProducts(r.data.data));
    api.get('/categories').then(r => setCategories(r.data.data));
    api.get('/branches').then(r => setBranches(r.data.data));
    api.get('/ingredients').then(r => setIngredients(r.data.data));
  };

  // delete
  const handleDelete = id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      api.delete(`/products/${id}`)
        .then(() => fetchAll())
        .catch(console.error);
    }
  };

  // open add form
  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  // open edit form
  const handleEdit = p => {
    setEditingId(p._id);
    setFormData({
      name: p.name,
      description: p.description,
      price: p.price,
      discount_price: p.discount_price,
      image_url: p.image_url,
      branch_id: p.branch_id,
      category_id: p.category_id,
      ingredient_id: p.ingredient_id,
      stock: p.stock
    });
    setShowForm(true);
  };

  // submit add or edit
  const handleSubmit = e => {
    e.preventDefault();
    const fn = editingId
      ? api.put(`/products/${editingId}`, formData)
      : api.post('/products', formData);

    fn.then(() => {
      fetchAll();
      setShowForm(false);
    })
    .catch(err => alert(err.response?.data?.msg || err.message));
  };

  // filter
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="product-management">
      <div><TabBarr/></div>
      <h2>Quản lý sản phẩm</h2>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm sản phẩm..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={handleAdd}>+ Thêm sản phẩm</button>
      </div>

      {showForm && (
        <form className="product-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
          <div className="form-row">
            <label>Tên:</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Loại:</label>
            <select
              required
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">--Chọn category--</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Chi nhánh:</label>
            <select
              required
              value={formData.branch_id}
              onChange={e => setFormData({...formData, branch_id: e.target.value})}
            >
              <option value="">--Chọn branch--</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Nguyên liệu:</label>
            <select
              required
              value={formData.ingredient_id}
              onChange={e => setFormData({...formData, ingredient_id: e.target.value})}
            >
              <option value="">--Chọn ingredient--</option>
              {ingredients.map(i => (
                <option key={i._id} value={i._id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Giá:</label>
            <input
              type="number"
              required
              value={formData.price}
              onChange={e => setFormData({...formData, price: +e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Giá KM:</label>
            <input
              type="number"
              value={formData.discount_price}
              onChange={e => setFormData({...formData, discount_price: +e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Stock:</label>
            <input
              type="number"
              required
              value={formData.stock}
              onChange={e => setFormData({...formData, stock: +e.target.value})}
            />
          </div>
          <div className="form-row">
            <label>Ảnh (URL):</label>
            <input
              required
              value={formData.image_url}
              onChange={e => setFormData({...formData, image_url: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button type="submit">{editingId ? 'Lưu thay đổi' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã SP</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Giá</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((p, i) => (
              <tr key={p._id}>
                <td>SP{(i+1).toString().padStart(3,'0')}</td>
                <td>{p.name}</td>
                <td>{categories.find(c=>c._id===p.category_id)?.name}</td>
                <td>{p.price.toLocaleString('vi-VN')}</td>
                <td>
                  <button onClick={() => handleEdit(p)}>Sửa</button>
                  <button onClick={() => handleDelete(p._id)}>Xóa</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">Không tìm thấy sản phẩm</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement;
