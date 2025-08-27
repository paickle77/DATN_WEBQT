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

  // ── Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [billsRes, billDetailsRes, usersRes, productsRes] = await Promise.all([
        api.get('/bills'),
        api.get('/billdetails'), 
        api.get('/users'),
        api.get('/products')
      ]);
      
      setRawData({
        bills: billsRes?.data?.data ?? [],
        billDetails: billDetailsRes?.data?.data ?? [],
        users: usersRes?.data?.data ?? [],
        products: productsRes?.data?.data ?? [],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setRawData({ 
        bills: [], 
        billDetails: [], 
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
    const { bills, users, billDetails, products } = rawData;

    if (!Array.isArray(bills) || bills.length === 0) return getEmptyAnalytics();

    const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), 0, 0, 0, 0);
    const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999);

    // Filter bills by date range
    const filteredBills = bills.filter(b => {
      if (!b || !b.created_at) return false;
      const d = new Date(b.created_at);
      return !isNaN(d) && d >= from && d <= to;
    });

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

    const completedBills = byStatus.done;
    const cancelledCount = byStatus.cancelled.length + byStatus.failed.length;
    const pendingCount = byStatus.pending.length + byStatus.confirmed.length + byStatus.ready.length + byStatus.shipping.length;
    const totalInRange = filteredBills.length;

    // Revenue calculation (only from completed orders)
    const completedRevenue = completedBills.reduce((sum, b) => {
      const val = parseFloat(b?.total) || 0;
      return sum + (val > 0 ? val : 0);
    }, 0);

    const totalOrders = completedBills.length;

    // Unique customers with completed orders
    const uniqueCustomerIds = Array.from(new Set(
      completedBills
        .map(b => String(b.Account_id || '').trim())
        .filter(id => id && id !== '' && id !== 'undefined' && id !== 'null')
    ));
    const totalCustomers = uniqueCustomerIds.length;

    const avgOrderValue = totalOrders > 0 ? (completedRevenue / totalOrders) : 0;

    // Customer statistics
    const userIndex = new Map((users || []).map(u => [String(u._id), u]));
    
    const customerStats = {};
    for (const b of completedBills) {
      const uid = String(b.Account_id || '');
      if (!uid) continue;
      const amount = parseFloat(b.total) || 0;

      if (!customerStats[uid]) {
        customerStats[uid] = {
          orders: 0,
          spent: 0,
          firstOrder: b.created_at,
          lastOrder: b.created_at,
        };
      }
      customerStats[uid].orders += 1;
      customerStats[uid].spent += amount;

      if (new Date(b.created_at) < new Date(customerStats[uid].firstOrder)) {
        customerStats[uid].firstOrder = b.created_at;
      }
      if (new Date(b.created_at) > new Date(customerStats[uid].lastOrder)) {
        customerStats[uid].lastOrder = b.created_at;
      }
    }

    // Top customers
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
    const repeatCustomers = Object.values(customerStats).filter(c => c.orders > 1).length;
    const customerRetention = totalCustomers ? (repeatCustomers / totalCustomers) * 100 : 0;

    const cancellationRate = totalInRange ? (cancelledCount / totalInRange) * 100 : 0;

    // Product statistics
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
      totalProductsSold: Object.values(productStats).reduce((s,p)=>s + p.sold,0),
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
        totalProductsSoldCompleted: Object.values(productStats).reduce((s,p)=>s + p.sold,0),
        cancellationRate,
        completionRate: totalInRange ? (completedBills.length / totalInRange) * 100 : 0
      }
    };
  }, [rawData, dateRange]);

  // ── Export Excel Functions
  const exportToExcel = async () => {
    try {
      alert('Tính năng xuất Excel sẽ được thêm sau khi cài đặt các package cần thiết');
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
          <p>Thống kê kinh doanh toàn diện</p>
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
            <h3>🏆 Khách hàng VIP</h3>
            <div className="stats-summary">
              Tổng: {analytics.totalCustomers} khách • Tỷ lệ quay lại: {analytics.customerRetention.toFixed(1)}%
            </div>
          </div>
          
          {analytics.topCustomers.length === 0 ? (
            <div className="no-data">
              <p>👥 Chưa có dữ liệu khách hàng</p>
              <div className="help-text">
                <p>Để có dữ liệu khách hàng, cần:</p>
                <ul>
                  <li>Có đơn hàng với trạng thái "done"</li>
                  <li>Đơn hàng có thông tin Account_id hợp lệ</li>
                  <li>Chọn khoảng thời gian phù hợp</li>
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
                    <th>Số đơn</th>
                    <th>Tổng chi tiêu</th>
                    <th>TB/đơn</th>
                    <th>Loại khách</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topCustomers.map((c, i) => (
                    <tr key={c.user?._id || i}>
                      <td className="customer-name">
                        <span className="rank">#{i + 1}</span>
                        {c.user?.name || 'Khách hàng'}
                      </td>
                      <td>
                        <div className="email">{c.user?.email || 'N/A'}</div>
                        <div className="phone">{c.user?.phone || 'N/A'}</div>
                      </td>
                      <td className="orders">{c.orders} đơn</td>
                      <td className="spent">{formatCurrency(c.spent)}</td>
                      <td>{formatCurrency((c.spent || 0) / Math.max(1, c.orders || 0))}</td>
                      <td>
                        <span className={`badge ${c.orders >= 5 ? 'vip' : c.orders >= 2 ? 'regular' : 'new'}`}>
                          {c.orders >= 5 ? '👑 VIP' : c.orders >= 3 ? '⭐ Thân thiết' : c.orders >= 2 ? '💎 Trung thành' : '🆕 Mới'}
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
                <p>Để có dữ liệu sản phẩm, cần:</p>
                <ul>
                  <li>Có dữ liệu trong bảng billDetails</li>
                  <li>Có đơn hàng đã hoàn thành</li>
                  <li>Sản phẩm có thông tin hợp lệ</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đã bán</th>
                    <th>Doanh thu (ước tính)</th>
                    <th>Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((item, index) => (
                    <tr key={item.product?._id || index}>
                      <td className="product-name">
                        <span className="rank">#{index + 1}</span>
                        <div>
                          <div>{item.product?.name || 'Sản phẩm'}</div>
                          <small>{item.product?.category || 'N/A'}</small>
                        </div>
                      </td>
                      <td className="sold">{item.sold} chiếc</td>
                      <td className="revenue">{formatCurrency(item.revenue)}</td>
                      <td>
                        {analytics.totalRevenue > 0 ? ((item.revenue / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                      </td>
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
                { label: 'Khách trung thành', value: analytics.topCustomers.filter(c => c.orders > 1).length },
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
              <h4>Báo cáo tổng quan chi tiết</h4>
              <p>Xuất toàn bộ dữ liệu thống kê ra Excel</p>
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
