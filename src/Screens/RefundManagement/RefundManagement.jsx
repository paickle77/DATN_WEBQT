// RefundManagement.jsx cải tiến
import React, { useEffect, useMemo, useState } from 'react';
import './RefundManagement.scss';
import api from '../../utils/api';
import TabBar from '../../component/tabbar/TabBar';

// Các trạng thái liên quan đến hoàn tiền/hoàn hàng
const REFUND_STATUSES = {
  CANCELLED: 'cancelled',           // Đã hủy (có thể cần hoàn tiền VNPay)
  REFUND_PENDING: 'refund_pending', // Chờ hoàn tiền
  REFUNDED: 'refunded',             // Đã hoàn tiền
  FAILED: 'failed',                 // Giao thất bại (từ ShipmentManagement chuyển sang)
  RETURNED: 'returned'              // Đã hoàn trả hàng
};

const STATUS_LABELS = {
  [REFUND_STATUSES.CANCELLED]: 'Đã hủy',
  [REFUND_STATUSES.REFUND_PENDING]: 'Chờ hoàn tiền VNPay',
  [REFUND_STATUSES.REFUNDED]: 'Đã hoàn tiền',
  [REFUND_STATUSES.FAILED]: 'Giao thất bại',
  [REFUND_STATUSES.RETURNED]: 'Đã hoàn trả hàng'
};

const STATUS_COLORS = {
  [REFUND_STATUSES.CANCELLED]: '#6b7280',
  [REFUND_STATUSES.REFUND_PENDING]: '#eab308',
  [REFUND_STATUSES.REFUNDED]: '#84cc16',
  [REFUND_STATUSES.FAILED]: '#ef4444',
  [REFUND_STATUSES.RETURNED]: '#f97316'
};

