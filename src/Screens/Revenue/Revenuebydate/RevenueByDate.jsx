import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueByDate.scss';
import TabBarr from '../../../component/tabbar/TabBar';

const sampleRevenueData = [
  { date: '2025-05-20', orderId: 'DH001', amount: 1500000 },
  { date: '2025-05-20', orderId: 'DH002', amount: 2000000 },
  { date: '2025-05-19', orderId: 'DH003', amount: 1200000 },
];

const RevenueByDate = () => {
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date?.toISOString().split('T')[0];
  };

  const filteredData = sampleRevenueData.filter(
    (item) => item.date === formatDate(selectedDate)
  );

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="revenue-container">
      <div>
          <TabBarr/>
      </div>
      <h2>Doanh thu theo ngày</h2>
      <div className="date-picker-wrapper">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="yyyy-MM-dd"
          placeholderText="Chọn ngày"
          className="custom-datepicker"
        />
      </div>

      {selectedDate && (
        <div className="revenue-results">
          <h3>Ngày: {formatDate(selectedDate)}</h3>
          {filteredData.length > 0 ? (
            <>
              <table style={{padding:20}}>
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Số tiền (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.orderId}>
                      <td>{item.orderId}</td>
                      <td>{item.amount.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="total">Tổng doanh thu: {totalRevenue.toLocaleString('vi-VN')} VND</p>
            </>
          ) : (
            <p>Không có dữ liệu cho ngày này.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueByDate;
