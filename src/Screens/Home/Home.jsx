// src/Screens/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.scss';
import TabBar from '../../component/tabbar/TabBar';
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';
import api from '../../utils/api';

// Recharts
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

// Toast notifications
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

const Home = () => {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [revData, setRevData]       = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);

  // Load locked users
  useEffect(() => {
    api.get('/users')
      .then(res => {
        const all = res.data.data || [];
        setLockedUsers(all.filter(u => u.is_lock));
      })
      .catch(console.error);
  }, []);

  // Load KPI charts: bills, billdetails, suppliers -
  useEffect(() => {
    Promise.all([
      api.get('/bills'),
      api.get('/billdetails'),
      api.get('/suppliers')
    ])
      .then(([bRes, bdRes, suppRes]) => {
        const bills       = bRes.data.data || [];
        const billDetails = bdRes.data.data || [];
        const suppliers   = suppRes.data.data || [];

        // a) Doanh thu 7 ngày gần nhất
        const today = new Date();
        const days  = Array.from({ length: 7 }).map((_, i) => {
          const dt = subDays(today, 6 - i);
          return format(dt, 'dd/MM');
        });
        const revenueMap = days.reduce((acc, day) => {
          acc[day] = 0;
          return acc;
        }, {});
        bills.forEach(b => {
          const d = format(new Date(b.createdAt || b.created_at), 'dd/MM');
          if (revenueMap[d] !== undefined) {
            billDetails
              .filter(dt => dt.bill_id._id === b._id)
              .forEach(dt => {
                revenueMap[d] += dt.price * dt.quantity;
              });
          }
        });
        setRevData(days.map(day => ({ day, revenue: revenueMap[day] })));

        // b) Tỷ lệ trạng thái hóa đơn
        const statusCount = {};
        bills.forEach(b => {
          const status = b.status || 'Chưa xác định';
          statusCount[status] = (statusCount[status] || 0) + 1;
        });
        setStatusData(
          Object.entries(statusCount).map(([name, value]) => ({ name, value }))
        );

        // c) Top 8 nhà cung cấp theo tổng giá trị đơn hàng
        const supplierStats = {};
        
        suppliers.forEach(supplier => {
          const totalValue = supplier.stock_quantity * (supplier.unit_price || 10000);
          const rating = Math.floor(Math.random() * 5) + 1; // Mock rating
          supplierStats[supplier.name || supplier.supplier_name || 'Không tên'] = {
            name: supplier.name || supplier.supplier_name || 'Không tên',
            shortName: (supplier.name || supplier.supplier_name || 'Không tên').length > 12 
              ? (supplier.name || supplier.supplier_name || 'Không tên').substring(0, 12) + '...' 
              : (supplier.name || supplier.supplier_name || 'Không tên'),
            value: totalValue,
            stock: supplier.stock_quantity || 0,
            rating: rating,
            category: supplier.category || 'Khác'
          };
        });

        const topSuppliers = Object.values(supplierStats)
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        setSupplierData(topSuppliers);
      })
      .catch(console.error);
  }, []);

  // Polling & toast alerts mỗi 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const oRes = await api.get('/bills?status=pending');
        if (oRes.data.data.length) {
          toast.info(`Có ${oRes.data.data.length} hóa đơn mới chờ xử lý`);
        }

        const iRes = await api.get('/suppliers');
        iRes.data.data
          .filter(i => i.stock_quantity < 10)
          .forEach(i => {
            toast.warn(`Tồn kho thấp: ${i.name} dưới 10`);
          });

        const vRes = await api.get('/vouchers');
        const now  = new Date();
        vRes.data.data
          .filter(v => {
            const end  = new Date(v.end_date || v.endDate);
            const diff = (end - now) / (1000 * 60 * 60 * 24);
            return diff > 0 && diff < 3;
          })
          .forEach(v => {
            const daysLeft = Math.ceil((new Date(v.end_date) - now) / (1000 * 60 * 60 * 24));
            toast.warning(`Voucher ${v.code} hết hạn sau ${daysLeft} ngày`);
          });
      } catch (err) {
        console.error(err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p className="tooltip-value">
            {`Giá trị: ${payload[0].value.toLocaleString('vi-VN')} đ`}
          </p>
          {payload[0].payload.rating && (
            <p className="tooltip-rating">
              {`Đánh giá: ${'★'.repeat(payload[0].payload.rating)}${'☆'.repeat(5-payload[0].payload.rating)}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <TabBar />
      </div>
      <div className="home-body">
        <div className="home-left">
          <Sidebar />
        </div>
        <div className="home-right">
          <DashboardCards 
            lockedUsers={lockedUsers}
          />

          {/* KPI Charts - Always Visible */}
          <div className="kpi-charts">
            <div className="chart-box revenue-chart">
              <div className="chart-header">
                <h3>📈 Doanh thu 7 ngày gần nhất</h3>
                <div className="chart-subtitle">Theo dõi xu hướng doanh thu hàng ngày</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="custom-tooltip">
                            <p className="tooltip-label">{`Ngày: ${label}`}</p>
                            <p className="tooltip-value">
                              {`Doanh thu: ${payload[0].value.toLocaleString('vi-VN')} đ`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#667eea" 
                    strokeWidth={4}
                    dot={{ fill: '#667eea', strokeWidth: 3, r: 6 }}
                    activeDot={{ r: 8, fill: '#ffffff', stroke: '#667eea', strokeWidth: 3 }}
                    fill="url(#revenueGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box status-chart">
              <div className="chart-header">
                <h3>📊 Tỷ lệ trạng thái hóa đơn</h3>
                <div className="chart-subtitle">Phân tích tình trạng đơn hàng</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {COLORS.map((color, index) => (
                      <linearGradient key={index} id={`statusGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={35}
                    paddingAngle={2}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, idx) => (
                      <Cell 
                        key={idx} 
                        fill={`url(#statusGradient${idx % COLORS.length})`}
                      />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    wrapperStyle={{
                      fontSize: '12px',
                      color: '#64748b'
                    }}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box supplier-chart">
              <div className="chart-header">
                <h3>🏆 Top nhà cung cấp theo giá trị</h3>
                <div className="chart-subtitle">Đánh giá hiệu suất đối tác chiến lược</div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={supplierData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <defs>
                    <linearGradient id="supplierGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4facfe" />
                      <stop offset="50%" stopColor="#00f2fe" />
                      <stop offset="100%" stopColor="#667eea" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                  <XAxis 
                    dataKey="shortName" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#supplierGradient)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer 
        position="top-right" 
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Home;