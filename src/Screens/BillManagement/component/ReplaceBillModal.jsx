import React, { useState, useEffect } from 'react';
import './ReplaceBillModal.scss';
import api from '../../../utils/api';

const ReplaceBillModal = ({ bill, onClose, onSave }) => {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    // tải danh sách sản phẩm để select
    api.get('/products').then(r => setProducts(r.data.data));
  }, []);

  const initialItems = (bill.items || []).map(it => ({
    product_id:  it.product_id,
    productName: it.productName,
    quantity:    it.quantity,
    unitPrice:   it.unitPrice
  }));
  
  const [items, setItems]         = useState(initialItems);
  const [addressId, setAddressId] = useState(bill.address_id);
  const [voucherId, setVoucherId] = useState(bill.voucher_id);

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
        <div className="modal-header">
          <h3>
            <span className="icon">🔄</span>
            Đổi hàng – Hóa đơn {bill._id}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <span>×</span>
          </button>
        </div>
        
        <div className="modal-content">
          <div className="table-container">
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
                    <td>
                      <span className="row-number">{i+1}</span>
                    </td>
                    <td>
                      <div className="select-wrapper">
                        <select
                          value={it.product_id}
                          onChange={e => handleFieldChange(i, 'product_id', e.target.value)}
                        >
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          value={it.unitPrice}
                          min="0"
                          onChange={e => handleFieldChange(i, 'unitPrice', e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          value={it.quantity}
                          min="1"
                          onChange={e => handleFieldChange(i, 'quantity', e.target.value)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chọn lại địa chỉ / voucher nếu muốn */}
          {/* ... */}

          <div className="actions">
            <button className="btn-cancel" onClick={onClose}>
              <span>Hủy</span>
            </button>
            <button className="btn-save" onClick={handleSubmit}>
              <span>💾 Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplaceBillModal;