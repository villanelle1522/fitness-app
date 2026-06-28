import { MouseGlow } from "./MouseGlow";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryCalendarProps {
  currentDate: string;
  onSelectDate: (dateStr: string) => void;
  daysData: Record<string, any>; // Pass db.days
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({ currentDate, onSelectDate, daysData }) => {
  const initialDate = new Date(currentDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const formatTargetDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="relative group">
      <MouseGlow />
      <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <span className="text-sm font-extrabold text-zinc-100">
            {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <span key={day} className="text-[10px] font-bold text-zinc-500">{day}</span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="h-10" />;
            
            const dateStr = formatTargetDate(date);
            const isSelected = dateStr === currentDate;
            const isToday = dateStr === formatTargetDate(new Date());
            const dayData = daysData[dateStr];
            const hasData = dayData ? (
              Object.values(dayData.meals || {}).some((list: any) => list.length > 0) || 
              (dayData.water > 0) || 
              (dayData.weight > 0)
            ) : false;
            
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`
                  relative h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200
                  ${isSelected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-white/10 text-zinc-300'}
                  ${isToday && !isSelected ? 'border border-indigo-500/50 text-indigo-400' : ''}
                `}
              >
                {date.getDate()}
                {hasData && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
                )}
                {hasData && isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
