import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RevenueByMonth.scss';
import TabBarr from '../../../component/tabbar/TabBar';

const sampleRevenueData = [
  { date: '2025-05-01', orderId: 'DH001', amount: 1500000 },
  { date: '2025-05-10', orderId: 'DH002', amount: 2000000 },
  { date: '2025-05-18', orderId: 'DH003', amount: 1200000 },
  { date: '2025-04-12', orderId: 'DH004', amount: 800000 },
];

const RevenueByMonth = () => {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
  };

  const isSameMonth = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const filteredData = sampleRevenueData.filter((item) =>
    selectedMonth ? isSameMonth(item.date, selectedMonth) : false
  );

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="revenue-month-container">
        <div>
            <TabBarr/>
        </div>
      <h2>Doanh thu theo tháng</h2>
      <div className="date-picker-wrapper">
        <DatePicker
          selected={selectedMonth}
          onChange={handleMonthChange}
          dateFormat="MM/yyyy"
          showMonthYearPicker
          placeholderText="Chọn tháng"
          className="custom-datepicker"
        />
      </div>

      {selectedMonth && (
        <div className="revenue-results">
          <h3>
            Tháng: {(selectedMonth.getMonth() + 1).toString().padStart(2, '0')} /{' '}
            {selectedMonth.getFullYear()}
          </h3>
          {filteredData.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Ngày</th>
                    <th>Số tiền (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.orderId}>
                      <td>{item.orderId}</td>
                      <td>{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                      <td>{item.amount.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="total">Tổng doanh thu: {totalRevenue.toLocaleString('vi-VN')} VND</p>
            </>
          ) : (
            <p>Không có dữ liệu cho tháng này.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueByMonth;
