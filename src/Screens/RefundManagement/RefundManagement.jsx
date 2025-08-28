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

  // 🔥 XỬ LÝ HOÀN TIỀN VNPAY + GỬI THÔNG BÁO
  const handleProcessVNPayRefund = async (bill) => {
    if (!window.confirm(
      `Xác nhận hoàn tiền VNPay cho đơn #${bill._id.slice(-8)}?\n\n` +
      `Số tiền: ${calcMoney(bill).fmt.total}\n` +
      `Khách hàng: ${getCustomerInfo(bill).name}\n\n` +
      `✅ Hệ thống sẽ tự động gửi thông báo đến khách hàng sau khi hoàn tiền thành công.`
    )) return;

    try {
      // 1. Gọi API hoàn tiền VNPay
      const refundResult = await api.post('/payments/vnpay/refund', {
        bill_id: bill._id,
        amount: bill.total,
        transactionNo: bill.vnpay_transaction_no || '',
        transDate: bill.vnpay_transaction_date || new Date(bill.created_at).toISOString(),
        note: 'Admin duyệt hoàn tiền'
      });

      if (refundResult.data.code === '00') {
        // 2. Cập nhật trạng thái đơn hàng
        await api.put(`/bills/${bill._id}`, {
          status: REFUND_STATUSES.REFUNDED,
          refund_note: 'Hoàn tiền VNPay thành công',
          refund_date: new Date().toISOString(),
          vnpay_refund_code: refundResult.data.vnp_TransactionNo
        });

        // 3. 🔥 GỬI THÔNG BÁO ĐẾN USER
        let userId = null; // Khai báo userId ở ngoài để dùng trong catch block
        try {
          const moneyInfo = calcMoney(bill);
          
          const notificationContent = `💰 Hoàn tiền thành công!\n\n` +
            `🛒 Đơn hàng: #${bill._id.slice(-8)}\n` +
            `💵 Số tiền hoàn: ${moneyInfo.fmt.total}\n` +
            `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
            `Tiền đã được hoàn vào tài khoản VNPay của bạn. Vui lòng kiểm tra!`;

          // 🔍 DEBUG: Kiểm tra các field có thể chứa user_id
          console.log('� DEBUG - Bill object keys:', Object.keys(bill));
          console.log('🔍 DEBUG - Possible user fields:', {
            user_id: bill.user_id,
            customer_id: bill.customer_id,
            user: bill.user,
            customer: bill.customer,
            account_id: bill.account_id,
            account: bill.account
          });

          userId = bill.user_id || bill.customer_id || bill.account_id || 
                  (bill.user && bill.user._id) || 
                  (bill.customer && bill.customer._id) ||
                  (bill.account && bill.account._id);

          console.log('🔔 Chuẩn bị gửi thông báo hoàn tiền đến user:', userId);
          console.log('📄 Nội dung thông báo:', notificationContent);

          if (!userId) {
            console.error('❌ Không tìm thấy user_id trong bill object:', bill);
            throw new Error('Không tìm thấy user_id để gửi thông báo');
          }

          const notificationResponse = await api.post('/notifications', {
            user_id: userId,
            content: notificationContent,
            type: 'personal'
          });

          console.log('✅ Response từ notification API:', notificationResponse.data);
          console.log('✅ Đã gửi thông báo hoàn tiền thành công đến user:', userId);
        } catch (notifyError) {
          console.error('⚠️ Chi tiết lỗi gửi thông báo:', {
            error: notifyError,
            response: notifyError.response?.data,
            status: notifyError.response?.status,
            user_id: userId,
            bill_id: bill._id
          });
          // Không throw error vì hoàn tiền đã thành công
        }

        alert('✅ Đã hoàn tiền VNPay thành công!\n📱 Thông báo đã được gửi đến khách hàng.');
        loadData();
      } else {
        throw new Error(`VNPay error: ${refundResult.data.message}`);
      }

    } catch (err) {
      console.error(err);
      alert('❌ Không thể hoàn tiền VNPay: ' + err.message);
    }
  };

  // 🔥 XỬ LÝ ĐƠN GIAO THẤT BẠI - HOÀN HÀNG + GỬI THÔNG BÁO
  const handleReturnFailedOrder = async (bill) => {
    if (!window.confirm(
      `Xác nhận hoàn trả hàng cho đơn giao thất bại #${bill._id.slice(-8)}?\n\n` +
      `Hàng sẽ được trả về kho và có thể hoàn tiền nếu đã thanh toán online.\n\n` +
      `✅ Hệ thống sẽ tự động gửi thông báo đến khách hàng.`
    )) return;

    try {
      // 1. Cập nhật trạng thái đơn hàng
      await api.put(`/bills/${bill._id}`, {
        status: REFUND_STATUSES.RETURNED,
        return_note: 'Hoàn trả hàng do giao thất bại',
        return_date: new Date().toISOString()
      });

      // 2. 🔥 GỬI THÔNG BÁO ĐẾN USER
      try {
        const deliveryInfo = getDeliveryInfo(bill);
        
        const notificationContent = `📦 Thông báo hoàn trả hàng\n\n` +
          `🛒 Đơn hàng: #${bill._id.slice(-8)}\n` +
          `❌ Lý do: Giao hàng thất bại\n` +
          `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
          `📍 Địa chỉ giao: ${deliveryInfo.address}\n\n` +
          `Hàng đã được hoàn trả về kho. Nếu bạn đã thanh toán online, chúng tôi sẽ hoàn tiền trong thời gian sớm nhất.`;

        console.log('🔔 Chuẩn bị gửi thông báo hoàn trả đến user:', bill.user_id || bill.customer_id);

        await api.post('/notifications', {
          user_id: bill.user_id || bill.customer_id,
          content: notificationContent,
          type: 'personal'
        });

        console.log('✅ Đã gửi thông báo hoàn trả đến user:', bill.user_id || bill.customer_id);
      } catch (notifyError) {
        console.error('⚠️ Chi tiết lỗi gửi thông báo hoàn trả:', {
          error: notifyError,
          response: notifyError.response?.data,
          status: notifyError.response?.status,
          user_id: bill.user_id || bill.customer_id
        });
      }

      alert('✅ Đã xác nhận hoàn trả hàng.\n📱 Thông báo đã được gửi đến khách hàng.\n💡 Kiểm tra có cần hoàn tiền thêm.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('❌ Không thể cập nhật trạng thái hoàn trả.');
    }
  };

  // 🔥 ASSIGN LẠI CHO SHIPPER KHÁC - BỎ SHIPPER_ID ĐỂ APP SHIPPER CÓ THỂ NHẬN LẠI + GỬI THÔNG BÁO
  const handleReassignShipper = async (bill) => {
    const newShipperNote = prompt(
      `Giao lại đơn #${bill._id.slice(-8)} cho shipper khác?\n\n` +
      `Nhập ghi chú lý do giao lại:`
    );
    
    if (!newShipperNote || !newShipperNote.trim()) return;

    try {
      // 1. Cập nhật trạng thái đơn hàng
      await api.put(`/bills/${bill._id}`, {
        status: 'ready', // Đưa về trạng thái sẵn sàng giao để shipper khác nhận
        shipper_id: null, // 🔥 ĐẶT VỀ NULL ĐỂ APP SHIPPER CÓ THỂ NHẬN LẠI
        shipper_name: null, // Xóa tên shipper cũ
        reassign_note: newShipperNote,
        reassign_date: new Date().toISOString(),
        previous_shipper: bill.shipper_name || 'Unknown',
        failed_shipper_id: bill.shipper_id || null, // Lưu lại shipper giao thất bại
        shipping_started_at: null, // Reset thời gian bắt đầu giao
        shipping_notes: null // Reset ghi chú giao hàng
      });

      // 2. 🔥 GỬI THÔNG BÁO ĐẾN USER
      try {
        const deliveryInfo = getDeliveryInfo(bill);
        
        const notificationContent = `🔄 Đơn hàng được giao lại\n\n` +
          `🛒 Đơn hàng: #${bill._id.slice(-8)}\n` +
          `📍 Địa chỉ giao: ${deliveryInfo.address}\n` +
          `📅 Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
          `👤 Người nhận: ${deliveryInfo.name} - ${deliveryInfo.phone}\n\n` +
          `Đơn hàng của bạn đang được sắp xếp giao lại bởi shipper khác. Chúng tôi sẽ liên hệ sớm nhất!`;

        console.log('🔔 Chuẩn bị gửi thông báo giao lại đến user:', bill.user_id || bill.customer_id);

        await api.post('/notifications', {
          user_id: bill.user_id || bill.customer_id,
          content: notificationContent,
          type: 'personal'
        });

        console.log('✅ Đã gửi thông báo giao lại đến user:', bill.user_id || bill.customer_id);
      } catch (notifyError) {
        console.error('⚠️ Chi tiết lỗi gửi thông báo giao lại:', {
          error: notifyError,
          response: notifyError.response?.data,
          status: notifyError.response?.status,
          user_id: bill.user_id || bill.customer_id
        });
      }

      alert('✅ Đã đặt lại đơn hàng về trạng thái "Sẵn sàng giao".\n🚚 Shipper khác có thể nhận đơn này trong app.\n📱 Thông báo đã được gửi đến khách hàng.');
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
            {/* <button className="reject-refund" onClick={() => handleRejectRefund(bill)}>
              ❌ Từ chối
            </button> */}
          </>
        )}

        {/* TRẠNG THÁI: REFUND_PENDING - Chờ hoàn tiền */}
        {status === REFUND_STATUSES.REFUND_PENDING && (
          <>
            <button className="approve-refund" onClick={() => handleProcessVNPayRefund(bill)}>
              ✅ Duyệt hoàn tiền
            </button>
            {/* <button className="reject-refund" onClick={() => handleRejectRefund(bill)}>
              ❌ Từ chối
            </button> */}
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
                <th>Địa chỉ giao</th>
                <th>Tiền hàng</th>
                <th>Phí ship</th>
                <th>Giảm giá</th>
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
                    <td>
                      <div className="address-cell">
                        <div className="address">{d.address}</div>
                      </div>
                    </td>
                    <td className="money items">{m.fmt.items}</td>
                    <td className="money ship">{m.fmt.ship}</td>
                    <td className="money discount">{m.fmt.disc}</td>
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
                        {/* Lý do hủy đơn */}
                        {b.cancel_reason && <div className="cancel-reason">❌ Hủy: {b.cancel_reason}</div>}
                        
                        {/* Lý do giao thất bại */}
                        {b.failed_reason && <div className="failed-reason">🚫 Giao thất bại: {b.failed_reason}</div>}
                        
                        {/* Ghi chú hoàn tiền */}
                        {b.refund_note && <div className="refund-note">💰 Hoàn tiền: {b.refund_note}</div>}
                        
                        {/* Ghi chú hoàn trả hàng */}
                        {b.return_note && <div className="return-note">📦 Hoàn trả: {b.return_note}</div>}
                        
                        {/* Ghi chú giao lại */}
                        {b.reassign_note && <div className="reassign-note">🔄 Giao lại: {b.reassign_note}</div>}
                        
                        {/* Thông tin shipper hiện tại */}
                        {b.shipper_name && <div className="shipper-info">🚚 Shipper: {b.shipper_name}</div>}
                        
                        {/* Shipper trước đó (nếu có reassign) */}
                        {b.previous_shipper && <div className="previous-shipper">⬅️ Trước: {b.previous_shipper}</div>}
                        
                        {/* Nếu không có lý do gì */}
                        {!b.cancel_reason && !b.failed_reason && !b.refund_note && !b.return_note && !b.reassign_note && (
                          <div className="no-reason">📝 Chưa có ghi chú</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {renderActions(b)}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={13}>Không có đơn hàng cần xử lý hoàn tiền/hoàn hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}