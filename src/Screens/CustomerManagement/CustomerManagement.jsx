import React, { useState } from 'react';
import './CustomerManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';

const sampleCustomers = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    email: 'vana@gmail.com',
    phone: '0912345678',
    address: 'Hà Nội',
  },
  {
    id: 2,
    name: 'Trần Thị B',
    email: 'thib@gmail.com',
    phone: '0987654321',
    address: 'TP. Hồ Chí Minh',
  },
  {
    id: 3,
    name: 'Lê Văn C',
    email: 'vanc@gmail.com',
    phone: '0933333333',
    address: 'Đà Nẵng',
  },
];

const CustomerManagement = () => {
  const [customers, setCustomers] = useState(sampleCustomers);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      setCustomers(customers.filter((c) => c.id !== id));
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="customer-management">
        <div>
            <TabBarr/>
        </div>
      <h2>Quản lý khách hàng</h2>

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
            <th>Mã KH</th>
            <th>Tên</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Địa chỉ</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>KH{customer.id.toString().padStart(3, '0')}</td>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{customer.address}</td>
                <td>
                  <button onClick={() => alert('Xem chi tiết khách hàng')}>Xem</button>
                  <button onClick={() => handleDelete(customer.id)}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">Không tìm thấy khách hàng phù hợp</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default CustomerManagement;
