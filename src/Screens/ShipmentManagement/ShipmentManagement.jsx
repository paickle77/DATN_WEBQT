import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../component/StatusBadge';
import TabBarr from '../../component/tabbar/TabBar';     // ← import vào đây
import './ShipmentManagement.scss';
import { toast } from 'react-toastify';

export default function ShipmentManagement() {
  const [shipments, setShipments] = useState([]);
  const [staff, setStaff]         = useState([]);

    useEffect(() => {
    fetchData();
    api.get('/users').then(r => {
        console.log('ALL USERS:', r.data.data);
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
      {/* ← đây là header khoanh đỏ của bạn */}
      <TabBarr />

      {/* phần nội dung trắng như ProductManagement */}
      <div className="shipment-content">
        <h2>Quản lý Giao hàng & Tracking</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Đơn hàng</th>
                <th>Shipper</th>
                <th>Ngày gửi</th>
                <th>Tracking</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s, i) => (
                <tr key={s._id}>
                  <td>{i + 1}</td>
                  <td>{s.order_id?._id || '-'}</td>
                  <td>
                    <select
                      value={s.assignedTo?._id || ''}
                      onChange={e =>
                        updateShipment(s._id, { assignedTo: e.target.value })
                      }
                    >
                      <option value="">— Chọn —</option>
                      {staff.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {new Date(s.shippedDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td>{s.carrier} / {s.trackingCode}</td>
                  <td>
                    <StatusBadge
                      status={s.status}
                      className={`status-badge ${s.status.replace(' ', '-')}`}
                    />
                  </td>
                  <td>
                    {['Đang giao','Hoàn thành'].map(st=>(
                      <button
                        key={st}
                        disabled={s.status===st}
                        onClick={()=>updateShipment(s._id, { status: st })}
                      >
                        {st}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
