import React, { useState } from "react";
import { DayRecord, NutritionTargets, MealRecord, MealItem } from "../types";
import { getDateString, formatFriendlyDate } from "../utils/nutrition";

interface ChartsProps {
  days: Record<string, DayRecord>;
  targets: NutritionTargets;
  goalWeight: number;
}

export const Charts: React.FC<ChartsProps> = ({ days, targets, goalWeight }) => {
  const [hoveredCalorie, setHoveredCalorie] = useState<{ x: number; y: number; val: number; date: string } | null>(null);
  const [hoveredWeight, setHoveredWeight] = useState<{ x: number; y: number; val: number; date: string } | null>(null);
  const [hoveredBodyFat, setHoveredBodyFat] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  // Helper to calculate total calories for a day
  const getDayKcal = (dateStr: string): number => {
    const day = days[dateStr];
    if (!day) return 0;
    let sum = 0;
    (Object.values(day.meals) as MealRecord[][]).forEach((meal) => {
      meal.forEach((item) => {
        if ("type" in item && item.type === "group") {
          item.items.forEach((sub) => (sum += sub.kcal || 0));
        } else {
          const single = item as MealItem;
          sum += single.kcal || 0;
        }
      });
    });
    return sum;
  };

  // 1. Calories Bar Chart (last 14 days)
  const renderCalorieChart = () => {
    const period = 14;
    const data: { date: string; kcal: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const dStr = getDateString(-i);
      data.push({
        date: dStr,
        kcal: getDayKcal(dStr),
      });
    }

    const maxKcal = Math.max(...data.map((d) => d.kcal), targets.kcal) * 1.15 || 2500;
    const chartHeight = 120;
    const barWidthPct = 80 / period;

    return (
      <div className="relative bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-4">
        <h4 className="text-xs font-bold text-zinc-400 tracking-wider mb-4 uppercase">每日熱量消耗與目標 (近 14 天)</h4>
        
        <div className="relative h-[130px] w-full flex items-end justify-between border-b border-zinc-800 pb-1">
          {/* Target Line */}
          <div 
            className="absolute left-0 right-0 border-t border-dashed border-purple-500/60 z-0 flex items-center justify-end"
            style={{ bottom: `${(targets.kcal / maxKcal) * 100}%` }}
          >
            <span className="text-[10px] text-purple-400 font-semibold px-2 bg-zinc-900/90 rounded border border-zinc-800 translate-y-[-50%]">
              目標: {targets.kcal} 大卡
            </span>
          </div>

          {/* Bar elements */}
          {data.map((item, index) => {
            const heightPct = (item.kcal / maxKcal) * 100;
            const isOver = item.kcal > targets.kcal;
            const barBg = item.kcal === 0 
              ? "bg-zinc-800" 
              : isOver 
                ? "bg-rose-500/80 hover:bg-rose-500" 
                : "bg-indigo-500/80 hover:bg-indigo-400";

            return (
              <div 
                key={index} 
                className="flex flex-col items-center flex-1 group"
                style={{ height: "100%" }}
              >
                <div className="relative w-full h-full flex items-end justify-center px-1">
                  {item.kcal > 0 && (
                    <div
                      className={`w-[70%] rounded-t-sm transition-all duration-300 ${barBg} cursor-pointer`}
                      style={{ height: `${heightPct}%` }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCalorie({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          val: Math.round(item.kcal),
                          date: formatFriendlyDate(item.date),
                        });
                      }}
                      onMouseLeave={() => setHoveredCalorie(null)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-1">
          <span>{formatFriendlyDate(data[0].date)}</span>
          <span>{formatFriendlyDate(data[Math.floor(period / 2)].date)}</span>
          <span>{formatFriendlyDate(data[period - 1].date)}</span>
        </div>

        {/* Hover Tooltip */}
        {hoveredCalorie && (
          <div 
            className="fixed bg-black/50 text-white text-xs py-1.5 px-3 rounded-lg border border-zinc-700 shadow-xl pointer-events-none z-50 transition-all duration-100"
            style={{ 
              left: `${hoveredCalorie.x}px`, 
              top: `${hoveredCalorie.y - 45}px`,
              transform: "translateX(-50%)"
            }}
          >
            <div className="font-semibold text-center">{hoveredCalorie.val} kcal</div>
            <div className="text-[10px] text-zinc-400 text-center">{hoveredCalorie.date}</div>
          </div>
        )}
      </div>
    );
  };

  // 2. Combined Trend Chart for both Weight and Bodyfat
  const renderCombinedTrendChart = () => {
    const period = 30;
    const weightPoints: { index: number; val: number; date: string }[] = [];
    const bodyfatPoints: { index: number; val: number; date: string }[] = [];

    let count = 0;
    for (let i = period - 1; i >= 0; i--) {
      const dStr = getDateString(-i);
      const day = days[dStr];
      if (day) {
        if (day.weight !== null && day.weight !== undefined) {
          weightPoints.push({
            index: count,
            val: day.weight,
            date: dStr,
          });
        }
        if (day.bodyfat !== null && day.bodyfat !== undefined) {
          bodyfatPoints.push({
            index: count,
            val: day.bodyfat,
            date: dStr,
          });
        }
      }
      count++;
    }

    const hasWeight = weightPoints.length >= 2;
    const hasBodyfat = bodyfatPoints.length >= 2;

    if (!hasWeight && !hasBodyfat) {
      return (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-4 flex flex-col justify-center items-center h-[160px]">
          <h4 className="text-xs font-bold text-zinc-400 tracking-wider mb-2 uppercase self-start">體重與體脂趨勢 (近 30 天)</h4>
          <span className="text-zinc-400 text-xs">資料不足，請記錄至少 2 天的體重或體脂率以生成趨勢圖</span>
        </div>
      );
    }

    // Helper coordinates
    const getXCoord = (idx: number) => (idx / (period - 1)) * 100;

    // Weight coordinate helper
    let weightPath = "";
    let minW = 0, maxW = 0;
    let getYCoordW = (val: number) => 50; // fallback
    if (hasWeight) {
      const wVals = weightPoints.map((p) => p.val);
      minW = Math.min(...wVals, goalWeight);
      maxW = Math.max(...wVals, goalWeight);
      const wRange = maxW - minW || 1;
      const padMinW = minW - wRange * 0.15;
      const padMaxW = maxW + wRange * 0.15;
      const padRangeW = padMaxW - padMinW || 1;
      getYCoordW = (val: number) => 100 - ((val - padMinW) / padRangeW) * 80 - 10;
      weightPath = weightPoints
        .map((p, idx) => `${idx === 0 ? "M" : "L"}${getXCoord(p.index)} ${getYCoordW(p.val)}`)
        .join(" ");
    }

    // Bodyfat coordinate helper
    let bodyfatPath = "";
    let minF = 0, maxF = 0;
    let getYCoordF = (val: number) => 50; // fallback
    if (hasBodyfat) {
      const fVals = bodyfatPoints.map((p) => p.val);
      minF = Math.min(...fVals);
      maxF = Math.max(...fVals);
      const fRange = maxF - minF || 1;
      const padMinF = minF - fRange * 0.15;
      const padMaxF = maxF + fRange * 0.15;
      const padRangeF = padMaxF - padMinF || 1;
      getYCoordF = (val: number) => 100 - ((val - padMinF) / padRangeF) * 80 - 10;
      bodyfatPath = bodyfatPoints
        .map((p, idx) => `${idx === 0 ? "M" : "L"}${getXCoord(p.index)} ${getYCoordF(p.val)}`)
        .join(" ");
    }

    return (
      <div className="relative bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">體重與體脂雙指標趨勢 (近 30 天)</h4>
            <div className="flex items-center gap-2.5 text-[9px] font-bold">
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                體重 {hasWeight ? `${weightPoints[weightPoints.length - 1].val.toFixed(1)}kg` : "無"}
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                體脂 {hasBodyfat ? `${bodyfatPoints[bodyfatPoints.length - 1].val.toFixed(1)}%` : "無"}
              </span>
            </div>
          </div>
          
          <div className="relative h-[90px] w-full border-b border-zinc-800/80 pb-1">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
              {/* Center divider line */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2,2" />

              {/* Weight trend line */}
              {hasWeight && (
                <path
                  d={weightPath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-85"
                />
              )}

              {/* Bodyfat trend line */}
              {hasBodyfat && (
                <path
                  d={bodyfatPath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-85"
                />
              )}

              {/* Target Goal Weight Guideline */}
              {hasWeight && (
                <g>
                  <line
                    x1="0"
                    y1={getYCoordW(goalWeight)}
                    x2="100"
                    y2={getYCoordW(goalWeight)}
                    stroke="#10b981"
                    strokeWidth="1.25"
                    strokeDasharray="2,2"
                    className="opacity-60"
                  />
                  <text
                    x="98"
                    y={getYCoordW(goalWeight) > 50 ? getYCoordW(goalWeight) - 3 : getYCoordW(goalWeight) + 5}
                    fill="#10b981"
                    fontSize="4"
                    fontWeight="black"
                    textAnchor="end"
                    className="opacity-90 font-mono tracking-wider"
                  >
                    目標 {goalWeight} kg 🎯
                  </text>
                </g>
              )}

              {/* Weight circles */}
              {hasWeight && weightPoints.map((p, idx) => {
                const cx = getXCoord(p.index);
                const cy = getYCoordW(p.val);
                return (
                  <circle
                    key={`w-${idx}`}
                    cx={`${cx}%`}
                    cy={`${cy}%`}
                    r="3.5"
                    fill="#09090b"
                    stroke="#6366f1"
                    strokeWidth="2"
                    className="cursor-pointer transition-transform duration-200 hover:scale-150"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredWeight({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        val: p.val,
                        date: formatFriendlyDate(p.date),
                      });
                    }}
                    onMouseLeave={() => setHoveredWeight(null)}
                  />
                );
              })}

              {/* Bodyfat circles */}
              {hasBodyfat && bodyfatPoints.map((p, idx) => {
                const cx = getXCoord(p.index);
                const cy = getYCoordF(p.val);
                return (
                  <circle
                    key={`f-${idx}`}
                    cx={`${cx}%`}
                    cy={`${cy}%`}
                    r="3.5"
                    fill="#09090b"
                    stroke="#f97316"
                    strokeWidth="2"
                    className="cursor-pointer transition-transform duration-200 hover:scale-150"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredBodyFat({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        val: p.val,
                        date: formatFriendlyDate(p.date),
                      });
                    }}
                    onMouseLeave={() => setHoveredBodyFat(null)}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* X Axis Labels & Ranges */}
        <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono mt-2">
          <span>{formatFriendlyDate(getDateString(-period + 1))}</span>
          <div className="flex gap-2.5">
            {hasWeight && (
              <span>體重: {minW.toFixed(1)}~{maxW.toFixed(1)}kg</span>
            )}
            {hasBodyfat && (
              <span>體脂: {minF.toFixed(1)}~{maxF.toFixed(1)}%</span>
            )}
          </div>
          <span>今天</span>
        </div>

        {/* Weight Tooltip */}
        {hoveredWeight && (
          <div 
            className="fixed bg-black/50 text-white text-[10px] py-1 px-2.5 rounded-lg border border-zinc-700 shadow-xl pointer-events-none z-50 transition-all duration-100"
            style={{ 
              left: `${hoveredWeight.x}px`, 
              top: `${hoveredWeight.y - 45}px`,
              transform: "translateX(-50%)"
            }}
          >
            <div className="font-semibold text-center text-indigo-400">體重: {hoveredWeight.val.toFixed(1)} kg</div>
            <div className="text-[9px] text-zinc-400 text-center">{hoveredWeight.date}</div>
          </div>
        )}

        {/* Bodyfat Tooltip */}
        {hoveredBodyFat && (
          <div 
            className="fixed bg-black/50 text-white text-[10px] py-1 px-2.5 rounded-lg border border-zinc-700 shadow-xl pointer-events-none z-50 transition-all duration-100"
            style={{ 
              left: `${hoveredBodyFat.x}px`, 
              top: `${hoveredBodyFat.y - 45}px`,
              transform: "translateX(-50%)"
            }}
          >
            <div className="font-semibold text-center text-orange-400">體脂率: {hoveredBodyFat.val.toFixed(1)}%</div>
            <div className="text-[9px] text-zinc-400 text-center">{hoveredBodyFat.date}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {renderCalorieChart()}
      {renderCombinedTrendChart()}
    </div>
  );
};
