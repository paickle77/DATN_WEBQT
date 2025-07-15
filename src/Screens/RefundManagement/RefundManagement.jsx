import React, { useState, useEffect } from 'react';
import './RefundManagement.scss';
import api from '../../utils/api';
import TabBar from '../../component/tabbar/TabBar';
import StatusBadge from '../../component/StatusBadge';

export default function RefundManagement() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/refund_requests');
      setRequests(res.data.data);
    } catch (err) {
      console.error(err);
      alert('Không tải được danh sách hoàn trả.');
    }
  };

  const handleDecision = async (id, approve) => {
    const req = requests.find(r => r._id === id);
    if (!window.confirm(`Xác nhận ${approve ? 'chấp nhận' : 'từ chối'} hoàn trả?`)) return;
    try {
      // 1) Cập nhật refund request
      await api.put(`/refund_requests/${id}`, {
        status: approve ? 'Đã chấp nhận' : 'Đã từ chối'
      });
       // 2) Nếu chấp nhận, đánh dấu đơn gốc đã hủy để khách không thấy nữa
       if (approve && req?.order_id?._id) {
         await api.put(`/orders/${req.order_id._id}`, {
           status: 'Đã hủy',
           cancel_note: req.reason
         });
       }
      alert('Cập nhật thành công.');
      fetchRefunds();
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật trạng thái.');
    }
  };

      // controllers/RefundManagement.jsx, ngay phía trên return(...)
    const handleCreateReplacement = async (orderId) => {
      if (!window.confirm('Tạo đơn mới thay thế cho đơn này?')) return;
      try {
        await api.post(`/orders/${orderId}/replace`);
        alert('Đã tạo đơn mới thành công');
        fetchRefunds();
      } catch (err) {
        console.error(err);
        alert('Không thể tạo đơn mới');
      }
    };


  return (
    <div className="refund-management">
      <TabBar />
      <div className="refund-content">
        <h2>Quản lý hoàn trả</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>ID Đơn</th>
                <th>Số tiền hoàn</th>
                <th>Khách</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((r, i) => (
                  <tr key={r._id}>
                    <td>{i + 1}</td>
                    <td>{r.order_id?._id || '-'}</td>
                    <td>{r.refund_amount?.toLocaleString('vi-VN')} đ</td>
                    <td>{r.customer_name}</td>
                    <td>{r.reason}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="approve"
                          onClick={() => handleDecision(r._id, true)}
                          disabled={r.status === 'Đã chấp nhận'}
                        >
                          Chấp nhận
                        </button>
                        <button
                          className="reject"
                          onClick={() => handleDecision(r._id, false)}
                          disabled={r.status === 'Đã từ chối'}
                        >
                          Từ chối
                        </button>
                        {/* ===== NÚT TẠO ĐƠN MỚI ===== */}
                        {r.status === 'Đã chấp nhận' && !r.order_id?.replacement_of && (
                          <button
                            className="create-replacement"
                            onClick={() => handleCreateReplacement(r.order_id._id)}
                          >
                            Tạo đơn mới
                          </button>
                              )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">Không có yêu cầu hoàn trả.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
