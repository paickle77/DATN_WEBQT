import React, { useState, useEffect } from 'react';
import './ProductManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

// Thay ID dưới đây thành đúng _id của Category "Bánh kem" và "Bánh quy"
const defaultSizesMap = {
  '64b1e1e18d28e450e97d8d01': [  // Bánh kem (từ dữ liệu thực tế)
    { size: '10cm', quantity: 0, price_increase: 0 },
    { size: '15cm', quantity: 0, price_increase: 5000 },
    { size: '20cm', quantity: 0, price_increase: 10000 }
  ],
  '64b1e1e18d28e450e97d8d02': [  // Bánh quy (từ dữ liệu thực tế)
    { size: '100g', quantity: 0, price_increase: 0 },
    { size: '200g', quantity: 0, price_increase: 3000 },
    { size: '500g', quantity: 0, price_increase: 8000 }
  ],
  '64b1e1e18d28e450e97d8e03': [  // Bánh bông lan (nếu có)
    { size: '10cm', quantity: 0, price_increase: 0 },
    { size: '15cm', quantity: 0, price_increase: 4000 },
    { size: '20cm', quantity: 0, price_increase: 8000 }
  ]
};

// ✅ Form mặc định - Đã xóa branch_id vì không còn cần
const emptyForm = {
  name: '',
  description: '',
  price: 0,
  discount_price: 0,
  image_url: '',
  // ❌ Xóa: branch_id: '',
  category_id: '',
  sizes: [],
  supplier_id: '',        // Thay đổi từ ingredient_ids
  import_price: 0,        // Thêm mới
  profit_margin: 30,      // Thêm mới
  sku: '',               // Thêm mới
  expiry_date: '',       // Thêm mới
  batch_number: ''       // Thêm mới
};

