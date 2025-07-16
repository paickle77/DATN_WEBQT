// src/Screens/OrderManagement/component/ReplaceOrderModal.jsx
import React, { useState, useEffect } from 'react';
import './ReplaceOrderModal.scss';
import api from '../../../utils/api';

const ReplaceOrderModal = ({ order, onClose, onSave }) => {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    // tải danh sách sản phẩm để select
    api.get('/products').then(r => setProducts(r.data.data));
  }, []);

  const initialItems = (order.items || []).map(it => ({
    product_id:  it.product_id,
    productName: it.productName,
    quantity:    it.quantity,
    unitPrice:   it.unitPrice
  }));
  const [items, setItems]         = useState(initialItems);
  const [addressId, setAddressId] = useState(order.address_id);
  const [voucherId, setVoucherId] = useState(order.voucher_id);

  const handleFieldChange = (idx, field, value) => {
    setItems(items.map((it,i) =>
      i === idx
        ? { ...it, [field]: field==='quantity' ? Math.max(1, Number(value)) : value }
        : it
    ));
  };

  const handleSubmit = () => {
    // chuyển unitPrice thành price để gửi backend
    onSave({
      items: items.map(({ product_id, quantity, unitPrice }) => ({
        product_id,
        quantity,
        price: unitPrice
      })),
      address_id: addressId,
      voucher_id: voucherId
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Đổi hàng – Đơn {order._id}</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th>Giá (đ)</th>
              <th>SL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i+1}</td>

                {/* Select sản phẩm */}
                <td>
                  <select
                    value={it.product_id}
                    onChange={e => handleFieldChange(i, 'product_id', e.target.value)}
                  >
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </td>

                {/* Thay đổi giá */}
                <td>
                  <input
                    type="number"
                    value={it.unitPrice}
                    min="0"
                    onChange={e => handleFieldChange(i, 'unitPrice', e.target.value)}
                  />
                </td>

                {/* Thay đổi số lượng */}
                <td>
                  <input
                    type="number"
                    value={it.quantity}
                    min="1"
                    onChange={e => handleFieldChange(i, 'quantity', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Chọn lại địa chỉ / voucher nếu muốn */}
        {/* ... */}

        <div className="actions">
          <button className="btn-save"   onClick={handleSubmit}>Lưu</button>
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceOrderModal;
