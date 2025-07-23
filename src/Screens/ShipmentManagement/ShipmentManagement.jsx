import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

export default function ShipmentManagement() {
  const [shipments, setShipments] = useState([]);
  const [staff, setStaff]         = useState([]);

  useEffect(() => {
    fetchData();
    api.get('/users').then(r => {
      setStaff(r.data.data.filter(u => u.role === 'shipper'));
    });
  }, []);

  const fetchData = () =>
    api.get('/shipments')
       .then(r => setShipments(r.data.data))
       .catch(() => toast.error('Không tải được danh sách giao hàng'));

  const updateShipment = (id, payload) => {
    api.put(`/shipments/${id}`, payload)
       .then(() => {
         toast.success('Cập nhật thành công');
         fetchData();
       })
       .catch(() => toast.error('Lỗi khi cập nhật'));
  };

  return (
    <div className="shipment-management">
      <TabBarr />

      <div className="shipment-content">
        <h2>Quản lý Giao hàng & Tracking</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Hóa đơn</th>
                <th>Shipper</th>
                <th>Ngày gửi</th>
                <th>Tracking</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s, i) => {
                return (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    {/* Hiển thị bill_id thay vì order_id */}
                    <td>{s.bill_id?._id || '-'}</td>
                    <td>
                      <select
                        value={s.assignedTo?._id || ''}
                        onChange={e => updateShipment(s._id, { assignedTo: e.target.value })}
                      >
                        <option value="">— Chọn —</option>
                        {staff.map(u => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(s.shippedDate).toLocaleDateString('vi-VN')}</td>
                    <td>{s.carrier} / {s.trackingCode}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      {['shipping','done'].map(st => {
                        // enable nút "shipping" khi bill đã xác nhận xong (doing→shipping)
                        // và enable nút "done" khi hiện tại đang shipping
                        let disabled = false;
                        if (st === 'shipping') {
                          disabled = s.status !== 'shipping' && s.status !== 'doing';
                        } else {
                          disabled = s.status !== 'shipping';
                        }
                        if (s.status === st) disabled = true;

                        const label = st === 'shipping' ? 'Đang giao' : 'Hoàn thành';

                        return (
                          <button
                            key={st}
                            disabled={disabled}
                            onClick={() => updateShipment(s._id, { status: st })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
