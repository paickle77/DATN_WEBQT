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
  const [toDate, setToDate]     = useState(null);
  const [report, setReport]     = useState(null);

  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      alert('Vui lòng chọn khoảng thời gian');
      return;
    }
    try {
      const [odRes, oRes] = await Promise.all([
        api.get('/orderDetails'),
        api.get('/orders'),
      ]);
      const allDetails = odRes.data.data;
      const allOrders  = oRes.data.data;

      // lọc đơn hàng theo ngày
      const ordersInRange = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= fromDate && d <= toDate;
      });
      const totalOrders    = ordersInRange.length;
      const orderIdSet     = new Set(ordersInRange.map(o => o._id));
      const detailsInRange = allDetails.filter(d => orderIdSet.has(d.order_id));
      const totalRevenue   = detailsInRange.reduce((sum, d) => sum + d.price * d.quantity, 0);
      const totalCustomers = new Set(ordersInRange.map(o => o.user_id)).size;

      setReport({ totalRevenue, totalOrders, totalCustomers, details: detailsInRange });
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
    const sheet    = workbook.addWorksheet('Báo cáo');

    // --- Bảng Tổng quan (Metrics) ở cột A,B
    sheet.getCell('A1').value = 'Metric';
    sheet.getCell('B1').value = 'Value';
    // style header
    sheet.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center' };
      cell.border    = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' }
      };
    });
    // dữ liệu
    sheet.getCell('A2').value = 'Tổng doanh thu (₫)';
    sheet.getCell('B2').value = report.totalRevenue;
    sheet.getCell('B2').numFmt  = '#,##0';
    sheet.getCell('A3').value = 'Tổng đơn hàng';
    sheet.getCell('B3').value = report.totalOrders;
    sheet.getCell('A4').value = 'Tổng khách hàng';
    sheet.getCell('B4').value = report.totalCustomers;

    // --- Bảng Chi tiết đơn ở cột D-H
    const startCol    = 4;  // D
    const headers     = ['#','Order ID','Quantity','Unit Price','Total (₫)'];
    // header
    headers.forEach((h, i) => {
      const cell = sheet.getCell(1, startCol + i);
      cell.value = h;
    });
    // style header
    sheet.getRow(1).eachCell((cell, colNum) => {
      if (colNum >= startCol && colNum < startCol + headers.length) {
        cell.font      = { bold: true };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center' };
        cell.border    = {
          top:    { style: 'thin' },
          left:   { style: 'thin' },
          bottom: { style: 'thin' },
          right:  { style: 'thin' }
        };
      }
    });
    // rows
    report.details.forEach((d, i) => {
      const rowIdx = i + 2;
      sheet.getCell(rowIdx, startCol + 0).value = i + 1;
      sheet.getCell(rowIdx, startCol + 1).value = d.order_id;
      sheet.getCell(rowIdx, startCol + 2).value = d.quantity;
      sheet.getCell(rowIdx, startCol + 3).value = d.price;
      sheet.getCell(rowIdx, startCol + 4).value = d.quantity * d.price;
      // format tiền
      sheet.getCell(rowIdx, startCol + 3).numFmt = '#,##0';
      sheet.getCell(rowIdx, startCol + 4).numFmt = '#,##0';
    });

    // Xuất file
    const buf      = await workbook.xlsx.writeBuffer();
    const filename = `BaoCao_${fromDate.toISOString().slice(0,10)}_${toDate.toISOString().slice(0,10)}.xlsx`;
    saveAs(new Blob([buf]), filename);
  };

  return (
    <div className="statistic-report">
      <TabBarr />

      <h2>Thống kê & Báo cáo</h2>

      <div className="filter-section">
        <div>
          <label>Từ ngày:</label>
          <DatePicker
            selected={fromDate}
            onChange={setFromDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Chọn ngày bắt đầu"
            maxDate={new Date()}
          />
        </div>
        <div>
          <label>Đến ngày:</label>
          <DatePicker
            selected={toDate}
            onChange={setToDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Chọn ngày kết thúc"
            maxDate={new Date()}
          />
        </div>
        <button onClick={handleGenerate}>Tạo báo cáo</button>
        <button className="excel-btn" onClick={exportToExcel}>
          Xuất Excel
        </button>
      </div>

      {report && (
        <div className="report-result">
          <div className="report-box blue">
            <h3>Tổng doanh thu</h3>
            <p>{report.totalRevenue.toLocaleString('vi-VN')} đ</p>
          </div>
          <div className="report-box green">
            <h3>Tổng đơn hàng</h3>
            <p>{report.totalOrders}</p>
          </div>
          <div className="report-box orange">
            <h3>Tổng khách hàng</h3>
            <p>{report.totalCustomers}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticReport;
