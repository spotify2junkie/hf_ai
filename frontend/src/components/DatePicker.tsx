import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  disabled = false
}) => {
  const today = new Date();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Select Date
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Choose a date to fetch academic papers from HuggingFace daily collection
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <ReactDatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              if (date) {
                onDateSelect(date);
              }
            }}
            maxDate={today}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select a date..."
            disabled={disabled}
            className={`
              w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              text-sm
            `}
            popperClassName="z-50"
            showPopperArrow={false}
          />
        </div>

        {selectedDate && (
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {disabled && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading papers...</span>
        </div>
      )}
    </div>
  );
};

export default DatePicker;