import React from 'react';
import './OrderDetailModal.scss';

const OrderDetailModal = ({ order, onClose, onPrint }) => {
  // luôn fallback thành [] nếu order.items undefined
  const items = order.items || [];
  // 1) Tính subtotal
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  // 2) Lấy discountAmount đã tính bởi openModal (nếu có), ngược lại 0
  const discount = order.discountAmount || 0;
  // 3) Tổng cuối cùng đã tính bởi openModal, ngược lại tính lại
  const finalTotal = order.finalTotal !== undefined
    ? order.finalTotal
    : subtotal - discount;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Chi tiết Đơn {order._id}</h3>
        <p><strong>Khách hàng:</strong> {order.userName}</p>
        <p><strong>Địa chỉ:</strong> {order.addressStr}</p>
        <p>
          <strong>Voucher:</strong> {order.voucherCode}
          {discount > 0 && <> (-{discount.toLocaleString('vi-VN')} đ)</>}
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.productName}</td>
                <td>{it.quantity}</td>
                <td>{it.unitPrice.toLocaleString('vi-VN')}</td>
                <td>{(it.quantity * it.unitPrice).toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="summary">
          <div><strong>Tạm tính:</strong> {subtotal.toLocaleString('vi-VN')} đ</div>
          {discount > 0 && (
            <div><strong>Giảm giá:</strong> -{discount.toLocaleString('vi-VN')} đ</div>
          )}
          <div><strong>Tổng thanh toán:</strong> {finalTotal.toLocaleString('vi-VN')} đ</div>
        </div>
        <div className="actions">
          <button onClick={onPrint}>In PDF</button>
          <button onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
