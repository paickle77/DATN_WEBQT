// src/Screens/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.scss';
import TabBar from '../../component/tabbar/TabBar';
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';
import api from '../../utils/api';

// Recharts
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

// Toast notifications
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Home = () => {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [revData, setRevData]       = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [stockData, setStockData]   = useState([]);

  // Load locked users + KPI datasets
  useEffect(() => {
    // 1. Khóa người dùng
    api.get('/users')
      .then(res => {
        const all = res.data.data || [];
        setLockedUsers(all.filter(u => u.is_lock));
      })
      .catch(console.error);

    // 2. KPI charts: orders, details, ingredients
    Promise.all([
      api.get('/orders'),
      api.get('/orderDetails'),
      api.get('/ingredients')
    ])
      .then(([oRes, dRes, ingRes]) => {
        const orders  = oRes.data.data || [];
        const details = dRes.data.data || [];
        const ing     = ingRes.data.data || [];

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
        orders.forEach(o => {
          const d = format(new Date(o.created_at), 'dd/MM');
          if (revenueMap[d] !== undefined) {
            details
              .filter(dt => dt.order_id === o._id)
              .forEach(dt => { revenueMap[d] += dt.price * dt.quantity; });
          }
        });
        setRevData(days.map(day => ({ day, revenue: revenueMap[day] })));

        // b) Tỷ lệ trạng thái đơn
        const statusCount = {};
        orders.forEach(o => {
          statusCount[o.status] = (statusCount[o.status] || 0) + 1;
        });
        setStatusData(
          Object.entries(statusCount).map(([name, value]) => ({ name, value }))
        );

        // c) Tồn kho nguyên liệu
        setStockData(
          ing.map(item => ({
            name: item.name,
            stock: item.stock_quantity
          }))
        );
      })
      .catch(console.error);
  }, []);

  // Polling & toast alerts mỗi 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Đơn mới
        const oRes = await api.get('/orders?status=pending');
        if (oRes.data.data.length) {
          toast.info(`Có ${oRes.data.data.length} đơn mới chờ xử lý`);
        }

        // Stock thấp
        const iRes = await api.get('/ingredients');
        iRes.data.data
          .filter(i => i.stock_quantity < 10)
          .forEach(i => {
            toast.warn(`Tồn kho thấp: ${i.name} dưới 10`);
          });

        // Voucher sắp hết hạn
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
          {/* DashboardCards vẫn giữ nguyên */}
          <DashboardCards lockedUsers={lockedUsers} />

          {/* KPI Charts */}
          <div className="kpi-charts">
            <div className="chart-box">
              <h3>Doanh thu 7 ngày gần nhất</h3>
              <LineChart width={500} height={250} data={revData}>
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={val => val.toLocaleString('vi-VN') + ' đ'} />
              </LineChart>
            </div>

            <div className="chart-box">
              <h3>Tỷ lệ trạng thái đơn</h3>
              <PieChart width={400} height={250}>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusData.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </div>

            <div className="chart-box">
              <h3>Tồn kho nguyên liệu</h3>
              <BarChart width={500} height={250} data={stockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" fill="#82ca9d" />
              </BarChart>
            </div>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default Home;
