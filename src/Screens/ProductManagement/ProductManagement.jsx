import React, { useState } from 'react';
import './ProductManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';

const sampleProducts = [
  { id: 1, name: 'Áo thun nam',category:'1', price: 150000 },
  { id: 2, name: 'Quần jean nữ',category:'1', price: 300000 },
  { id: 3, name: 'Giày thể thao',category:'1', price: 500000 },
];

const ProductManagement = () => {
  const [products, setProducts] = useState(sampleProducts);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      setProducts(products.filter((product) => product.id !== id));
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="product-management">
        <div>
            <TabBarr/>
        </div>
      <h2>Quản lý sản phẩm</h2>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Tìm sản phẩm..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <button onClick={() => alert('Chức năng thêm sản phẩm')}>+ Thêm sản phẩm</button>
      </div>

   <div style={{padding:20}}>
       <table>
        <thead>
          <tr>
            <th>Mã SP</th>
            <th>Tên sản phẩm</th>
             <th>Loại </th>
            <th>Giá (VND)</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>SP{product.id.toString().padStart(3, '0')}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>{product.price.toLocaleString('vi-VN')}</td>
                <td>
                  <button onClick={() => alert('Chức năng sửa sản phẩm')}>Sửa</button>
                  <button onClick={() => handleDelete(product.id)}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">Không tìm thấy sản phẩm nào</td>
            </tr>
          )}
        </tbody>
      </table>
   </div>
    </div>
  );
};

export default ProductManagement;
