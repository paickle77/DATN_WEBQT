import React, { useState, useEffect } from 'react';
import './RefundManagement.scss';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';

export default function RefundManagement() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
  try {
    const res = await api.get('/refund_requests');
    console.log(res.data);
    setRequests(res.data.data);
  } catch (err) {
    console.error(err.response || err);
    alert('Không tải được danh sách hoàn trả.');
  }
};


  const handleDecision = async (id, approve) => {
    if (!window.confirm(`Xác nhận ${approve ? 'chấp nhận' : 'từ chối'} hoàn trả?`)) return;
    try {
      await api.patch(`/refund_requests/${id}`, { status: approve ? 'approved' : 'rejected' });
      alert('Cập nhật thành công.');
      fetchRefunds();
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật trạng thái.');
    }
  };

  return (
    <div className="refund-management">
      <h2>Quản lý hoàn trả</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th><th>ID Đơn</th><th>Khách</th><th>Lý do</th><th>Trạng thái</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r,i)=>(
              <tr key={r._id}>
                <td>{i+1}</td>
             <td data-label="ID Đơn">
               {r.order_id && r.order_id._id 
                 ? r.order_id._id 
                 : r.order_id}
             </td>
             <td data-label="Khách">{r.customer_name}</td>
             <td data-label="Lý do">{r.reason}</td>
             <td data-label="Trạng thái">
               <StatusBadge status={r.status} />
             </td>
             <td data-label="Hành động">
               <div className="btn-group">
                 <button
                   className="approve"
                   onClick={() => handleDecision(r._id, true)}
                 >
                   Chấp nhận
                 </button>
                 <button
                   className="reject"
                   onClick={() => handleDecision(r._id, false)}
                 >
                   Từ chối
                 </button>
               </div>
             </td>
              </tr>
            ))}
            {requests.length===0&&(
              <tr><td colSpan="6">Không có yêu cầu hoàn trả.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
