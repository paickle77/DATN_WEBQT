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
  const [bills, setBills]               = useState([]);
  const [details, setDetails]           = useState([]);

  useEffect(() => {
    api.get('/bills').then(r => setBills(r.data.data));
    api.get('/billdetails').then(r => setDetails(r.data.data));
  }, []);

  const billsInDate = selectedDate
    ? bills.filter(b => fmtDate(new Date(b.created_at)) === fmtDate(selectedDate))
    : [];
  const idSet       = new Set(billsInDate.map(b => b._id));
  const detInDate   = details.filter(d => idSet.has(d.bill_id));
  const total       = detInDate.reduce((sum,d) => sum + d.quantity*d.price, 0);

  return (
    <div className="revenue-wrapper">
      <TabBarr />
      <h2>Doanh thu theo ngày</h2>
      <label>Chọn ngày:</label>
      <DatePicker selected={selectedDate} onChange={setSelectedDate} dateFormat="dd/MM/yyyy" maxDate={new Date()} />
      {selectedDate && (
        <div className="result">
          <h3>Ngày: {fmtDate(selectedDate)}</h3>
          {detInDate.length>0 ? (
            <><table><thead><tr><th>#</th><th>Mã hóa đơn</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
            <tbody>{detInDate.map((d,i)=>(<tr key={d._id}><td>{i+1}</td><td>{d.bill_id}</td><td>{d.quantity}</td><td>{d.price.toLocaleString('vi-VN')}</td><td>{(d.quantity*d.price).toLocaleString('vi-VN')}</td></tr>))}</tbody></table>
            <p className="total">Tổng: {total.toLocaleString('vi-VN')} ₫</p></>
          ) : (<p>Không có dữ liệu.</p>)}
        </div>
      )}
    </div>
  );
};
export default RevenueByDate;
