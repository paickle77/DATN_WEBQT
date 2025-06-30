// src/Screens/LogManagement/LogManagement.jsx
import React, { useState, useEffect } from 'react';
import './LogManagement.scss';
import TabBar from '../../component/tabbar/TabBar';
import api from '../../utils/api';

const LogManagement = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/logs')
      .then(res => setLogs(res.data.data))
      .catch(console.error);
  }, []);

  return (
    <div className="log-management">
      <TabBar />
      <h2>Audit Trail</h2>
      <table className="log-table">
        <thead>
          <tr><th>#</th><th>User</th><th>Action</th><th>When</th></tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={l._id}>
              <td>{i + 1}</td>
              <td>{l.user_id}</td>
              <td>{l.action}</td>
              <td>{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogManagement;
