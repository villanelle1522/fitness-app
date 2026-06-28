import React, { useMemo } from "react";
import { DBState, Settings } from "../types";
import { getTodayString } from "../utils/nutrition";
import { Target, TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";

interface WeeklyReportProps {
  db: DBState;
  currentDate: string;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ db, currentDate }) => {
  const report = useMemo(() => {
    // 找出過去 7 天的資料 (包含今天)
    const today = new Date(currentDate);
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      last7Days.push(dStr);
    }

    let totalKcal = 0;
    let daysWithFood = 0;
    let startWeight: number | null = null;
    let endWeight: number | null = null;

    last7Days.forEach((dStr, index) => {
      const day = db.days[dStr];
      if (day) {
        // 計算這天的熱量
        let dayKcal = 0;
        Object.values(day.meals).flat().forEach(m => {
          dayKcal += m.items.reduce((sum, item) => sum + item.kcal, 0);
        });
        
        if (dayKcal > 0) {
          totalKcal += dayKcal;
          daysWithFood++;
        }

        // 找起訖體重
        if (day.weight) {
          if (startWeight === null) startWeight = day.weight;
          endWeight = day.weight; // 最後一個有體重的就是 endWeight
        }
      }
    });

    const avgKcal = daysWithFood > 0 ? Math.round(totalKcal / daysWithFood) : 0;
    const weightDiff = (startWeight && endWeight) ? (endWeight - startWeight) : 0;
    
    // 目標建議邏輯
    let suggestion = "";
    let targetAdjustment = 0;
    let icon = <Minus className="w-5 h-5 text-zinc-400" />;

    const targetKcal = db.settings.targets?.kcal || 2000;

    if (daysWithFood >= 4 && startWeight && endWeight) {
      if (weightDiff > 0.3) {
        suggestion = "本週體重有上升趨勢。若您的目標是減重，建議下週可嘗試將每日目標稍微下調 100 大卡，並增加活動量。";
        targetAdjustment = -100;
        icon = <TrendingUp className="w-5 h-5 text-rose-400" />;
      } else if (weightDiff < -0.2) {
        suggestion = "本週體重順利下降，請繼續保持目前的飲食節奏！若感覺飢餓，可適度補充蛋白質。";
        targetAdjustment = 0;
        icon = <TrendingDown className="w-5 h-5 text-emerald-400" />;
      } else {
        suggestion = "本週體重維持平穩。若處於減重停滯期，建議可下調 50-100 大卡，或嘗試改變運動型態。";
        targetAdjustment = -50;
        icon = <Minus className="w-5 h-5 text-indigo-400" />;
      }
    } else {
      suggestion = "過去 7 天的紀錄較少，建議每天持續紀錄體重與飲食，系統才能給予準確的週報表分析。";
    }

    return {
      avgKcal,
      startWeight,
      endWeight,
      weightDiff,
      suggestion,
      targetAdjustment,
      icon,
      targetKcal
    };
  }, [db, currentDate]);

  return (
    <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Target className="w-24 h-24" />
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-black tracking-widest text-zinc-200 uppercase">AI 週報表與動態目標</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-black/30 rounded-2xl p-4 border border-zinc-800/80">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">近 7 天平均攝取</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-black text-white">{report.avgKcal}</span>
            <span className="text-xs text-zinc-500 font-bold mb-1">kcal</span>
          </div>
        </div>
        <div className="bg-black/30 rounded-2xl p-4 border border-zinc-800/80">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">近 7 天體重變化</p>
          <div className="flex items-center gap-2">
            {report.icon}
            <div className="flex items-end gap-1">
              <span className={`text-2xl font-black ${report.weightDiff > 0 ? "text-rose-400" : report.weightDiff < 0 ? "text-emerald-400" : "text-zinc-200"}`}>
                {report.weightDiff > 0 ? "+" : ""}{report.weightDiff > 0 || report.weightDiff < 0 ? report.weightDiff.toFixed(1) : "-"}
              </span>
              <span className="text-xs text-zinc-500 font-bold mb-1">kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-2 relative z-10">
        <p className="text-xs text-indigo-200 leading-relaxed font-bold">
          {report.suggestion}
        </p>
        {report.targetAdjustment !== 0 && (
          <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center justify-between">
            <span className="text-[11px] text-indigo-300 font-bold">目前目標: {report.targetKcal} kcal</span>
            <span className="text-[11px] text-indigo-300 font-bold">建議調整: {report.targetKcal + report.targetAdjustment} kcal</span>
          </div>
        )}
      </div>
    </div>
  );
};
