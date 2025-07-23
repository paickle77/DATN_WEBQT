// src/Screens/Revenue/RevenueByYear.jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueCommon.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const RevenueByYear = () => {
  const [selectedYear, setSelectedYear] = useState(null);
  const [bills, setBills]     = useState([]);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    api.get('/bills').then(r => setBills(r.data.data));
    api.get('/billdetails').then(r => setDetails(r.data.data));
  }, []);

  const billsInYear = selectedYear
    ? bills.filter(b => new Date(b.created_at).getFullYear()===selectedYear.getFullYear())
    : [];
  const idSet = new Set(billsInYear.map(b=>b._id));
  const detInYear = details.filter(d=>idSet.has(d.bill_id));
  const total = detInYear.reduce((s,d)=>s+d.quantity*d.price,0);

  return (
    <div className="revenue-wrapper">
      <TabBarr />
      <h2>Doanh thu theo năm</h2>
      <label>Chọn năm:</label>
      <DatePicker selected={selectedYear} onChange={setSelectedYear} dateFormat="yyyy" showYearPicker />
      {selectedYear && (
        <div className="result">
          <h3>Năm: {selectedYear.getFullYear()}</h3>
          {detInYear.length>0 ? (
            <><table><thead><tr><th>#</th><th>Mã hóa đơn</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>{detInYear.map((d,i)=>(<tr key={d._id}><td>{i+1}</td><td>{d.bill_id}</td><td>{d.quantity}</td><td>{(d.quantity*d.price).toLocaleString('vi-VN')}</td></tr>))}</tbody></table>
            <p className="total">Tổng: {total.toLocaleString('vi-VN')} ₫</p></>
          ):(<p>Không có dữ liệu.</p>)}
        </div>
      )}
    </div>
  );
};
export default RevenueByYear;