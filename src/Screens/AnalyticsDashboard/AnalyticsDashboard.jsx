import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './AnalyticsDashboard.scss'; // Import SCSS file

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState({
    bills: [],
    billDetails: [],
    users: [],
    products: []
  });

  // Fetch real data from API
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
        bills: billsRes.data.data || [],
        billDetails: billDetailsRes.data.data || [],
        users: usersRes.data.data || [],
        products: productsRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setRawData({
        bills: [],
        billDetails: [],
        users: [],
        products: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Analytics calculations với real data
  const analytics = useMemo(() => {
    const { bills, billDetails, users, products } = rawData;
    
    if (!bills.length) return {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      avgOrderValue: 0,
      cancellationRate: 0,
      topCustomers: [],
      topProducts: [],
      dailyRevenue: {}
    };
    
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.created_at);
      return billDate >= dateRange.from && billDate <= dateRange.to;
    });

    const validBills = filteredBills.filter(bill => 
      bill.status !== 'cancelled' && 
      bill.status !== 'failed' && 
      bill.status !== 'pending'
    );

    const validBillIds = new Set(validBills.map(b => b._id));
    const validDetails = billDetails.filter(d => validBillIds.has(d.bill_id));

    const totalRevenue = validDetails.reduce((sum, d) => sum + (d.quantity * d.price), 0);
    const totalOrders = validBills.length;
    const totalCustomers = new Set(validBills.map(b => b.user_id)).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const customerStats = validBills.reduce((acc, bill) => {
      const details = validDetails.filter(d => d.bill_id === bill._id);
      const amount = details.reduce((sum, d) => sum + (d.quantity * d.price), 0);
      
      if (!acc[bill.user_id]) {
        acc[bill.user_id] = { orders: 0, spent: 0 };
      }
      acc[bill.user_id].orders += 1;
      acc[bill.user_id].spent += amount;
      return acc;
    }, {});

    const topCustomers = Object.entries(customerStats)
      .map(([userId, stats]) => ({
        user: users.find(u => u._id === userId) || { _id: userId, name: 'Khách hàng', email: 'N/A' },
        ...stats
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const productStats = validDetails.reduce((acc, detail) => {
      if (!acc[detail.product_id]) {
        acc[detail.product_id] = { sold: 0, revenue: 0 };
      }
      acc[detail.product_id].sold += detail.quantity;
      acc[detail.product_id].revenue += detail.quantity * detail.price;
      return acc;
    }, {});

    const topProducts = Object.entries(productStats)
      .map(([productId, stats]) => ({
        product: products.find(p => p._id === productId) || { _id: productId, name: 'Sản phẩm', category: 'N/A' },
        ...stats
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    const cancelledBills = filteredBills.filter(bill => 
      bill.status === 'cancelled' || bill.status === 'failed'
    );
    
    const cancellationRate = filteredBills.length > 0 ? (cancelledBills.length / filteredBills.length) * 100 : 0;

    const dailyRevenue = validBills.reduce((acc, bill) => {
      const date = new Date(bill.created_at).toISOString().split('T')[0];
      const details = validDetails.filter(d => d.bill_id === bill._id);
      const amount = details.reduce((sum, d) => sum + (d.quantity * d.price), 0);
      
      acc[date] = (acc[date] || 0) + amount;
      return acc;
    }, {});

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      cancellationRate,
      topCustomers,
      topProducts,
      dailyRevenue
    };
  }, [rawData, dateRange]);

  // Export to Excel function
  const exportToExcel = async () => {
    if (!analytics.totalOrders) {
      alert('Không có dữ liệu để xuất báo cáo');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo Analytics');

    sheet.getCell('A1').value = 'CakeShop Analytics Report';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.mergeCells('A1:F1');
    
    sheet.getCell('A2').value = `Từ ${dateRange.from.toLocaleDateString('vi-VN')} đến ${dateRange.to.toLocaleDateString('vi-VN')}`;
    sheet.mergeCells('A2:F2');

    sheet.getCell('A4').value = 'TỔNG QUAN';
    sheet.getCell('A4').font = { bold: true };

    const overviewData = [
      ['Tổng doanh thu', analytics.totalRevenue.toLocaleString('vi-VN') + ' ₫'],
      ['Tổng đơn hàng', analytics.totalOrders],
      ['Tổng khách hàng', analytics.totalCustomers],
      ['Giá trị trung bình/đơn', analytics.avgOrderValue.toLocaleString('vi-VN') + ' ₫'],
      ['Tỷ lệ hủy đơn', analytics.cancellationRate.toFixed(1) + '%']
    ];
    
    overviewData.forEach((row, index) => {
      sheet.getCell(`A${5 + index}`).value = row[0];
      sheet.getCell(`B${5 + index}`).value = row[1];
    });

    // Top customers
    sheet.getCell('A12').value = 'TOP KHÁCH HÀNG';
    sheet.getCell('A12').font = { bold: true };
    
    const customerHeaders = ['Tên khách hàng', 'Email', 'Số đơn', 'Tổng chi tiêu'];
    customerHeaders.forEach((header, index) => {
      sheet.getCell(`${String.fromCharCode(65 + index)}13`).value = header;
      sheet.getCell(`${String.fromCharCode(65 + index)}13`).font = { bold: true };
    });
    
    analytics.topCustomers.forEach((customer, index) => {
      sheet.getCell(`A${14 + index}`).value = customer.user.name;
      sheet.getCell(`B${14 + index}`).value = customer.user.email;
      sheet.getCell(`C${14 + index}`).value = customer.orders;
      sheet.getCell(`D${14 + index}`).value = customer.spent.toLocaleString('vi-VN') + ' ₫';
    });

    const buf = await workbook.xlsx.writeBuffer();
    const filename = `CakeShop_Analytics_${dateRange.from.toISOString().slice(0, 10)}_${dateRange.to.toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buf]), filename);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const tabs = [
    { id: 'overview', name: 'Tổng quan', icon: '📊' },
    { id: 'revenue', name: 'Doanh thu', icon: '💰' },
    { id: 'customers', name: 'Khách hàng', icon: '👥' },
    { id: 'products', name: 'Sản phẩm', icon: '🍰' },
    { id: 'trends', name: 'Xu hướng', icon: '📈' }
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
                <h1>Analytics Dashboard</h1>
                <p>Thống kê kinh doanh toàn diện</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        {/* Date Range Filter */}
        <div className="date-filter">
          <div className="filter-content">
            <div className="filter-label">
              <span>📅 Khoảng thời gian:</span>
            </div>
            <div className="date-inputs">
              <DatePicker
                selected={dateRange.from}
                onChange={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Từ ngày"
              />
              <span className="date-separator">→</span>
              <DatePicker
                selected={dateRange.to}
                onChange={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Đến ngày"
              />
            </div>
            <button
              onClick={exportToExcel}
              disabled={!analytics.totalOrders}
              className="export-btn"
            >
              <span>📊</span>
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <div className="tab-list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="content-section fade-in">
            {/* Key Metrics */}
            <div className="metric-cards">
              <div className="metric-card">
                <div className="card-content">
                  <div className="metric-info">
                    <p className="metric-label">Tổng doanh thu</p>
                    <p className="metric-value">{formatCurrency(analytics.totalRevenue)}</p>
                  </div>
                  <div className="metric-icon green">💰</div>
                </div>
                <div className="metric-footer">
                  <span className={`metric-trend ${analytics.totalRevenue > 0 ? 'positive' : 'neutral'}`}>
                    {analytics.totalRevenue > 0 ? '↗ Có dữ liệu' : '📊 Chưa có dữ liệu'}
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-content">
                  <div className="metric-info">
                    <p className="metric-label">Số đơn hàng</p>
                    <p className="metric-value">{analytics.totalOrders}</p>
                  </div>
                  <div className="metric-icon blue">📦</div>
                </div>
                <div className="metric-footer">
                  <span className={`metric-trend ${analytics.totalOrders > 0 ? 'positive' : 'neutral'}`}>
                    {analytics.totalOrders > 0 ? '↗ Đang hoạt động' : '📊 Chưa có đơn hàng'}
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-content">
                  <div className="metric-info">
                    <p className="metric-label">Khách hàng</p>
                    <p className="metric-value">{analytics.totalCustomers}</p>
                  </div>
                  <div className="metric-icon purple">👥</div>
                </div>
                <div className="metric-footer">
                  <span className={`metric-trend ${analytics.totalCustomers > 0 ? 'positive' : 'neutral'}`}>
                    {analytics.totalCustomers > 0 ? '↗ Khách hàng trung thành' : '📊 Chưa có khách hàng'}
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-content">
                  <div className="metric-info">
                    <p className="metric-label">Giá trị trung bình</p>
                    <p className="metric-value">{formatCurrency(analytics.avgOrderValue)}</p>
                  </div>
                  <div className="metric-icon orange">📊</div>
                </div>
                <div className="metric-footer">
                  <span className={`metric-trend ${analytics.avgOrderValue > 0 ? 'positive' : 'neutral'}`}>
                    {analytics.avgOrderValue > 0 ? '↗ Giá trị tốt' : '📊 Chưa có dữ liệu'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="section-grid two-columns">
              <div className="section-card">
                <h3 className="card-header">📈 Thống kê nhanh</h3>
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">Tỷ lệ hủy đơn</span>
                    <span className={`stat-value ${analytics.cancellationRate > 10 ? 'red' : 'green'}`}>
                      {analytics.cancellationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Đơn hàng thành công</span>
                    <span className="stat-value green">{analytics.totalOrders}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sản phẩm bán chạy</span>
                    <span className="stat-value purple">{analytics.topProducts.length} loại</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h3 className="card-header">💡 Insights</h3>
                <div className="card-body">
                  {analytics.totalRevenue === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <p className="empty-description">Chưa có dữ liệu trong khoảng thời gian này. Thử chọn khoảng thời gian khác</p>
                    </div>
                  ) : (
                    <>
                      <div className="stat-item">
                        <span className="stat-label green">✅ Có {analytics.totalOrders} đơn hàng thành công</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label blue">💡 {analytics.totalCustomers} khách hàng đã mua hàng</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label purple">🎯 Giá trị trung bình: {formatCurrency(analytics.avgOrderValue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
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
                      .slice(0, 7)
                      .map(([date, revenue]) => (
                        <div key={date} className="revenue-item">
                          <span className="date-label">
                            {new Date(date).toLocaleDateString('vi-VN')}
                          </span>
                          <div className="revenue-details">
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ 
                                width: `${Math.max((revenue / Math.max(...Object.values(analytics.dailyRevenue))) * 100, 5)}%` 
                              }}></div>
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
                      <div className="metric-value blue">{((analytics.totalRevenue / 1000000) || 0).toFixed(1)}M</div>
                      <p className="metric-label">Tổng doanh thu (triệu ₫)</p>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="metric-info">
                      <div className="metric-value purple">{analytics.avgOrderValue > 0 ? ((analytics.avgOrderValue / 1000) || 0).toFixed(0) + 'K' : '0'}</div>
                      <p className="metric-label">Giá trị TB/đơn (nghìn ₫)</p>
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
                    <span className="stat-label">Đơn hàng/ngày</span>
                    <span className="stat-value blue">
                      {analytics.totalOrders > 0 ? 
                        (analytics.totalOrders / Math.max(1, Object.keys(analytics.dailyRevenue).length)).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Khách hàng trung thành</span>
                    <span className="stat-value purple">{analytics.topCustomers.filter(c => c.orders > 1).length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
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
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topCustomers.map((customer, index) => (
                        <tr key={customer.user?._id || index}>
                          <td>
                            <div className="user-info">
                              <div className="user-avatar">
                                {customer.user?.name?.charAt(0) || 'K'}
                              </div>
                              <div className="user-details">
                                <div className="user-name">{customer.user?.name || 'Khách hàng'}</div>
                                <div className="user-email">{customer.user?.email || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{customer.orders} đơn</td>
                          <td className="stat-value green">{formatCurrency(customer.spent)}</td>
                          <td>{formatCurrency(customer.spent / customer.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="content-section fade-in">
            {analytics.topProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🍰</div>
                <h3 className="empty-title">Chưa có dữ liệu sản phẩm</h3>
                <p className="empty-description">Thử chọn khoảng thời gian khác hoặc kiểm tra dữ liệu</p>
              </div>
            ) : (
              <div className="section-card data-table">
                <h3 className="card-header">🍰 Sản phẩm bán chạy</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Đã bán</th>
                        <th>Doanh thu</th>
                        <th>Tỷ trọng</th>
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
                                <div className="progress-fill" style={{ 
                                  width: `${analytics.totalRevenue > 0 ? (item.revenue / analytics.totalRevenue) * 100 : 0}%` 
                                }}></div>
                              </div>
                              <span className="progress-label">
                                {analytics.totalRevenue > 0 ? ((item.revenue / analytics.totalRevenue) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
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

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="content-section trends-section fade-in">
            <div className="section-card">
              <h3 className="card-header">📈 Phân tích xu hướng</h3>
              <div className="section-grid two-columns">
                <div>
                  <h4>Thống kê tổng quan</h4>
                  <div className="growth-metrics">
                    <div className="growth-item positive">
                      <div className="metric-info">
                        <div className="metric-name positive">Tổng sản phẩm đã bán</div>
                        <div className="metric-description positive">Tổng số sản phẩm đã bán thành công</div>
                      </div>
                      <div className="metric-change">
                        <div className="change-value positive">
                          {analytics.topProducts.reduce((sum, p) => sum + p.sold, 0)} chiếc
                        </div>
                      </div>
                    </div>
                    
                    <div className="growth-item neutral">
                      <div className="metric-info">
                        <div className="metric-name neutral">Doanh thu TB/khách</div>
                        <div className="metric-description neutral">Doanh thu trung bình mỗi khách hàng</div>
                      </div>
                      <div className="metric-change">
                        <div className="change-value neutral">
                          {analytics.totalCustomers > 0 ? 
                            formatCurrency(analytics.totalRevenue / analytics.totalCustomers) : 
                            formatCurrency(0)}
                        </div>
                      </div>
                    </div>

                    <div className="growth-item positive">
                      <div className="metric-info">
                        <div className="metric-name positive">Sản phẩm bán chạy</div>
                        <div className="metric-description positive">Sản phẩm có doanh số cao nhất</div>
                      </div>
                      <div className="metric-change">
                        <div className="change-value positive">
                          {analytics.topProducts[0]?.product?.name || 'Chưa có dữ liệu'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4>Insights & Đề xuất</h4>
                  <div className="insights-panel">
                    {analytics.totalRevenue === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <p className="empty-description">Chưa có dữ liệu để phân tích</p>
                      </div>
                    ) : (
                      <>
                        <div className="insight-item tip">
                          <div className="insight-header tip">💡 Gợi ý:</div>
                          <div className="insight-content tip">
                            {analytics.topProducts.length > 0 ? 
                              `Sản phẩm "${analytics.topProducts[0]?.product?.name}" đang bán chạy nhất với ${analytics.topProducts[0]?.sold} chiếc đã bán.` :
                              'Cần thêm dữ liệu để phân tích sản phẩm bán chạy.'}
                          </div>
                        </div>
                        
                        <div className="insight-item analysis">
                          <div className="insight-header analysis">📊 Thống kê:</div>
                          <div className="insight-content analysis">
                            Giá trị trung bình mỗi đơn hàng là {formatCurrency(analytics.avgOrderValue)}.
                            {analytics.avgOrderValue < 100000 ? ' Có thể tăng giá trị đơn hàng bằng cách combo sản phẩm.' : ' Đây là mức giá trị tốt!'}
                          </div>
                        </div>
                        
                        <div className="insight-item opportunity">
                          <div className="insight-header opportunity">🎯 Cơ hội:</div>
                          <div className="insight-content opportunity">
                            {analytics.topCustomers.filter(c => c.orders === 1).length} khách hàng mới cần được chăm sóc để trở thành khách hàng trung thành.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Revenue Chart */}
            {Object.keys(analytics.dailyRevenue).length > 0 && (
              <div className="section-card">
                <h3 className="card-header">📊 Biểu đồ doanh thu theo ngày</h3>
                <div className="card-body">
                  <div className="daily-revenue-chart">
                    {Object.entries(analytics.dailyRevenue)
                      .sort(([a], [b]) => new Date(a) - new Date(b))
                      .map(([date, revenue]) => {
                        const maxRevenue = Math.max(...Object.values(analytics.dailyRevenue));
                        const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                        
                        return (
                          <div key={date} className="chart-item">
                            <div className="chart-date">
                              {new Date(date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="chart-bar-container">
                              <div 
                                className="chart-bar"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              >
                                <span className="bar-label">
                                  {(revenue / 1000).toFixed(0)}K
                                </span>
                              </div>
                            </div>
                            <div className="chart-value">
                              {formatCurrency(revenue)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;