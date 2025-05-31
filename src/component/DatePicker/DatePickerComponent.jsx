import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './DatePickerComponent.scss'; // Nếu bạn đang dùng SCSS riêng
import { format } from 'date-fns';

const DatePickerComponent = () => {
  const [selectedDate, setSelectedDate] = useState(null);

  const handleChange = (date) => {
    setSelectedDate(date);
     console.log('Ngày được chọn:', format(date, 'dd/MM/yyyy'));
  };

  return (
    <div className="date-picker-container">
      <label>Chọn ngày:</label>
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText="Chọn ngày"
        className="custom-datepicker"
      />
    </div>
  );
};

export default DatePickerComponent;
