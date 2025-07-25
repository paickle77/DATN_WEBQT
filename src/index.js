// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// import App from './App';
import reportWebVitals from './reportWebVitals';

import LoginForm          from './Screens/Login/Login';
import Home               from './Screens/Home/Home';
import Sidebar            from './component/Sidebar/Sidebar';
import DatePickerComponent from './component/DatePicker/DatePickerComponent';
import DashboardCards     from './component/DashboardCards/DashboardCards';
import RevenueByDate      from './Screens/Revenue/RevenueByDate.jsx';
import RevenueByMonth     from './Screens/Revenue/RevenueByMonth.jsx';
import RevenueByYear      from './Screens/Revenue/RevenueByYear.jsx';
import ProductManagement  from './Screens/ProductManagement/ProductManagement';
import OrderManagement    from './Screens/OrderManagement/OrderManagement';
import CustomerManagement from './Screens/CustomerManagement/CustomerManagement';
import StatisticReport    from './Screens/StatisticReport/StatisticReport';
import VoucherManagement  from './Screens/VoucherManagement/VoucherManagement';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ENUM_PAGE } from './component/ENUM/enum.ts';

// Import PrivateRoute từ folder component
import PrivateRoute from './component/PrivateRoute';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Public route: Login */}
        <Route path={ENUM_PAGE.Login} element={<LoginForm />} />

        {/* All other routes require authentication */}
        <Route
          path={ENUM_PAGE.Home}
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.sidebar}
          element={
            <PrivateRoute>
              <Sidebar />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.RevenueByDate}
          element={
            <PrivateRoute>
              <RevenueByDate />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.RevenueByMonth}
          element={
            <PrivateRoute>
              <RevenueByMonth />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.RevenueByYear}
          element={
            <PrivateRoute>
              <RevenueByYear />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.DatePickerComponent}
          element={
            <PrivateRoute>
              <DatePickerComponent />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.DashboardCards}
          element={
            <PrivateRoute>
              <DashboardCards />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.ProductManagement}
          element={
            <PrivateRoute>
              <ProductManagement />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.OrderManagement}
          element={
            <PrivateRoute>
              <OrderManagement />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.CustomerManagement}
          element={
            <PrivateRoute>
              <CustomerManagement />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.StatisticReport}
          element={
            <PrivateRoute>
              <StatisticReport />
            </PrivateRoute>
          }
        />
        <Route
          path={ENUM_PAGE.VoucherManagement}
          element={
            <PrivateRoute>
              <VoucherManagement />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