export default function RefundManagement() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/bills/enhanced?enrich=true');
      const all = res?.data?.data || [];
      
      // 🔥 LỌC CÁC TRẠNG THÁI LIÊN QUAN ĐÉN HOÀN TIỀN/HOÀN HÀNG
      const refundBills = all.filter(b => 
        Object.values(REFUND_STATUSES).includes(b.status)
      );
      
      setBills(refundBills);
    } catch (err) {
      console.error(err);
      setError('Không tải được danh sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerInfo = (bill) => ({
    name: bill.customerName || 'Khách hàng không rõ',
    phone: bill.customerPhone || ''
  });

  const getDeliveryInfo = (bill) => ({
    name: bill.deliveryName || 'Chưa có tên người nhận',
    phone: bill.deliveryPhone || 'Chưa có SĐT',
    address: bill.deliveryAddress || 'Chưa có địa chỉ giao hàng'
  });

  const calcMoney = (bill) => {
    const itemsSubtotal = Number(bill.original_total) || 0;
    const shippingFee   = Number(bill.shipping_fee)    || 0;
    const discount      = Number(bill.discount_amount) || 0;
    const total         = Number(bill.total)           || 0;
    return {
      itemsSubtotal, shippingFee, discount, total,
      fmt: {
        items: itemsSubtotal.toLocaleString('vi-VN') + ' đ',
        ship: shippingFee.toLocaleString('vi-VN') + ' đ',
        disc: discount > 0 ? `-${discount.toLocaleString('vi-VN')} đ` : '0 đ',
        total: total.toLocaleString('vi-VN') + ' đ'
      }
    };
  };

  // 🔥 XỬ LÝ HOÀN TIỀN VNPAY
  const handleProcessVNPayRefund = async (bill) => {
    if (!window.confirm(
      `Xác nhận hoàn tiền VNPay cho đơn #${bill._id.slice(-8)}?\n\n` +
      `Số tiền: ${calcMoney(bill).fmt.total}\n` +
      `Khách hàng: ${getCustomerInfo(bill).name}`
    )) return;

    try {
      // Gọi API hoàn tiền VNPay
      const refundResult = await api.post('/payments/vnpay/refund', {
        bill_id: bill._id,
        amount: bill.total,
        transactionNo: bill.vnpay_transaction_no || '',
        transDate: bill.vnpay_transaction_date || new Date(bill.created_at).toISOString(),
        note: 'Admin duyệt hoàn tiền'
      });

      if (refundResult.data.code === '00') {
        // Cập nhật trạng thái đơn hàng
        await api.put(`/bills/${bill._id}`, {
          status: REFUND_STATUSES.REFUNDED,
          refund_note: 'Hoàn tiền VNPay thành công',
          refund_date: new Date().toISOString(),
          vnpay_refund_code: refundResult.data.vnp_TransactionNo
        });

        alert('✅ Đã hoàn tiền VNPay thành công!');
        loadData();
      } else {
        throw new Error(`VNPay error: ${refundResult.data.message}`);
      }

    } catch (err) {
      console.error(err);
      alert('❌ Không thể hoàn tiền VNPay: ' + err.message);
    }
  };

  // 🔥 XỬ LÝ ĐƠN GIAO THẤT BẠI - HOÀN HÀNG
  const handleReturnFailedOrder = async (bill) => {
    if (!window.confirm(
      `Xác nhận hoàn trả hàng cho đơn giao thất bại #${bill._id.slice(-8)}?\n\n` +
      `Hàng sẽ được trả về kho và có thể hoàn tiền nếu đã thanh toán online.`
    )) return;

    try {
      await api.put(`/bills/${bill._id}`, {
        status: REFUND_STATUSES.RETURNED,
        return_note: 'Hoàn trả hàng do giao thất bại',
        return_date: new Date().toISOString()
      });

      alert('✅ Đã xác nhận hoàn trả hàng. Kiểm tra có cần hoàn tiền thêm.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('❌ Không thể cập nhật trạng thái hoàn trả.');
    }
  };

  // 🔥 ASSIGN LẠI CHO SHIPPER KHÁC
  const handleReassignShipper = async (bill) => {
    const newShipperNote = prompt(
      `Giao lại đơn #${bill._id.slice(-8)} cho shipper khác?\n\n` +
      `Nhập ghi chú lý do giao lại:`
    );
    
    if (!newShipperNote || !newShipperNote.trim()) return;

    try {
      await api.put(`/bills/${bill._id}`, {
        status: 'ready', // Đưa về trạng thái sẵn sàng giao để shipper khác nhận
        reassign_note: newShipperNote,
        reassign_date: new Date().toISOString(),
        previous_shipper: bill.shipper_name || 'Unknown'
      });

      alert('✅ Đã chuyển đơn về trạng thái "Sẵn sàng giao" để shipper khác nhận.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('❌ Không thể giao lại đơn hàng.');
    }
  };

  // 🔥 RENDER ACTION BUTTONS THEO TỪNG TRẠNG THÁI
  const renderActions = (bill) => {
    const status = bill.status;
    const isPaidOnline = bill.payment_method === 'vnpay' && bill.payment_status === 'paid';

    return (
      <div className="btn-group">
        {/* TRẠNG THÁI: CANCELLED - Đã hủy, có thể cần hoàn VNPay */}
        {status === REFUND_STATUSES.CANCELLED && isPaidOnline && (
          <>
            <button className="process-refund" onClick={() => handleProcessVNPayRefund(bill)}>
              💳 Hoàn VNPay
            </button>
            <button className="reject-refund" onClick={() => handleRejectRefund(bill)}>
              ❌ Từ chối
            </button>
          </>
        )}

        {/* TRẠNG THÁI: REFUND_PENDING - Chờ hoàn tiền */}
        {status === REFUND_STATUSES.REFUND_PENDING && (
          <>
            <button className="approve-refund" onClick={() => handleProcessVNPayRefund(bill)}>
              ✅ Duyệt hoàn tiền
            </button>
            <button className="reject-refund" onClick={() => handleRejectRefund(bill)}>
              ❌ Từ chối
            </button>
          </>
        )}

        {/* TRẠNG THÁI: FAILED - Giao thất bại */}
        {status === REFUND_STATUSES.FAILED && (
          <>
            <button className="return-goods" onClick={() => handleReturnFailedOrder(bill)}>
              📦 Hoàn trả hàng
            </button>
            <button className="reassign-shipper" onClick={() => handleReassignShipper(bill)}>
              🔄 Giao lại
            </button>
            {isPaidOnline && (
              <button className="refund-failed" onClick={() => handleProcessVNPayRefund(bill)}>
                💳 Hoàn tiền
              </button>
            )}
          </>
        )}

        {/* TRẠNG THÁI: REFUNDED - Đã hoàn tiền */}
        {status === REFUND_STATUSES.REFUNDED && (
          <button className="query-status" onClick={() => handleQueryVNPayStatus(bill)}>
            🔍 Query VNPay
          </button>
        )}

        {/* TRẠNG THÁI: RETURNED - Đã hoàn trả */}
        {status === REFUND_STATUSES.RETURNED && (
          <span className="status-note">✅ Đã xử lý xong</span>
        )}
      </div>
    );
  };

  const handleRejectRefund = async (bill) => {
    const reason = prompt('Nhập lý do từ chối hoàn tiền:');
    if (!reason) return;

    try {
      await api.put(`/bills/${bill._id}`, {
        status: REFUND_STATUSES.CANCELLED,
        refund_reject_reason: reason,
        refund_reject_date: new Date().toISOString()
      });
      alert('✅ Đã từ chối hoàn tiền.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('❌ Không thể cập nhật trạng thái.');
    }
  };

  const handleQueryVNPayStatus = async (bill) => {
    try {
      const result = await api.post('/payments/vnpay/query', {
        bill_id: bill._id,
        orderId: bill.order_code || bill._id,
        transDate: bill.vnpay_transaction_date || bill.created_at
      });
      
      alert(`VNPay Query Result:\nCode: ${result.data.code}\nMessage: ${result.data.message}`);
    } catch (err) {
      console.error(err);
      alert('❌ Không thể truy vấn trạng thái VNPay.');
    }
  };

  const filtered = useMemo(() => {
    return bills.filter(b => {
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const c = getCustomerInfo(b);
        const d = getDeliveryInfo(b);
        return (b._id || '').toLowerCase().includes(s)
            || c.name.toLowerCase().includes(s)
            || c.phone.toLowerCase().includes(s)
            || d.name.toLowerCase().includes(s)
            || d.phone.toLowerCase().includes(s);
      }
      return true;
    });
  }, [bills, searchTerm, filterStatus]);

  if (loading) {
    return (
      <div className="refund-management">
        <TabBar />
        <div className="loading">⏳ Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="refund-management">
      <TabBar />
      <div className="refund-content">
        <div className="header">
          <div className="header-left">
            <h1>🔄 Quản lý hoàn tiền & hoàn hàng</h1>
            <p className="subtitle">
              Xử lý hoàn tiền VNPay, hoàn trả hàng giao thất bại, và các vấn đề sau bán hàng
            </p>
          </div>
          <div className="filters">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              className="filter-input"
              placeholder="Tìm: mã đơn, tên KH, SĐT, người nhận…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="refresh-btn" onClick={loadData}>🔄 Làm mới</button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="refund-stats">
          <div className="stat-card cancelled">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <span className="stat-number">
                {bills.filter(b => b.status === REFUND_STATUSES.CANCELLED).length}
              </span>
              <span className="stat-label">Đã hủy</span>
            </div>
          </div>
          <div className="stat-card refund-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <span className="stat-number">
                {bills.filter(b => b.status === REFUND_STATUSES.REFUND_PENDING).length}
              </span>
              <span className="stat-label">Chờ hoàn tiền</span>
            </div>
          </div>
          <div className="stat-card failed">
            <div className="stat-icon">🚫</div>
            <div className="stat-content">
              <span className="stat-number">
                {bills.filter(b => b.status === REFUND_STATUSES.FAILED).length}
              </span>
              <span className="stat-label">Giao thất bại</span>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-number">
                {bills.filter(b => [REFUND_STATUSES.RETURNED].includes(b.status)).length}
              </span>
              <span className="stat-label">Đã trả lại hàng</span>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <span className="stat-number">
                {bills.filter(b => [REFUND_STATUSES.REFUNDED].includes(b.status)).length}
              </span>
              <span className="stat-label">Đã hoàn tiền</span>
            </div>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Người nhận</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Lý do</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((b, i) => {
                const c = getCustomerInfo(b);
                const d = getDeliveryInfo(b);
                const m = calcMoney(b);
                const label = STATUS_LABELS[b.status] || b.status;
                const bg = STATUS_COLORS[b.status] || '#6b7280';
                
                return (
                  <tr key={b._id} className={`bill-row status-${b.status}`}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="bill-cell">
                        <div className="bill-id">#{b._id.slice(-8)}</div>
                        <div className="bill-date">
                          {b.created_date || (b.created_at ? new Date(b.created_at).toLocaleDateString('vi-VN') : 'N/A')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="name">{c.name}</div>
                        {c.phone && <a href={`tel:${c.phone}`} className="phone">📞 {c.phone}</a>}
                      </div>
                    </td>
                    <td>
                      <div className="delivery-cell">
                        <div className="name">{d.name}</div>
                        {d.phone !== 'Chưa có SĐT' && <a href={`tel:${d.phone}`} className="phone">📞 {d.phone}</a>}
                      </div>
                    </td>
                    <td className="money total">{m.fmt.total}</td>
                    <td>
                      <div className="payment-info">
                        <span className="method">{b.paymentMethodDisplay || b.payment_method || 'Chưa chọn'}</span>
                        {b.payment_method === 'vnpay' && (
                          <span className={`payment-status ${b.payment_status}`}>
                            {b.payment_status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: bg }}>{label}</span>
                    </td>
                    <td>
                      <div className="reason-cell">
                        {b.cancel_reason && <div className="cancel-reason">Hủy: {b.cancel_reason}</div>}
                        {b.failed_reason && <div className="failed-reason">Lỗi: {b.failed_reason}</div>}
                        {b.refund_note && <div className="refund-note">Hoàn: {b.refund_note}</div>}
                        {b.return_note && <div className="return-note">Trả: {b.return_note}</div>}
                      </div>
                    </td>
                    <td>
                      {renderActions(b)}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9}>Không có đơn hàng cần xử lý hoàn tiền/hoàn hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}