// src/Screens/Home/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Home.scss';
import TabBar from '../../component/tabbar/TabBar';
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';
import api from '../../utils/api';

// Recharts
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

// Toast
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ===== Palette gọn, nhất quán
const BRAND_BLUE   = '#3b82f6';
const ACCENT_EMERALD = '#10b981';
const ACCENT_RED   = '#ef4444';
const SLATE_500    = '#64748b';
const SLATE_300    = '#cbd5e1';

// Bật/tắt cụm thẻ tóm tắt đầu trang (nếu thấy rối mắt thì để false)
const SHOW_SUMMARY_CARDS = false;

// Màu theo trạng thái (giữ key tiếng Anh để map từ API)
const STATUS_COLORS = {
  done: '#22c55e',
  cancelled: '#ef4444',
  failed: '#f97316',
  pending: '#60a5fa',
  confirmed: '#818cf8',
  ready: '#f59e0b',
  shipping: '#34d399',
  other: '#94a3b8',
};

// Nhãn tiếng Việt cho trạng thái
const STATUS_LABELS = {
  done: 'Hoàn tất',
  cancelled: 'Đã hủy',
  failed: 'Lỗi',
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  ready: 'Sẵn sàng',
  shipping: 'Đang giao',
  other: 'Khác',
};

// Nếu DB chưa có reorder_point thì dùng ngưỡng mặc định
const DEFAULT_REORDER = 20;

