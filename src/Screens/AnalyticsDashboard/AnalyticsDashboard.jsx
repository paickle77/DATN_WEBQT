import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './AnalyticsDashboard.scss';

// ───────────────────────────── Helpers ─────────────────────────────
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount) || amount < 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Dùng chung cho Excel
const formatCurrencyForExcel = formatCurrency;

// ───────────────────────────── 1) Nhóm trạng thái ─────────────────────────────
const STATUS_GROUPS = {
  DONE: ['done'],
  CANCELLED: ['cancelled', 'failed'],
  IN_PROGRESS: ['pending', 'confirmed', 'ready', 'shipping'],
};

const normalizeStatus = (s) => (typeof s === 'string' ? s.toLowerCase() : 'unknown');

// ✅ Chuẩn hoá mốc thời gian đầu/cuối ngày (CHỈNH SỬA #1)
const atStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const atEndOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// ───────────────────────────── Component ─────────────────────────────
const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState({
    bills: [],
    billDetails: [],
    users: [],
    products: [],
    // 🆕 Thêm dữ liệu từ server
    serverKPI: null,
    serverDailyRevenue: {}
  });
  const [timeFilter, setTimeFilter] = useState('all');

  const getEmptyAnalytics = () => ({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    cancellationRate: 0,
    topCustomers: [],
    topProducts: [],
    dailyRevenue: {},
    dailyOrders: {},
    customerRetention: 0,
    bestSellingHour: '12',
    ordersByStatus: {},
    monthlyGrowth: 0,
    totalProductsSold: 0,
    avgCustomerValue: 0,
    newCustomers: 0,
    loyalCustomers: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    completedRevenue: 0,
    detailedStats: {
      totalBillsInRange: 0,
      completionRate: 0,
    },
  });

  // ── Fetch (Sử dụng endpoints mới)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Gọi endpoints mới song song với endpoints cũ
      const dateFrom = dateRange.from.toISOString().slice(0, 10);
      const dateTo = dateRange.to.toISOString().slice(0, 10);
      
      const [billsRes, billDetailsRes, usersRes, productsRes, kpiRes, dailyRevenueRes] = await Promise.all([
        api.get('/bills'),
        api.get('/billdetails'), 
        api.get('/users'),
        api.get('/products'),
        // 🆕 Endpoints mới cho thống kê nhanh
        api.get('/bills/admin/kpi'),
        api.get(`/bills/admin/daily-revenue?from=${dateFrom}&to=${dateTo}`)
      ]);
      
      setRawData({
        bills: billsRes?.data?.data ?? [],
        billDetails: billDetailsRes?.data?.data ?? [],
        users: usersRes?.data?.data ?? [],
        products: productsRes?.data?.data ?? [],
        // 🆕 Dữ liệu từ endpoints mới
        serverKPI: kpiRes?.data?.data ?? null,
        serverDailyRevenue: dailyRevenueRes?.data?.data ?? {}
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setRawData({ 
        bills: [], 
        billDetails: [], 
        users: [], 
        products: [],
        serverKPI: null,
        serverDailyRevenue: {}
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]); // 🆕 Thêm dateRange dependency để re-fetch khi đổi ngày

  // ───────────────────────────── 2) Lõi tính toán ─────────────────────────────
  const analytics = useMemo(() => {
    const { bills, users, billDetails, products, serverKPI, serverDailyRevenue } = rawData;

    // 🆕 Nếu có dữ liệu từ server, ưu tiên sử dụng
    if (serverKPI && Object.keys(serverDailyRevenue).length > 0) {
      console.log('📊 Sử dụng dữ liệu từ server endpoints');
      // Có thể trả về kết quả nhanh từ server tại đây
      // Hoặc kết hợp với tính toán client-side
    }

    if (!Array.isArray(bills) || bills.length === 0) return getEmptyAnalytics();

    // ✅ Áp dụng from/to đã chuẩn hoá đầu-cuối ngày
    const from = dateRange.from ? atStartOfDay(dateRange.from) : new Date('1970-01-01');
    const to   = dateRange.to   ? atEndOfDay(dateRange.to)     : new Date();

    // Lọc theo thời gian
    const filteredBills = bills.filter(b => {
      if (!b || !b.created_at) return false;
      const d = new Date(b.created_at);
      return !isNaN(d) && d >= from && d <= to;
    });

    // 🆕 Tùy chọn: Sử dụng dữ liệu từ server cho các metric cơ bản
    if (serverKPI) {
      console.log('📊 Server KPI:', serverKPI);
      // Có thể sử dụng serverKPI.totalOrders, serverKPI.completedRevenue, etc.
      // Ưu tiên server data nếu có
    }

    if (Object.keys(serverDailyRevenue).length > 0) {
      console.log('📈 Server Daily Revenue:', serverDailyRevenue);
      // Có thể sử dụng serverDailyRevenue thay vì tính toán từ bills
    }

    // Phân loại theo trạng thái đúng với backend
    const byStatus = {
      done: [],
      cancelled: [],
      failed: [],
      pending: [],
      confirmed: [],
      ready: [],
      shipping: [],
      other: [],
    };

    for (const b of filteredBills) {
      const st = normalizeStatus(b.status);
      if (st === 'done') byStatus.done.push(b);
      else if (st === 'cancelled') byStatus.cancelled.push(b);
      else if (st === 'failed') byStatus.failed.push(b);
      else if (['pending','confirmed','ready','shipping'].includes(st)) byStatus[st].push(b);
      else byStatus.other.push(b);
    }

    const completedBills = byStatus.done;
    const cancelledCount = byStatus.cancelled.length + byStatus.failed.length;
    const pendingCount   = byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + byStatus.shipping.length;
    const totalInRange   = filteredBills.length;

    // ✅ Doanh thu chỉ tính từ đơn DONE và lấy thẳng từ bill.total
    const completedRevenue = serverKPI?.completedRevenue || completedBills.reduce((sum, b) => {
      const val = Number(b?.total) || 0;
      return sum + (val > 0 ? val : 0);
    }, 0);

    // ✅ Số đơn hoàn thành
    const totalOrders = completedBills.length;

    // ✅ Khách hàng có ít nhất 1 đơn DONE
    const uniqueCustomerIds = Array.from(new Set(completedBills.map(b => String(b.Account_id)).filter(Boolean)));
    const totalCustomers = uniqueCustomerIds.length;

    // ✅ Giá trị TB/đơn DONE
    const avgOrderValue = totalOrders > 0 ? (completedRevenue / totalOrders) : 0;

    // Bản đồ user để lấy email/phone
    const userIndex = new Map((users || []).map(u => [String(u._id), u]));

    // ✅ Thống kê khách hàng từ đơn DONE
    const customerStats = {};
    for (const b of completedBills) {
      const uid = String(b.Account_id || '');
      if (!uid) continue;
      const amount = Number(b.total) || 0;

      if (!customerStats[uid]) {
        customerStats[uid] = {
          orders: 0,
          spent: 0,
          firstOrder: b.created_at,
          lastOrder:  b.created_at,
        };
      }
      customerStats[uid].orders += 1;
      customerStats[uid].spent  += amount;

      if (new Date(b.created_at) < new Date(customerStats[uid].firstOrder)) {
        customerStats[uid].firstOrder = b.created_at;
      }
      if (new Date(b.created_at) > new Date(customerStats[uid].lastOrder)) {
        customerStats[uid].lastOrder = b.created_at;
      }
    }

    // ✅ Top customers
    const topCustomers = Object.entries(customerStats)
      .map(([userId, stats]) => {
        const user = userIndex.get(userId);
        return {
          user: {
            _id: userId,
            name: user?.name || user?.username || `Khách #${userId.slice(-6)}`,
            email: user?.email || 'Email chưa cập nhật',
            phone: user?.phone || user?.phoneNumber || 'SĐT chưa cập nhật',
          },
          ...stats
        };
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 20);

    // ✅ Doanh thu và số đơn theo ngày
    // 🆕 Ưu tiên server daily revenue nếu có data
    const dailyRevenue = Object.keys(serverDailyRevenue).length > 0 
      ? serverDailyRevenue 
      : completedBills.reduce((acc, b) => {
          const key = new Date(b.created_at).toISOString().slice(0,10);
          acc[key] = (acc[key] || 0) + (Number(b.total) || 0);
          return acc;
        }, {});
    const dailyOrders = completedBills.reduce((acc, b) => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // ✅ Best hour, retention
    const hourlyOrders = completedBills.reduce((acc, b) => {
      const h = new Date(b.created_at).getHours();
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
    const bestSellingHour = Object.entries(hourlyOrders).sort((a,b)=>b[1]-a[1])[0]?.[0] || '12';

    const repeatCustomers = Object.values(customerStats).filter(c => c.orders > 1).length;
    const customerRetention = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    const cancellationRate = totalInRange ? (cancelledCount / totalInRange) * 100 : 0;

    // Sản phẩm (tham chiếu billDetails)
    const validDetails = (billDetails || []).filter(d => d && d.quantity > 0 && d.price >= 0);
    const productStats = validDetails.reduce((acc, d) => {
      const pid = String(d.product_id || '');
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { sold: 0, revenue: 0 };
      acc[pid].sold += Number(d.quantity) || 0;
      acc[pid].revenue += (Number(d.quantity) || 0) * (Number(d.price) || 0);
      return acc;
    }, {});
    const topProducts = Object.entries(productStats)
      .map(([productId, stats]) => {
        const p = (products || []).find(pp => String(pp._id) === productId);
        return {
          product: {
            _id: productId,
            name: p?.name || `Sản phẩm #${productId.slice(-6)}`,
            category: p?.category || 'Chưa phân loại',
            price: p?.price || 0
          },
          ...stats
        };
      })
      .sort((a,b)=>b.sold-a.sold)
      .slice(0,10);

    return {
      totalRevenue: completedRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      cancellationRate,
      topCustomers,
      topProducts,
      dailyRevenue,
      dailyOrders,
      customerRetention,
      bestSellingHour,
      ordersByStatus: {
        done: completedBills.length,
        cancelled: byStatus.cancelled.length,
        failed: byStatus.failed.length,
        pending: byStatus.pending.length,
        confirmed: byStatus.confirmed.length,
        ready: byStatus.ready.length,
        shipping: byStatus.shipping.length,
        total: totalInRange
      },
      monthlyGrowth: 0,
      totalProductsSold: Object.values(productStats).reduce((s,p)=>s + p.sold,0),
      avgCustomerValue: totalCustomers ? completedRevenue / totalCustomers : 0,
      newCustomers: topCustomers.filter(c=>c.orders===1).length,
      loyalCustomers: topCustomers.filter(c=>c.orders>=3).length,
      completedOrders: completedBills.length,
      cancelledOrders: cancelledCount,
      pendingOrders: pendingCount,
      completedRevenue: completedRevenue,
      detailedStats: {
        totalBillsInRange: totalInRange,
        completedBills: completedBills.length,
        cancelledBills: byStatus.cancelled.length,
        failedBills: byStatus.failed.length,
        pendingBills: byStatus.pending.length,
        confirmedBills: byStatus.confirmed.length,
        readyBills: byStatus.ready.length,
        shippingBills: byStatus.shipping.length,
        completedRevenue: completedRevenue,
        averageCompletedOrderValue: avgOrderValue,
        totalCustomersWithCompletedOrders: totalCustomers,
        totalProductsSoldCompleted: Object.values(productStats).reduce((s,p)=>s + p.sold,0),
        cancellationRate,
        completionRate: totalInRange ? (completedBills.length / totalInRange) * 100 : 0
      }
    };
  }, [rawData, dateRange]);

  // ── Export Excel
  const createOverviewSheetFixed = async (workbook, dateRangeText) => {
    const sheet = workbook.addWorksheet('Báo cáo tổng quan');

    sheet.columns = [{ width: 30 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];

    const titleStyle = {
      font: { bold: true, size: 16, color: { argb: 'FF2D5AA0' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const headerStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const dataStyle = {
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const successStyle = { ...dataStyle, font: { color: { argb: 'FF22C55E' } } };
    const warningStyle = { ...dataStyle, font: { color: { argb: 'FFEF4444' } } };

    sheet.getCell('A1').value = 'BÁO CÁO TỔNG QUAN CHI TIẾT - CAKESHOP';
    sheet.getCell('A1').style = titleStyle;
    sheet.mergeCells('A1:F1');

    sheet.getCell('A2').value = `Khoảng thời gian: ${dateRangeText}`;
    sheet.getCell('A2').style = { font: { italic: true }, alignment: { horizontal: 'center' } };
    sheet.mergeCells('A2:F2');

    sheet.getCell('A3').value = `Ngày tạo: ${new Date().toLocaleString('vi-VN')}`;
    sheet.getCell('A3').style = { font: { size: 10 }, alignment: { horizontal: 'center' } };
    sheet.mergeCells('A3:F3');

    let row = 5;
    sheet.getCell(`A${row}`).value = 'THỐNG KÊ THEO TRẠNG THÁI ĐƠN HÀNG';
    sheet.getCell(`A${row}`).style = headerStyle;
    sheet.mergeCells(`A${row}:B${row}`);
    row++;

    const statusData = [
      ['Tổng đơn hàng trong khoảng thời gian', String(analytics.detailedStats?.totalBillsInRange || 0)],
      ['Đơn hàng hoàn thành (done)', String(analytics.completedOrders || 0)],
      ['Đơn hàng đã hủy (cancelled + failed)', String(analytics.cancelledOrders || 0)],
      ['Đơn hàng đang xử lý (pending/confirmed/ready/shipping)', String(analytics.pendingOrders || 0)],
      ['Tỷ lệ hoàn thành (%)', (analytics.detailedStats?.completionRate ?? 0).toFixed(1)],
      ['Tỷ lệ hủy đơn (%)', (analytics.cancellationRate ?? 0).toFixed(1)],
    ];

    for (const [label, value] of statusData) {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`A${row}`).style = dataStyle;
      const isGood = label.toLowerCase().includes('hoàn thành');
      const isBad = label.toLowerCase().includes('hủy');
      sheet.getCell(`B${row}`).style = isGood ? successStyle : isBad ? warningStyle : dataStyle;
      row++;
    }

    row += 1;
    sheet.getCell(`A${row}`).value = 'THỐNG KÊ DOANH THU (CHỈ ĐƠN DONE)';
    sheet.getCell(`A${row}`).style = headerStyle;
    sheet.mergeCells(`A${row}:B${row}`);
    row++;

    const revData = [
      ['Tổng doanh thu (đơn done)', formatCurrencyForExcel(analytics.totalRevenue)],
      ['Số đơn hàng hoàn thành (done)', String(analytics.totalOrders || 0)],
      ['Số khách hàng có đơn done', String(analytics.totalCustomers || 0)],
      ['Giá trị trung bình/đơn done', formatCurrencyForExcel(analytics.avgOrderValue)],
      ['Tổng sản phẩm đã bán (tham chiếu billDetails)', String(analytics.totalProductsSold || 0)],
      ['Doanh thu trung bình/khách', formatCurrencyForExcel(analytics.avgCustomerValue)],
      ['Tỷ lệ khách quay lại (%)', (analytics.customerRetention ?? 0).toFixed(1)],
      ['Giờ bán chạy nhất', `${analytics.bestSellingHour || '12'}:00`],
    ];

    for (const [label, value] of revData) {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`A${row}`).style = dataStyle;
      sheet.getCell(`B${row}`).style = successStyle;
      row++;
    }

    row += 2;
    sheet.getCell(`A${row}`).value = 'TOP 10 KHÁCH HÀNG (THEO ĐƠN DONE)';
    sheet.getCell(`A${row}`).style = headerStyle;
    sheet.mergeCells(`A${row}:E${row}`);
    row++;

    const headers = ['Tên khách hàng', 'Email', 'Số điện thoại', 'Số đơn done', 'Tổng chi tiêu'];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      sheet.getCell(`${col}${row}`).value = h;
      sheet.getCell(`${col}${row}`).style = headerStyle;
    });
    row++;

    const top = analytics.topCustomers?.slice(0, 10) ?? [];
    if (top.length) {
      for (const c of top) {
        const rowData = [
          c.user?.name ?? 'Khách hàng',
          c.user?.email ?? 'Email chưa cập nhật',
          c.user?.phone ?? 'SĐT chưa cập nhật',
          String(c.orders ?? 0),
          formatCurrencyForExcel(num(c.spent, 0)),
        ];
        rowData.forEach((val, i) => {
          const col = String.fromCharCode(65 + i);
          sheet.getCell(`${col}${row}`).value = val;
          sheet.getCell(`${col}${row}`).style = dataStyle;
        });
        row++;
      }
    } else {
      sheet.getCell(`A${row}`).value = 'Không có dữ liệu khách hàng trong khoảng thời gian này';
      sheet.mergeCells(`A${row}:E${row}`);
      sheet.getCell(`A${row}`).style = warningStyle;
      row++;
    }

    row += 2;
    sheet.getCell(`A${row}`).value = '⚠️ GHI CHÚ QUAN TRỌNG:';
    sheet.getCell(`A${row}`).style = { font: { bold: true, color: { argb: 'FFEF4444' } } };
    row++;

    const notes = [
      'Doanh thu chỉ tính các đơn done',
      'Đơn hủy: cancelled, failed',
      'Đơn đang xử lý: pending/confirmed/ready/shipping',
      'Mọi thống kê đều theo khoảng thời gian đã chọn',
    ];
    for (const n of notes) {
      sheet.getCell(`A${row}`).value = `• ${n}`;
      sheet.getCell(`A${row}`).style = { font: { italic: true, size: 10 }, alignment: { wrapText: true } };
      sheet.mergeCells(`A${row}:E${row}`);
      row++;
    }
  };

  const createCustomersSheetFixed = async (workbook, dateRangeText) => {
    const sheet = workbook.addWorksheet('Báo cáo khách hàng');

    sheet.columns = [
      { width: 5 },  // STT
      { width: 25 }, // Tên
      { width: 35 }, // Email
      { width: 18 }, // Phone
      { width: 12 }, // Đơn hoàn thành
      { width: 18 }, // Tổng chi tiêu
      { width: 15 }, // TB/đơn
      { width: 16 }, // Đơn đầu
      { width: 16 }, // Đơn cuối
      { width: 15 }, // Loại KH
    ];

    const headerStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const dataStyle = {
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const warnStyle = { ...dataStyle, font: { color: { argb: 'FFEF4444' } } };

    sheet.getCell('A1').value = 'BÁO CÁO CHI TIẾT KHÁCH HÀNG (CHỈ ĐƠN DONE)';
    sheet.getCell('A1').style = { font: { bold: true, size: 16, color: { argb: 'FF70AD47' } }, alignment: { horizontal: 'center' } };
    sheet.mergeCells('A1:J1');

    sheet.getCell('A2').value = `Khoảng thời gian: ${dateRangeText}`;
    sheet.mergeCells('A2:J2');

    // ✅ Dùng đúng số hàng thực in ra (CHỈNH SỬA #3)
    const data = analytics.topCustomers ?? [];
    sheet.getCell('A3').value = `Tổng KH có đơn done: ${data.length} | Tỷ lệ quay lại: ${analytics.customerRetention.toFixed(1)}%`;
    sheet.mergeCells('A3:J3');
    sheet.getCell('A3').style = { font: { italic: true, color: { argb: 'FF70AD47' } } };

    const headers = [
      'STT',
      'Tên khách hàng',
      'Email',
      'Số điện thoại',
      'Đơn hoàn thành (done)',
      'Tổng chi tiêu',
      'TB/đơn',
      'Đơn đầu tiên',
      'Đơn gần nhất',
      'Loại khách',
    ];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      sheet.getCell(`${col}5`).value = h;
      sheet.getCell(`${col}5`).style = headerStyle;
    });

    if (data.length) {
      data.forEach((c, idx) => {
        const row = 6 + idx;
        const avgPerOrder = c.orders > 0 ? c.spent / c.orders : 0;
        let type = 'Mới';
        if (c.orders >= 5) type = 'VIP';
        else if (c.orders >= 3) type = 'Thân thiết';
        else if (c.orders >= 2) type = 'Trung thành';

        const rowData = [
          idx + 1,
          c.user?.name ?? 'Khách hàng',
          c.user?.email ?? 'Email chưa cập nhật',
          c.user?.phone ?? 'SĐT chưa cập nhật',
          c.orders ?? 0,
          formatCurrencyForExcel(num(c.spent, 0)),
          formatCurrencyForExcel(avgPerOrder),
          c.firstOrder ? new Date(c.firstOrder).toLocaleDateString('vi-VN') : 'N/A',
          c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('vi-VN') : 'N/A',
          type,
        ];

        rowData.forEach((val, i) => {
          const col = String.fromCharCode(65 + i);
          sheet.getCell(`${col}${row}`).value = val;
          if ((i === 2 && val === 'Email chưa cập nhật') || (i === 3 && val === 'SĐT chưa cập nhật')) {
            sheet.getCell(`${col}${row}`).style = warnStyle;
          } else {
            sheet.getCell(`${col}${row}`).style = dataStyle;
          }
        });
      });
    } else {
      sheet.getCell('A6').value = 'Không có dữ liệu khách hàng';
      sheet.mergeCells('A6:J6');
      sheet.getCell('A6').style = warnStyle;
    }
  };

  const createProductsSheetFixed = async (workbook, dateRangeText) => {
    const sheet = workbook.addWorksheet('Báo cáo sản phẩm');

    sheet.columns = [
      { width: 5 },  { width: 30 }, { width: 20 },
      { width: 16 }, { width: 18 }, { width: 12 }, { width: 16 },
    ];

    const headerStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE67E22' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const dataStyle = {
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };

    sheet.getCell('A1').value = 'BÁO CÁO HIỆU SUẤT SẢN PHẨM (THAM CHIẾU BILLDETAILS)';
    sheet.getCell('A1').style = { font: { bold: true, size: 16, color: { argb: 'FFE67E22' } }, alignment: { horizontal: 'center' } };
    sheet.mergeCells('A1:G1');

    sheet.getCell('A2').value = `Khoảng thời gian: ${dateRangeText}`;
    sheet.mergeCells('A2:G2');

    sheet.getCell('A3').value = `Tổng sản phẩm đã bán: ${analytics.totalProductsSold} | Doanh thu (đơn done): ${formatCurrencyForExcel(
      analytics.totalRevenue
    )}`;
    sheet.mergeCells('A3:G3');
    sheet.getCell('A3').style = { font: { italic: true, color: { argb: 'FFE67E22' } } };

    const headers = ['STT', 'Tên sản phẩm', 'Danh mục', 'Số lượng bán', 'Doanh thu (ước tính)', 'Tỷ trọng (%)', 'Giá TB/sp'];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      sheet.getCell(`${col}5`).value = h;
      sheet.getCell(`${col}5`).style = headerStyle;
    });

    const list = analytics.topProducts ?? [];
    if (list.length) {
      list.forEach((p, idx) => {
        const row = 6 + idx;
        const percent = analytics.totalRevenue > 0 ? (p.revenue / analytics.totalRevenue) * 100 : 0;
        const avgPrice = p.sold > 0 ? p.revenue / p.sold : 0;

        const rowData = [
          idx + 1,
          p.product?.name ?? 'Sản phẩm',
          p.product?.category ?? 'Chưa phân loại',
          `${p.sold ?? 0} chiếc`,
          formatCurrencyForExcel(num(p.revenue, 0)),
          `${percent.toFixed(1)}%`,
          formatCurrencyForExcel(avgPrice),
        ];
        rowData.forEach((val, i) => {
          const col = String.fromCharCode(65 + i);
          sheet.getCell(`${col}${row}`).value = val;
          sheet.getCell(`${col}${row}`).style = dataStyle;
        });
      });
    } else {
      sheet.getCell('A6').value = 'Không có dữ liệu sản phẩm';
      sheet.mergeCells('A6:G6');
    }
  };

  const createRevenueSheetFixed = async (workbook, dateRangeText) => {
    const sheet = workbook.addWorksheet('Báo cáo doanh thu');

    sheet.columns = [{ width: 15 }, { width: 18 }, { width: 14 }, { width: 15 }, { width: 18 }];

    const headerStyle = {
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B59B6' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const dataStyle = {
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };

    sheet.getCell('A1').value = 'BÁO CÁO DOANH THU THEO NGÀY (ĐƠN DONE)';
    sheet.getCell('A1').style = { font: { bold: true, size: 16, color: { argb: 'FF9B59B6' } }, alignment: { horizontal: 'center' } };
    sheet.mergeCells('A1:E1');

    sheet.getCell('A2').value = `Khoảng thời gian: ${dateRangeText}`;
    sheet.mergeCells('A2:E2');

    sheet.getCell('A3').value = `Tổng doanh thu: ${formatCurrencyForExcel(analytics.totalRevenue)} | Tổng đơn done: ${
      analytics.totalOrders
    }`;
    sheet.mergeCells('A3:E3');
    sheet.getCell('A3').style = { font: { italic: true, color: { argb: 'FF9B59B6' } } };

    // ✅ Đổi nhãn & công thức phần trăm theo tổng kỳ (CHỈNH SỬA #2)
    ['Ngày', 'Doanh thu', 'Tỷ trọng (%)', 'Số đơn', 'TB/đơn'].forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      sheet.getCell(`${col}5`).value = h;
      sheet.getCell(`${col}5`).style = headerStyle;
    });

    const revenueData = analytics.dailyRevenue || {};
    const orderCounts = analytics.dailyOrders || {};
    const totalRevenueAllDays = Object.values(revenueData).reduce((s, v) => s + v, 0);

    let row = 6;
    const sorted = Object.entries(revenueData).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    if (sorted.length) {
      for (const [date, rev] of sorted) {
        const percent = totalRevenueAllDays > 0 ? (rev / totalRevenueAllDays) * 100 : 0;
        const count = orderCounts[date] || 0;
        const avg = count > 0 ? rev / count : 0;

        sheet.getCell(`A${row}`).value = new Date(date).toLocaleDateString('vi-VN');
        sheet.getCell(`B${row}`).value = formatCurrencyForExcel(rev);
        sheet.getCell(`C${row}`).value = `${percent.toFixed(1)}%`;
        sheet.getCell(`D${row}`).value = `${count} đơn`;
        sheet.getCell(`E${row}`).value = formatCurrencyForExcel(avg);

        ['A', 'B', 'C', 'D', 'E'].forEach((c) => (sheet.getCell(`${c}${row}`).style = dataStyle));
        row++;
      }
    } else {
      sheet.getCell('A6').value = 'Không có dữ liệu doanh thu';
      sheet.mergeCells('A6:E6');
    }
  };

  const exportToExcel = async (reportType = 'overview') => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CakeShop Analytics';
      workbook.lastModifiedBy = 'System';
      workbook.created = new Date();
      workbook.modified = new Date();

      const dateRangeText = `${dateRange.from.toLocaleDateString('vi-VN')} - ${dateRange.to.toLocaleDateString('vi-VN')}`;

      switch (reportType) {
        case 'overview':
          await createOverviewSheetFixed(workbook, dateRangeText);
          break;
        case 'customers':
          await createCustomersSheetFixed(workbook, dateRangeText);
          break;
        case 'products':
          await createProductsSheetFixed(workbook, dateRangeText);
          break;
        case 'revenue':
          await createRevenueSheetFixed(workbook, dateRangeText);
          break;
        case 'comprehensive': {
          await createOverviewSheetFixed(workbook, dateRangeText);
          await createCustomersSheetFixed(workbook, dateRangeText);
          await createProductsSheetFixed(workbook, dateRangeText);
          await createRevenueSheetFixed(workbook, dateRangeText);
          break;
        }
        default:
          await createOverviewSheetFixed(workbook, dateRangeText);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `CakeShop_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Lỗi khi xuất Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại.');
    }
  };

  // ── UI helpers
  const handleQuickFilter = (filterType) => {
    const now = new Date();
    let from = new Date();
    switch (filterType) {
      case 'today':
        from = new Date();
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        from.setDate(now.getDate() - 90);
        break;
      default:
        break;
    }
    setDateRange({ from, to: now });
    setTimeFilter(filterType);
  };

  const tabs = [
    { id: 'overview', name: 'Tổng quan', icon: '📊', description: 'Tổng quan kinh doanh' },
    { id: 'revenue', name: 'Doanh thu', icon: '💰', description: 'Phân tích doanh thu chi tiết' },
    { id: 'customers', name: 'Khách hàng', icon: '👥', description: 'Phân tích khách hàng' },
    { id: 'products', name: 'Sản phẩm', icon: '🧁', description: 'Hiệu suất sản phẩm' },
    { id: 'reports', name: 'Báo cáo', icon: '📈', description: 'Báo cáo chuyên sâu' },
  ];

  if (isLoading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-container">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <TabBarr />

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-main">
            <div className="brand-section">
              <div className="brand-icon">🧁</div>
              <div className="brand-info">
                <h1>Thống kê toàn diện</h1>
                <p>Thống kê kinh doanh toàn diện</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-container">
        <div className="date-filter">
          <div className="filter-content">
            <div className="filter-section">
              <div className="filter-label">
                <span>📅 Khoảng thời gian:</span>
              </div>
              <div className="date-inputs">
                <DatePicker
                  selected={dateRange.from}
                  onChange={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Từ ngày"
                />
                <span className="date-separator">→</span>
                <DatePicker
                  selected={dateRange.to}
                  onChange={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Đến ngày"
                />
              </div>
            </div>

            <div className="quick-filters">
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: 'week', label: '7 ngày' },
                { key: 'month', label: '30 ngày' },
                { key: 'quarter', label: '3 tháng' },
              ].map((f) => (
                <button key={f.key} onClick={() => handleQuickFilter(f.key)} className={`quick-filter-btn ${timeFilter === f.key ? 'active' : ''}`}>
                  {f.label}
                </button>
              ))}
            </div>

            <button onClick={() => exportToExcel('comprehensive')} disabled={!analytics.detailedStats?.totalBillsInRange} className="export-btn">
              <span>📊</span>
              <span>Xuất Excel (đầy đủ)</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-navigation">
          <div className="tab-list">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}>
                <span className="tab-icon">{tab.icon}</span>
                <div className="tab-content">
                  <span className="tab-name">{tab.name}</span>
                  <span className="tab-description">{tab.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="content-section fade-in">
            <div className="metric-cards">
              {[
                {
                  title: 'Tổng doanh thu (đơn done)',
                  value: formatCurrency(analytics.totalRevenue),
                  icon: '💰',
                  color: 'green',
                  trend: analytics.totalRevenue > 0 ? '↗ Có dữ liệu' : '📊 Chưa có dữ liệu',
                  trendType: analytics.totalRevenue > 0 ? 'positive' : 'neutral',
                },
                {
                  title: 'Số đơn hoàn thành (done)',
                  value: analytics.totalOrders,
                  icon: '📦',
                  color: 'blue',
                  trend: analytics.totalOrders > 0 ? '↗ Đang hoạt động' : '📊 Chưa có đơn',
                  trendType: analytics.totalOrders > 0 ? 'positive' : 'neutral',
                },
                {
                  title: 'Khách hàng (đã mua thành công)',
                  value: analytics.totalCustomers,
                  icon: '👥',
                  color: 'purple',
                  trend: `${analytics.customerRetention.toFixed(1)}% quay lại`,
                  trendType: analytics.customerRetention > 30 ? 'positive' : 'neutral',
                },
                {
                  title: 'Giá trị trung bình/đơn (done)',
                  value: formatCurrency(analytics.avgOrderValue),
                  icon: '📊',
                  color: 'orange',
                  trend: analytics.avgOrderValue > 0 ? '↗ Giá trị tốt' : '📊 Chưa có dữ liệu',
                  trendType: analytics.avgOrderValue > 0 ? 'positive' : 'neutral',
                },
              ].map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="card-content">
                    <div className="metric-info">
                      <p className="metric-label">{m.title}</p>
                      <p className="metric-value">{m.value}</p>
                    </div>
                    <div className={`metric-icon ${m.color}`}>{m.icon}</div>
                  </div>
                  <div className="metric-footer">
                    <span className={`metric-trend ${m.trendType}`}>{m.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue */}
        {activeTab === 'revenue' && (
          <div className="content-section revenue-analysis fade-in">
            <div className="section-grid three-columns">
              <div className="section-card">
                <h3 className="card-header">💰 Doanh thu theo ngày</h3>
                <div className="card-body daily-revenue">
                  {Object.keys(analytics.dailyRevenue).length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <p className="empty-description">Chưa có dữ liệu doanh thu</p>
                    </div>
                  ) : (
                    Object.entries(analytics.dailyRevenue)
                      .sort(([a], [b]) => new Date(b) - new Date(a))
                      .slice(0, 10)
                      .map(([date, revenue]) => (
                        <div key={date} className="revenue-item">
                          <span className="date-label">{new Date(date).toLocaleDateString('vi-VN')}</span>
                          <div className="revenue-details">
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${
                                    Math.max(
                                      (revenue / Math.max(...Object.values(analytics.dailyRevenue))) * 100,
                                      5
                                    )
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <span className="revenue-amount">{formatCurrency(revenue)}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="section-card">
                <h3 className="card-header">📈 Xu hướng</h3>
                <div className="card-body">
                  <div className="stat-item">
                    <div className="metric-info">
                      <div className="metric-value blue">{((analytics.totalRevenue / 1_000_000) || 0).toFixed(1)}M</div>
                      <p className="metric-label">Tổng doanh thu (triệu ₫)</p>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="metric-info">
                      <div className="metric-value purple">
                        {analytics.avgOrderValue > 0 ? `${(analytics.avgOrderValue / 1000).toFixed(0)}K` : '0'}
                      </div>
                      <p className="metric-label">Giá trị TB/đơn (nghìn ₫)</p>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="metric-info">
                      <div className="metric-value green">{analytics.totalProductsSold}</div>
                      <p className="metric-label">Tổng sản phẩm đã bán (tham chiếu)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3 className="card-header">🎯 Hiệu suất</h3>
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">Tỷ lệ thành công</span>
                    <span className="stat-value green">{(100 - analytics.cancellationRate).toFixed(1)}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Đơn/ngày</span>
                    <span className="stat-value blue">
                      {analytics.totalOrders > 0
                        ? (analytics.totalOrders / Math.max(1, Object.keys(analytics.dailyRevenue).length)).toFixed(1)
                        : 0}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Khách hàng trung thành</span>
                    <span className="stat-value purple">{analytics.topCustomers.filter((c) => c.orders > 1).length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Doanh thu TB/khách</span>
                    <span className="stat-value orange">
                      {analytics.totalCustomers > 0 ? formatCurrency(analytics.totalRevenue / analytics.totalCustomers) : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers */}
        {activeTab === 'customers' && (
          <div className="content-section fade-in">
            {analytics.topCustomers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3 className="empty-title">Chưa có dữ liệu khách hàng</h3>
                <p className="empty-description">Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu</p>
              </div>
            ) : (
              <div className="section-card data-table">
                <h3 className="card-header">🏆 Khách hàng VIP</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Số đơn</th>
                        <th>Tổng chi tiêu</th>
                        <th>Trung bình/đơn</th>
                        <th>Loại khách</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topCustomers.map((c, i) => (
                        <tr key={c.user?._id || i}>
                          <td>
                            <div className="user-info">
                              <div className="user-avatar">{(c.user?.name || 'K').charAt(0)}</div>
                              <div className="user-details">
                                <div className="user-name">{c.user?.name || 'Khách hàng'}</div>
                                <div className="user-email">{c.user?.email || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="order-badge">{c.orders} đơn</span>
                          </td>
                          <td className="stat-value green">{formatCurrency(c.spent)}</td>
                          <td>{formatCurrency((c.spent || 0) / Math.max(1, c.orders || 0))}</td>
                          <td>
                            <span
                              className={`customer-type ${
                                c.orders >= 5 ? 'vip' : c.orders >= 3 ? 'loyal' : c.orders >= 2 ? 'repeat' : 'new'
                              }`}
                            >
                              {c.orders >= 5 ? '👑 VIP' : c.orders >= 3 ? '⭐ Thân thiết' : c.orders >= 2 ? '💎 Trung thành' : '🆕 Mới'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div className="content-section fade-in">
            {analytics.topProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧁</div>
                <h3 className="empty-title">Chưa có dữ liệu sản phẩm</h3>
                <p className="empty-description">Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu</p>
              </div>
            ) : (
              <div className="section-card data-table">
                <h3 className="card-header">🧁 Sản phẩm bán chạy</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Đã bán</th>
                        <th>Doanh thu (ước tính)</th>
                        <th>Tỷ trọng</th>
                        <th>Hiệu suất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topProducts.map((item, index) => (
                        <tr key={item.product?._id || index}>
                          <td>
                            <div className="product-info">
                              <div className="product-icon">🧁</div>
                              <div className="product-details">
                                <div className="product-name">{item.product?.name || 'Sản phẩm'}</div>
                                <div className="product-category">{item.product?.category || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="stat-value blue">{item.sold} chiếc</td>
                          <td className="stat-value green">{formatCurrency(item.revenue)}</td>
                          <td>
                            <div className="progress-bar">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${analytics.totalRevenue > 0 ? (item.revenue / analytics.totalRevenue) * 100 : 0}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="progress-label">
                                {analytics.totalRevenue > 0 ? ((item.revenue / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`performance-badge ${index === 0 ? 'gold' : index <= 2 ? 'silver' : index <= 4 ? 'bronze' : 'normal'}`}>
                              {index === 0 ? '🏆 #1' : index <= 2 ? '🥈 Top 3' : index <= 4 ? '🥉 Top 5' : '📊 Khác'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {activeTab === 'reports' && (
          <div className="content-section reports-section fade-in">
            <div className="metric-cards">
              {[
                {
                  title: 'Tổng đơn hàng',
                  value: analytics.detailedStats?.totalBillsInRange || 0,
                  icon: '📦',
                  color: 'blue',
                  trend: `${analytics.detailedStats?.totalBillsInRange || 0} đơn trong khoảng thời gian`,
                  trendType: 'neutral',
                },
                {
                  title: 'Đơn hoàn thành (done)',
                  value: analytics.completedOrders || 0,
                  icon: '✅',
                  color: 'green',
                  trend: `${(analytics.detailedStats?.completionRate ?? 0).toFixed(1)}% tỷ lệ hoàn thành`,
                  trendType: 'positive',
                },
                {
                  title: 'Đơn đã hủy (cancelled + failed)',
                  value: analytics.cancelledOrders || 0,
                  icon: '❌',
                  color: 'red',
                  trend: `${(analytics.cancellationRate ?? 0).toFixed(1)}% tỷ lệ hủy`,
                  trendType: analytics.cancellationRate > 10 ? 'negative' : 'neutral',
                },
                {
                  title: 'Đơn đang xử lý',
                  value: analytics.pendingOrders || 0,
                  icon: '⏳',
                  color: 'orange',
                  trend: `${analytics.pendingOrders > 0 ? 'Cần theo dõi' : 'Không có đơn chờ'}`,
                  trendType: analytics.pendingOrders > 0 ? 'neutral' : 'positive',
                },
              ].map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="card-content">
                    <div className="metric-info">
                      <p className="metric-label">{m.title}</p>
                      <p className="metric-value">{m.value}</p>
                    </div>
                    <div className={`metric-icon ${m.color}`}>{m.icon}</div>
                  </div>
                  <div className="metric-footer">
                    <span className={`metric-trend ${m.trendType}`}>{m.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-card">
              <h3 className="card-header">📋 Tuỳ chọn xuất báo cáo</h3>
              <div className="card-body">
                <div className="export-options">
                  {[
                    {
                      title: 'Báo cáo tổng quan chi tiết',
                      description: 'Thống kê theo trạng thái; doanh thu chỉ tính đơn done',
                      icon: '📊',
                      color: 'blue',
                      action: () => exportToExcel('overview'),
                    },
                    {
                      title: 'Báo cáo khách hàng chi tiết',
                      description: 'Tên/Email/SĐT + lịch sử mua (đơn done)',
                      icon: '👥',
                      color: 'green',
                      action: () => exportToExcel('customers'),
                    },
                    {
                      title: 'Báo cáo sản phẩm chi tiết',
                      description: 'Hiệu suất (tham chiếu billDetails)',
                      icon: '🧁',
                      color: 'purple',
                      action: () => exportToExcel('products'),
                    },
                    {
                      title: 'Báo cáo doanh thu theo ngày',
                      description: 'Doanh thu/ngày + số đơn/ngày (đơn done)',
                      icon: '💰',
                      color: 'pink',
                      action: () => exportToExcel('revenue'),
                    },
                    {
                      title: 'Báo cáo toàn diện (4 sheet)',
                      description: 'Tổng quan + Khách hàng + Sản phẩm + Doanh thu',
                      icon: '📈',
                      color: 'orange',
                      action: () => exportToExcel('comprehensive'),
                    },
                  ].map((r, i) => (
                    <div key={i} className={`export-option ${r.color}`}>
                      <div className="export-icon">
                        <span>{r.icon}</span>
                      </div>
                      <div className="export-info">
                        <h4 className="export-title">{r.title}</h4>
                        <p className="export-description">{r.description}</p>
                      </div>
                      <button onClick={r.action} disabled={analytics.detailedStats?.totalBillsInRange === 0} className="export-action-btn">
                        Xuất Excel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
