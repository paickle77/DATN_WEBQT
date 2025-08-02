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
        <div className="modal-header">
          <h3>
            <span className="icon">📋</span>
            Chi tiết Hóa đơn
            <span className="bill-id">#{bill._id}</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <span>×</span>
          </button>
        </div>

        <div className="modal-content">
          <div className="customer-info">
            <div className="info-card">
              <div className="info-item">
                <span className="label">
                  <span className="icon">👤</span>
                  Khách hàng
                </span>
                <span className="value">{bill.userName}</span>
              </div>
              <div className="info-item">
                <span className="label">
                  <span className="icon">📍</span>
                  Địa chỉ
                </span>
                <span className="value">{bill.addressStr}</span>
              </div>
              <div className="info-item">
                <span className="label">
                  <span className="icon">🎫</span>
                  Voucher
                </span>
                <span className="value">
                  {bill.voucherCode}
                  {discount > 0 && (
                    <span className="discount-badge">
                      -{discount.toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="items-section">
            <h4>
              <span className="icon">📦</span>
              Danh sách sản phẩm
            </h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sản phẩm</th>
                    <th>SL</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <span className="row-number">{i + 1}</span>
                      </td>
                      <td className="product-name">{it.productName}</td>
                      <td className="quantity">{it.quantity}</td>
                      <td className="unit-price">{it.unitPrice.toLocaleString('vi-VN')} đ</td>
                      <td className="total-price">{(it.quantity * it.unitPrice).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="summary">
            <div className="summary-card">
              <div className="summary-item">
                <span className="label">Tạm tính</span>
                <span className="value">{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              {discount > 0 && (
                <div className="summary-item discount">
                  <span className="label">Giảm giá</span>
                  <span className="value">-{discount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="summary-item total">
                <span className="label">Tổng thanh toán</span>
                <span className="value">{finalTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn-print" onClick={onPrint}>
              <span className="icon">🖨️</span>
              <span>In PDF</span>
            </button>
            <button className="btn-close" onClick={onClose}>
              <span className="icon">✕</span>
              <span>Đóng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetailModal;