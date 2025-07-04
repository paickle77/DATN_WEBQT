import React from 'react';
import './StatusBadge.scss';
const StatusBadge = ({status}) => (
  <span className={`status-badge ${status}`}>{status.toUpperCase()}</span>
);
export default StatusBadge;
