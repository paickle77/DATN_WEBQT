import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Home.scss';
import TabBar from '../../component/tabbar/TabBar';
import Sidebar from '../../component/Sidebar/Sidebar';
import DashboardCards from '../../component/DashboardCards/DashboardCards';
import api from '../../utils/api';

// Recharts
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import { format, subDays, isAfter, startOfDay } from 'date-fns';

// Toast
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ─────────────────────────── Helpers ─────────────────────────── */
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const fmtVND = (n) => VND.format(Math.max(0, Number(n) || 0));
const dayKey = (d) => format(d, 'dd/MM');

// Chuẩn hoá trạng thái giống backend Analytics
const norm = (s) => (typeof s === 'string' ? s.toLowerCase() : '');
const STATUS = {
  DONE: 'done',
  CANCELLED: ['cancelled', 'failed'],
  IN_PROGRESS: ['pending', 'confirmed', 'ready', 'shipping'],
};

const STATUS_COLORS = {
  done: '#16a34a',
  cancelled: '#ef4444',
  in_progress: '#3b82f6',
  other: '#a78bfa',
};

const Home = () => {
  const [lockedUsers, setLockedUsers] = useState([]);
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // toast dedupe
  const lastPendingCount = useRef(0);
  const lastLowStock = useRef('');      // join ids
  const lastExpiring = useRef('');      // join codes

  /* ───────────── Fetch ───────────── */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [usersRes, billsRes, suppRes] = await Promise.all([
          api.get('/users'),
          api.get('/bills'),
          api.get('/suppliers'),
        ]);

        if (!alive) return;
        const allUsers = usersRes?.data?.data ?? [];
        setLockedUsers(allUsers.filter((u) => u?.is_lock));

        setBills(billsRes?.data?.data ?? []);
        setSuppliers(suppRes?.data?.data ?? []);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ───────────── Derived data (memo) ───────────── */

  // a) Revenue – chỉ đơn DONE trong 7 ngày gần nhất, ưu tiên bill.total
  const revenue7 = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }).map((_, i) => dayKey(subDays(today, 6 - i)));
    const map = Object.fromEntries(days.map((k) => [k, 0]));

    bills.forEach((b) => {
      const st = norm(b?.status);
      if (st !== STATUS.DONE) return;
      const created = new Date(b?.created_at || b?.createdAt);
      if (!isAfter(startOfDay(created), subDays(today, 8))) {
        const k = dayKey(created);
        if (map[k] !== undefined) {
          const total = Number(b?.total) || 0;
          map[k] += total > 0 ? total : 0;
        }
      }
    });

    return days.map((k) => ({ day: k, revenue: map[k] }));
  }, [bills]);

  // b) Status distribution – gom nhóm
  const statusPie = useMemo(() => {
    const acc = { done: 0, cancelled: 0, in_progress: 0, other: 0 };

    bills.forEach((b) => {
      const s = norm(b?.status);
      if (s === 'done') acc.done += 1;
      else if (STATUS.CANCELLED.includes(s)) acc.cancelled += 1;
      else if (STATUS.IN_PROGRESS.includes(s)) acc.in_progress += 1;
      else acc.other += 1;
    });

    return [
      { name: 'Hoàn thành', key: 'done', value: acc.done, color: STATUS_COLORS.done },
      { name: 'Đã hủy / thất bại', key: 'cancelled', value: acc.cancelled, color: STATUS_COLORS.cancelled },
      { name: 'Đang xử lý', key: 'in_progress', value: acc.in_progress, color: STATUS_COLORS.in_progress },
      { name: 'Khác', key: 'other', value: acc.other, color: STATUS_COLORS.other },
    ].filter((d) => d.value > 0);
  }, [bills]);

  // c) Top suppliers theo giá trị tồn kho ước tính
  const topSuppliers = useMemo(() => {
    const rows = (suppliers || []).map((s) => {
      const name = s?.name || s?.supplier_name || 'Không tên';
      const price = Number(s?.unit_price ?? s?.import_price ?? 0);
      const qty = Number(s?.stock_quantity ?? 0);
      const value = Math.max(0, price * qty);
      const shortName = name.length > 16 ? name.slice(0, 16) + '…' : name;
      return { id: String(s?._id ?? name), name, shortName, value, qty };
    });

    return rows.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [suppliers]);

  /* ───────────── Polling + Toast (chống trùng) ───────────── */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [pendingRes, suppRes, voucherRes] = await Promise.all([
          api.get('/bills?status=pending'),
          api.get('/suppliers'),
          api.get('/vouchers'),
        ]);

        // pending orders
        const pendingCount = pendingRes?.data?.data?.length || 0;
        if (pendingCount > 0 && pendingCount !== lastPendingCount.current) {
          toast.info(`Có ${pendingCount} hóa đơn mới chờ xử lý`);
          lastPendingCount.current = pendingCount;
        }

        // low stock (gộp)
        const low = (suppRes?.data?.data || []).filter((i) => Number(i?.stock_quantity ?? 0) < 10);
        const lowIds = low.map((i) => String(i?._id)).sort().join(',');
        if (low.length && lowIds !== lastLowStock.current) {
          const preview = low.slice(0, 3).map((i) => i?.name || 'Không tên').join(', ');
          toast.warn(`Tồn kho thấp (${low.length}): ${preview}${low.length > 3 ? '…' : ''}`);
          lastLowStock.current = lowIds;
        }

        // vouchers nearly expires (<=3 ngày)
        const now = new Date();
        const expiring = (voucherRes?.data?.data || []).filter((v) => {
          const end = new Date(v?.end_date || v?.endDate);
          const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
          return diffDays > 0 && diffDays <= 3;
        });
        const codes = expiring.map((v) => v?.code).sort().join(',');
        if (expiring.length && codes !== lastExpiring.current) {
          const list = expiring.slice(0, 3).map((v) => v.code).join(', ');
          toast.warning(`Voucher sắp hết hạn: ${list}${expiring.length > 3 ? '…' : ''}`);
          lastExpiring.current = codes;
        }
      } catch (e) {
        console.error(e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /* ───────────── UI ───────────── */

  const CurrencyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value || 0;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Ngày: ${label}`}</p>
          <p className="tooltip-value">{`Doanh thu: ${fmtVND(val)}`}</p>
        </div>
      );
    }
    return null;
  };

  const SupplierTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{p?.name}</p>
          <p className="tooltip-value">{`Giá trị ước tính: ${fmtVND(p?.value)}`}</p>
          <p className="tooltip-sub">{`Tồn kho: ${p?.qty ?? 0}`}</p>
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
          <DashboardCards lockedUsers={lockedUsers} />

          {/* KPI Charts */}
          <div className="kpi-charts">
            {/* Revenue 7 days */}
            <div className="chart-box revenue-chart">
              <div className="chart-header">
                <h3>📈 Doanh thu 7 ngày gần nhất</h3>
                <div className="chart-subtitle">Chỉ tính các đơn hoàn thành (done)</div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenue7}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1_000)}K`)}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    fill="url(#revenueGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>

              {!revenue7.some((r) => r.revenue > 0) && (
                <div className="empty-overlay">Chưa có doanh thu trong 7 ngày gần nhất</div>
              )}
            </div>

            {/* Status distribution */}
            <div className="chart-box status-chart">
              <div className="chart-header">
                <h3>📊 Tỷ lệ trạng thái hóa đơn</h3>
                <div className="chart-subtitle">Gom nhóm theo quy ước: done / cancelled+failed / in-progress / other</div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={86}
                    innerRadius={38}
                    paddingAngle={2}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {statusPie.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip formatter={(v) => `${v} đơn`} />
                </PieChart>
              </ResponsiveContainer>

              {statusPie.length === 0 && <div className="empty-overlay">Chưa có dữ liệu trạng thái</div>}
            </div>

            {/* Top suppliers */}
            <div className="chart-box supplier-chart">
              <div className="chart-header">
                <h3>🏆 Top nhà cung cấp theo giá trị tồn</h3>
                <div className="chart-subtitle">Giá trị = số lượng tồn × đơn giá nhập/đơn vị</div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topSuppliers} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                  <defs>
                    <linearGradient id="supplierGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }}
                         tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1_000)}K`)} />
                  <Tooltip content={<SupplierTooltip />} />
                  <Bar dataKey="value" fill="url(#supplierGradient)" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>

              {topSuppliers.length === 0 && <div className="empty-overlay">Chưa có dữ liệu nhà cung cấp</div>}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={5000} closeOnClick pauseOnHover theme="light" />
    </div>
  );
};

export default Home;
