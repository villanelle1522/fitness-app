import React, { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { DayRecord, NutritionTargets, MealRecord, MealItem, MealGroup } from "../types";
import { getDateString, formatFriendlyDate } from "../utils/nutrition";

interface ChartsProps {
  days: Record<string, DayRecord>;
  targets: NutritionTargets;
  goalWeight: number;
}

type ChartMetric = "kcal" | "protein" | "carb" | "fat";

export const Charts: React.FC<ChartsProps> = ({ days, targets, goalWeight }) => {
  const [activeTab, setActiveTab] = useState<ChartMetric>("kcal");
  const [hoveredMetric, setHoveredMetric] = useState<{ x: number; y: number; val: number; date: string } | null>(null);
  const [hoveredWeight, setHoveredWeight] = useState<{ x: number; y: number; val: number; date: string; kcal?: number } | null>(null);
  const [hoveredBodyFat, setHoveredBodyFat] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  // Helper to calculate total metrics for a day
  const getDayMetric = (dateStr: string, metric: ChartMetric): number => {
    const day = days[dateStr];
    if (!day) return 0;
    let sum = 0;
    (Object.values(day.meals) as MealRecord[][]).forEach((meal) => {
      meal.forEach((item) => {
        if ("type" in item && item.type === "group") {
          item.items.forEach((sub) => (sum += sub[metric] || 0));
        } else {
          const single = item as MealItem;
          sum += single[metric] || 0;
        }
      });
    });
    return sum;
  };

  const periodCalorie = 7;
  const metricChartData = useMemo(() => {
    const data: { date: string; val: number }[] = [];
    for (let i = periodCalorie - 1; i >= 0; i--) {
      const dStr = getDateString(-i);
      data.push({
        date: dStr,
        val: getDayMetric(dStr, activeTab),
      });
    }
    return data;
  }, [days, periodCalorie, activeTab]);

  // 1. Metric Bar Chart (last 14 days)
  const renderMetricChart = () => {
    const data = metricChartData;
    const currentTarget = targets[activeTab] || 0;
    const maxVal = Math.max(...data.map((d) => d.val), currentTarget) * 1.15 || (activeTab === "kcal" ? 2500 : 100);
    const chartHeight = 120;
    
    const metricConfig = {
      kcal: { label: "熱量", unit: "大卡", color: "bg-indigo-500", hoverColor: "hover:bg-indigo-400", targetColor: "border-purple-500/60", textColor: "text-purple-400", overColor: "bg-rose-500/80 hover:bg-rose-500" },
      protein: { label: "蛋白質", unit: "克", color: "bg-emerald-500", hoverColor: "hover:bg-emerald-400", targetColor: "border-emerald-500/60", textColor: "text-emerald-400", overColor: "bg-emerald-500/80 hover:bg-emerald-500" },
      carb: { label: "碳水", unit: "克", color: "bg-orange-500", hoverColor: "hover:bg-orange-400", targetColor: "border-orange-500/60", textColor: "text-orange-400", overColor: "bg-rose-500/80 hover:bg-rose-500" },
      fat: { label: "脂肪", unit: "克", color: "bg-amber-400", hoverColor: "hover:bg-amber-300", targetColor: "border-amber-400/60", textColor: "text-amber-400", overColor: "bg-rose-500/80 hover:bg-rose-500" }
    };
    
    const config = metricConfig[activeTab];

    return (
      <div className="relative group h-full">
        <div className="absolute -inset-1 rounded-3xl opacity-[0.2] blur-xl bg-gradient-to-br from-indigo-500/20 via-white/10 to-transparent group-hover:opacity-[0.4] group-active:opacity-[0.5] group-active:scale-95 transition-all duration-500 pointer-events-none" />
        <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-4 h-full flex flex-col justify-between">
          
          <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1">營養攝取趨勢 (近 7 天)</h4>
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                透過追蹤一週內的營養素變化，可以檢視飲食是否穩定，並依據目標線調整未來的攝取量，確保身體處於最佳代謝狀態。
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-black/50 rounded-lg p-0.5 border border-zinc-800/80">
              {(["kcal", "protein", "carb", "fat"] as ChartMetric[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-colors ${
                    activeTab === tab ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {metricConfig[tab].label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end mb-2">
            <div className={`flex items-center gap-1.5 text-[9px] ${config.textColor} font-extrabold bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800 uppercase tracking-widest shrink-0`}>
              <span className={`w-2.5 h-0 border-t border-dashed ${config.targetColor} inline-block`} />
              <span>目標 {Math.round(currentTarget)} {config.unit}</span>
            </div>
          </div>
        
        <div className="relative h-[130px] w-full flex items-end justify-between border-b border-zinc-800 pb-1">
          {/* Target Line */}
          <div 
            className={`absolute left-0 right-0 border-t border-dashed ${config.targetColor} z-0 flex items-center justify-end animate-pulse`}
            style={{ bottom: `${(currentTarget / maxVal) * 100}%` }}
          />

          {/* Bar elements */}
          {data.map((item, index) => {
            const heightPct = (item.val / maxVal) * 100;
            const isOver = item.val > currentTarget;
            // For protein, going over target is often good, so we keep it green or slightly different. For others, going over might be red.
            const barBg = item.val === 0 
              ? "bg-zinc-800" 
              : isOver 
                ? config.overColor 
                : `${config.color}/80 ${config.hoverColor}`;

            return (
              <div 
                key={index} 
                className="flex flex-col items-center flex-1 group"
                style={{ height: "100%" }}
              >
                <div className="relative w-full h-full flex items-end justify-center px-1">
                  {item.val > 0 && (
                    <div
                      className={`w-[70%] rounded-t-sm transition-all duration-300 ${barBg} cursor-pointer`}
                      style={{ height: `${heightPct}%` }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredMetric({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          val: Math.round(item.val * 10) / 10,
                          date: formatFriendlyDate(item.date),
                        });
                      }}
                      onMouseLeave={() => setHoveredMetric(null)}
                      onTouchStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredMetric({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          val: Math.round(item.val * 10) / 10,
                          date: formatFriendlyDate(item.date),
                        });
                      }}
                      onTouchEnd={() => {
                        setTimeout(() => setHoveredMetric(null), 2500);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-2 px-1">
          {data.map((item, index) => {
            const dateStr = item.date.split("-");
            return (
              <div key={index} className="flex-1 text-center truncate">
                {dateStr[1]}/{dateStr[2]}
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip */}
        {hoveredMetric && (
          <div 
            className="fixed bg-zinc-900 border border-zinc-700 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-2xl pointer-events-none z-[100] transition-all duration-100 flex flex-col items-center backdrop-blur-md"
            style={{ 
              left: `${hoveredMetric.x}px`, 
              top: `${hoveredMetric.y - 45}px`,
              transform: "translateX(-50%)"
            }}
          >
            <div className={`font-semibold text-center ${config.textColor}`}>{hoveredMetric.val} {config.unit}</div>
            <div className="text-[9px] text-zinc-400 text-center">{hoveredMetric.date}</div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-700"></div>
          </div>
        )}
        </div>
      </div>
    );
  };

  const periodTrend = 30;
  const trendChartData = useMemo(() => {
    const weightPoints: { val: number; date: string }[] = [];
    const caloriePoints: { val: number; date: string }[] = [];

    for (let i = periodTrend - 1; i >= 0; i--) {
      const dStr = getDateString(-i);
      const day = days[dStr];
      if (day) {
        if (day.weight !== null && day.weight !== undefined) {
          weightPoints.push({
            val: day.weight,
            date: dStr,
          });
        }
        // Calculate kcal for the day
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
        caloriePoints.push({
          val: sum,
          date: dStr,
        });
      }
    }

    weightPoints.sort((a, b) => a.date.localeCompare(b.date));
    caloriePoints.sort((a, b) => a.date.localeCompare(b.date));

    return { weightPoints, caloriePoints };
  }, [days, periodTrend]);

  // 2. Combined Trend Chart for Weight and Calories
  const renderCombinedTrendChart = () => {
    const { weightPoints, caloriePoints } = trendChartData;
    const hasWeight = weightPoints.length >= 2;
    const hasCalories = caloriePoints.length >= 2;

    const allDates = [
      ...weightPoints.map((p) => p.date),
      ...caloriePoints.map((p) => p.date),
    ].sort();

    const uniqueDates = Array.from(new Set(allDates)).sort();
    const hasData = uniqueDates.length >= 2;

    if (!hasData) {
      return (
        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-4 flex flex-col justify-center items-center h-[160px]">
          <h4 className="text-xs font-bold text-zinc-400 tracking-wider mb-2 uppercase self-start">體重與熱量趨勢 (近 30 天)</h4>
          <span className="text-zinc-400 text-xs">資料不足，請記錄至少 2 天的體重或熱量以生成趨勢圖</span>
        </div>
      );
    }

    const startDate = uniqueDates[0];
    const endDate = uniqueDates[uniqueDates.length - 1];

    const getDayDiff = (dateStr1: string, dateStr2: string): number => {
      const d1 = new Date(dateStr1 + "T00:00:00");
      const d2 = new Date(dateStr2 + "T00:00:00");
      const diffTime = d2.getTime() - d1.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    const totalDays = Math.max(1, getDayDiff(startDate, endDate));

    const getXCoord = (dateStr: string) => {
      const daysFromStart = getDayDiff(startDate, dateStr);
      return (daysFromStart / totalDays) * 100;
    };

    // Weight coordinate helper
    let weightPath = "";
    let minW = 0, maxW = 0;
    let getYCoordW = (val: number) => 50; // fallback
    if (hasWeight) {
      const wVals = weightPoints.map((p) => p.val);
      const actualMaxW = Math.max(...wVals, goalWeight);
      const actualMinW = Math.min(...wVals, goalWeight);
      minW = actualMinW - 2;
      maxW = actualMaxW + 2;
      const wRange = maxW - minW || 1;
      getYCoordW = (val: number) => 100 - ((val - minW) / wRange) * 80 - 10;
      weightPath = weightPoints
        .map((p, idx) => `${idx === 0 ? "M" : "L"}${getXCoord(p.date)} ${getYCoordW(p.val)}`)
        .join(" ");
    }

    // Calorie Coordinate Helper
    let maxC = 2500;
    const targetKcal = targets.kcal || 2000;
    if (hasCalories) {
      const cVals = caloriePoints.map((p) => p.val);
      maxC = Math.max(...cVals, targetKcal) * 1.15;
    }

    return (
      <div className="relative group h-full">
        <div className="absolute -inset-1 rounded-3xl opacity-[0.2] blur-xl bg-gradient-to-br from-indigo-500/20 via-white/10 to-transparent group-hover:opacity-[0.4] transition-all duration-500 pointer-events-none" />
        <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">體重與熱量趨勢 (近 30 天)</h4>
            <div className="flex items-center gap-2 text-[9px] font-bold flex-wrap">
              {hasWeight && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[8px] uppercase tracking-wider">
                  <Trophy className="w-2.5 h-2.5" /> 目標 {goalWeight} kg
                </span>
              )}
              <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                體重 {hasWeight ? `${weightPoints[weightPoints.length - 1].val.toFixed(1)}kg` : "無"}
              </span>
            </div>
          </div>
          
          <div className="relative h-[160px] w-full border-b border-zinc-800/80 pb-1">
            {/* Calorie Bars Layer */}
            <div className="absolute inset-0 flex items-end justify-between px-1 pointer-events-none z-0 opacity-40">
              {caloriePoints.map((p, idx) => {
                const heightPct = (p.val / maxC) * 100;
                const isOver = p.val > targetKcal;
                const bgClass = p.val === 0 ? "bg-transparent" : isOver ? "bg-rose-500/60" : "bg-emerald-500/60";
                const cx = getXCoord(p.date);
                
                return (
                  <div 
                    key={`c-bar-${idx}`} 
                    className="absolute bottom-0 w-2 sm:w-3 -translate-x-1/2 flex flex-col justify-end"
                    style={{ left: `${cx}%`, height: "100%" }}
                  >
                     {p.val > 0 && <div className={`w-full rounded-t-sm ${bgClass}`} style={{ height: `${heightPct}%` }} />}
                  </div>
                );
              })}
              {/* Target Calorie Line */}
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-zinc-500/50"
                style={{ bottom: `${(targetKcal / maxC) * 100}%` }}
              />
            </div>

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 overflow-visible z-10 pointer-events-none">
              {/* Weight trend line */}
              {hasWeight && (
                <path
                  d={weightPath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="opacity-85"
                />
              )}

              {/* Target Goal Weight Guideline */}
              {hasWeight && (
                <line
                  x1="0"
                  y1={getYCoordW(goalWeight)}
                  x2="100"
                  y2={getYCoordW(goalWeight)}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  vectorEffect="non-scaling-stroke"
                  className="opacity-80"
                />
              )}
            </svg>

            {/* Weight HTML circles */}
            {hasWeight && weightPoints.map((p, idx) => {
              const cx = getXCoord(p.date);
              const cy = getYCoordW(p.val);
              // Find matching calorie val
              const cPoint = caloriePoints.find(cp => cp.date === p.date);
              const cVal = cPoint ? cPoint.val : 0;

              return (
                <div
                  key={`w-touch-target-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center z-20 cursor-pointer group"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                  onMouseEnter={() => {
                    setHoveredWeight({ x: cx, y: cy, val: p.val, date: formatFriendlyDate(p.date), kcal: cVal });
                  }}
                  onMouseLeave={() => setHoveredWeight(null)}
                  onTouchStart={() => {
                    setHoveredWeight({ x: cx, y: cy, val: p.val, date: formatFriendlyDate(p.date), kcal: cVal });
                  }}
                  onTouchEnd={() => {
                    setTimeout(() => setHoveredWeight(null), 2500);
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border-[2px] border-indigo-500 group-hover:scale-150 group-active:scale-150 transition-transform duration-200" />
                </div>
              );
            })}

            {/* Tooltip (Positioned relative to the SVG container!) */}
            {hoveredWeight && (
              <div 
                className="absolute bg-zinc-900 border border-zinc-700 text-white text-[10px] py-2 px-3 rounded-xl shadow-2xl pointer-events-none z-[100] transition-all duration-100 flex flex-col gap-1 items-center backdrop-blur-md"
                style={{ 
                  left: `${hoveredWeight.x}%`, 
                  top: `max(0%, ${hoveredWeight.y}% - 10px)`,
                  transform: "translate(-50%, -100%)",
                  minWidth: "100px"
                }}
              >
                <div className="font-semibold text-indigo-400 text-xs">體重: {hoveredWeight.val.toFixed(1)} kg</div>
                <div className={`font-bold ${hoveredWeight.kcal > targetKcal ? 'text-rose-400' : 'text-emerald-400'}`}>
                  熱量: {Math.round(hoveredWeight.kcal)} 大卡
                </div>
                <div className="text-[9px] text-zinc-400">{hoveredWeight.date}</div>
                {/* Small downward arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-700"></div>
              </div>
            )}
          </div>

        {/* X Axis Labels & Ranges */}
        <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono mt-2 border-t border-zinc-800/50 pt-1.5">
          <span>{formatFriendlyDate(startDate)}</span>
          <div className="flex gap-2.5">
            {hasWeight && (
              <span>體重: {minW.toFixed(1)}~{maxW.toFixed(1)}kg</span>
            )}
          </div>
          <span>{formatFriendlyDate(endDate)}</span>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {renderMetricChart()}
      {renderCombinedTrendChart()}
    </div>
  );
};
