import React, { useState, useEffect, useMemo } from 'react';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import './AnalyticsDashboard.scss';

// ───────────────────────────── Helpers ─────────────────────────────
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount) || amount < 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// 🔥 LOGIC TÍNH GIÁ SẢN PHẨM GIỐNG BILLMANAGEMENT.JSX
const getItemPrice = (item) => {
  const priceFields = ['unitPrice', 'unit_price', 'price', 'itemPrice', 'productPrice'];
  
  for (const field of priceFields) {
    if (item[field] && Number(item[field]) > 0) {
      return Number(item[field]);
    }
  }
  
  if (item.total && item.quantity && Number(item.quantity) > 0) {
    return Number(item.total) / Number(item.quantity);
  }
  
  return 0;
};

// 🔥 LOGIC LẤY THÔNG TIN KHÁCH HÀNG GIỐNG CUSTOMERMANAGEMENT.JSX  
const getCustomerAddress = (customer) => {
  if (customer.address_detail && customer.address_detail.full_address) {
    return customer.address_detail.full_address;
  }
  
  if (customer.address_detail) {
    const { street, ward, district, city } = customer.address_detail;
    const parts = [street, ward, district, city].filter(part => part && part.trim() !== '');
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }
  
  return 'Chưa cập nhật địa chỉ';
};

const getCustomerOrderCount = (customer) => {
  return customer.total_orders || 0;
};

