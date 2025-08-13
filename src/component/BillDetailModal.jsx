// 🔥 FIXED BillDetailModal - Sửa lỗi đơn giá và cải thiện hiển thị
import React from 'react';
import './BillDetailModal.scss';

const BillDetailModal = ({ bill, onClose, onPrint }) => {
  console.log('🔍 Bill detail modal data:', bill);
  console.log('🔍 Items data:', bill.items);

  // 🔥 SỬ DỤNG DỮ LIỆU ĐÃ TÍNH SẴN TỪ API ENRICHED
  const items = Array.isArray(bill.items) ? bill.items : [];
  
  // 🔥 DEBUG: Log từng item để check cấu trúc dữ liệu
  items.forEach((item, i) => {
    console.log(`Item ${i}:`, {
      productName: item.productName || item.name,
      unitPrice: item.unitPrice || item.price || item.unit_price,
      quantity: item.quantity || item.qty,
      originalItem: item
    });
  });
  
  // Ưu tiên sử dụng dữ liệu đã format từ backend
  const financialInfo = {
    subtotal: bill.subtotal || 0,
    shippingFee: bill.shippingFee || 0,
    discountAmount: bill.discountAmount || 0,
    finalTotal: bill.finalTotal || bill.total || 0,
    
    // Formatted values từ backend
    subtotal_formatted: bill.subtotal_formatted || `${Number(bill.subtotal || 0).toLocaleString('vi-VN')} đ`,
    shipping_fee_formatted: bill.shipping_fee_formatted || `${Number(bill.shippingFee || 0).toLocaleString('vi-VN')} đ`,
    discount_formatted: bill.discount_formatted || `${Number(bill.discountAmount || 0).toLocaleString('vi-VN')} đ`,
    total_formatted: bill.total_formatted || `${Number(bill.total || 0).toLocaleString('vi-VN')} đ`
  };

  // 🔥 THÔNG TIN KHÁCH HÀNG VÀ GIAO HÀNG TỪ ENRICHED DATA
  const customerInfo = {
    name: bill.customerName || bill.userName || 'Khách hàng không rõ',
    phone: bill.customerPhone || '',
    address: bill.customerAddress || bill.addressStr || 'Chưa có địa chỉ'
  };

  const deliveryInfo = {
    name: bill.deliveryName || 'Chưa có tên người nhận',
    phone: bill.deliveryPhone || 'Chưa có SĐT',
    address: bill.deliveryAddress || 'Chưa có địa chỉ giao hàng'
  };

  // 🔥 THÔNG TIN THANH TOÁN VÀ GIAO HÀNG
  const orderInfo = {
    shippingMethod: bill.shippingMethodDisplay || bill.shipping_method || 'Chưa chọn',
    paymentMethod: bill.paymentMethodDisplay || bill.payment_method || 'Chưa chọn',
    voucherCode: bill.voucherDisplayCode || bill.voucherCode || '—',
    status: bill.statusDisplay || bill.status || 'N/A',
    createdDate: bill.created_date || (bill.created_at ? new Date(bill.created_at).toLocaleString('vi-VN') : 'N/A'),
    updatedDate: bill.updated_at ? new Date(bill.updated_at).toLocaleString('vi-VN') : null
  };

  // 🔥 LỊCH SỬ TRẠNG THÁI (nếu có)
  const statusHistory = bill.statusHistory || [];

  // 🔥 HÀM LẤY GIÁ SẢN PHẨM - FIX LOGIC LẤY GIÁ
  const getItemPrice = (item) => {
    // Thử nhiều field khác nhau theo thứ tự ưu tiên
    const priceFields = [
      'unitPrice',        // Field chính từ enriched API
      'price',           // Field phổ biến
      'unit_price',      // Field snake_case
      'itemPrice',       // Field có thể có
      'productPrice',    // Field từ product
      'cost',           // Field backup
      'basePrice'       // Field backup khác
    ];
    
    for (const field of priceFields) {
      const value = item[field];
      if (value !== undefined && value !== null && Number(value) > 0) {
        return Number(value);
      }
    }
    
    // Nếu không có giá nào, thử tính từ total và quantity
    if (item.total && item.quantity && Number(item.quantity) > 0) {
      return Number(item.total) / Number(item.quantity);
    }
    
    console.warn('⚠️ Không tìm thấy giá cho item:', item);
    return 0;
  };

  // 🔥 HÀM LẤY SỐ LƯỢNG SẢN PHẨM
  const getItemQuantity = (item) => {
    const qtyFields = ['quantity', 'qty', 'amount', 'count', 'num'];
    
    for (const field of qtyFields) {
      const value = item[field];
      if (value !== undefined && value !== null && Number(value) > 0) {
        return Number(value);
      }
    }
    
    return 1; // Default quantity
  };

  // 🔥 HÀM LẤY TÊN SẢN PHẨM
  const getItemName = (item) => {
    return item.productName || item.name || item.product_name || item.title || 'Sản phẩm không rõ';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>
            <span className="icon">📋</span>
            Chi tiết Hóa đơn
            <span className="bill-id">#{bill._id?.slice(-8) || 'N/A'}</span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            <span>×</span>
          </button>
        </div>

        <div className="modal-content">
          {/* 🔥 THÔNG TIN KHÁCH HÀNG VÀ ĐƠN HÀNG */}
          <div className="info-section">
            <h4>
              <span className="icon">👤</span>
              Thông tin khách hàng & đơn hàng
            </h4>
            <div className="info-grid">
              <div className="info-card customer-card">
                <h5>👤 Khách hàng đặt hàng</h5>
                <div className="info-item">
                  <span className="label">Tên khách hàng:</span>
                  <span className="value">{customerInfo.name}</span>
                </div>
                {customerInfo.phone && (
                  <div className="info-item">
                    <span className="label">Số điện thoại:</span>
                    <a href={`tel:${customerInfo.phone}`} className="value phone-link">
                      📞 {customerInfo.phone}
                    </a>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">Địa chỉ:</span>
                  <span className="value">{customerInfo.address}</span>
                </div>
              </div>

              <div className="info-card delivery-card">
                <h5>📦 Thông tin giao hàng</h5>
                <div className="info-item">
                  <span className="label">Người nhận:</span>
                  <span className="value">{deliveryInfo.name}</span>
                </div>
                {deliveryInfo.phone !== 'Chưa có SĐT' && (
                  <div className="info-item">
                    <span className="label">SĐT người nhận:</span>
                    <a href={`tel:${deliveryInfo.phone}`} className="value phone-link">
                      📞 {deliveryInfo.phone}
                    </a>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">Địa chỉ giao hàng:</span>
                  <span className="value">{deliveryInfo.address}</span>
                </div>
              </div>

              <div className="info-card order-card">
                <h5>📋 Thông tin đơn hàng</h5>
                <div className="info-item">
                  <span className="label">Trạng thái:</span>
                  <span className="value status-value">{orderInfo.status}</span>
                </div>
                <div className="info-item">
                  <span className="label">Ngày tạo:</span>
                  <span className="value">{orderInfo.createdDate}</span>
                </div>
                {orderInfo.updatedDate && (
                  <div className="info-item">
                    <span className="label">Cập nhật cuối:</span>
                    <span className="value">{orderInfo.updatedDate}</span>
                  </div>
                )}
              </div>

              <div className="info-card payment-card">
                <h5>💳 Thanh toán & vận chuyển</h5>
                <div className="info-item">
                  <span className="label">Phương thức giao hàng:</span>
                  <span className="value">{orderInfo.shippingMethod}</span>
                </div>
                <div className="info-item">
                  <span className="label">Phương thức thanh toán:</span>
                  <span className="value">{orderInfo.paymentMethod}</span>
                </div>
                <div className="info-item">
                  <span className="label">Mã voucher:</span>
                  <span className="value voucher-code">{orderInfo.voucherCode}</span>
                  {financialInfo.discountAmount > 0 && (
                    <span className="discount-badge">
                      Giảm: {financialInfo.discount_formatted}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 DANH SÁCH SẢN PHẨM - FIXED PRICING */}
          <div className="items-section">
            <h4>
              <span className="icon">📦</span>
              Danh sách sản phẩm ({items.length} món)
            </h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tên sản phẩm</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? items.map((item, i) => {
                    const itemPrice = getItemPrice(item);
                    const itemQty = getItemQuantity(item);
                    const itemName = getItemName(item);
                    const itemTotal = itemPrice * itemQty;
                    
                    // Debug log cho từng item
                    console.log(`🔍 Item ${i + 1} details:`, {
                      name: itemName,
                      price: itemPrice,
                      qty: itemQty,
                      total: itemTotal,
                      originalData: item
                    });
                    
                    return (
                      <tr key={i}>
                        <td>
                          <span className="row-number">{i + 1}</span>
                        </td>
                        <td className="product-name">
                          <div className="product-info">
                            <span className="name">{itemName}</span>
                            {item.productId && (
                              <span className="product-id">ID: {item.productId}</span>
                            )}
                            {itemPrice === 0 && (
                              <span className="price-warning">⚠️ Không có giá</span>
                            )}
                            {/* Debug info */}
                            <small style={{color: '#888', fontSize: '11px'}}>
                              Fields: {Object.keys(item).join(', ')}
                            </small>
                          </div>
                        </td>
                        <td className="unit-price">
                          <span className={itemPrice === 0 ? 'price-error' : 'price-normal'}>
                            {itemPrice.toLocaleString('vi-VN')} đ
                          </span>
                        </td>
                        <td className="quantity">
                          <span className="qty-badge">{itemQty}</span>
                        </td>
                        <td className="total-price">
                          <strong>{itemTotal.toLocaleString('vi-VN')} đ</strong>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="5" className="no-items">
                        <span>📭 Không có sản phẩm nào trong đơn hàng</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔥 BREAKDOWN TÀI CHÍNH CHI TIẾT */}
          <div className="financial-section">
            <h4>
              <span className="icon">💰</span>
              Chi tiết thanh toán
            </h4>
            <div className="financial-breakdown">
              <div className="financial-card">
                <div className="breakdown-item">
                  <span className="label">💰 Tiền hàng:</span>
                  <span className="value">{financialInfo.subtotal_formatted}</span>
                </div>
                
                <div className="breakdown-item">
                  <span className="label">🚚 Phí vận chuyển:</span>
                  <span className="value">{financialInfo.shipping_fee_formatted}</span>
                </div>

                {financialInfo.discountAmount > 0 && (
                  <div className="breakdown-item discount-item">
                    <span className="label">💸 Giảm giá:</span>
                    <span className="value discount-value">-{financialInfo.discount_formatted}</span>
                  </div>
                )}

                <div className="breakdown-divider"></div>

                <div className="breakdown-item total-item">
                  <span className="label">💵 TỔNG THANH TOÁN:</span>
                  <span className="value total-value">{financialInfo.total_formatted}</span>
                </div>

                {/* Hiển thị tính toán chi tiết */}
                <div className="calculation-detail">
                  <small>
                    Tính toán: {financialInfo.subtotal_formatted} + {financialInfo.shipping_fee_formatted}
                    {financialInfo.discountAmount > 0 && ` - ${financialInfo.discount_formatted}`}
                    {' = '}{financialInfo.total_formatted}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 LỊCH SỬ TRẠNG THÁI (nếu có) */}
          {statusHistory.length > 0 && (
            <div className="history-section">
              <h4>
                <span className="icon">📋</span>
                Lịch sử trạng thái
              </h4>
              <div className="status-timeline">
                {statusHistory.map((status, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="status-text">{status.status}</span>
                      <span className="status-time">{new Date(status.timestamp).toLocaleString('vi-VN')}</span>
                      {status.note && <span className="status-note">{status.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🔥 ACTIONS */}
          <div className="actions">
            <button className="btn-print" onClick={onPrint}>
              <span className="icon">🖨️</span>
              <span>In hóa đơn PDF</span>
            </button>
            
            <button className="btn-copy" onClick={() => {
              const info = `Hóa đơn #${bill._id?.slice(-8) || 'N/A'}\n` +
                         `Khách hàng: ${customerInfo.name} - ${customerInfo.phone}\n` +
                         `Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n` +
                         `Địa chỉ: ${deliveryInfo.address}\n` +
                         `Tổng tiền: ${financialInfo.total_formatted}\n` +
                         `Trạng thái: ${orderInfo.status}\n` +
                         `Ngày tạo: ${orderInfo.createdDate}`;
              navigator.clipboard.writeText(info);
              alert('📋 Đã copy thông tin hóa đơn!');
            }}>
              <span className="icon">📋</span>
              <span>Copy thông tin</span>
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