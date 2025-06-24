// src/Screens/StatisticReport/StatisticReport.jsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './StatisticReport.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

// Thay thế SheetJS bằng ExcelJS + file-saver
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const StatisticReport = () => {
  const [fromDate, setFromDate]   = useState(null);
  const [toDate, setToDate]       = useState(null);
  const [report, setReport]       = useState(null);

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
      const totalOrders = ordersInRange.length;

      // tính doanh thu
      const orderIdSet     = new Set(ordersInRange.map(o => o._id));
      const detailsInRange = allDetails.filter(d => orderIdSet.has(d.order_id));
      const totalRevenue   = detailsInRange.reduce(
        (sum, d) => sum + d.price * d.quantity,
        0
      );

      // số khách hàng unique
      const customerSet    = new Set(ordersInRange.map(o => o.user_id));
      const totalCustomers = customerSet.size;

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

    // 1. Tạo workbook và 2 sheet
    const workbook      = new ExcelJS.Workbook();
    const summarySheet  = workbook.addWorksheet('Tổng quan');
    const detailSheet   = workbook.addWorksheet('Chi tiết đơn');

    // 2. Cấu hình cột cho sheet Tổng quan
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value',  key: 'value',  width: 20 },
    ];
    // Style header
    summarySheet.getRow(1).eachCell(cell => {
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
    // Thêm dữ liệu
    summarySheet.addRows([
      { metric: 'Tổng doanh thu (₫)', value: report.totalRevenue },
      { metric: 'Tổng đơn hàng',      value: report.totalOrders },
      { metric: 'Tổng khách hàng',    value: report.totalCustomers },
    ]);
    // Format cột Value
    summarySheet.getColumn('value').numFmt = '#,##0';

    // 3. Cấu hình cột cho sheet Chi tiết đơn
    detailSheet.columns = [
      { header: '#',           key: 'idx',      width: 5 },
      { header: 'Order ID',    key: 'orderId',  width: 30 },
      { header: 'Quantity',    key: 'qty',      width: 12 },
      { header: 'Unit Price',  key: 'price',    width: 15 },
      { header: 'Total (₫)',   key: 'total',    width: 15 },
    ];
    // Style header
    detailSheet.getRow(1).eachCell(cell => {
      cell.font      = { bold: true };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      cell.alignment = { horizontal: 'center' };
      cell.border    = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' }
      };
    });
    // Thêm data chi tiết
    report.details.forEach((d, i) => {
      detailSheet.addRow({
        idx:     i + 1,
        orderId: d.order_id,
        qty:     d.quantity,
        price:   d.price,
        total:   d.quantity * d.price
      });
    });
    // Format số tiền
    detailSheet.getColumn('price').numFmt = '#,##0';
    detailSheet.getColumn('total').numFmt = '#,##0';

    // 4. Xuất file
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
