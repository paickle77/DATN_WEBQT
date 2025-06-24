// src/Screens/Revenue/RevenueByMonth.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueCommon.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const fmtMonth = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

const RevenueByMonth = () => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [orders, setOrders]   = useState([]);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data.data));
    api.get('/orderDetails').then(r => setDetails(r.data.data));
  }, []);

  const ordersInMonth = selectedMonth
    ? orders.filter(o => {
        const d = new Date(o.created_at);
        return (
          d.getFullYear() === selectedMonth.getFullYear() &&
          d.getMonth()    === selectedMonth.getMonth()
        );
      })
    : [];

  const idSet = new Set(ordersInMonth.map(o => o._id));
  const detInMonth = details.filter(d => idSet.has(d.order_id));
  const total = detInMonth.reduce((s,d) => s + d.quantity*d.price, 0);

  return (
    <div className="revenue-wrapper">
      <TabBarr/>
      <h2>Doanh thu theo tháng</h2>

      <div className="filter">
        <label>Chọn tháng:</label>
        <DatePicker
          selected={selectedMonth}
          onChange={setSelectedMonth}
          dateFormat="MM/yyyy"
          showMonthYearPicker
          placeholderText="Chọn tháng"
        />
      </div>

      {selectedMonth && (
        <div className="result">
          <h3>Tháng: {fmtMonth(selectedMonth)}</h3>
          {detInMonth.length>0 ? (
            <>
              <table>
                <thead>
                  <tr><th>#</th><th>Mã đơn</th><th>Số lượng</th><th>Thành tiền</th></tr>
                </thead>
                <tbody>
                  {detInMonth.map((d,i) => (
                    <tr key={d._id}>
                      <td>{i+1}</td>
                      <td>{d.order_id}</td>
                      <td>{d.quantity}</td>
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

export default RevenueByMonth;
