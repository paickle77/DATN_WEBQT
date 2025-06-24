// src/Screens/Revenue/RevenueByDate.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueCommon.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const fmtDate = d => d.toISOString().split('T')[0];

const RevenueByDate = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [orders, setOrders]     = useState([]);
  const [details, setDetails]   = useState([]);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data.data));
    api.get('/orderDetails').then(r => setDetails(r.data.data));
  }, []);

  // Lọc đơn hàng trùng ngày
  const ordersInDate = selectedDate
    ? orders.filter(o => {
        const d = new Date(o.created_at);
        return fmtDate(d) === fmtDate(selectedDate);
      })
    : [];

  // Lọc chi tiết cho các đơn trên
  const idSet = new Set(ordersInDate.map(o => o._id));
  const detInDate = details.filter(d => idSet.has(d.order_id));
  const total = detInDate.reduce((sum, d) => sum + d.quantity * d.price, 0);

  return (
    <div className="revenue-wrapper">
      <TabBarr/>
      <h2>Doanh thu theo ngày</h2>

      <div className="filter">
        <label>Chọn ngày:</label>
        <DatePicker
          selected={selectedDate}
          onChange={setSelectedDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="Click để chọn ngày"
          maxDate={new Date()}
        />
      </div>

      {selectedDate && (
        <div className="result">
          <h3>Ngày: {fmtDate(selectedDate)}</h3>
          {detInDate.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr><th>#</th><th>Mã đơn</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                </thead>
                <tbody>
                  {detInDate.map((d,i) => (
                    <tr key={d._id}>
                      <td>{i+1}</td>
                      <td>{d.order_id}</td>
                      <td>{d.quantity}</td>
                      <td>{d.price.toLocaleString('vi-VN')}</td>
                      <td>{(d.quantity*d.price).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="total">Tổng: {total.toLocaleString('vi-VN')} ₫</p>
            </>
          ) : (
            <p>Không có dữ liệu.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueByDate;
