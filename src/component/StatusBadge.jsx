import React from 'react';
import './StatusBadge.scss';

const StatusBadge = ({ status }) => {
  // Map status to Vietnamese and icons
  const statusConfig = {
    pending: { 
      label: 'Chờ xác nhận', 
      icon: '⏳' 
    },
    doing: { 
      label: 'Đang xử lý', 
      icon: '⚡' 
    },
    confirmed: { 
      label: 'Đã xác nhận', 
      icon: '✅' 
    },
    shipping: { 
      label: 'Đang giao', 
      icon: '🚚' 
    },
    delivered: { 
      label: 'Đã giao', 
      icon: '📦' 
    },
    cancelled: { 
      label: 'Đã hủy', 
      icon: '❌' 
    },
    returned: { 
      label: 'Trả hàng', 
      icon: '↩️' 
    }
  };

  const config = statusConfig[status] || { 
    label: status.toUpperCase(), 
    icon: '📋' 
  };

  return (
    <span className={`status-badge ${status}`}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-text">{config.label}</span>
    </span>
  );
};

export default StatusBadge;