const ProductManagement = () => {
  const [productsRaw, setProductsRaw] = useState([]);
  const [sizesData, setSizesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // Thay đổi từ ingredients
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [originalSizeIds, setOriginalSizeIds] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAll();
    // Debug để kiểm tra categories
    debugCategories();
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

    // Sửa để lấy suppliers hoạt động
    api.get('/suppliers/active')
       .then(r => setSuppliers(r.data.data))
       .catch(() => {
         // Fallback nếu route /suppliers/active không có
         api.get('/suppliers')
           .then(r => setSuppliers(r.data.data.filter(s => s.status === 'active')))
           .catch(console.error);
       });
  };

  // Debug function để kiểm tra categories
  const debugCategories = () => {
    api.get('/categories').then(r => {
      console.log('=== DEBUG CATEGORIES ===');
      r.data.data.forEach(cat => {
        console.log(`${cat.name}: ${cat._id}`);
      });
      console.log('defaultSizesMap keys:', Object.keys(defaultSizesMap));
      console.log('========================');
    }).catch(console.error);
  };

  // Gộp sizes dựa theo trường Product_id
  const products = productsRaw.map(p => ({
    ...p,
    sizes: sizesData.filter(s => String(s.product_id) === p._id)
  }));

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
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
    setOriginalSizeIds(currentSizes.map(s => s._id));
    setEditingId(p._id);
    setFormData({
      name: p.name,
      description: p.description,
      price: p.price,
      discount_price: p.discount_price,
      image_url: p.image_url,
      // ❌ Xóa: branch_id: p.branch_id,
      category_id: p.category_id,
      sizes: currentSizes.length ? currentSizes : emptyForm.sizes,
      supplier_id: p.supplier_id || '',     // Thay đổi
      import_price: p.import_price || 0,    // Thêm mới
      profit_margin: p.profit_margin || 30, // Thêm mới  
      sku: p.sku || '',                     // Thêm mới
      expiry_date: p.expiry_date ? new Date(p.expiry_date).toISOString().split('T')[0] : '', // Thêm mới
      batch_number: p.batch_number || ''    // Thêm mới
    });
    setShowForm(true);
  };

  // Hàm tính giá bán đề xuất
  const calculateSuggestedPrice = (importPrice, margin) => {
    if (!importPrice || !margin) return 0;
    return Math.ceil(importPrice * (1 + margin / 100));
  };

  // Hàm format hiển thị size chi tiết
  const formatSizeDetails = (sizes) => {
    if (!sizes || sizes.length === 0) return 'Không có size';
    
    return sizes.map(size => 
      `${size.size}: ${size.quantity}`
    ).join(', ');
  };

  // Hàm tính tổng tồn kho
  const getTotalStock = (sizes) => {
    if (!sizes || sizes.length === 0) return 0;
    return sizes.reduce((total, size) => total + size.quantity, 0);
  };

  // Hàm xác định trạng thái tồn kho
  const getStockStatus = (stock) => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= 10) return 'low-stock';
    return 'in-stock';
  };

  const handleSubmit = e => {
    e.preventDefault();
    const { sizes, expiry_date, ...rest } = formData;
    const productPayload = {
      ...rest,
      expiry_date: expiry_date ? new Date(expiry_date) : null
    };
    
    const req = editingId
      ? api.put(`/products/${editingId}`, productPayload)
      : api.post('/products', productPayload);

    req.then(async res => {
      const prodId = editingId || res.data.data._id;
      
      // XÓA những size đã remove
      if (editingId) {
        const formIds = sizes.filter(s => s._id).map(s => s._id);
        const toDelete = originalSizeIds.filter(id => !formIds.includes(id));
        await Promise.all(toDelete.map(id => 
          api.delete(`/sizes/${id}`).catch(console.error)
        ));
      }
      
      // Thêm/cập nhật sizes
      await Promise.all(sizes.map(s => {
        const payload = { ...s, product_id: prodId };
        return s._id 
          ? api.put(`/sizes/${s._id}`, payload)
          : api.post('/sizes', payload);
      }));
      
      fetchAll();
      setShowForm(false);
      setOriginalSizeIds([]);
    })
    .catch(err => alert(err.response?.data?.msg || err.message));
  };

  return (
    <div className="product-management-container">
      <div className="product-management">
        <TabBarr />
        
        {/* Modern Page Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17M2 12L12 17L22 12"/>
              </svg>
            </div>
            <div className="header-text">
              <h2>Quản lý sản phẩm</h2>
              <p>Quản lý thông tin sản phẩm, giá cả và tồn kho một cách hiệu quả</p>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="top-controls">
          <div className="search-section">
            <div className="search-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm sản phẩm theo tên hoặc SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button className="add-btn" onClick={handleAdd}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Thêm sản phẩm
          </button>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>{editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                <button className="close-btn" onClick={() => setShowForm(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form className="product-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  {/* Cột trái */}
                  <div className="form-column">
                    <div className="form-group">
                      <label>Tên sản phẩm *</label>
                      <input
                        required
                        placeholder="Nhập tên sản phẩm"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Mã SKU</label>
                      <input
                        placeholder="Mã định danh sản phẩm"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Danh mục sản phẩm *</label>
                      <select
                        required
                        value={formData.category_id}
                        onChange={e => {
                          const cat = e.target.value;
                          const defs = defaultSizesMap[cat] || [];
                          console.log('Selected category:', cat, 'Default sizes:', defs);
                          setFormData(prev => ({
                            ...prev,
                            category_id: cat,
                            sizes: editingId ? prev.sizes : defs
                          }));
                        }}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Nhà phân phối *</label>
                      <select
                        required
                        value={formData.supplier_id}
                        onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                      >
                        <option value="">Chọn nhà phân phối</option>
                        {suppliers.map(s => 
                          <option key={s._id} value={s._id}>{s.name}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Cột phải */}
                  <div className="form-column">
                    <div className="form-group">
                      <label>Giá nhập hàng *</label>
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={formData.import_price}
                        onChange={e => {
                          const importPrice = Number(e.target.value);
                          setFormData({ 
                            ...formData, 
                            import_price: importPrice,
                            price: calculateSuggestedPrice(importPrice, formData.profit_margin)
                          });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Lợi nhuận mong muốn (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="30"
                        value={formData.profit_margin}
                        onChange={e => {
                          const margin = Number(e.target.value);
                          setFormData({ 
                            ...formData, 
                            profit_margin: margin,
                            price: calculateSuggestedPrice(formData.import_price, margin)
                          });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Giá bán *</label>
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                      />
                      {formData.import_price > 0 && (
                        <div className="price-suggestion">
                          💡 Đề xuất: {calculateSuggestedPrice(formData.import_price, formData.profit_margin).toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Giá khuyến mãi</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.discount_price}
                        onChange={e => setFormData({ ...formData, discount_price: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Hạn sử dụng</label>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Full width fields */}
                <div className="form-group full-width">
                  <label>Mô tả sản phẩm *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Nhập mô tả chi tiết về sản phẩm..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Số lô sản xuất</label>
                  <input
                    placeholder="Nhập số lô sản xuất"
                    value={formData.batch_number}
                    onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label>URL hình ảnh *</label>
                  <input
                    required
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                {/* Sizes Manager */}
                <div className="form-group full-width">
                  <label>Quản lý kích thước & tồn kho</label>
                  <div className="sizes-manager">
                    {formData.sizes.map((s, idx) => (
                      <div className="size-item" key={idx}>
                        <div className="size-inputs">
                          <input
                            type="text"
                            placeholder="VD: 10cm, 15cm, 20cm"
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
                            placeholder="Phụ thu (đ)"
                            value={s.price_increase}
                            onChange={e => {
                              const arr = [...formData.sizes];
                              arr[idx].price_increase = Number(e.target.value);
                              setFormData({ ...formData, sizes: arr });
                            }}
                          />
                        </div>
                        <button type="button" className="remove-size-btn" onClick={() => removeSize(idx)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button type="button" className="add-size-btn" onClick={addSize}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Thêm kích thước mới
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="products-section">
          <div className="table-container">
            <div className="table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Hình ảnh</th>
                    <th>Thông tin sản phẩm</th>
                    <th>Nhà phân phối</th>
                    <th>Giá nhập</th>
                    <th>Giá bán</th>
                    <th>Lợi nhuận</th>
                    <th>Chi tiết tồn kho</th>
                    <th>Tổng TK</th>
                    <th>Hạn sử dụng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((p, i) => {
                      const supplier = suppliers.find(s => s._id === p.supplier_id);
                      const profit = p.price - (p.import_price || 0);
                      const profitMargin = p.import_price > 0 ? ((profit / p.import_price) * 100) : 0;
                      const isExpiring = p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000);
                      const totalStock = getTotalStock(p.sizes);
                      const stockStatus = getStockStatus(totalStock);
                      
                      return (
                        <tr key={p._id} className={`table-row ${isExpiring ? 'expiring-soon' : ''} ${stockStatus === 'out-of-stock' ? 'out-of-stock' : ''}`}>
                          <td className="row-number">{i + 1}</td>
                          <td className="product-image">
                            <div className="image-wrapper">
                              <img src={p.image_url} alt={p.name} />
                            </div>
                          </td>
                          <td className="product-info">
                            <div className="product-details">
                              <h4 className="product-name">{p.name}</h4>
                              {p.sku && <span className="product-sku">SKU: {p.sku}</span>}
                              <p className="product-description">{p.description}</p>
                            </div>
                          </td>
                          <td className="supplier-name">{supplier?.name || 'N/A'}</td>
                          <td className="import-price">{(p.import_price || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="sale-price">{p.price.toLocaleString('vi-VN')} đ</td>
                          <td className="profit-info">
                            <div className="profit-amount">{profit.toLocaleString('vi-VN')} đ</div>
                            <div className="profit-margin">({profitMargin.toFixed(1)}%)</div>
                          </td>
                          <td className="stock-details">
                            {p.sizes && p.sizes.length > 0 ? (
                              <div className="sizes-list">
                                {p.sizes.map((size, idx) => (
                                  <div key={idx} className="size-item">
                                    <span className="size-name">{size.size}</span>
                                    <span className="size-quantity">{size.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="no-sizes">Chưa có size</span>
                            )}
                          </td>
                          <td className="total-stock">
                            <span className={`stock-badge ${stockStatus}`}>
                              {totalStock}
                            </span>
                          </td>
                          <td className="expiry-date">
                            {p.expiry_date ? (
                              <span className={`date-badge ${isExpiring ? 'expiring' : ''}`}>
                                {new Date(p.expiry_date).toLocaleDateString('vi-VN')}
                              </span>
                            ) : 'N/A'}
                          </td>
                          <td className="actions">
                            <button className="edit-btn" onClick={() => handleEdit(p)} title="Chỉnh sửa">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(p._id)} title="Xóa">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="empty-state">
                        <div className="empty-content">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17M2 12L12 17L22 12"/>
                          </svg>
                          <h4>Không tìm thấy sản phẩm nào</h4>
                          <p>Hãy thử điều chỉnh bộ lọc tìm kiếm hoặc thêm sản phẩm mới</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;