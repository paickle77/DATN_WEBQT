// src/Screens/VoucherManagement/VoucherManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './VoucherManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../../utils/api';

// ---------- Helpers ----------
const parseDate = (d) => (d ? new Date(d) : null);
const toISO = (d) => (d ? new Date(d).toISOString() : null);
const fmtVN = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '-');

const now = () => new Date();
const isVoucherValid = (v) => {
  if (!v?.start_date || !v?.end_date) return false;
  const n = now();
  return n >= new Date(v.start_date) && n <= new Date(v.end_date);
};
const isVoucherUpcoming = (v) => v?.start_date && new Date(v.start_date) > now();
const isVoucherExpired = (v) => v?.end_date && new Date(v.end_date) < now();

const emptyVoucher = {
  code: '',
  description: '',
  discount_percent: 0,
  start_date: null,
  end_date: null,
  quantity: 0, // 0 = unlimited
  max_usage_per_user: 1, // 0 = unlimited
  status: 'active',
};

const PAGE_SIZES = [10, 20, 50, 100];

// Simple debounce hook (no extra deps)
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ---------- Component ----------
export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);

  // search & filters
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [validityFilter, setValidityFilter] = useState('all'); // all | valid | expired | upcoming | no-window
  const [discountMin, setDiscountMin] = useState('');
  const [discountMax, setDiscountMax] = useState('');
  const [startFrom, setStartFrom] = useState(null);
  const [startTo, setStartTo] = useState(null);
  const [endFrom, setEndFrom] = useState(null);
  const [endTo, setEndTo] = useState(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false); // quantity==0 or quantity-used_count > 0

  // sort
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc'); // asc | desc

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  // form modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyVoucher);

  const debouncedQ = useDebounced(q);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vouchers');
      setVouchers(res.data?.data || []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.msg || e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- CRUD ----------
  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyVoucher);
    setShowForm(true);
  };

  const handleEdit = (v) => {
    setEditingId(v._id);
    setFormData({
      code: v.code || '',
      description: v.description || '',
      discount_percent: Number(v.discount_percent) || 0,
      start_date: parseDate(v.start_date),
      end_date: parseDate(v.end_date),
      quantity: v.quantity ?? 0,
      max_usage_per_user: v.max_usage_per_user ?? 1,
      status: v.status || 'active',
    });
    setShowForm(true);
  };

  const handleDuplicate = (v) => {
    // Open form with a suggested new code
    const suggestion = `${v.code || 'NEW'}-COPY`;
    setEditingId(null);
    setFormData({
      code: suggestion,
      description: v.description || '',
      discount_percent: Number(v.discount_percent) || 0,
      start_date: parseDate(v.start_date),
      end_date: parseDate(v.end_date),
      quantity: v.quantity ?? 0,
      max_usage_per_user: v.max_usage_per_user ?? 1,
      status: 'inactive',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) return;
    try {
      await api.delete(`/vouchers/${id}`);
      await fetchAll();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      code: (formData.code || '').trim(),
      description: formData.description,
      discount_percent: Number(formData.discount_percent) || 0,
      start_date: toISO(formData.start_date),
      end_date: toISO(formData.end_date),
      quantity: Number(formData.quantity) || 0,
      max_usage_per_user: Number(formData.max_usage_per_user) || 0,
      status: formData.status,
    };
    try {
      if (editingId) {
        await api.put(`/vouchers/${editingId}`, payload);
      } else {
        await api.post('/vouchers', payload);
      }
      await fetchAll();
      setShowForm(false);
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  const toggleStatus = async (v) => {
    try {
      await api.put(`/vouchers/${v._id}`, { status: v.status === 'active' ? 'inactive' : 'active' });
      await fetchAll();
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  // ---------- Bulk actions ----------
  const toggleSelectAll = (checked, list) => {
    if (checked) setSelectedIds(list.map((x) => x._id));
    else setSelectedIds([]);
  };
  const toggleSelectOne = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return alert('Chưa chọn voucher nào');
    if (!window.confirm(`Xóa ${selectedIds.length} voucher đã chọn?`)) return;
    try {
      // no bulk endpoint -> fire sequentially
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`/vouchers/${id}`);
      }
      await fetchAll();
      setSelectedIds([]);
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  const bulkSetStatus = async (status) => {
    if (!selectedIds.length) return alert('Chưa chọn voucher nào');
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/vouchers/${id}`, { status });
      }
      await fetchAll();
      setSelectedIds([]);
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  // ---------- Import / Export CSV ----------
  const exportCSV = (rows) => {
    const header = [
      'code',
      'description',
      'discount_percent',
      'start_date',
      'end_date',
      'quantity',
      'max_usage_per_user',
      'status',
      'used_count',
    ];
    const lines = [
      header.join(','),
      ...rows.map((v) =>
        [
          v.code ?? '',
          (v.description ?? '').replace(/,/g, ' '),
          v.discount_percent ?? 0,
          v.start_date ? new Date(v.start_date).toISOString() : '',
          v.end_date ? new Date(v.end_date).toISOString() : '',
          v.quantity ?? 0,
          v.max_usage_per_user ?? 0,
          v.status ?? 'active',
          v.used_count ?? 0,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [head, ...rows] = lines;
    const cols = head.split(',').map((x) => x.trim());
    const idx = (k) => cols.indexOf(k);

    const items = rows.map((r) => {
      const c = r.split(',');
      return {
        code: (c[idx('code')] || '').trim(),
        description: c[idx('description')] || '',
        discount_percent: Number(c[idx('discount_percent')] || 0),
        start_date: c[idx('start_date')] ? new Date(c[idx('start_date')]).toISOString() : null,
        end_date: c[idx('end_date')] ? new Date(c[idx('end_date')]).toISOString() : null,
        quantity: Number(c[idx('quantity')] || 0),
        max_usage_per_user: Number(c[idx('max_usage_per_user')] || 0),
        status: c[idx('status')] || 'active',
      };
    });

    if (!items.length) return alert('File CSV trống hoặc không hợp lệ');
    if (!window.confirm(`Nhập ${items.length} voucher từ CSV?`)) return;

    try {
      // không có bulk -> tạo tuần tự
      for (const it of items) {
        // eslint-disable-next-line no-await-in-loop
        await api.post('/vouchers', it);
      }
      await fetchAll();
      e.target.value = '';
      alert('Nhập CSV thành công');
    } catch (err) {
      alert(err?.response?.data?.msg || err.message);
    }
  };

  // ---------- Filtering / Sorting / Paging ----------
  const filtered = useMemo(() => {
    const term = (debouncedQ || '').toLowerCase().trim();
    const dMin = discountMin === '' ? null : Number(discountMin);
    const dMax = discountMax === '' ? null : Number(discountMax);

    return (vouchers || []).filter((v) => {
      // text search: code + description
      if (term) {
        const hay = `${v.code || ''} ${v.description || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      // status
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;

      // validity
      if (validityFilter !== 'all') {
        const hasWindow = !!(v.start_date && v.end_date);
        if (validityFilter === 'no-window' && hasWindow) return false;
        if (validityFilter !== 'no-window') {
          if (!hasWindow) return false;
          if (validityFilter === 'valid' && !isVoucherValid(v)) return false;
          if (validityFilter === 'expired' && !isVoucherExpired(v)) return false;
          if (validityFilter === 'upcoming' && !isVoucherUpcoming(v)) return false;
        }
      }

      // discount range
      const d = Number(v.discount_percent) || 0;
      if (dMin != null && d < dMin) return false;
      if (dMax != null && d > dMax) return false;

      // start range
      const s = v.start_date ? new Date(v.start_date) : null;
      if (startFrom && (!s || s < startFrom)) return false;
      if (startTo && (!s || s > startTo)) return false;

      // end range
      const e = v.end_date ? new Date(v.end_date) : null;
      if (endFrom && (!e || e < endFrom)) return false;
      if (endTo && (!e || e > endTo)) return false;

      // only available (chưa hết)
      if (onlyAvailable) {
        const q = Number(v.quantity) || 0;
        const used = Number(v.used_count) || 0;
        const has = q === 0 || used < q;
        if (!has) return false;
      }

      return true;
    });
  }, [
    vouchers,
    debouncedQ,
    statusFilter,
    validityFilter,
    discountMin,
    discountMax,
    startFrom,
    startTo,
    endFrom,
    endTo,
    onlyAvailable,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av =
        sortKey === 'discount_percent'
          ? Number(a.discount_percent) || 0
          : sortKey === 'start_date' || sortKey === 'end_date' || sortKey === 'created_at'
          ? new Date(a[sortKey] || 0).getTime()
          : sortKey === 'status'
          ? (a.status || '')
          : (a[sortKey] || '').toString().toLowerCase();
      const bv =
        sortKey === 'discount_percent'
          ? Number(b.discount_percent) || 0
          : sortKey === 'start_date' || sortKey === 'end_date' || sortKey === 'created_at'
          ? new Date(b[sortKey] || 0).getTime()
          : sortKey === 'status'
          ? (b.status || '')
          : (b[sortKey] || '').toString().toLowerCase();

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // stats
  const validCount = (vouchers || []).filter(isVoucherValid).length;
  const expiredCount = (vouchers || []).filter(isVoucherExpired).length;
  const upcomingCount = (vouchers || []).filter(isVoucherUpcoming).length;

  // ---------- UI ----------
  const headerClick = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Đã copy mã: ' + code);
    } catch {
      // fallback
      window.prompt('Copy mã voucher:', code);
    }
  };

  return (
    <div className="voucher-management">
      <TabBarr />
      <div className="voucher-container">
        {/* Header */}
        <div className="header-section">
          <div className="header-icon">🎟️</div>
          <h1>Quản lý Voucher</h1>
          <p className="subtitle">Tạo, tìm kiếm, lọc, sắp xếp & thao tác hàng loạt theo chuẩn dự án thực tế</p>
        </div>

        {/* Stats */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">📦</div>
            <div className="stat-info">
              <div className="stat-number">{vouchers.length}</div>
              <div className="stat-label">Tổng voucher</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-valid">✅</div>
            <div className="stat-info">
              <div className="stat-number">{validCount}</div>
              <div className="stat-label">Đang có hiệu lực</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-expired">⏳</div>
            <div className="stat-info">
              <div className="stat-number">{upcomingCount}</div>
              <div className="stat-label">Sắp hiệu lực</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-expired">🛑</div>
            <div className="stat-info">
              <div className="stat-number">{expiredCount}</div>
              <div className="stat-label">Đã hết hạn</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content-card">
          <div className="content-header">
            <h3>Danh sách voucher</h3>

            {/* Top tools */}
            <div className="top-bar">
              <div className="search-box">
                <input
                  placeholder="Tìm theo mã / mô tả…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="filters">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  title="Trạng thái"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={validityFilter}
                  onChange={(e) => {
                    setValidityFilter(e.target.value);
                    setPage(1);
                  }}
                  title="Hiệu lực"
                >
                  <option value="all">Tất cả hiệu lực</option>
                  <option value="valid">Đang hiệu lực</option>
                  <option value="upcoming">Sắp hiệu lực</option>
                  <option value="expired">Đã hết hạn</option>
                  <option value="no-window">Không đặt thời gian</option>
                </select>

                <input
                  type="number"
                  placeholder="% từ"
                  value={discountMin}
                  min={0}
                  max={100}
                  onChange={(e) => {
                    setDiscountMin(e.target.value);
                    setPage(1);
                  }}
                />
                <input
                  type="number"
                  placeholder="% đến"
                  value={discountMax}
                  min={0}
                  max={100}
                  onChange={(e) => {
                    setDiscountMax(e.target.value);
                    setPage(1);
                  }}
                />

                <div className="date-pair">
                  <span>Bắt đầu:</span>
                  <DatePicker
                    selected={startFrom}
                    onChange={(d) => {
                      setStartFrom(d);
                      setPage(1);
                    }}
                    placeholderText="Từ ngày"
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                  />
                  <DatePicker
                    selected={startTo}
                    onChange={(d) => {
                      setStartTo(d);
                      setPage(1);
                    }}
                    placeholderText="Đến ngày"
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                  />
                </div>

                <div className="date-pair">
                  <span>Kết thúc:</span>
                  <DatePicker
                    selected={endFrom}
                    onChange={(d) => {
                      setEndFrom(d);
                      setPage(1);
                    }}
                    placeholderText="Từ ngày"
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                  />
                  <DatePicker
                    selected={endTo}
                    onChange={(d) => {
                      setEndTo(d);
                      setPage(1);
                    }}
                    placeholderText="Đến ngày"
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                  />
                </div>

                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => {
                      setOnlyAvailable(e.target.checked);
                      setPage(1);
                    }}
                  />
                  Còn lượt phát hành
                </label>
              </div>

              <div className="right-tools">
                <button className="add-button" onClick={handleAdd}>+ Thêm voucher</button>

                <div className="split">
                  <button
                    className="secondary"
                    onClick={() => exportCSV(sorted)}
                    title="Xuất toàn bộ (theo lọc hiện tại)"
                  >
                    Xuất CSV (lọc)
                  </button>
                  <button
                    className="secondary"
                    onClick={() => exportCSV(vouchers.filter(v => selectedIds.includes(v._id)))}
                    disabled={!selectedIds.length}
                    title="Xuất những dòng đã chọn"
                  >
                    Xuất CSV (chọn)
                  </button>
                  <label className="import-btn">
                    Nhập CSV
                    <input type="file" accept=".csv" onChange={handleImportCSV} />
                  </label>
                </div>
              </div>
            </div>

            {/* Bulk bar */}
            <div className="bulk-bar">
              <div>
                Đang lọc: <b>{total}</b> dòng | Đang chọn: <b>{selectedIds.length}</b>
              </div>
              <div className="bulk-actions">
                <button className="secondary" onClick={() => bulkSetStatus('active')} disabled={!selectedIds.length}>
                  Bật Active (đã chọn)
                </button>
                <button className="secondary" onClick={() => bulkSetStatus('inactive')} disabled={!selectedIds.length}>
                  Tắt Inactive (đã chọn)
                </button>
                <button className="danger" onClick={bulkDelete} disabled={!selectedIds.length}>
                  Xóa (đã chọn)
                </button>
                <button className="ghost" onClick={() => { setSelectedIds([]); }}>
                  Bỏ chọn
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.length && pageData.length && pageData.every(r => selectedIds.includes(r._id))}
                      onChange={(e) => toggleSelectAll(e.target.checked, pageData)}
                    />
                  </th>
                  <th className="clickable" onClick={() => headerClick('code')}>Code</th>
                  <th className="clickable" onClick={() => headerClick('description')}>Mô tả</th>
                  <th className="clickable" onClick={() => headerClick('discount_percent')}>Giảm (%)</th>
                  <th className="clickable" onClick={() => headerClick('start_date')}>Bắt đầu</th>
                  <th className="clickable" onClick={() => headerClick('end_date')}>Kết thúc</th>
                  <th>Phát hành/Đã dùng</th>
                  <th className="clickable" onClick={() => headerClick('max_usage_per_user')}>Lượt/User</th>
                  <th className="clickable" onClick={() => headerClick('status')}>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="no-data"><div className="no-data-content"><p>Đang tải…</p></div></td></tr>
                ) : pageData.length ? (
                  pageData.map((v) => {
                    const valid = isVoucherValid(v);
                    const rowCls = valid ? 'valid-row' : (isVoucherExpired(v) ? 'expired-row' : (isVoucherUpcoming(v) ? 'upcoming-row' : ''));
                    const limited = Number(v.quantity) || 0;
                    const used = Number(v.used_count) || 0;
                    const hasLeft = limited === 0 ? '∞' : Math.max(0, limited - used);
                    return (
                      <tr key={v._id} className={rowCls}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(v._id)}
                            onChange={(e) => toggleSelectOne(v._id, e.target.checked)}
                          />
                        </td>
                        <td className="code-cell">
                          <span className="voucher-code" title="Click để copy" onClick={() => copyCode(v.code)}>{v.code}</span>
                        </td>
                        <td className="description-cell">{v.description}</td>
                        <td className="discount-cell"><span className="discount-badge">{v.discount_percent}%</span></td>
                        <td className="date-cell">{fmtVN(v.start_date)}</td>
                        <td className="date-cell">{fmtVN(v.end_date)}</td>
                        <td className="usage-cell">
                          {limited === 0 ? '∞' : limited} / {used} {limited !== 0 ? ` (còn ${hasLeft})` : ''}
                        </td>
                        <td>{(v.max_usage_per_user || 0) === 0 ? '∞' : v.max_usage_per_user}</td>
                        <td className="status-cell">
                          <span className={`status-badge ${valid && v.status === 'active' ? 'status-valid' : 'status-expired'}`}>
                            {valid && v.status === 'active' ? 'Còn hạn' : isVoucherUpcoming(v) ? 'Sắp hiệu lực' : 'Hết hạn / Tắt'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => handleEdit(v)}>Sửa</button>
                            <button className="secondary" onClick={() => handleDuplicate(v)}>Nhân bản</button>
                            <button className="secondary" onClick={() => toggleStatus(v)}>
                              {v.status === 'active' ? 'Tắt' : 'Bật'}
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(v._id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="10" className="no-data"><div className="no-data-content"><p>Không tìm thấy voucher nào</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <div className="left">
              Hiển thị
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              mục / trang
              <span className="muted"> • Tổng {total} mục</span>
            </div>
            <div className="right">
              <button onClick={() => setPage(1)} disabled={currentPage === 1}>{'<<'}</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>{'<'}</button>
              <span>Trang {currentPage} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{'>'}</button>
              <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>{'>>'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form className="voucher-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Mã code</label>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Nhập mã voucher"
                  />
                </div>

                <div className="form-group">
                  <label>Mô tả</label>
                  <input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả voucher"
                  />
                </div>

                <div className="form-group">
                  <label>% Giảm giá</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: +e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <DatePicker
                    selected={formData.start_date}
                    onChange={(date) => setFormData({ ...formData, start_date: date })}
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                    placeholderText="Chọn ngày bắt đầu"
                  />
                </div>

                <div className="form-group">
                  <label>Ngày kết thúc</label>
                  <DatePicker
                    selected={formData.end_date}
                    onChange={(date) => setFormData({ ...formData, end_date: date })}
                    dateFormat="dd/MM/yyyy"
                    className="modern-datepicker"
                    placeholderText="Chọn ngày kết thúc"
                  />
                </div>

                <div className="form-group">
                  <label>Tổng phát hành (0 = không giới hạn)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: +e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Lượt/User (0 = không giới hạn)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_usage_per_user}
                    onChange={(e) => setFormData({ ...formData, max_usage_per_user: +e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">{editingId ? 'Lưu thay đổi' : 'Tạo voucher'}</button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Hủy bỏ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
