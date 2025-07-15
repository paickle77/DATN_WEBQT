// src/Screens/OrderManagement/component/ReplaceOrderModal.jsx
import React, { useState } from 'react';
import './ReplaceOrderModal.scss';

const ReplaceOrderModal = ({ order, onClose, onSave }) => {
  // Prefill các giá trị từ order
  const [items, setItems]         = useState(order.items || []);
  const [addressId, setAddressId] = useState(order.address_id);
  const [voucherId, setVoucherId] = useState(order.voucher_id);

  // Cập nhật số lượng item
  const handleQtyChange = (idx, newQty) => {
    setItems(items.map((it,i) =>
      i === idx ? { ...it, quantity: Number(newQty) } : it
    ));
  };

  const handleSubmit = () => {
    onSave({
      items,
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
            <tr><th>#</th><th>Sản phẩm</th><th>SL</th></tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i+1}</td>
                <td>{it.productName}</td>
                <td>
                  <input
                    type="number"
                    value={it.quantity}
                    min="1"
                    onChange={e => handleQtyChange(i, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Bạn có thể thêm dropdown chọn địa chỉ / voucher ở đây nếu muốn */}
        <div className="actions">
          <button onClick={handleSubmit}>Lưu</button>
          <button onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceOrderModal;
