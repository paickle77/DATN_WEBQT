import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import LoginForm from './Screens/Login/Login';
import Home from './Screens/Home/Home';
import Sidebar from './component/Sidebar/Sidebar';
import DatePickerComponent from './component/DatePicker/DatePickerComponent';
import DashboardCards from './component/DashboardCards/DashboardCards';
import ProductManagement from './Screens/ProductManagement/ProductManagement';
import BillManagement from './Screens/BillManagement/BillManagement';
import RefundManagement from './Screens/RefundManagement/RefundManagement';
import ShipmentManagement from './Screens/ShipmentManagement/ShipmentManagement';
import CustomerManagement from './Screens/CustomerManagement/CustomerManagement';
import AnalyticsDashboard from './Screens/AnalyticsDashboard/AnalyticsDashboard';
import VoucherManagement from './Screens/VoucherManagement/VoucherManagement';
import VoucherUserManagement from './Screens/VoucherUserManagement/VoucherUserManagement';
import SupplierManagement from './Screens/SupplierManagement/SupplierManagement';
import LogManagement from './Screens/LogManagement/LogManagement';
import NotificationManagement from './Screens/NotificationManagement/NotificationManagement';
import ShipperManagement from './Screens/ShipperManagement/ShipperManagement';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ENUM_PAGE } from './component/ENUM/enum.ts';
import PrivateRoute from './component/PrivateRoute';

// ✅ HELPER FUNCTION - Kiểm tra authentication status
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // ✅ Kiểm tra token có hợp lệ không (không quá strict)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch (e) {
    console.error('Token validation error:', e);
    return false;
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* ✅ LOGIN ROUTE */}
        <Route path={ENUM_PAGE.Login} element={<LoginForm />} />
        
        {/* ✅ ROOT REDIRECT */}
        <Route path="/" element={
          isAuthenticated() ? <Navigate to={ENUM_PAGE.Home} replace /> : <Navigate to={ENUM_PAGE.Login} replace />
        } />
        
        {/* ✅ PROTECTED ROUTES */}
        <Route path={ENUM_PAGE.Home} element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path={ENUM_PAGE.ProductManagement} element={<PrivateRoute><ProductManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.BillManagement} element={<PrivateRoute><BillManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.RefundManagement} element={<PrivateRoute><RefundManagement /></PrivateRoute>} />
        
        {/* ✅ SHIPMENT MANAGEMENT - CRITICAL ROUTE */}
        <Route path={ENUM_PAGE.ShipmentManagement} element={<PrivateRoute><ShipmentManagement /></PrivateRoute>} />
        
        <Route path={ENUM_PAGE.CustomerManagement} element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.DatePicker} element={<PrivateRoute><DatePickerComponent /></PrivateRoute>} />
        <Route path={ENUM_PAGE.ShipperManagement} element={<PrivateRoute><ShipperManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.AnalyticsDashboard} element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
        <Route path={ENUM_PAGE.VoucherManagement} element={<PrivateRoute><VoucherManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.VoucherUserManagement} element={<PrivateRoute><VoucherUserManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.SupplierManagement} element={<PrivateRoute><SupplierManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.LogManagement} element={<PrivateRoute><LogManagement /></PrivateRoute>} />
        <Route path={ENUM_PAGE.NotificationManagement} element={<PrivateRoute><NotificationManagement /></PrivateRoute>} />
        
        {/* ✅ FALLBACK - Redirect to appropriate page */}
        <Route path="*" element={
          isAuthenticated() ? <Navigate to={ENUM_PAGE.Home} replace /> : <Navigate to={ENUM_PAGE.Login} replace />
        } />
      </Routes>
    </Router>
  </React.StrictMode>
);

reportWebVitals();