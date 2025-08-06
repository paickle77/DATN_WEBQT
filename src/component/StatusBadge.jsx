import React from 'react';
import './StatusBadge.scss';

// Định nghĩa trạng thái và màu sắc
const STATUS_CONFIG = {
  pending: {
    label: 'Chờ xác nhận',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: '⏳'
  },
  confirmed: {
    label: 'Đã xác nhận đơn hàng',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: '✅'
  },
  ready: {
    label: 'Đã sẵn sàng giao',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: '📦'
  },
  shipping: {
    label: 'Đang giao',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    icon: '🚚'
  },
  done: {
    label: 'Giao hàng thành công',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: '🎉'
  },
  delivered: {
    label: 'Giao hàng thành công',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: '🎉'
  },
  cancelled: {
    label: 'Hủy đơn hàng',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: '❌'
  },
  failed: {
    label: 'Giao hàng thất bại',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: '⚠️'
  }
};

const StatusBadge = ({ status, showIcon = true, size = 'medium' }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Không xác định',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: '❓'
  };

  const sizeClasses = {
    small: 'status-badge-small',
    medium: 'status-badge-medium',
    large: 'status-badge-large'
  };

  return (
    <span 
      className={`status-badge ${sizeClasses[size]}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}20`
      }}
    >
      {showIcon && <span className="status-icon">{config.icon}</span>}
      <span className="status-text">{config.label}</span>
    </span>
  );
};

export default StatusBadge;