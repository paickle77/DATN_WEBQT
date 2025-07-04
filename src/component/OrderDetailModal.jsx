import React from 'react';
import './OrderDetailModal.scss';
const OrderDetailModal = ({order, onClose, onPrint}) => {
  // 1) Tính sơ bộ (subtotal)
const subtotal   = order.items.reduce((sum,i)=>sum + i.unitPrice*i.quantity, 0);
// 2) Lấy số tiền giảm (nếu có)
const discount   = order.discountAmount || 0;
// 3) Tổng cuối cùng server đã tính sẵn
const finalTotal = order.total_price;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
       <h3>Chi tiết Đơn {order._id}</h3>
       <p><strong>Khách hàng:</strong> {order.userName}</p>
       <p><strong>Địa chỉ:</strong> {order.addressStr}</p>
        <p><strong>Voucher:</strong> {order.voucherCode} 
          {order.discountAmount > 0 && (
            <> (-{order.discountAmount.toLocaleString('vi-VN')} đ)</>
          )}
        </p>
        <table>
          <thead><tr><th>#</th><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
          <tbody>
            {order.items.map((it,i)=>(
              <tr key={i}>
                <td>{i+1}</td>
                <td>{it.productName}</td>
                <td>{it.quantity}</td>
                <td>{it.unitPrice.toLocaleString('vi-VN')}</td>
                <td>{(it.quantity*it.unitPrice).toLocaleString('vi-VN')}</td>
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
          <button onClick={onPrint}>In Packing Slip</button>
          <button onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};
export default OrderDetailModal;