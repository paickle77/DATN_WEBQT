import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// import App from './App';
import reportWebVitals from './reportWebVitals';
import LoginForm from './Screens/Login/Login';
import Home from './Screens/Home/Home';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './component/Sidebar/Sidebar';
import DatePickerComponent from './component/DatePicker/DatePickerComponent';
import DashboardCards from './component/DashboardCards/DashboardCards';
import RevenueByDate from './Screens/Revenue/RevenueByDate.jsx';
import RevenueByMonth from './Screens/Revenue/RevenueByMonth.jsx';
import RevenueByYear from './Screens/Revenue/RevenueByYear.jsx';
import ProductManagement from './Screens/ProductManagement/ProductManagement';
import OrderManagement from './Screens/OrderManagement/OrderManagement';
import CustomerManagement from './Screens/CustomerManagement/CustomerManagement';
import StatisticReport from './Screens/StatisticReport/StatisticReport';
import { ENUM_PAGE } from './component/ENUM/enum.ts';
import VoucherManagement from './Screens/VoucherManagement/VoucherManagement';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path={ENUM_PAGE.Login} element={<LoginForm />} />
        <Route path={ENUM_PAGE.Home} element={<Home />} />
         <Route path={ENUM_PAGE.sidebar} element={<Sidebar />} />
          <Route path={ENUM_PAGE.RevenueByDate} element={<RevenueByDate />} />
           <Route path={ENUM_PAGE.RevenueByMonth} element={<RevenueByMonth />} />
            <Route path={ENUM_PAGE.RevenueByYear} element={<RevenueByYear />} />
              <Route path={ENUM_PAGE.DatePickerComponent} element={<DatePickerComponent />} />
                <Route path={ENUM_PAGE.DashboardCards} element={<DashboardCards />} />
            <Route path={ENUM_PAGE.ProductManagement} element={<ProductManagement />} />
             <Route path={ENUM_PAGE.OrderManagement} element={<OrderManagement />} />
              <Route path={ENUM_PAGE.CustomerManagement} element={<CustomerManagement />} />
               <Route path={ENUM_PAGE.StatisticReport} element={<StatisticReport />} />
               <Route path={ENUM_PAGE.VoucherManagement} element={<VoucherManagement />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
