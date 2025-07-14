import React, { useState, useEffect } from 'react';
import './ProductManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

// Thay ID dưới đây thành đúng _id của Category "Bánh kem" và "Bánh quy"
const defaultSizesMap = {
  '64b1e1e18d28e450e97d8d01': [  // ví dụ category_id của bánh kem
    { size: '10cm', quantity: 0, price_increase: 0 },
    { size: '15cm', quantity: 0, price_increase: 0 },
    { size: '20cm', quantity: 0, price_increase: 0 }
  ],
  '64b1e1e18d28e450e97d8d02': [  // ví dụ category_id của bánh quy
    { size: '100g', quantity: 0, price_increase: 0 },
    { size: '200g', quantity: 0, price_increase: 0 },
    { size: '300g', quantity: 0, price_increase: 0 }
  ]
};
// Form mặc định, bao gồm sizes với price_increase và ingredient_ids
const emptyForm = {
  name: '',
  description: '',
  price: 0,
  discount_price: 0,
  image_url: '',
  branch_id: '',
  category_id: '',
  sizes: [],
    ingredient_ids: [],
};

const ProductManagement = () => {
  const [productsRaw, setProductsRaw] = useState([]);
  const [sizesData, setSizesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    api.get('/products')
       .then(r => setProductsRaw(r.data.data))
       .catch(console.error);
    api.get('/sizes')
       .then(r => setSizesData(r.data.data))
       .catch(console.error);
    api.get('/categories')
       .then(r => setCategories(r.data.data))
       .catch(console.error);
    api.get('/branches')
       .then(r => setBranches(r.data.data))
       .catch(console.error);
    api.get('/ingredients')
       .then(r => setIngredients(r.data.data))
       .catch(console.error);
  };

  // Gộp sizes dựa theo trường Product_id
  const products = productsRaw.map(p => ({
    ...p,
    sizes: sizesData.filter(s => String(s.product_id) === p._id)
  }));

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addSize = () => {
    setFormData({
      ...formData,
      sizes: [...formData.sizes, { size: '', quantity: 0, price_increase: 0 }]
    });
  };

  const removeSize = index => {
    const arr = [...formData.sizes];
    arr.splice(index, 1);
    setFormData({ ...formData, sizes: arr });
  };

  const handleDelete = id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      api.delete(`/products/${id}`)
        .then(() => fetchAll())
        .catch(console.error);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = p => {
    const currentSizes = sizesData
      .filter(s => String(s.product_id) === p._id)
      .map(s => ({
        _id: s._id,
        size: s.size,
        quantity: s.quantity,
        price_increase: s.price_increase
      }));
    setEditingId(p._id);
    setFormData({
      name: p.name,
      description: p.description,
      price: p.price,
      discount_price: p.discount_price,
      image_url: p.image_url,
      branch_id: p.branch_id,
      category_id: p.category_id,
      sizes: currentSizes.length ? currentSizes : emptyForm.sizes,
      ingredient_ids: p.ingredient_id || []
    });
    setShowForm(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const { sizes, ingredient_ids, stock, ...rest } = formData;
    const productPayload = {
      ...rest,
      ingredient_id: ingredient_ids
    };
    const req = editingId
      ? api.put(`/products/${editingId}`, productPayload)
      : api.post('/products', productPayload);

    req.then(res => {
      const prodId = editingId || res.data.data._id;
      sizes.forEach(s => {
        const payload = { ...s, product_id: prodId };
        if (s._id) {
          api.put(`/sizes/${s._id}`, payload).catch(console.error);
        } else {
          api.post('/sizes', payload).catch(console.error);
        }
      });
      fetchAll();
      setShowForm(false);
    })
    .catch(err => alert(err.response?.data?.msg || err.message));
  };

  return (
    <div className="product-management">
      <TabBarr />
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
        <div className="modal-overlay">
          <div className="modal-box">
            <form className="product-form" onSubmit={handleSubmit}>
              <h3>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>

              {/* Các trường cơ bản */}
              <div className="form-row">
                <label>Tên</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Mô tả</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>Giá gốc</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>Giá khuyến mãi</label>
                <input
                  type="number"
                  value={formData.discount_price}
                  onChange={e => setFormData({ ...formData, discount_price: Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>Chi nhánh</label>
                <select
                  required
                  value={formData.branch_id}
                  onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Danh mục</label>
                 <select
                   required
                   value={formData.category_id}
                   onChange={e => {
                     const cat = e.target.value;
                     const defs = defaultSizesMap[cat] || [];      // lấy mặc định theo map
                     setFormData(prev => ({
                       ...prev,
                       category_id: cat,
                       sizes: editingId ? prev.sizes : defs     // nếu đang edit thì giữ nguyên sizes, chỉ apply khi thêm mới
                     }));
                   }}
                 >
                  <option value="">Chọn danh mục</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Ảnh (URL)</label>
                <input
                  required
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Kích thước, SL và phụ thu giá */}
              <div className="form-row">
                <label>Kích thước, SL & Phụ thu giá</label>
                <div className="sizes-container">
                  {formData.sizes.map((s, idx) => (
                    <div className="size-row" key={idx}>
                      <input
                        type="text"
                        placeholder="Ví dụ:10,15,20cm hoặc 100,200,300g"
                        value={s.size}
                        onChange={e => {
                          const arr = [...formData.sizes];
                          arr[idx].size = e.target.value;
                          setFormData({ ...formData, sizes: arr });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Số lượng"
                        value={s.quantity}
                        onChange={e => {
                          const arr = [...formData.sizes];
                          arr[idx].quantity = Number(e.target.value);
                          setFormData({ ...formData, sizes: arr });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Phụ thu giá"
                        value={s.price_increase}
                        onChange={e => {
                          const arr = [...formData.sizes];
                          arr[idx].price_increase = Number(e.target.value);
                          setFormData({ ...formData, sizes: arr });
                        }}
                      />
                      <button type="button" onClick={() => removeSize(idx)}>Xóa</button>
                    </div>
                  ))}
                  <button type="button" onClick={addSize}>+ Thêm kích thước</button>
                </div>
              </div>

              {/* Nguyên liệu nhiều chọn */}
              <div className="form-row">
                <label>Nguyên liệu</label>
                <select
                  multiple
                  required
                  value={formData.ingredient_ids}
                  onChange={e => {
                    const vals = Array.from(e.target.selectedOptions, o => o.value);
                    setFormData({ ...formData, ingredient_ids: vals });
                  }}
                >
                  {ingredients.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                </select>
              </div>

              {/* Hành động */}
              <div className="form-actions">
                <button type="submit">{editingId ? 'Lưu thay đổi' : 'Tạo mới'}</button>
                <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bảng sản phẩm */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ảnh</th>
              <th>Tên</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Tổng tồn kho</th>
              <th>Sizes (SL)</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((p, i) => (
                <tr key={p._id}>
                  <td>{i + 1}</td>
                  <td><img src={p.image_url} alt={p.name} className="product-thumb"/></td>
                  <td>{p.name}</td>
                  <td>{categories.find(c => c._id === p.category_id)?.name || ''}</td>
                  <td>{p.price.toLocaleString('vi-VN')} đ</td>
                  <td>
                    {p.sizes.reduce((sum, s) => sum + s.quantity, 0)}
                  </td>
                  <td>
                    {p.sizes.map((s, idx) => (
                      <div key={idx}>{s.size}: {s.quantity}</div>
                    ))}
                  </td>
                  <td>
                    <button onClick={() => handleEdit(p)}>Sửa</button>
                    <button onClick={() => handleDelete(p._id)}>Xóa</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7">Không có sản phẩm</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement;
