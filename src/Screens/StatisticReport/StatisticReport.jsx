import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './StatisticReport.scss';
import TabBarr from '../../component/tabbar/TabBar';

const StatisticReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = () => {
    if (!fromDate || !toDate) {
      alert('Vui lòng chọn khoảng thời gian');
      return;
    }

    // Giả lập dữ liệu báo cáo
    const fakeReport = {
      totalRevenue: 123456789,
      totalOrders: 82,
      totalCustomers: 47,
    };

    setReportData(fakeReport);
    console.log('Tạo báo cáo cho:', fromDate, '->', toDate);
  };

  return (
    <div className="statistic-report">
        <div>
            <TabBarr/>
        </div>
      <h2>Thống kê & Báo cáo</h2>

      <div className="filter-section">
        <div>
          <label>Từ ngày:</label>
          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Chọn ngày bắt đầu"
          />
        </div>
        <div>
          <label>Đến ngày:</label>
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            dateFormat="dd/MM/yyyy"
            placeholderText="Chọn ngày kết thúc"
          />
        </div>
        <button onClick={handleGenerateReport}>Tạo báo cáo</button>
      </div>

      {reportData && (
        <div style={{padding:20}} className="report-result">
          <div className="report-box blue">
            <h3>Tổng doanh thu</h3>
            <p>{reportData.totalRevenue.toLocaleString()} đ</p>
          </div>
          <div className="report-box green">
            <h3>Tổng đơn hàng</h3>
            <p>{reportData.totalOrders}</p>
          </div>
          <div className="report-box orange">
            <h3>Tổng khách hàng</h3>
            <p>{reportData.totalCustomers}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticReport;
