import { MouseGlow } from "./MouseGlow";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryCalendarProps {
  currentDate: string;
  onSelectDate: (dateStr: string) => void;
  daysData: Record<string, any>; // Pass db.days
  targets: any; // Pass NutritionTargets
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({ currentDate, onSelectDate, daysData, targets }) => {
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
            
            let dailyKcal = 0;
            let dailyProtein = 0;
            let hasMeals = false;
            
            if (dayData && dayData.meals) {
              Object.values(dayData.meals).forEach((meal: any) => {
                if (meal.length > 0) hasMeals = true;
                meal.forEach((item: any) => {
                  if (item.type === "group") {
                    item.items.forEach((sub: any) => {
                      dailyKcal += sub.kcal || 0;
                      dailyProtein += sub.protein || 0;
                    });
                  } else {
                    dailyKcal += item.kcal || 0;
                    dailyProtein += item.protein || 0;
                  }
                });
              });
            }

            const hasData = hasMeals || (dayData?.water > 0) || (dayData?.weight > 0);
            const isOverKcal = dailyKcal > (targets?.kcal || 2000);
            const isTargetMet = hasMeals && !isOverKcal && (dailyProtein >= ((targets?.protein || 50) * 0.9)); // Allow 10% margin for perfect

            let heatColorClass = "hover:bg-white/10 text-zinc-500 bg-white/[0.02]"; // 忘記紀錄 (Gray)
            
            if (hasMeals) {
              if (isOverKcal) {
                heatColorClass = "bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:bg-rose-500/30"; // 熱量爆表
              } else if (isTargetMet) {
                heatColorClass = "bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40"; // 完美達標
              } else {
                heatColorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 hover:bg-emerald-500/20"; // 有紀錄但未達完美
              }
            } else if (hasData) {
              heatColorClass = "bg-white/5 text-zinc-400 hover:bg-white/10"; // 只有水量體重
            }

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`
                  relative h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200
                  ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 z-10' : ''}
                  ${isToday && !isSelected ? 'border border-indigo-500/50 text-indigo-400' : ''}
                  ${heatColorClass}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 pt-2 border-t border-zinc-800/50 text-[10px] text-zinc-500 font-bold justify-center flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/30"></div>
            <span>完美達標</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/10"></div>
            <span>有紀錄</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/20"></div>
            <span>熱量爆表</span>
          </div>
        </div>
      </div>
    </div>
  );
};