const getCustomerTotalSpent = (customer) => {
  return customer.total_spent || 0;
};

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
    users: [], // 🔥 SỬ DỤNG ENDPOINT /users/with-accounts
    products: [],
  });
  const [timeFilter, setTimeFilter] = useState('month');

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
    totalProductsSold: 0,
    avgCustomerValue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    completedRevenue: 0,
    detailedStats: {
      totalBillsInRange: 0,
      completionRate: 0,
    },
  });

  // ── Fetch Data 🔥 SỬ DỤNG ĐÚNG API ENDPOINTS
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [billsRes, usersRes, productsRes] = await Promise.all([
        api.get('/bills/enhanced?enrich=true'), // 🔥 SỬ DỤNG ENHANCED API GIỐNG BILLMANAGEMENT
        api.get('/users/with-accounts', { params: { limit: 1000 } }), // 🔥 SỬ DỤNG API GIỐNG CUSTOMERMANAGEMENT
        api.get('/products')
      ]);

      console.log('🔍 Bills response:', billsRes?.data?.data?.length || 0);
      console.log('🔍 Users response:', usersRes?.data?.data?.customers?.length || 0);
      console.log('🔍 Products response:', productsRes?.data?.data?.length || 0);

      setRawData({
        bills: billsRes?.data?.data ?? [],
        users: usersRes?.data?.data?.customers ?? [], // 🔥 LẤY ĐÚNG MẢNG CUSTOMERS
        products: productsRes?.data?.data ?? [],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setRawData({ 
        bills: [], 
        users: [], 
        products: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ───────────────────────────── Analytics Calculation ─────────────────────────────
  const analytics = useMemo(() => {
    const { bills, users, products } = rawData;

    if (!Array.isArray(bills) || bills.length === 0) return getEmptyAnalytics();

    const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), 0, 0, 0, 0);
    const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999);

    // Filter bills by date range
    const filteredBills = bills.filter(b => {
      if (!b || !b.created_at) return false;
      const d = new Date(b.created_at);
      return !isNaN(d) && d >= from && d <= to;
    });

    console.log('🔍 Filtered bills count:', filteredBills.length);
    console.log('🔍 Sample filtered bills:', filteredBills.slice(0, 3).map(b => ({
      id: b._id,
      status: b.status,
      user_id: b.user_id,
      Account_id: b.Account_id,
      total: b.total,
      created_at: b.created_at
    })));

    // Group by status
    const byStatus = {
      done: [],
      cancelled: [],
      failed: [],
      pending: [],
      confirmed: [],
      ready: [],
      shipping: [],
    };

    for (const b of filteredBills) {
      const st = (typeof b.status === 'string' ? b.status.toLowerCase() : 'unknown');
      if (st === 'done') byStatus.done.push(b);
      else if (st === 'cancelled') byStatus.cancelled.push(b);
      else if (st === 'failed') byStatus.failed.push(b);
      else if (['pending','confirmed','ready','shipping'].includes(st)) byStatus[st].push(b);
    }

    console.log('🔍 Bills by status:', {
      done: byStatus.done.length,
      cancelled: byStatus.cancelled.length,
      failed: byStatus.failed.length,
      pending: byStatus.pending.length,
      confirmed: byStatus.confirmed.length,
      ready: byStatus.ready.length,
      shipping: byStatus.shipping.length
    });

    const completedBills = byStatus.done;
    const cancelledCount = byStatus.cancelled.length + byStatus.failed.length;
    const pendingCount = byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + byStatus.shipping.length;
    const totalInRange = filteredBills.length;

    console.log('🔍 Completed bills count:', completedBills.length);
    console.log('🔍 Sample completed bills:', completedBills.slice(0, 2).map(b => ({
      id: b._id,
      user_id: b.user_id,
      Account_id: b.Account_id,
      total: b.total,
      status: b.status
    })));

    // Revenue calculation (only from completed orders)
    const completedRevenue = completedBills.reduce((sum, b) => {
      const val = parseFloat(b?.total) || 0;
      return sum + (val > 0 ? val : 0);
    }, 0);

    const totalOrders = completedBills.length;

    // 🔥 TOP CUSTOMERS - VỪa GIỮ THÔNG TIN KHÁCH HÀNG VỪA CHỈ TÍNH ĐƠN DONE
    console.log('🔍 Processing customers: showing all but only counting done orders...');
    
    // Bước 1: Nhóm đơn done theo user_id
    const customerStatsFromDoneBills = {};
    
    for (const bill of completedBills) {
      const userId = String(bill.user_id || bill.Account_id || '').trim();
      if (!userId || userId === '' || userId === 'undefined' || userId === 'null') continue;
      
      const billTotal = parseFloat(bill?.total) || 0;
      if (billTotal <= 0) continue;
      
      if (!customerStatsFromDoneBills[userId]) {
        customerStatsFromDoneBills[userId] = {
          orderCount: 0,
          totalSpent: 0,
          orders: []
        };
      }
      
      customerStatsFromDoneBills[userId].orderCount += 1;
      customerStatsFromDoneBills[userId].totalSpent += billTotal;
      customerStatsFromDoneBills[userId].orders.push(bill);
    }
    
    console.log('🔍 Customer stats from done bills:', Object.keys(customerStatsFromDoneBills).length);
    console.log('🔍 Sample customer stats:', Object.entries(customerStatsFromDoneBills).slice(0, 2));
    console.log('🔍 Sample users from API:', users.slice(0, 2).map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      total_orders: u.total_orders,
      total_spent: u.total_spent
    })));
    
    // Bước 2: Lấy TẤT CẢ khách hàng từ users array, nhưng chỉ tính đơn done
    let topCustomers = users
      .map(user => {
        // 🔥 TÌM KIẾM THEO CẢ _id VÀ ACCOUNT_ID
        const userId = String(user._id);
        const accountId = String(user.account_id || ''); // Nếu có field account_id
        
        // Tìm stats theo cả 2 cách
        const doneStats = customerStatsFromDoneBills[userId] || 
                         customerStatsFromDoneBills[accountId] || 
                         {
                           orderCount: 0,
                           totalSpent: 0,
                           orders: []
                         };
        
        return {
          _id: user._id,
          name: user.name || 'Khách hàng không rõ',
          email: user.email || 'Email chưa cập nhật', 
          phone: user.phone || 'SĐT chưa cập nhật',
          orderCount: doneStats.orderCount, // CHỈ đơn done
          totalSpent: doneStats.totalSpent, // CHỈ từ đơn done  
          avgOrderValue: doneStats.orderCount > 0 ? doneStats.totalSpent / doneStats.orderCount : 0,
          address: getCustomerAddress(user),
          lastOrderDate: doneStats.orders.length > 0 ? 
            new Date(Math.max(...doneStats.orders.map(o => new Date(o.created_at).getTime()))) : null,
          // Thêm thông tin tổng từ API gốc để tham khảo
          totalOrdersAllTime: getCustomerOrderCount(user), // Tất cả đơn
          totalSpentAllTime: getCustomerTotalSpent(user)    // Tất cả đơn
        };
      });
    
    // 🔥 CHỈ LẤY KHÁCH HÀNG THẬT CÓ TRONG DATABASE
    
    // Filter và sort - CHỈ hiển thị khách hàng có đơn done
    topCustomers = topCustomers
      .filter(customer => customer.orderCount > 0) // CHỈ khách có đơn done
      .sort((a, b) => {
        // Ưu tiên theo số đơn done, sau đó theo chi tiêu done
        if (a.orderCount !== b.orderCount) {
          return b.orderCount - a.orderCount;
        }
        return b.totalSpent - a.totalSpent;
      })
      .slice(0, 20);

    console.log('🔍 Top customers with done orders only:', topCustomers.length);

    // 🔥 TOP PRODUCTS - SỬ DỤNG LOGIC TỪ BILLMANAGEMENT.JSX
    console.log('🔍 Processing top products from bills items...');
    
    const productStats = {};
    
    for (const bill of completedBills) {
      if (!bill.items || !Array.isArray(bill.items)) continue;
      
      for (const item of bill.items) {
        const productId = item.product_id;
        if (!productId) continue;
        
        const itemPrice = getItemPrice(item);
        const quantity = Number(item.quantity) || 0;
        const itemTotal = itemPrice * quantity;
        
        if (!productStats[productId]) {
          productStats[productId] = {
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
            avgPrice: 0
          };
        }
        
        productStats[productId].totalQuantity += quantity;
        productStats[productId].totalRevenue += itemTotal;
        productStats[productId].orderCount += 1;
      }
    }
    
    // Calculate average price for each product
    Object.keys(productStats).forEach(productId => {
      const stats = productStats[productId];
      stats.avgPrice = stats.totalQuantity > 0 ? stats.totalRevenue / stats.totalQuantity : 0;
    });
    
    console.log('🔍 Product stats calculated:', Object.keys(productStats).length);
    
    const topProducts = Object.entries(productStats)
      .map(([productId, stats]) => {
        const product = products.find(p => String(p._id) === String(productId));
        return {
          _id: productId,
          name: product?.name || `Sản phẩm #${productId.slice(-6)}`,
          image: product?.image || '',
          category: product?.category_id || product?.category || 'Chưa phân loại',
          ...stats
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    console.log('🔍 Top products processed:', topProducts.length);

    // Unique customers with completed orders (từ bills thực tế)
    const uniqueCustomerIds = Array.from(new Set(
      completedBills
        .map(b => String(b.user_id || b.Account_id || '').trim())
        .filter(id => id && id !== '' && id !== 'undefined' && id !== 'null')
    ));
    const totalCustomers = uniqueCustomerIds.length;

    const avgOrderValue = totalOrders > 0 ? (completedRevenue / totalOrders) : 0;

    // Daily revenue and orders
    const dailyRevenue = completedBills.reduce((acc, b) => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      acc[key] = (acc[key] || 0) + (parseFloat(b.total) || 0);
      return acc;
    }, {});
    
    const dailyOrders = completedBills.reduce((acc, b) => {
      const key = new Date(b.created_at).toISOString().slice(0,10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Best selling hour
    const hourlyOrders = completedBills.reduce((acc, b) => {
      const h = new Date(b.created_at).getHours();
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
    const bestSellingHour = Object.entries(hourlyOrders).sort((a,b)=>b[1]-a[1])[0]?.[0] || '12';

    // Customer retention
    const customerStats = {};
    for (const b of completedBills) {
      const uid = String(b.user_id || b.Account_id || '');
      if (!uid) continue;
      customerStats[uid] = (customerStats[uid] || 0) + 1;
    }
    
    const repeatCustomers = Object.values(customerStats).filter(count => count > 1).length;
    const customerRetention = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    const cancellationRate = totalInRange ? (cancelledCount / totalInRange) * 100 : 0;

    const totalProductsSold = Object.values(productStats).reduce((sum, p) => sum + p.totalQuantity, 0);

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
      totalProductsSold,
      avgCustomerValue: totalCustomers ? completedRevenue / totalCustomers : 0,
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
        totalProductsSoldCompleted: totalProductsSold,
        cancellationRate,
        completionRate: totalInRange ? (completedBills.length / totalInRange) * 100 : 0
      }
    };
  }, [rawData, dateRange]);

  // ── Export Excel Functions
  const exportToExcel = async () => {
    try {
      // 🔥 SỬ DỤNG EXCELJS GIỐNG CUSTOMERMANAGEMENT.JSX
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Analytics Dashboard';
      workbook.created = new Date();
      
      // 📊 Sheet 1: KPI Overview
      const kpiSheet = workbook.addWorksheet('Tổng quan KPI');
      kpiSheet.addRow(['Chỉ số', 'Giá trị']);
      kpiSheet.addRow(['Tổng doanh thu', formatCurrency(analytics.totalRevenue)]);
      kpiSheet.addRow(['Số đơn hoàn thành', analytics.totalOrders]);
      kpiSheet.addRow(['Khách hàng', analytics.totalCustomers]);
      kpiSheet.addRow(['Giá trị TB/đơn', formatCurrency(analytics.avgOrderValue)]);
      kpiSheet.addRow(['Tỷ lệ hủy đơn', `${analytics.cancellationRate.toFixed(2)}%`]);
      kpiSheet.addRow(['Tỷ lệ quay lại', `${analytics.customerRetention.toFixed(2)}%`]);
      kpiSheet.addRow(['Sản phẩm đã bán', analytics.totalProductsSold]);
      
      // 👥 Sheet 2: Top Customers với thông tin đầy đủ
      const customersSheet = workbook.addWorksheet('Top khách hàng');
      customersSheet.addRow(['#', 'Tên khách hàng', 'Email', 'Số điện thoại', 'Đơn done', 'Chi tiêu done', 'TB/đơn done', 'Tổng đơn', 'Tổng chi tiêu']);
      analytics.topCustomers.forEach((customer, index) => {
        customersSheet.addRow([
          index + 1,
          customer.name,
          customer.email,
          customer.phone,
          customer.orderCount,
          customer.totalSpent,
          customer.avgOrderValue,
          customer.totalOrdersAllTime || 0,
          customer.totalSpentAllTime || 0
        ]);
      });
      
      // 🧁 Sheet 3: Top Products
      const productsSheet = workbook.addWorksheet('Sản phẩm bán chạy');
      productsSheet.addRow(['#', 'Tên sản phẩm', 'Danh mục', 'Số lượng bán', 'Doanh thu', 'Giá TB']);
      analytics.topProducts.forEach((product, index) => {
        productsSheet.addRow([
          index + 1,
          product.name,
          product.category,
          product.totalQuantity,
          product.totalRevenue,
          product.avgPrice
        ]);
      });
      
      // 📅 Sheet 4: Daily Revenue
      const dailySheet = workbook.addWorksheet('Doanh thu theo ngày');
      dailySheet.addRow(['Ngày', 'Doanh thu', 'Số đơn']);
      Object.entries(analytics.dailyRevenue)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .forEach(([date, revenue]) => {
          dailySheet.addRow([
            new Date(date).toLocaleDateString('vi-VN'),
            revenue,
            analytics.dailyOrders[date] || 0
          ]);
        });
      
      // Style headers
      [kpiSheet, customersSheet, productsSheet, dailySheet].forEach(sheet => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      
      // Export file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const filename = `Analytics_${dateRange.from.toISOString().slice(0,10)}_to_${dateRange.to.toISOString().slice(0,10)}.xlsx`;
      saveAs(blob, filename);
      
      alert('✅ Xuất Excel thành công!');
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('⚠️ Lỗi khi xuất Excel. Vui lòng kiểm tra và thử lại.');
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

  const handleDateChange = (type, event) => {
    const date = new Date(event.target.value);
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
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
      <TabBar />

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🧁 Thống kê toàn diện</h1>
          <p>Thống kê kinh doanh toàn diện - Dữ liệu khách hàng và sản phẩm đã được sửa</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="date-filter">
          <label>📅 Khoảng thời gian:</label>
          <input
            type="date"
            value={dateRange.from.toISOString().slice(0, 10)}
            onChange={(e) => handleDateChange('from', e)}
            className="date-picker"
          />
          <span>→</span>
          <input
            type="date"
            value={dateRange.to.toISOString().slice(0, 10)}
            onChange={(e) => handleDateChange('to', e)}
            className="date-picker"
          />
        </div>

        <div className="quick-filters">
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: 'week', label: '7 ngày' },
            { key: 'month', label: '30 ngày' },
            { key: 'quarter', label: '3 tháng' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              className={`filter-btn ${timeFilter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={exportToExcel}
          disabled={!analytics.detailedStats?.totalBillsInRange}
          className="export-btn"
        >
          📊 Xuất Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <div>
              <div>{tab.name}</div>
              <small>{tab.description}</small>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="kpi-grid">
            {[
              {
                title: 'Tổng doanh thu (đơn done)',
                value: formatCurrency(analytics.totalRevenue),
                icon: '💰',
                color: 'green',
              },
              {
                title: 'Số đơn hoàn thành (done)',
                value: analytics.totalOrders,
                icon: '📦',
                color: 'blue',
              },
              {
                title: 'Khách hàng (đã mua thành công)',
                value: analytics.totalCustomers,
                icon: '👥',
                color: 'purple',
              },
              {
                title: 'Giá trị trung bình/đơn (done)',
                value: formatCurrency(analytics.avgOrderValue),
                icon: '📊',
                color: 'orange',
              },
            ].map((kpi, i) => (
              <div key={i} className="kpi-card">
                <h3>{kpi.title}</h3>
                <div className="value">{kpi.value}</div>
                <div className="subtitle">
                  {kpi.title.includes('doanh thu') && analytics.totalOrders > 0 ? 
                    `${analytics.totalOrders} đơn hoàn thành` : 
                    kpi.title.includes('khách hàng') ? 
                    `${analytics.customerRetention.toFixed(1)}% quay lại` : 
                    'Dữ liệu cập nhật'}
                </div>
              </div>
            ))}
          </div>

          <div className="charts-grid">
            <div className="revenue-chart">
              <h3>💰 Doanh thu theo ngày</h3>
              {Object.keys(analytics.dailyRevenue).length === 0 ? (
                <div className="no-data">
                  <p>📊 Chưa có dữ liệu doanh thu</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Số đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.dailyRevenue)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .slice(0, 10)
                        .map(([date, revenue]) => (
                          <tr key={date}>
                            <td>{new Date(date).toLocaleDateString('vi-VN')}</td>
                            <td className="revenue">{formatCurrency(revenue)}</td>
                            <td className="orders">{analytics.dailyOrders[date] || 0} đơn</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="status-chart">
              <h3>📊 Tình trạng đơn hàng</h3>
              <div className="status-stats">
                <div className="stat-group">
                  <h4>✅ Hoàn thành</h4>
                  <p>{analytics.completedOrders} đơn ({((analytics.completedOrders / (analytics.detailedStats?.totalBillsInRange || 1)) * 100).toFixed(1)}%)</p>
                </div>
                <div className="stat-group">
                  <h4>⏳ Đang xử lý</h4>
                  <p>{analytics.pendingOrders} đơn</p>
                </div>
                <div className="stat-group">
                  <h4>❌ Đã hủy</h4>
                  <p>{analytics.cancelledOrders} đơn ({analytics.cancellationRate.toFixed(1)}%)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="quick-stats">
            <div className="stat-group">
              <h4>🕒 Thời gian</h4>
              <p>Giờ bán chạy: {analytics.bestSellingHour}:00</p>
            </div>
            <div className="stat-group">
              <h4>👥 Khách hàng</h4>
              <p>Tỷ lệ quay lại: {analytics.customerRetention.toFixed(1)}%</p>
            </div>
            <div className="stat-group">
              <h4>🧁 Sản phẩm</h4>
              <p>Đã bán: {analytics.totalProductsSold} chiếc</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="revenue-section">
          <div className="section-header">
            <h3>💰 Phân tích doanh thu chi tiết</h3>
            <div className="stats-summary">
              Tổng doanh thu: {formatCurrency(analytics.totalRevenue)} • Từ {analytics.totalOrders} đơn hoàn thành
            </div>
          </div>

          <div className="revenue-grid">
            <div className="revenue-summary">
              <h4>📈 Tổng quan doanh thu</h4>
              <div className="summary-stats">
                <div className="stat-item">
                  <label>Doanh thu hoàn thành:</label>
                  <span className="value green">{formatCurrency(analytics.completedRevenue)}</span>
                </div>
                <div className="stat-item">
                  <label>Giá trị trung bình/đơn:</label>
                  <span className="value blue">{formatCurrency(analytics.avgOrderValue)}</span>
                </div>
                <div className="stat-item">
                  <label>Giá trị TB/khách hàng:</label>
                  <span className="value purple">{formatCurrency(analytics.avgCustomerValue)}</span>
                </div>
                <div className="stat-item">
                  <label>Giờ bán chạy nhất:</label>
                  <span className="value orange">{analytics.bestSellingHour}:00</span>
                </div>
              </div>
            </div>

            <div className="daily-breakdown">
              <h4>📅 Doanh thu theo ngày</h4>
              {Object.keys(analytics.dailyRevenue).length === 0 ? (
                <div className="no-data">
                  <p>📊 Chưa có dữ liệu trong khoảng thời gian này</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Đơn hàng</th>
                        <th>TB/đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.dailyRevenue)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([date, revenue]) => {
                          const orders = analytics.dailyOrders[date] || 0;
                          const avgValue = orders > 0 ? revenue / orders : 0;
                          return (
                            <tr key={date}>
                              <td>{new Date(date).toLocaleDateString('vi-VN')}</td>
                              <td className="revenue">{formatCurrency(revenue)}</td>
                              <td className="orders">{orders}</td>
                              <td className="avg">{formatCurrency(avgValue)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="customers-section">
          <div className="section-header">
            <h3>🏆 Khách hàng VIP (thông tin đầy đủ + chỉ tính đơn done)</h3>
            <div className="stats-summary">
              Tổng: {analytics.topCustomers.length} khách hàng • Tỷ lệ quay lại: {analytics.customerRetention.toFixed(1)}% • Chỉ tính doanh thu từ đơn hoàn thành
            </div>
          </div>
          
          {analytics.topCustomers.length === 0 ? (
            <div className="no-data">
              <p>👥 Chưa có dữ liệu khách hàng</p>
              <div className="help-text">
                <p>🔧 Hiển thị tất cả khách hàng + chỉ tính doanh thu từ đơn done</p>
                <p>🔍 Debug: Kiểm tra dữ liệu trong console</p>
                <ul>
                  <li>Completed bills: {analytics.completedOrders}</li>
                  <li>Users fetched: {rawData.users.length}</li>
                  <li>Date range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Liên hệ</th>
                    <th>Đơn done 🎯</th>
                    <th>Chi tiêu done 💰</th>
                    <th>TB/đơn done</th>
                    <th>Tổng đơn 📊</th>
                    <th>Loại khách</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topCustomers.map((customer, i) => (
                    <tr key={customer._id || i}>
                      <td className="customer-name">
                        <span className="rank">#{i + 1}</span>
                        {customer.name}
                      </td>
                      <td>
                        <div className="email">{customer.email}</div>
                        <div className="phone">{customer.phone}</div>
                      </td>
                      <td className="orders" title="Chỉ đơn hoàn thành trong khoảng thời gian">
                        {customer.orderCount} đơn
                      </td>
                      <td className="spent" title="Chỉ doanh thu từ đơn hoàn thành">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td title="Giá trị trung bình đơn hoàn thành">
                        {formatCurrency(customer.avgOrderValue)}
                      </td>
                      <td className="total-info" title="Tổng tất cả đơn hàng (tham khảo)">
                        <div>{customer.totalOrdersAllTime || 0} đơn</div>
                        <small>{formatCurrency(customer.totalSpentAllTime || 0)}</small>
                      </td>
                      <td>
                        <span className={`badge ${customer.orderCount >= 5 ? 'vip' : customer.orderCount >= 2 ? 'regular' : 'new'}`}>
                          {customer.orderCount >= 5 ? '👑 VIP' : customer.orderCount >= 3 ? '⭐ Thân thiết' : customer.orderCount >= 2 ? '💎 Trung thành' : customer.orderCount === 0 ? '😴 Chưa mua' : '🆕 Mới'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="products-section">
          <div className="section-header">
            <h3>🧁 Sản phẩm bán chạy</h3>
            <div className="stats-summary">
              Tổng bán: {analytics.totalProductsSold} chiếc • Doanh thu: {formatCurrency(analytics.totalRevenue)}
            </div>
          </div>
          
          {analytics.topProducts.length === 0 ? (
            <div className="no-data">
              <p>🧁 Chưa có dữ liệu sản phẩm</p>
              <div className="help-text">
                <p>🔧 Đã sử dụng logic từ BillManagement.jsx và BillDetailModal.jsx</p>
                <p>🔍 Debug: Kiểm tra dữ liệu trong console</p>
                <ul>
                  <li>Completed bills: {analytics.completedOrders}</li>
                  <li>Products fetched: {rawData.products.length}</li>
                  <li>Date range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Đã bán</th>
                    <th>Doanh thu</th>
                    <th>Giá TB</th>
                    <th>Số đơn</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product, index) => (
                    <tr key={product._id || index}>
                      <td className="product-name">
                        <span className="rank">#{index + 1}</span>
                        <div>
                          <div>{product.name}</div>
                          <small>ID: {product._id.slice(-6)}</small>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td className="sold">{product.totalQuantity} chiếc</td>
                      <td className="revenue">{formatCurrency(product.totalRevenue)}</td>
                      <td>{formatCurrency(product.avgPrice)}</td>
                      <td className="orders">{product.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="reports-section">
          <div className="section-header">
            <h3>📈 Báo cáo chi tiết</h3>
          </div>

          <div className="report-summary">
            <div className="summary-grid">
              {[
                { label: 'Tổng đơn trong khoảng', value: analytics.detailedStats?.totalBillsInRange || 0 },
                { label: 'Tỷ lệ hoàn thành', value: `${(analytics.detailedStats?.completionRate || 0).toFixed(1)}%` },
                { label: 'Tỷ lệ hủy đơn', value: `${analytics.cancellationRate.toFixed(1)}%` },
                { label: 'Khách trung thành', value: analytics.topCustomers.filter(c => c.orderCount > 1).length },
                { label: 'Sản phẩm khác nhau', value: analytics.topProducts.length },
                { label: 'Users có data', value: rawData.users.length },
              ].map((item, i) => (
                <div key={i} className="summary-item">
                  <h4>{item.label}</h4>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="export-options">
            <div className="export-card">
              <h4>📊 Báo cáo tổng quan chi tiết</h4>
              <p>Xuất toàn bộ dữ liệu thống kê ra Excel với đầy đủ thông tin khách hàng và sản phẩm</p>
              <button
                onClick={exportToExcel}
                disabled={analytics.detailedStats?.totalBillsInRange === 0}
                className="export-btn"
              >
                📊 Xuất Excel
              </button>
            </div>
          </div>

          {analytics.detailedStats?.totalBillsInRange === 0 && (
            <div className="no-data">
              <p>📊 Chưa có dữ liệu trong khoảng thời gian đã chọn</p>
              <p>Hãy thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu đơn hàng</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
