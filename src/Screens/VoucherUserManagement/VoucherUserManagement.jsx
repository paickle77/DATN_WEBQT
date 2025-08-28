// src/Screens/VoucherUserManagement/VoucherUserManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './VoucherUserManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const STATUSES = ['active', 'used', 'expired'];
const PAGE_SIZES = [10, 20, 50, 100];

function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function VoucherUserManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [q, setQ] = useState('');
  const [minUsage, setMinUsage] = useState('');
  const [maxUsage, setMaxUsage] = useState('');

  // sorting
  const [sortKey, setSortKey] = useState('saved_at'); // saved_at | used_at | discount | user | code | usage_count
  const [sortDir, setSortDir] = useState('desc');

  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  const debouncedQ = useDebounced(q);

  useEffect(() => { fetchAll(); }, []);

  function normalizeUserName(a) {
    return a?.Account_id?.full_name || a?.Account_id?.name || '';
  }
  function normalizeUserContact(a) {
    return a?.Account_id?.email || a?.Account_id?.phone || '';
  }

  function getUsed(vu) {
    // nếu usage_count=0 nhưng có used_at (dữ liệu cũ), vẫn hiển thị tối thiểu là 1
    const cnt = Number(vu?.usage_count ?? 0);
    return Math.max(cnt, vu?.used_at ? 1 : 0);
  }


  async function fetchAll() {
    try {
      setLoading(true);
      const r = await api.get('/admin/voucher_users');
      setData(r.data?.data || []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.msg || e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = (debouncedQ || '').toLowerCase().trim();
    const uMin = minUsage === '' ? null : Number(minUsage);
    const uMax = maxUsage === '' ? null : Number(maxUsage);

    return (data || []).filter((vu) => {
      if (filterStatus !== 'all' && vu.status !== filterStatus) return false;

      // search by user name / email / phone / voucher code
      if (term) {
        const userStr = `${normalizeUserName(vu)} ${normalizeUserContact(vu)}`.toLowerCase();
        const codeStr = (vu.voucher_id?.code || '').toLowerCase();
        if (!userStr.includes(term) && !codeStr.includes(term)) return false;
      }

      const used = getUsed(vu);
      if (uMin != null && used < uMin) return false;
      if (uMax != null && used > uMax) return false;

      return true;
    });
  }, [data, debouncedQ, filterStatus, minUsage, maxUsage]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const map = (row) => {
        switch (sortKey) {
          case 'discount': return Number(row?.voucher_id?.discount_percent) || 0;
          case 'code': return (row?.voucher_id?.code || '').toLowerCase();
          case 'user': return normalizeUserName(row).toLowerCase();
          case 'usage_count': return getUsed(row);
          case 'saved_at': return new Date(row?.saved_at || 0).getTime();
          case 'used_at': return new Date(row?.used_at || 0).getTime();
          default: return 0;
        }
      };
      const av = map(a), bv = map(b);
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

  // counts
  const activeCount = data.filter(vu => vu.status === 'active').length;
  const usedCount = data.filter(vu => vu.status === 'used').length;
  const expiredCount = data.filter(vu => vu.status === 'expired').length;

  const del = async (id) => {
    if (!window.confirm('Xóa voucher user này?')) return;
    try {
      await api.delete(`/admin/voucher_users/${id}`);
      await fetchAll();
      setSelectedIds((prev) => prev.filter(x => x !== id));
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  // selection
  const toggleAll = (checked, list) => setSelectedIds(checked ? list.map(x => x._id) : []);
  const toggleOne = (id, checked) => setSelectedIds(prev => checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id));

  // bulk
  const bulkDelete = async () => {
    if (!selectedIds.length) return alert('Chưa chọn dòng nào');
    if (!window.confirm(`Xóa ${selectedIds.length} bản ghi đã chọn?`)) return;
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api.delete(`/admin/voucher_users/${id}`);
      }
      await fetchAll();
      setSelectedIds([]);
    } catch (e) {
      alert(e?.response?.data?.msg || e.message);
    }
  };

  const exportCSV = (rows) => {
    const header = ['user_name','user_contact','voucher_code','discount_percent','status','usage_count','saved_at','used_at','limit_per_user'];
    const lines = [
      header.join(','),
      ...rows.map(vu => [
        (normalizeUserName(vu) || '').replace(/,/g, ' '),
        (normalizeUserContact(vu) || '').replace(/,/g, ' '),
        vu.voucher_id?.code ?? '',
        vu.voucher_id?.discount_percent ?? 0,
        vu.status ?? '',
        vu.usage_count ?? 0,
        vu.saved_at ? new Date(vu.saved_at).toISOString() : '',
        vu.used_at ? new Date(vu.used_at).toISOString() : '',
        vu.voucher_id?.max_usage_per_user ?? 0
      ].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voucher_users_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

      // === Excel Export (HTML table -> .xls) ===
    function exportExcelVoucherUsers(rows) {
      const th = `
        <tr style="font-weight:bold;text-align:center;background:#f2f2f2">
          <td>User</td><td>Liên hệ</td><td>Voucher Code</td><td>Discount (%)</td>
          <td>Ngày lưu</td><td>Đã dùng/Tối đa</td><td>Trạng thái</td><td>Ngày dùng gần nhất</td><td>Trong hạn?</td>
        </tr>`;

      const body = rows.map(vu => {
        const name = vu?.Account_id?.full_name || vu?.Account_id?.name || '';
        const contact = vu?.Account_id?.email || vu?.Account_id?.phone || '';
        const code = vu?.voucher_id?.code || '';
        const discount = vu?.voucher_id?.discount_percent || 0;
        const limit = vu?.voucher_id?.max_usage_per_user || 0;
        const limitText = limit === 0 ? '∞' : limit;
        const savedAt = vu?.saved_at ? fmtVN(vu.saved_at) : '-';
        const usedAt = vu?.used_at ? fmtVN(vu.used_at) : '-';
        const used = vu?.usage_count || 0;

        const v = vu?.voucher_id || {};
        const inRange = v.start_date && v.end_date &&
          (new Date() >= new Date(v.start_date)) &&
          (new Date() <= new Date(v.end_date));

        return `
          <tr>
            <td>${(name || '').replace(/</g,'&lt;')}</td>
            <td>${(contact || '').replace(/</g,'&lt;')}</td>
            <td>${code}</td>
            <td style="text-align:right">${discount}</td>
            <td>${savedAt}</td>
            <td style="text-align:right">${used} / ${limitText}</td>
            <td>${vu.status || ''}</td>
            <td>${usedAt}</td>
            <td>${inRange ? 'Trong hạn' : 'Hết hạn/Chưa hiệu lực'}</td>
          </tr>`;
      }).join('');

      const html = `
        <html><head><meta charset="utf-8"></head>
        <body>
          <table border="1" style="border-collapse:collapse">
            ${th}
            ${body}
          </table>
        </body></html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voucher_users_${Date.now()}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }

  // UI helpers
  const headerClick = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const fmtVN = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '-');

  return (
    <div className="voucher-user-management">
      <TabBar />
      <div className="voucher-user-container">
        {/* Header */}
        <div className="header-section">
          <div className="header-icon">👥</div>
          <h1>Voucher của Người dùng</h1>
          <p className="subtitle">Theo dõi & kiểm soát tình trạng sử dụng voucher theo người dùng</p>
        </div>

        {/* Stats */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon stat-icon-total">📦</div>
            <div className="stat-info">
              <div className="stat-number">{data.length}</div>
              <div className="stat-label">Tổng bản ghi</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-active">✅</div>
            <div className="stat-info">
              <div className="stat-number">{activeCount}</div>
              <div className="stat-label">Đang khả dụng</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-used">🧾</div>
            <div className="stat-info">
              <div className="stat-number">{usedCount}</div>
              <div className="stat-label">Đã dùng</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-expired">🛑</div>
            <div className="stat-info">
              <div className="stat-number">{expiredCount}</div>
              <div className="stat-label">Hết hạn</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content-card">
          <div className="content-header">
            <h3>Danh sách voucher theo user</h3>
            <div className="controls">
              <div className="search-box">
                <input
                  placeholder="Tìm theo tên / email / sđt / mã voucher…"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
              </div>

              <div className="filter-select">
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <input
                type="number"
                placeholder="Min used"
                value={minUsage}
                onChange={(e) => { setMinUsage(e.target.value); setPage(1); }}
              />
              <input
                type="number"
                placeholder="Max used"
                value={maxUsage}
                onChange={(e) => { setMaxUsage(e.target.value); setPage(1); }}
              />

              <button className="refresh-btn" onClick={fetchAll}>Làm mới</button>

              <div className="split">
                <button className="refresh-btn" onClick={() => exportExcelVoucherUsers(sorted)}>Xuất Excel (lọc)</button>
                <button
                  className="refresh-btn"
                  onClick={() => exportExcelVoucherUsers(data.filter(v => selectedIds.includes(v._id)))}
                  disabled={!selectedIds.length}
                >
                  Xuất Excel (chọn)
                </button>
              </div>
            </div>

            {/* bulk */}
            <div className="controls" style={{ marginTop: 10 }}>
              <div className="filter-select" style={{ gap: 8 }}>
                <span>Đang chọn: <b>{selectedIds.length}</b></span>
                <button className="refresh-btn" onClick={bulkDelete} disabled={!selectedIds.length}>Xóa đã chọn</button>
                <button className="refresh-btn" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Bỏ chọn</button>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.length && pageData.length && pageData.every(r => selectedIds.includes(r._id))}
                      onChange={(e) => toggleAll(e.target.checked, pageData)}
                    />
                  </th>
                  <th className="clickable" onClick={() => { headerClick('user'); setPage(1); }}>User</th>
                  <th className="clickable" onClick={() => { headerClick('code'); setPage(1); }}>Voucher Code</th>
                  <th className="clickable" onClick={() => { headerClick('discount'); setPage(1); }}>Discount</th>
                  <th className="clickable" onClick={() => { headerClick('saved_at'); setPage(1); }}>Ngày lưu</th>
                  <th className="clickable" onClick={() => { headerClick('usage_count'); setPage(1); }}>Đã dùng / Tối đa</th>
                  <th className="clickable" onClick={() => { headerClick('used_at'); setPage(1); }}>Ngày dùng gần nhất</th>
                  {/* <th>Hành động</th> */}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="no-data"><div className="no-data-content"><p>Đang tải…</p></div></td></tr>
                ) : pageData.length ? (
                  pageData.map((vu) => {
                    const limit = vu.voucher_id?.max_usage_per_user || 0; // 0 = ∞
                    const used = getUsed(vu);
                    const limitText = limit === 0 ? '∞' : limit;
                    return (
                      <tr key={vu._id} className={`status-${vu.status}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(vu._id)}
                            onChange={(e) => toggleOne(vu._id, e.target.checked)}
                          />
                        </td>
                        <td className="user-cell">
                          <div className="user-info">
                            <div className="user-avatar">👤</div>
                            <div className="user-details">
                              <span className="user-name">{normalizeUserName(vu) || '—'}</span>
                              <span className="user-email">{normalizeUserContact(vu) || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="voucher-cell"><span className="voucher-code">{vu.voucher_id?.code}</span></td>
                        <td className="discount-cell"><span className="discount-badge">{vu.voucher_id?.discount_percent}%</span></td>
                        <td className="date-cell">{fmtVN(vu.saved_at)}</td>
                        <td className="usage-cell">{used} / {limitText}</td>
                        <td className="used-date-cell">{fmtVN(vu.used_at)}</td>
                        {/* <td className="actions-cell">
                          <button className="delete-btn" onClick={() => del(vu._id)}>Xóa</button>
                        </td> */}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data"><div className="no-data-content"><p>Không tìm thấy voucher user nào</p></div></td>
                  </tr>
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
    </div>
  );
}
