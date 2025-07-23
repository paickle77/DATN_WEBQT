import React from 'react';
import './BillDetailModal.scss';

const BillDetailModal = ({ bill, onClose, onPrint }) => {
  const items = bill.items || [];
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = bill.discountAmount || 0;
  const finalTotal = bill.finalTotal !== undefined
    ? bill.finalTotal
    : subtotal - discount;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Chi tiết Hóa đơn {bill._id}</h3>
        <p><strong>Khách hàng:</strong> {bill.userName}</p>
        <p><strong>Địa chỉ:</strong> {bill.addressStr}</p>
        <p>
          <strong>Voucher:</strong> {bill.voucherCode}
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

export default BillDetailModal;
