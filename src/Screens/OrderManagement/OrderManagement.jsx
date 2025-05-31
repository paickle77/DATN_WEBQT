import React, { useState } from 'react';
import './OrderManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';

const sampleOrders = [
  {
    id: 1,
    customerName: 'Nguyễn Văn A',
    date: '2024-05-01',
    status: 'Đã giao',
    total: 1500000,
  },
  {
    id: 2,
    customerName: 'Trần Thị B',
    date: '2024-05-02',
    status: 'Đang xử lý',
    total: 800000,
  },
  {
    id: 3,
    customerName: 'Phạm Văn C',
    date: '2024-05-05',
    status: 'Đã giao',
    total: 1200000,
  },
];

const OrderManagement = () => {
  const [orders, setOrders] = useState(sampleOrders);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
      setOrders(orders.filter((order) => order.id !== id));
    }
  };

  const filteredOrders = orders.filter((order) =>
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="order-management">
        <div>
            <TabBarr/>
        </div>
      <h2>Quản lý đơn hàng</h2>

      <div style={{padding:20}} className="top-bar">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên khách hàng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

     <div style={{padding:20}}>
         <table>
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Ngày đặt</th>
            <th>Trạng thái</th>
            <th>Tổng tiền (VND)</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>DH{order.id.toString().padStart(3, '0')}</td>
                <td>{order.customerName}</td>
                <td>{order.date}</td>
                <td>{order.status}</td> 
                <td>{order.total.toLocaleString('vi-VN')}</td>
                <td>
                  <button onClick={() => alert('Xem chi tiết đơn hàng')}>Xem</button>
                  <button onClick={() => handleDelete(order.id)}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">Không tìm thấy đơn hàng phù hợp</td>
            </tr>
          )}
        </tbody>
      </table>
     </div>
    </div>
  );
};

export default OrderManagement;
