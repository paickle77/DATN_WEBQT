// src/Screens/SupplierManagement/SupplierManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './SupplierManagement.scss';
import TabBarr from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const emptySupplier = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  tax_code: '',
  payment_terms: '',
  status: 'active',
  rating: 5,
  contract_start_date: '',
  contract_end_date: '',
  notes: '',
  created_at: null,
  updated_at: null
};

// --- helpers: an toàn hóa dữ liệu ---
const safeStr = (v) => (typeof v === 'string' ? v : v ? String(v) : '');
const clampRating = (r) => {
  const n = Number.isFinite(+r) ? Math.round(+r) : 5;
  return Math.min(5, Math.max(1, n)); // 1..5 cho khớp schema
};
const ymd = (input) => {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  // toISOString luôn UTC → đủ cho <input type="date">
  return d.toISOString().slice(0, 10);
};
const formatDate = (input) => {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN');
};
const isContractExpiring = (end) => {
  if (!end) return false;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  return diff <= 30 && diff > 0;
};
const isContractExpired = (end) => {
  if (!end) return false;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return d < today;
};
const normalizeSupplier = (s) => ({
  ...s,
  name: safeStr(s?.name),
  contact_person: safeStr(s?.contact_person),
  phone: safeStr(s?.phone),
  email: safeStr(s?.email),
  address: safeStr(s?.address),
  tax_code: safeStr(s?.tax_code),
  payment_terms: safeStr(s?.payment_terms),
  status: s?.status === 'inactive' ? 'inactive' : 'active',
  rating: clampRating(s?.rating),
  contract_start_date: s?.contract_start_date || '',
  contract_end_date: s?.contract_end_date || '',
  created_at: s?.created_at || null,
  updated_at: s?.updated_at || null,
});

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const r = await api.get('/suppliers');
      const list = Array.isArray(r?.data?.data) ? r.data.data : [];
      setSuppliers(list.map(normalizeSupplier));
    } catch (e) {
      console.error(e);
      alert('Tải danh sách nhà phân phối thất bại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return suppliers
      .map(normalizeSupplier)
      .filter((s) => {
        if (!term) return true;
        return (
          s.name.toLowerCase().includes(term) ||
          s.contact_person.toLowerCase().includes(term) ||
          s.phone.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.tax_code.toLowerCase().includes(term)
        );
      });
  }, [suppliers, searchTerm]);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      ...emptySupplier,
      contract_start_date: ymd(new Date())
    });
    setShowForm(true);
  };

  const handleEdit = (supplier) => {
    const s = normalizeSupplier(supplier);
    setEditingId(s._id);
    setFormData({
      ...s,
      // date input cần 'YYYY-MM-DD'
      contract_start_date: ymd(s.contract_start_date),
      contract_end_date: ymd(s.contract_end_date),
    });
    setShowForm(true);
  };

  const handleViewDetail = (supplier) => {
    setSelectedSupplier(normalizeSupplier(supplier));
    setShowDetail(true);
  };

  const toggleStatus = async (supplier) => {
    try {
      setLoading(true);
      const next = supplier.status === 'active' ? 'inactive' : 'active';
      await api.put(`/suppliers/${supplier._id}`, {
        ...supplier,
        status: next,
        updated_at: new Date().toISOString(),
      });
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Cập nhật trạng thái thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // const handleDelete = async (id) => {
  //   if (!window.confirm('Xóa nhà phân phối này?')) return;
  //   try {
  //     setLoading(true);
  //     await api.delete(`/suppliers/${id}`);
  //     await fetchAll();
  //   } catch (e) {
  //     console.error(e);
  //     alert('Xóa thất bại. Vui lòng thử lại!');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      name: formData.name.trim(),
      contact_person: formData.contact_person.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      tax_code: formData.tax_code.trim(),
      payment_terms: formData.payment_terms.trim(),
      status: formData.status === 'inactive' ? 'inactive' : 'active',
      rating: clampRating(formData.rating),
      // gửi ISO thay vì Date object
      contract_start_date: formData.contract_start_date ? new Date(formData.contract_start_date).toISOString() : null,
      contract_end_date: formData.contract_end_date ? new Date(formData.contract_end_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
      } else {
        payload.created_at = new Date().toISOString();
        await api.post('/suppliers', payload);
      }
      await fetchAll();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Lưu thất bại. Vui lòng kiểm tra dữ liệu và thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const active = status === 'active';
    return (
      <span className={`status-badge ${active ? 'active' : 'inactive'}`}>
        <div className="status-indicator"></div>
        {active ? 'Hoạt động' : 'Ngừng hoạt động'}
      </span>
    );
  };

  const getRatingStars = (rating) => {
    const n = clampRating(rating);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  };

  return (
    <div className="supplier-management">
      <TabBarr />

      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1>Quản lý nhà phân phối</h1>
            <p className="subtitle">Quản lý thông tin và quan hệ đối tác</p>
          </div>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-number">{suppliers.length}</div>
              <div className="stat-label">Tổng số nhà phân phối</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{suppliers.filter(s => s.status === 'active').length}</div>
              <div className="stat-label">Đang hoạt động</div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        <div className="toolbar">
          <div className="search-section">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="Tìm kiếm nhà phân phối..."
                value={searchTerm}
                onChange={(e)=>setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <button className="add-button" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Thêm nhà phân phối
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>{editingId ? 'Chỉnh sửa nhà phân phối' : 'Thêm nhà phân phối mới'}</h2>
                <button className="close-button" onClick={()=>setShowForm(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form className="modern-form" onSubmit={handleSubmit}>
                <div className="form-sections">
                  <div className="form-section">
                    <h3 className="section-title">Thông tin cơ bản</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tên nhà phân phối *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e=>setFormData({...formData, name: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Người liên hệ *</label>
                        <input
                          type="text"
                          required
                          value={formData.contact_person}
                          onChange={e=>setFormData({...formData, contact_person: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Số điện thoại *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={e=>setFormData({...formData, phone: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e=>setFormData({...formData, email: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Mã số thuế</label>
                        <input
                          type="text"
                          value={formData.tax_code}
                          onChange={e=>setFormData({...formData, tax_code: e.target.value})}
                          className="form-input"
                          disabled={Boolean(editingId)}
                        />
                      </div>
                      {/* ✅ THÊM TRƯỜNG RATING */}
                      <div className="form-group">
                        <label>Đánh giá chất lượng</label>
                        <select
                          value={formData.rating}
                          onChange={e=>setFormData({...formData, rating: Number(e.target.value)})}
                          className="form-select"
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ (5/5) - Xuất sắc</option>
                          <option value={4}>⭐⭐⭐⭐☆ (4/5) - Tốt</option>
                          <option value={3}>⭐⭐⭐☆☆ (3/5) - Trung bình</option>
                          <option value={2}>⭐⭐☆☆☆ (2/5) - Kém</option>
                          <option value={1}>⭐☆☆☆☆ (1/5) - Rất kém</option>
                        </select>
                      </div>
                      {/* ✅ SỬA: Chỉ giữ 1 trường trạng thái, xóa duplicate */}
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select
                          value={formData.status}
                          onChange={e=>setFormData({...formData, status: e.target.value})}
                          className="form-select"
                        >
                          <option value="active">Hoạt động</option>
                          <option value="inactive">Ngừng hoạt động</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">Thông tin hợp đồng</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Ngày bắt đầu hợp đồng</label>
                        <input
                          type="date"
                          value={formData.contract_start_date}
                          onChange={e=>setFormData({...formData, contract_start_date: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Ngày kết thúc hợp đồng</label>
                        <input
                          type="date"
                          value={formData.contract_end_date}
                          onChange={e=>setFormData({...formData, contract_end_date: e.target.value})}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">Thông tin chi tiết</h3>
                    <div className="form-group full-width">
                      <label>Địa chỉ *</label>
                      <textarea
                        required
                        rows="3"
                        value={formData.address}
                        onChange={e=>setFormData({...formData, address: e.target.value})}
                        className="form-textarea"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Điều kiện thanh toán</label>
                      <input
                        type="text"
                        placeholder="VD: Thanh toán trong 30 ngày"
                        value={formData.payment_terms}
                        onChange={e=>setFormData({...formData, payment_terms: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Ghi chú</label>
                      <textarea
                        rows="4"
                        value={formData.notes}
                        onChange={e=>setFormData({...formData, notes: e.target.value})}
                        className="form-textarea"
                        placeholder="Nhập ghi chú về nhà phân phối..."
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={()=>setShowForm(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    {editingId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedSupplier && (
          <div className="modal-overlay">
            <div className="modal-container detail-modal">
              <div className="modal-header">
                <h2>Chi tiết nhà phân phối</h2>
                <button className="close-button" onClick={()=>setShowDetail(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-sections">
                  <div className="detail-section">
                    <div className="section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <h3>Thông tin chính</h3>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Tên nhà phân phối</label>
                        <div className="detail-value highlight">{selectedSupplier.name}</div>
                      </div>
                      <div className="detail-item">
                        <label>Người liên hệ</label>
                        <div className="detail-value">{selectedSupplier.contact_person || 'Không có'}</div>
                      </div>
                      <div className="detail-item">
                        <label>Mã số thuế</label>
                        <div className="detail-value">{selectedSupplier.tax_code || 'Không có'}</div>
                      </div>
                      <div className="detail-item">
                        <label>Trạng thái</label>
                        <div className="detail-value">{getStatusBadge(selectedSupplier.status)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <h3>Thông tin liên hệ</h3>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Số điện thoại</label>
                        <div className="detail-value">
                          {selectedSupplier.phone ? (
                            <a href={`tel:${selectedSupplier.phone}`} className="contact-link phone">
                              {selectedSupplier.phone}
                            </a>
                          ) : 'Không có'}
                        </div>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <div className="detail-value">
                          {selectedSupplier.email ? (
                            <a href={`mailto:${selectedSupplier.email}`} className="contact-link email">
                              {selectedSupplier.email}
                            </a>
                          ) : 'Không có'}
                        </div>
                      </div>
                      <div className="detail-item full-width">
                        <label>Địa chỉ</label>
                        <div className="detail-value address">{selectedSupplier.address || 'Không có'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                      </svg>
                      <h3>Thông tin hợp đồng</h3>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Ngày bắt đầu</label>
                        <div className="detail-value">
                          {selectedSupplier.contract_start_date ? formatDate(selectedSupplier.contract_start_date) : 'Chưa có'}
                        </div>
                      </div>
                      <div className="detail-item">
                        <label>Ngày kết thúc</label>
                        <div className="detail-value">
                          {selectedSupplier.contract_end_date ? (
                            <span className={
                              isContractExpired(selectedSupplier.contract_end_date) ? 'contract-expired' :
                              isContractExpiring(selectedSupplier.contract_end_date) ? 'contract-expiring' : ''
                            }>
                              {formatDate(selectedSupplier.contract_end_date)}
                              {isContractExpired(selectedSupplier.contract_end_date) && ' (Đã hết hạn)'}
                              {isContractExpiring(selectedSupplier.contract_end_date) && ' (Sắp hết hạn)'}
                            </span>
                          ) : 'Chưa có'}
                        </div>
                      </div>
                      <div className="detail-item full-width">
                        <label>Điều kiện thanh toán</label>
                        <div className="detail-value payment-terms">
                          {selectedSupplier.payment_terms || 'Chưa có thông tin'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                      <h3>Đánh giá & Ghi chú</h3>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Đánh giá</label>
                        <div className="detail-value rating">
                          <span className="stars">{getRatingStars(selectedSupplier.rating)}</span>
                          <span className="rating-number">({clampRating(selectedSupplier.rating)}/5)</span>
                        </div>
                      </div>
                      <div className="detail-item full-width">
                        <label>Ghi chú</label>
                        <div className="detail-value notes">
                          {selectedSupplier.notes || 'Không có ghi chú'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <h3>Thông tin hệ thống</h3>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Ngày tạo</label>
                        <div className="detail-value">
                          {selectedSupplier.created_at ? formatDate(selectedSupplier.created_at) : 'Không có thông tin'}
                        </div>
                      </div>
                      <div className="detail-item">
                        <label>Cập nhật lần cuối</label>
                        <div className="detail-value">
                          {selectedSupplier.updated_at ? formatDate(selectedSupplier.updated_at) : 'Không có thông tin'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={()=>setShowDetail(false)}>
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={()=>{ setShowDetail(false); handleEdit(selectedSupplier); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-container">
          <div className="table-header">
            <h3>Danh sách nhà phân phối ({filtered.length})</h3>
          </div>

          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Nhà phân phối</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th>Đánh giá</th>
                  <th>Hợp đồng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier, i) => (
                  <tr key={supplier._id || i} className="table-row">
                    <td className="row-number">{i + 1}</td>
                    <td className="supplier-info">
                      <div className="supplier-name">{supplier.name || '(Chưa đặt tên)'}</div>
                      {supplier.tax_code && <div className="tax-code">MST: {supplier.tax_code}</div>}
                    </td>
                    <td className="contact-info">
                      <div className="contact-person">{supplier.contact_person || '—'}</div>
                      <div className="contact-details">
                        <div className="phone">{supplier.phone || '—'}</div>
                        {supplier.email && <div className="email">{supplier.email}</div>}
                      </div>
                    </td>
                    <td>{getStatusBadge(supplier.status)}</td>
                    <td className="rating-cell">
                      <div className="rating-display">
                        <span className="stars">{getRatingStars(supplier.rating)}</span>
                        <span className="rating-number">({clampRating(supplier.rating)}/5)</span>
                      </div>
                    </td>
                    <td className="contract-info">
                      {supplier.contract_end_date ? (
                        <div className={`contract-status ${
                          isContractExpired(supplier.contract_end_date) ? 'expired' :
                          isContractExpiring(supplier.contract_end_date) ? 'expiring' : 'active'
                        }`}>
                          <div className="contract-date">
                            {formatDate(supplier.contract_end_date)}
                          </div>
                          <div className="contract-label">
                            {isContractExpired(supplier.contract_end_date) ? 'Đã hết hạn' :
                             isContractExpiring(supplier.contract_end_date) ? 'Sắp hết hạn' : 'Còn hiệu lực'}
                          </div>
                        </div>
                      ) : (
                        <span className="no-contract">Chưa có hợp đồng</span>
                      )}
                    </td>
                    <td className="actions">
                      <button className="view-btn" onClick={()=>handleViewDetail(supplier)} title="Xem chi tiết">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>

                      <button className="edit-btn" onClick={()=>handleEdit(supplier)} title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>

                      {/* Nút Ngừng/Kích hoạt thay cho Xóa */}
                      <button
                        className="delete-btn"
                        onClick={()=>toggleStatus(supplier)}
                        title={supplier.status === 'active' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                        style={{minWidth: '2rem'}}
                      >
                        {supplier.status === 'active'
                          ? (
                            // icon pause
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <rect x="6" y="4" width="4" height="16"/>
                              <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                          ) : (
                            // icon play
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <polygon points="5,3 19,12 5,21 5,3"/>
                            </svg>
                          )
                        }
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>Không tìm thấy nhà phân phối</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc thêm nhà phân phối mới</p>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="modal-overlay" style={{background:'rgba(255,255,255,0.35)'}}>
            <div className="modal-container" style={{maxWidth: 320, padding: '2rem', textAlign:'center'}}>
              <div className="modal-header" style={{borderBottom:'none', justifyContent:'center'}}>
                <h2>Đang xử lý…</h2>
              </div>
              <div style={{padding:'1rem 2rem 2rem', color:'#718096'}}>Vui lòng đợi trong giây lát</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierManagement;
