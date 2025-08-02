// src/Screens/StatisticReport/StatisticReport.jsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './StatisticReport.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

// ExcelJS + file-saver
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const StatisticReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      alert('Vui lòng chọn khoảng thời gian');
      return;
    }
    try {
      const [bdRes, bRes] = await Promise.all([
        api.get('/billdetails'),
        api.get('/bills'),
      ]);
      const allDetails = bdRes.data.data;
      const allBills = bRes.data.data;

      // lọc hóa đơn theo ngày
      const billsInRange = allBills.filter(b => {
        const d = new Date(b.created_at);
        return d >= fromDate && d <= toDate;
      });
      const totalBills = billsInRange.length;
      const billIdSet = new Set(billsInRange.map(b => b._id));
      const detailsInRange = allDetails.filter(d => billIdSet.has(d.bill_id));
      const totalRevenue = detailsInRange.reduce((sum, d) => sum + d.price * d.quantity, 0);
      const totalCustomers = new Set(billsInRange.map(b => b.user_id)).size;

      setReport({ totalRevenue, totalBills, totalCustomers, details: detailsInRange });
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo báo cáo');
    }
  };

  const exportToExcel = async () => {
    if (!report) {
      alert('Bạn cần tạo báo cáo trước');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo');

    // --- Bảng Tổng quan (Metrics) ở cột A,B
    sheet.getCell('A1').value = 'Metric';
    sheet.getCell('B1').value = 'Value';
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    sheet.getCell('A2').value = 'Tổng doanh thu (₫)';
    sheet.getCell('B2').value = report.totalRevenue;
    sheet.getCell('B2').numFmt = '#,##0';
    sheet.getCell('A3').value = 'Tổng hóa đơn';
    sheet.getCell('B3').value = report.totalBills;
    sheet.getCell('A4').value = 'Tổng khách hàng';
    sheet.getCell('B4').value = report.totalCustomers;

    // --- Bảng Chi tiết đơn ở cột D-H
    const startCol = 4; // D
    const headers = ['#', 'Bill ID', 'Quantity', 'Unit Price', 'Total (₫)'];
    headers.forEach((h, i) => {
      sheet.getCell(1, startCol + i).value = h;
    });
    sheet.getRow(1).eachCell((cell, colNum) => {
      if (colNum >= startCol && colNum < startCol + headers.length) {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });
    report.details.forEach((d, i) => {
      const rowIdx = i + 2;
      sheet.getCell(rowIdx, startCol + 0).value = i + 1;
      sheet.getCell(rowIdx, startCol + 1).value = d.bill_id;
      sheet.getCell(rowIdx, startCol + 2).value = d.quantity;
      sheet.getCell(rowIdx, startCol + 3).value = d.price;
      sheet.getCell(rowIdx, startCol + 4).value = d.quantity * d.price;
      sheet.getCell(rowIdx, startCol + 3).numFmt = '#,##0';
      sheet.getCell(rowIdx, startCol + 4).numFmt = '#,##0';
    });

    const buf = await workbook.xlsx.writeBuffer();
    const filename = `BaoCao_${fromDate.toISOString().slice(0, 10)}_${toDate.toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buf]), filename);
  };

  return (
    <div className="statistic-report">
      <TabBarr />
      
      <div className="report-container">
        <div className="header-section">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9L12 6L16 10L21 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="9" r="2" fill="currentColor"/>
              <circle cx="12" cy="6" r="2" fill="currentColor"/>
              <circle cx="16" cy="10" r="2" fill="currentColor"/>
              <circle cx="21" cy="5" r="2" fill="currentColor"/>
            </svg>
          </div>
          <h1>Thống kê & Báo cáo</h1>
          <p className="subtitle">Phân tích dữ liệu kinh doanh và tạo báo cáo chi tiết</p>
        </div>

        <div className="filter-section">
          <div className="filter-card">
            <div className="filter-header">
              <div className="filter-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 6L10 10V15L14 19V14L18 10V6H14Z"/>
                </svg>
              </div>
              <h3>Bộ lọc thời gian</h3>
            </div>
            
            <div className="filter-content">
              <div className="date-inputs">
                <div className="date-input-group">
                  <label>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                      <path d="M7 10H17V12H7V10Z"/>
                    </svg>
                    Từ ngày
                  </label>
                  <DatePicker
                    selected={fromDate}
                    onChange={setFromDate}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày bắt đầu"
                    maxDate={new Date()}
                    className="modern-datepicker"
                  />
                </div>
                
                <div className="date-separator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z"/>
                  </svg>
                </div>
                
                <div className="date-input-group">
                  <label>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                      <path d="M7 10H17V12H7V10Z"/>
                    </svg>
                    Đến ngày
                  </label>
                  <DatePicker
                    selected={toDate}
                    onChange={setToDate}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày kết thúc"
                    maxDate={new Date()}
                    className="modern-datepicker"
                  />
                </div>
              </div>
              
              <div className="action-buttons">
                <button className="btn-generate" onClick={handleGenerate}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                  </svg>
                  Tạo báo cáo
                </button>
                
                <button className="btn-excel" onClick={exportToExcel} disabled={!report}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                  </svg>
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {report && (
          <div className="report-result">
            <div className="result-header">
              <h2>Kết quả báo cáo</h2>
              <div className="report-period">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
                </svg>
                Từ {fromDate?.toLocaleDateString('vi-VN')} đến {toDate?.toLocaleDateString('vi-VN')}
              </div>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card revenue-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 21H5V3H13V9H19V21Z"/>
                    </svg>
                  </div>
                  <div className="stat-trend positive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14L12 9L17 14H7Z"/>
                    </svg>
                    +12.5%
                  </div>
                </div>
                <div className="stat-content">
                  <h3>Tổng doanh thu</h3>
                  <p className="stat-value">{report.totalRevenue.toLocaleString('vi-VN')} ₫</p>
                  <span className="stat-description">So với tháng trước</span>
                </div>
              </div>
              
              <div className="stat-card orders-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 7H16V6C16 3.79 14.21 2 12 2S8 3.79 8 6V7H5C3.9 7 3 7.9 3 9V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V9C21 7.9 20.1 7 19 7ZM10 6C10 4.9 10.9 4 12 4S14 4.9 14 6V7H10V6ZM19 20H5V9H7V11H9V9H15V11H17V9H19V20Z"/>
                    </svg>
                  </div>
                  <div className="stat-trend positive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14L12 9L17 14H7Z"/>
                    </svg>
                    +8.3%
                  </div>
                </div>
                <div className="stat-content">
                  <h3>Tổng hóa đơn</h3>
                  <p className="stat-value">{report.totalBills}</p>
                  <span className="stat-description">Đơn hàng được tạo</span>
                </div>
              </div>
              
              <div className="stat-card customers-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 4C18.21 4 20 5.79 20 8S18.21 12 16 12 12 10.21 12 8 13.79 4 16 4ZM16 14C20.42 14 24 15.79 24 18V20H8V18C8 15.79 11.58 14 16 14ZM6 6C7.1 6 8 6.9 8 8S7.1 10 6 10 4 9.1 4 8 4.9 6 6 6ZM6 12C8.67 12 12 13.34 12 16V18H0V16C0 13.34 3.33 12 6 12Z"/>
                    </svg>
                  </div>
                  <div className="stat-trend positive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14L12 9L17 14H7Z"/>
                    </svg>
                    +15.7%
                  </div>
                </div>
                <div className="stat-content">
                  <h3>Tổng khách hàng</h3>
                  <p className="stat-value">{report.totalCustomers}</p>
                  <span className="stat-description">Khách hàng mua hàng</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticReport;