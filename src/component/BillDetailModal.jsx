// 🔥 FIXED BillDetailModal - Đồng bộ logic tài chính với BillManagement và ShipmentManagement
import React from 'react';
import './BillDetailModal.scss';

const BillDetailModal = ({ bill, onClose, onPrint }) => {
  console.log('🔍 Bill detail modal data:', bill);
  console.log('🔍 Items data:', bill.items);

  // 🔥 ĐỒNG BỘ LOGIC CALCULATEFINANCIALINFO VỚI BILLMANAGEMENT
  const calculateFinancialInfo = (bill) => {
    // 1. TIỀN HÀNG: Ưu tiên original_total từ MongoDB
    let itemsSubtotal = 0;
    if (Array.isArray(bill.items) && bill.items.length > 0) {
      itemsSubtotal = bill.items.reduce((sum, item) => {
        const itemPrice = getItemPrice(item);
        const quantity = Number(item.quantity) || 0;
        return sum + (itemPrice * quantity);
      }, 0);
    }
    
    // Ưu tiên original_total từ MongoDB thay vì tính từ items
    const originalTotal = Number(bill.original_total) || 0;
    const finalItemsSubtotal = originalTotal > 0 ? originalTotal : itemsSubtotal;

    // 2. PHI SHIP: Từ MongoDB
    const shippingFee = Number(bill.shipping_fee) || 0;

    // 3. GIẢM GIÁ: Từ MongoDB 
    const discountAmount = Number(bill.discount_amount) || 0;

    // 4. TỔNG TIỀN: Từ MongoDB (đã tính sẵn)
    const finalTotal = Number(bill.total) || 0;

    // 5. VERIFICATION: Kiểm tra công thức
    const calculatedTotal = finalItemsSubtotal + shippingFee - discountAmount;
    const isFormulaCorrect = Math.abs(calculatedTotal - finalTotal) < 1;

    console.log(`💰 Modal financial calculation for bill ${bill._id?.slice(-8)}:`, {
      originalTotal,
      itemsFromCalculation: itemsSubtotal,
      finalItemsSubtotal,
      shippingFee,
      discountAmount,
      calculatedTotal,
      finalTotal,
      isFormulaCorrect
    });

    return {
      itemsSubtotal: finalItemsSubtotal,
      shippingFee,
      discountAmount,
      finalTotal,
      calculatedTotal,
      isFormulaCorrect,
      // Formatted versions
      itemsSubtotal_formatted: finalItemsSubtotal.toLocaleString('vi-VN') + ' đ',
      shippingFee_formatted: shippingFee.toLocaleString('vi-VN') + ' đ',
      discountAmount_formatted: discountAmount.toLocaleString('vi-VN') + ' đ',
      finalTotal_formatted: finalTotal.toLocaleString('vi-VN') + ' đ'
    };
  };

  // 🔧 ĐỒNG BỘ HÀM LẤY GIÁ SẢN PHẨM VỚI BILLMANAGEMENT
  const getItemPrice = (item) => {
    // Thử các field khác nhau theo thứ tự ưu tiên
    const priceFields = ['unit_price', 'unitPrice', 'price', 'itemPrice', 'productPrice'];
    
    for (const field of priceFields) {
      if (item[field] && Number(item[field]) > 0) {
        return Number(item[field]);
      }
    }
    
    // Fallback: tính từ total/quantity nếu có
    if (item.total && item.quantity && Number(item.quantity) > 0) {
      return Number(item.total) / Number(item.quantity);
    }
    
    console.warn('⚠️ Không tìm thấy giá hợp lệ cho item:', item);
    return 0;
  };

  // 🔥 HÀM LẤY SỐ LƯỢNG SẢN PHẨM
  const getItemQuantity = (item) => {
    return Number(item.quantity) || 1;
  };

  // 🔥 HÀM LẤY TÊN SẢN PHẨM
  const getItemName = (item) => {
    // Ưu tiên product_snapshot.name từ database
    if (item.product_snapshot?.name) {
      return item.product_snapshot.name;
    }
    return item.productName || item.name || item.product_name || item.title || 'Sản phẩm không rõ';
  };

  // 🔥 SỬ DỤNG DỮ LIỆU ĐÃ TÍNH SẴN TỪ API ENRICHED
  const items = Array.isArray(bill.items) ? bill.items : [];
  
  // 🔥 TÍNH TOÁN TÀI CHÍNH CHÍNH XÁC
  const financialInfo = calculateFinancialInfo(bill);

  // 🔥 THÔNG TIN KHÁCH HÀNG VÀ GIAO HÀNG TỪ ENRICHED DATA
  const customerInfo = {
    name: bill.customerName || bill.userName || 'Khách hàng không rõ',
    phone: bill.customerPhone || '',
    address: bill.customerAddress || bill.addressStr || 'Chưa có địa chỉ'
  };

  const deliveryInfo = {
    name: bill.deliveryName || bill.address_snapshot?.name || 'Chưa có tên người nhận',
    phone: bill.deliveryPhone || bill.address_snapshot?.phone || 'Chưa có SĐT',
    address: bill.deliveryAddress || 
             (bill.address_snapshot ? 
              `${bill.address_snapshot.detail}, ${bill.address_snapshot.ward}, ${bill.address_snapshot.district}, ${bill.address_snapshot.city}` : 
              'Chưa có địa chỉ giao hàng')
  };

  // 🔥 THÔNG TIN THANH TOÁN VÀ GIAO HÀNG
  const orderInfo = {
    shippingMethod: bill.shippingMethodDisplay || bill.shipping_method || 'Chưa chọn',
    paymentMethod: bill.paymentMethodDisplay || bill.payment_method || 'Chưa chọn',
    voucherCode: bill.voucherDisplayCode || bill.voucher_code || '—',
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
            {!financialInfo.isFormulaCorrect && (
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
          {!financialInfo.isFormulaCorrect && (
            <div className="financial-warning-section">
              <div className="warning-card">
                <div className="warning-header">
                  <span className="warning-icon">⚠️</span>
                  <h4>Phát hiện vấn đề trong tính toán tài chính</h4>
                </div>
                <div className="warning-content">
                  <div className="warning-item">
                    <strong>Công thức tính toán không đúng:</strong>
                    <br />
                    • Tiền hàng: {financialInfo.itemsSubtotal_formatted}
                    <br />
                    • Phí vận chuyển: {financialInfo.shippingFee_formatted}
                    <br />
                    • Giảm giá: {financialInfo.discountAmount_formatted}
                    <br />
                    • Tính toán: {financialInfo.calculatedTotal.toLocaleString('vi-VN')} đ
                    <br />
                    • Backend: {financialInfo.finalTotal_formatted}
                    <br />
                    • Chênh lệch: {Math.abs(financialInfo.calculatedTotal - financialInfo.finalTotal).toLocaleString('vi-VN')} đ
                  </div>
                  
                  <div className="warning-actions">
                    <button 
                      className="debug-btn"
                      onClick={() => {
                        console.group('🔍 Modal Financial Debug Details');
                        console.log('📊 Backend Data:', {
                          original_total: bill.original_total,
                          shipping_fee: bill.shipping_fee,
                          discount_amount: bill.discount_amount,
                          total: bill.total
                        });
                        console.log('📦 Items:', items);
                        console.log('🧮 Financial Info:', financialInfo);
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
                      Giảm: {financialInfo.discountAmount_formatted}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 DANH SÁCH SẢN PHẨM - ĐỒNG BỘ VỚI BILLMANAGEMENT */}
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
                    <th>Kích cỡ</th>
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
                    const itemSize = item.size || item.selected_size || '—';
                    
                    return (
                      <tr key={i}>
                        <td>
                          <span className="row-number">{i + 1}</span>
                        </td>
                        <td className="product-name">
                          <div className="product-info">
                            <span className="name">{itemName}</span>
                            {item.product_id && (
                              <span className="product-id">ID: {item.product_id}</span>
                            )}
                            {itemPrice === 0 && (
                              <span className="price-warning">⚠️ Không có giá</span>
                            )}
                          </div>
                        </td>
                        <td className="product-size">
                          <span className="size-badge">{itemSize}</span>
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
                          <strong className={itemPrice === 0 ? 'price-error' : ''}>
                            {itemTotal.toLocaleString('vi-VN')} đ
                          </strong>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="no-items">
                        <span>📭 Không có sản phẩm nào trong đơn hàng</span>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="subtotal-row">
                    <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      💰 Tiền hàng:
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      <span className="price-normal">
                        {financialInfo.itemsSubtotal_formatted}
                      </span>
                      {Number(bill.original_total) > 0 && (
                        <div style={{ fontSize: '11px', color: '#059669' }}>
                          Từ MongoDB: {Number(bill.original_total).toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 🔥 BREAKDOWN TÀI CHÍNH CHI TIẾT - ĐỒNG BỘ VỚI BILLMANAGEMENT */}
          <div className="financial-section">
            <h4>
              <span className="icon">💰</span>
              Chi tiết thanh toán
              {!financialInfo.isFormulaCorrect && (
                <span className="section-warning" title="Tổng tiền có vấn đề">⚠️</span>
              )}
            </h4>
            <div className="financial-breakdown">
              <div className="financial-card">
                <div className="breakdown-item">
                  <span className="label">💰 Tiền hàng:</span>
                  <div className="value-container">
                    <span className="value">
                      {financialInfo.itemsSubtotal_formatted}
                    </span>
                    <small className="source-note">
                      Nguồn: {Number(bill.original_total) > 0 ? 'MongoDB original_total' : 'Tính từ items'}
                    </small>
                  </div>
                </div>
                
                <div className="breakdown-item">
                  <span className="label">🚚 Phí vận chuyển:</span>
                  <span className="value">{financialInfo.shippingFee_formatted}</span>
                </div>

                {financialInfo.discountAmount > 0 && (
                  <div className="breakdown-item discount-item">
                    <span className="label">💸 Giảm giá:</span>
                    <span className="value discount-value">-{financialInfo.discountAmount_formatted}</span>
                  </div>
                )}

                <div className="breakdown-divider"></div>

                <div className="breakdown-item total-item">
                  <span className="label">💵 TỔNG THANH TOÁN:</span>
                  <div className="value-container">
                    <span className="value total-value">
                      {financialInfo.finalTotal_formatted}
                    </span>
                    {!financialInfo.isFormulaCorrect && (
                      <div className="validation-info">
                        <small className="calculated-value">
                          Tính toán: {financialInfo.calculatedTotal.toLocaleString('vi-VN')} đ
                        </small>
                        <small className="difference">
                          Chênh lệch: {Math.abs(financialInfo.calculatedTotal - financialInfo.finalTotal).toLocaleString('vi-VN')} đ
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hiển thị công thức tính */}
                <div className="calculation-detail">
                  <small>
                    📊 Công thức: {financialInfo.itemsSubtotal.toLocaleString('vi-VN')} 
                    + {financialInfo.shippingFee.toLocaleString('vi-VN')}
                    {financialInfo.discountAmount > 0 && ` - ${financialInfo.discountAmount.toLocaleString('vi-VN')}`}
                    {' = '}{financialInfo.calculatedTotal.toLocaleString('vi-VN')} đ
                  </small>
                  {!financialInfo.isFormulaCorrect && (
                    <small style={{ display: 'block', color: '#ef4444', marginTop: '5px' }}>
                      ⚠️ Backend trả về: {financialInfo.finalTotal.toLocaleString('vi-VN')} đ
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
                         `Tiền hàng: ${financialInfo.itemsSubtotal_formatted}\n` +
                         `Phí ship: ${financialInfo.shippingFee_formatted}\n` +
                         `${financialInfo.discountAmount > 0 ? `Giảm giá: ${financialInfo.discountAmount_formatted}\n` : ''}` +
                         `Tổng tiền: ${financialInfo.finalTotal_formatted}\n` +
                         `Trạng thái: ${orderInfo.status}\n` +
                         `Ngày tạo: ${orderInfo.createdDate}` +
                         `${!financialInfo.isFormulaCorrect ? `\n⚠️ Công thức sai - Tính toán: ${financialInfo.calculatedTotal.toLocaleString('vi-VN')}đ` : ''}`;
              navigator.clipboard.writeText(info);
              alert('📋 Đã copy thông tin hóa đơn!');
            }}>
              <span className="icon">📋</span>
              <span>Copy thông tin</span>
            </button>

            {/* Debug button nếu có vấn đề */}
            {!financialInfo.isFormulaCorrect && (
              <button className="btn-debug" onClick={() => {
                console.group('🔍 Detailed Financial Debug - Modal');
                console.log('💰 Financial Info:', financialInfo);
                console.log('📊 Bill Raw Data:', {
                  original_total: bill.original_total,
                  shipping_fee: bill.shipping_fee,
                  discount_amount: bill.discount_amount,
                  total: bill.total
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
                  itemsSubtotal: financialInfo.itemsSubtotal,
                  shippingFee: financialInfo.shippingFee,
                  discountAmount: financialInfo.discountAmount,
                  calculatedTotal: financialInfo.calculatedTotal,
                  backendTotal: financialInfo.finalTotal,
                  isCorrect: financialInfo.isFormulaCorrect
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

        .source-note {
          color: #6b7280;
          font-size: 10px;
          font-style: italic;
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

        .size-badge {
          background: #f3f4f6;
          color: #374151;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }

        .product-size {
          text-align: center;
        }

        .discount-badge {
          background: #dcfce7;
          color: #166534;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          margin-left: 8px;
        }

        .voucher-code {
          font-family: monospace;
          background: #f8fafc;
          padding: 2px 4px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default BillDetailModal;