const Home = () => {
  const [lockedUsers, setLockedUsers] = useState([]);

  const [revData, setRevData] = useState([]);
  const [statusData, setStatusData] = useState([]);


  // Khối “Hợp đồng NCC sắp hết hạn”
  const [expiringData, setExpiringData] = useState([]); // cho biểu đồ
  const [expiringList, setExpiringList] = useState([]); // cho bảng


  // tránh spam toast
  const lastPendingCountRef = useRef(0);
  const lowStockAlertedRef = useRef(new Set());
  const voucherAlertedRef = useRef(new Set());

  // USERS bị khóa
  useEffect(() => {
    api.get('/users')
      .then(res => {
        const all = res?.data?.data || [];
        setLockedUsers(all.filter(u => u?.is_lock));
      })
      .catch(console.error);
  }, []);

  // KPI: bills + suppliers
  useEffect(() => {
    Promise.all([api.get('/bills'), api.get('/suppliers')])
      .then(([bRes, suppRes]) => {
        const bills = bRes?.data?.data || [];
        const suppliers = suppRes?.data?.data || [];

        // a) Doanh thu 7 ngày gần nhất — chỉ đơn DONE, dùng bill.total
        const today = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = subDays(today, 6 - i);
          return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'dd/MM') };
        });
        const revenueMap = Object.fromEntries(days.map(d => [d.key, 0]));

        bills.forEach(b => {
          const created = new Date(b.created_at || b.createdAt);
          const key = isNaN(created) ? null : format(created, 'yyyy-MM-dd');
          if (key && revenueMap[key] !== undefined && String(b.status).toLowerCase() === 'done') {
            const total = Number(b.total) || 0;
            revenueMap[key] += total > 0 ? total : 0;
          }
        });

        setRevData(days.map(d => ({ day: d.label, revenue: revenueMap[d.key] })));

        // b) Tỷ lệ trạng thái (giới hạn trong 7 ngày)
        const statusCount = {
          done: 0, cancelled: 0, failed: 0, pending: 0, confirmed: 0, ready: 0, shipping: 0, other: 0,
        };
        bills.forEach(b => {
          const created = new Date(b.created_at || b.createdAt);
          const in7days = !isNaN(created) && (format(created, 'yyyy-MM-dd') in revenueMap);
          if (!in7days) return;
          const st = String(b.status || '').toLowerCase();
          if (st in statusCount) statusCount[st] += 1;
          else statusCount.other += 1;
        });

        const statusSeries = Object.entries(statusCount)
          .filter(([, v]) => v > 0)
          .map(([key, value]) => ({
            key,
            label: STATUS_LABELS[key] || STATUS_LABELS.other,
            value,
            color: STATUS_COLORS[key] || STATUS_COLORS.other,
          }));
        setStatusData(statusSeries);

        // c) Hợp đồng sắp hết hạn (≤30 ngày) dựa trên contract_end_date
        const nowTs = Date.now();
        const ONE_DAY = 24 * 3600 * 1000;

        const list = (suppliers || [])
          .map(s => {
            const end = s.contract_end_date ? new Date(s.contract_end_date) : null;
            const endTs = end && !isNaN(end) ? end.getTime() : null;
            const remainDays = endTs ? Math.ceil((endTs - nowTs) / ONE_DAY) : null;

            let statusLabel = 'Chưa có';
            if (remainDays === null) statusLabel = 'Chưa có';
            else if (remainDays < 0) statusLabel = 'Đã hết hạn';
            else if (remainDays <= 30) statusLabel = 'Sắp hết hạn';
            else statusLabel = 'Còn hiệu lực';

            return {
              _id: s._id || s.id,
              name: s.name || 'Không tên',
              endDate: end,
              remainDays,
              statusLabel,
              rating: Number(s.rating) || 0,
            };
          })
          .filter(it => it.remainDays !== null) // chỉ những NCC có ngày kết thúc
          .sort((a, b) => (a.remainDays ?? 9e9) - (b.remainDays ?? 9e9));

        const top = list.slice(0, 8);
        setExpiringList(top);

        // data cho BarChart: tên rút gọn + số ngày còn lại (âm => 0 để vẽ)
        setExpiringData(
          top.map(it => ({
            name: it.name.length > 14 ? it.name.slice(0, 14) + '…' : it.name,
            daysLeft: Math.max(0, it.remainDays ?? 0),
          }))
        );
      })
      .catch(console.error);
  }, []);

  // Polling gọn + khử trùng lặp toast
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // 1) Đơn pending mới
        const oRes = await api.get('/bills?status=pending');
        const pendingNum = (oRes?.data?.data || []).length;
        if (pendingNum > 0 && pendingNum !== lastPendingCountRef.current) {
          lastPendingCountRef.current = pendingNum;
          toast.info(`Có ${pendingNum} hóa đơn mới chờ xử lý`);
        }

        // 2) Tồn kho thấp: cảnh báo 1 lần/phiên/ID
        const iRes = await api.get('/suppliers');
        (iRes?.data?.data || [])
          .filter(i => {
            const stock = Number(i.stock_quantity) || 0;
            const reorder = Number(i.reorder_point) >= 0 ? Number(i.reorder_point) : DEFAULT_REORDER;
            return stock < reorder;
          })
          .forEach(i => {
            const id = i._id || i.id || i.name;
            if (!lowStockAlertedRef.current.has(id)) {
              lowStockAlertedRef.current.add(id);
              toast.warn(`Cần đặt lại hàng: ${i.name || 'Nhà phân phối'}`);
            }
          });

        // 3) Voucher sắp hết hạn: báo 1 lần/phiên
        const vRes = await api.get('/vouchers');
        const now = new Date();
        (vRes?.data?.data || []).forEach(v => {
          const end = new Date(v.end_date || v.endDate);
          const code = v.code || v.name;
          const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
          if (diffDays > 0 && diffDays <= 3 && !voucherAlertedRef.current.has(code)) {
            voucherAlertedRef.current.add(code);
            toast.warning(`Voucher ${code} hết hạn sau ${diffDays} ngày`);
          }
        });
      } catch (err) {
        console.error(err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Tooltip dùng chung cho biểu đồ
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">{`Giá trị: ${payload[0].value.toLocaleString('vi-VN')} đ`}</p>
      </div>
    );
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <TabBar />
      </div>

      <div className="home-body">
        <div className="home-left"><Sidebar /></div>

        <div className="home-right">
          {SHOW_SUMMARY_CARDS && <DashboardCards lockedUsers={lockedUsers} />}

          {/* KPI */}
          <div className="kpi-charts">
            {/* Doanh thu 7 ngày */}
            <div className="chart-box revenue-chart">
              <div className="chart-header">
                <h3>Doanh thu 7 ngày gần nhất</h3>
                <div className="chart-subtitle">Chỉ tính đơn hoàn tất (DONE)</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={SLATE_300} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: SLATE_500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: SLATE_500 }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="custom-tooltip">
                          <p className="tooltip-label">{`Ngày: ${label}`}</p>
                          <p className="tooltip-value">{`Doanh thu: ${payload[0].value.toLocaleString('vi-VN')} đ`}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={BRAND_BLUE}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: BRAND_BLUE, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: BRAND_BLUE, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trạng thái hóa đơn (Việt hoá legend/label) */}
            <div className="chart-box status-chart">
              <div className="chart-header">
                <h3>Tỷ lệ trạng thái hóa đơn</h3>
                <div className="chart-subtitle">Trong 7 ngày gần nhất</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={1}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((s, idx) => (
                      <Cell key={idx} fill={s.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: SLATE_500 }} />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Hợp đồng NCC sắp hết hạn */}
            <div className="chart-box supplier-chart">
              <div className="chart-header">
                <h3>Hợp đồng nhà phân phối sắp hết hạn</h3>
                <div className="chart-subtitle">
                  Hiển thị top 8 NCC có ngày kết thúc hợp đồng gần nhất
                </div>
              </div>

              {/* Có ≥3 NCC thì hiển thị biểu đồ “Ngày còn lại” */}
              {expiringData.length >= 3 && (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={expiringData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={SLATE_300} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: SLATE_500 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: SLATE_500 }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="custom-tooltip">
                            <p className="tooltip-label">{label}</p>
                            <p className="tooltip-value">{`Còn lại: ${payload[0].value} ngày`}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="daysLeft" fill={ACCENT_EMERALD} radius={[6, 6, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Bảng tóm tắt */}
              <div style={{ overflowX: 'auto', marginTop: expiringData.length >= 3 ? 12 : 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ textAlign: 'left',  padding: '10px 12px' }}>Nhà phân phối</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px' }}>Ngày KT HĐ</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Còn lại (ngày)</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px' }}>Trạng thái</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px' }}>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringList.map((it, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px' }}>{it.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {it.endDate ? it.endDate.toLocaleDateString('vi-VN') : 'Chưa có'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {it.remainDays ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center',
                          color: it.statusLabel === 'Đã hết hạn' ? '#ef4444'
                                : it.statusLabel === 'Sắp hết hạn' ? '#f59e0b'
                                : '#16a34a' }}>
                          {it.statusLabel}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {'★'.repeat(it.rating)}{'☆'.repeat(5 - it.rating)}
                        </td>
                      </tr>
                    ))}
                    {!expiringList.length && (
                      <tr>
                        <td colSpan={5} style={{ padding: '12px', color: '#64748b' }}>
                          Chưa có dữ liệu hợp đồng hoặc tất cả còn dài hạn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Home;
