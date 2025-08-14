// 🔥 UPDATED BillDetailModal - VỚI VALIDATION TÀI CHÍNH CHI TIẾT
import React from 'react';
import './BillDetailModal.scss';

const BillDetailModal = ({ bill, onClose, onPrint }) => {
  console.log('🔍 Bill detail modal data:', bill);
  console.log('🔍 Items data:', bill.items);

  // 🔥 SỬ DỤNG DỮ LIỆU ĐÃ TÍNH SẴN TỪ API ENRICHED
  const items = Array.isArray(bill.items) ? bill.items : [];
  
  // 🔥 HÀM LẤY GIÁ SẢN PHẨM - FIXED LOGIC
  const getItemPrice = (item) => {
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

  // 🔥 TÍNH TOÁN VÀ VALIDATION TÀI CHÍNH
  const calculateItemsSubtotal = () => {
    return items.reduce((total, item) => {
      const itemPrice = getItemPrice(item);
      const itemQty = getItemQuantity(item);
      return total + (itemPrice * itemQty);
    }, 0);
  };

  const getFinancialValidation = () => {
    const calculatedSubtotal = calculateItemsSubtotal();
    const backendSubtotal = Number(bill.subtotal || 0);
    const shippingFee = Number(bill.shippingFee || 0);
    const discountAmount = Number(bill.discountAmount || 0);
    const backendTotal = Number(bill.finalTotal || bill.total || 0);
    
    // Tính toán theo công thức đúng
    const expectedTotal = calculatedSubtotal + shippingFee - discountAmount;
    const backendExpectedTotal = backendSubtotal + shippingFee - discountAmount;
    
    // Kiểm tra sai lệch (tolerance 1 đ để tránh lỗi làm tròn)
    const subtotalMismatch = Math.abs(calculatedSubtotal - backendSubtotal);
    const totalMismatch = Math.abs(expectedTotal - backendTotal);
    
    const hasSubtotalIssue = subtotalMismatch > 1;
    const hasTotalIssue = totalMismatch > 1;
    
    return {
      calculatedSubtotal,
      backendSubtotal,
      shippingFee,
      discountAmount,
      expectedTotal,
      backendTotal,
      subtotalMismatch,
      totalMismatch,
      hasSubtotalIssue,
      hasTotalIssue,
      hasAnyIssue: hasSubtotalIssue || hasTotalIssue
    };
  };

  const financialValidation = getFinancialValidation();
  
  // Ưu tiên sử dụng dữ liệu đã format từ backend
  const financialInfo = {
    subtotal: financialValidation.backendSubtotal,
    shippingFee: financialValidation.shippingFee,
    discountAmount: financialValidation.discountAmount,
    finalTotal: financialValidation.backendTotal,
    
    // Formatted values từ backend
    subtotal_formatted: bill.subtotal_formatted || `${financialValidation.backendSubtotal.toLocaleString('vi-VN')} đ`,
    shipping_fee_formatted: bill.shipping_fee_formatted || `${financialValidation.shippingFee.toLocaleString('vi-VN')} đ`,
    discount_formatted: bill.discount_formatted || `${financialValidation.discountAmount.toLocaleString('vi-VN')} đ`,
    total_formatted: bill.total_formatted || `${financialValidation.backendTotal.toLocaleString('vi-VN')} đ`
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

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>
            <span className="icon">📋</span>
            Chi tiết Hóa đơn
            <span className="bill-id">#{bill._id?.slice(-8) || 'N/A'}</span>
            {financialValidation.hasAnyIssue && (
              <span className="financial-warning-badge" title="Có vấn đề trong tính toán tài chính">
                ⚠️
              </span>
            )}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <span>×</span>
          </button>
        </div>

        <div className="modal-content">
          {/* 🚨 CẢNH BÁO TÀI CHÍNH (nếu có vấn đề) */}
          {financialValidation.hasAnyIssue && (
            <div className="financial-warning-section">
              <div className="warning-card">
                <div className="warning-header">
                  <span className="warning-icon">⚠️</span>
                  <h4>Phát hiện vấn đề trong tính toán tài chính</h4>
                </div>
                <div className="warning-content">
                  {financialValidation.hasSubtotalIssue && (
                    <div className="warning-item">
                      <strong>Tiền hàng không khớp:</strong>
                      <br />
                      • Backend: {financialValidation.backendSubtotal.toLocaleString('vi-VN')} đ
                      <br />
                      • Tính từ items: {financialValidation.calculatedSubtotal.toLocaleString('vi-VN')} đ
                      <br />
                      • Chênh lệch: {financialValidation.subtotalMismatch.toLocaleString('vi-VN')} đ
                    </div>
                  )}
                  
                  {financialValidation.hasTotalIssue && (
                    <div className="warning-item">
                      <strong>Tổng tiền không đúng công thức:</strong>
                      <br />
                      • Backend: {financialValidation.backendTotal.toLocaleString('vi-VN')} đ
                      <br />
                      • Tính toán: {financialValidation.expectedTotal.toLocaleString('vi-VN')} đ
                      <br />
                      • Chênh lệch: {financialValidation.totalMismatch.toLocaleString('vi-VN')} đ
                    </div>
                  )}
                  
                  <div className="warning-actions">
                    <button 
                      className="debug-btn"
                      onClick={() => {
                        console.group('🔍 Financial Debug Details');
                        console.log('📊 Backend Data:', {
                          subtotal: bill.subtotal,
                          shippingFee: bill.shippingFee,
                          discountAmount: bill.discountAmount,
                          total: bill.total
                        });
                        console.log('📦 Items:', items);
                        console.log('🧮 Validation Results:', financialValidation);
                        console.groupEnd();
                        alert('🔍 Debug information đã được log ra console.\nMở Developer Tools > Console để xem chi tiết.');
                      }}
                    >
                      🔍 Debug Console
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* 🔥 DANH SÁCH SẢN PHẨM - WITH DETAILED PRICING INFO */}
          <div className="items-section">
            <h4>
              <span className="icon">📦</span>
              Danh sách sản phẩm ({items.length} món)
              {financialValidation.hasSubtotalIssue && (
                <span className="section-warning" title="Tổng tiền sản phẩm có vấn đề">⚠️</span>
              )}
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
                            {/* Debug info - chỉ hiện khi có vấn đề */}
                            {itemPrice === 0 && (
                              <details style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                                <summary>🔍 Debug item data</summary>
                                <pre>{JSON.stringify(item, null, 2)}</pre>
                              </details>
                            )}
                          </div>
                        </td>
                        <td className="unit-price">
                          <span className={itemPrice === 0 ? 'price-error' : 'price-normal'}>
                            {itemPrice.toLocaleString('vi-VN')} đ
                          </span>
                          {itemPrice === 0 && (
                            <div style={{ fontSize: '10px', color: '#ef4444' }}>
                              Missing price data
                            </div>
                          )}
                        </td>
                        <td className="quantity">
                          <span className="qty-badge">{itemQty}</span>
                        </td>
                        <td className="total-price">
                          <strong className={itemPrice === 0 ? 'price-error' : ''}>
                            {itemTotal.toLocaleString('vi-VN')} đ
                          </strong>
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
                <tfoot>
                  <tr className="subtotal-row">
                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      🧮 Tổng tính từ items:
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      <span className={financialValidation.hasSubtotalIssue ? 'price-error' : 'price-normal'}>
                        {financialValidation.calculatedSubtotal.toLocaleString('vi-VN')} đ
                      </span>
                      {financialValidation.hasSubtotalIssue && (
                        <div style={{ fontSize: '11px', color: '#ef4444' }}>
                          Backend: {financialValidation.backendSubtotal.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 🔥 BREAKDOWN TÀI CHÍNH CHI TIẾT VỚI VALIDATION */}
          <div className="financial-section">
            <h4>
              <span className="icon">💰</span>
              Chi tiết thanh toán
              {financialValidation.hasTotalIssue && (
                <span className="section-warning" title="Tổng tiền có vấn đề">⚠️</span>
              )}
            </h4>
            <div className="financial-breakdown">
              <div className="financial-card">
                <div className="breakdown-item">
                  <span className="label">💰 Tiền hàng:</span>
                  <div className="value-container">
                    <span className="value">
                      {financialInfo.subtotal_formatted}
                    </span>
                    {financialValidation.hasSubtotalIssue && (
                      <div className="validation-info">
                        <small className="calculated-value">
                          Tính từ items: {financialValidation.calculatedSubtotal.toLocaleString('vi-VN')} đ
                        </small>
                        <small className="difference">
                          Chênh lệch: {financialValidation.subtotalMismatch.toLocaleString('vi-VN')} đ
                        </small>
                      </div>
                    )}
                  </div>
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
                  <div className="value-container">
                    <span className="value total-value">
                      {financialInfo.total_formatted}
                    </span>
                    {financialValidation.hasTotalIssue && (
                      <div className="validation-info">
                        <small className="calculated-value">
                          Tính toán: {financialValidation.expectedTotal.toLocaleString('vi-VN')} đ
                        </small>
                        <small className="difference">
                          Chênh lệch: {financialValidation.totalMismatch.toLocaleString('vi-VN')} đ
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hiển thị công thức tính */}
                <div className="calculation-detail">
                  <small>
                    📊 Công thức: {financialValidation.calculatedSubtotal.toLocaleString('vi-VN')} 
                    + {financialValidation.shippingFee.toLocaleString('vi-VN')}
                    {financialValidation.discountAmount > 0 && ` - ${financialValidation.discountAmount.toLocaleString('vi-VN')}`}
                    {' = '}{financialValidation.expectedTotal.toLocaleString('vi-VN')} đ
                  </small>
                  {financialValidation.hasTotalIssue && (
                    <small style={{ display: 'block', color: '#ef4444', marginTop: '5px' }}>
                      ⚠️ Backend trả về: {financialValidation.backendTotal.toLocaleString('vi-VN')} đ
                    </small>
                  )}
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
                         `Tiền hàng: ${financialInfo.subtotal_formatted}\n` +
                         `Phí ship: ${financialInfo.shipping_fee_formatted}\n` +
                         `${financialInfo.discountAmount > 0 ? `Giảm giá: ${financialInfo.discount_formatted}\n` : ''}` +
                         `Tổng tiền: ${financialInfo.total_formatted}\n` +
                         `Trạng thái: ${orderInfo.status}\n` +
                         `Ngày tạo: ${orderInfo.createdDate}`;
              navigator.clipboard.writeText(info);
              alert('📋 Đã copy thông tin hóa đơn!');
            }}>
              <span className="icon">📋</span>
              <span>Copy thông tin</span>
            </button>

            {/* Debug button nếu có vấn đề */}
            {financialValidation.hasAnyIssue && (
              <button className="btn-debug" onClick={() => {
                console.group('🔍 Detailed Financial Debug');
                console.log('💰 Financial Validation:', financialValidation);
                console.log('📊 Bill Raw Data:', {
                  subtotal: bill.subtotal,
                  shippingFee: bill.shippingFee,
                  discountAmount: bill.discountAmount,
                  total: bill.total,
                  finalTotal: bill.finalTotal
                });
                console.log('📦 Items with prices:', items.map((item, i) => ({
                  index: i + 1,
                  name: getItemName(item),
                  price: getItemPrice(item),
                  quantity: getItemQuantity(item),
                  total: getItemPrice(item) * getItemQuantity(item),
                  rawData: item
                })));
                console.log('🧮 Calculations:', {
                  itemsSubtotal: financialValidation.calculatedSubtotal,
                  backendSubtotal: financialValidation.backendSubtotal,
                  shippingFee: financialValidation.shippingFee,
                  discountAmount: financialValidation.discountAmount,
                  expectedTotal: financialValidation.expectedTotal,
                  backendTotal: financialValidation.backendTotal
                });
                console.groupEnd();
                
                alert('🔍 Chi tiết debug đã được log ra console!\n\n' +
                      'Mở Developer Tools > Console để xem:\n' +
                      '• Dữ liệu thô từ backend\n' +
                      '• Chi tiết từng sản phẩm\n' +
                      '• So sánh tính toán vs backend\n' +
                      '• Phân tích nguyên nhân sai lệch');
              }}>
                <span className="icon">🔍</span>
                <span>Debug tài chính</span>
              </button>
            )}
            
            <button className="btn-close" onClick={onClose}>
              <span className="icon">✕</span>
              <span>Đóng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🎨 INLINE STYLES CHO VALIDATION */}
      <style jsx>{`
        .financial-warning-badge {
          background: #ef4444;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          margin-left: 8px;
        }

        .financial-warning-section {
          margin-bottom: 20px;
        }

        .warning-card {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 8px;
          padding: 15px;
          border-left: 4px solid #ef4444;
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .warning-header h4 {
          margin: 0;
          color: #dc2626;
        }

        .warning-content {
          color: #991b1b;
        }

        .warning-item {
          margin: 8px 0;
          padding: 8px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 4px;
          font-size: 13px;
        }

        .warning-actions {
          margin-top: 12px;
        }

        .debug-btn, .btn-debug {
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .debug-btn:hover, .btn-debug:hover {
          background: #dc2626;
        }

        .section-warning {
          color: #ef4444;
          margin-left: 8px;
        }

        .price-error {
          color: #ef4444 !important;
        }

        .price-normal {
          color: #059669;
        }

        .subtotal-row {
          background-color: #f9fafb;
          border-top: 2px solid #e5e7eb;
        }

        .value-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .validation-info {
          margin-top: 4px;
        }

        .calculated-value {
          color: #059669;
          font-size: 11px;
        }

        .difference {
          color: #ef4444;
          font-size: 11px;
        }

        .price-warning {
          background: #fef2f2;
          color: #dc2626;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          margin-left: 8px;
        }

        .breakdown-divider {
          height: 2px;
          background: linear-gradient(90deg, #10b981, #059669);
          margin: 10px 0;
          border-radius: 1px;
        }

        .calculation-detail {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default BillDetailModal;