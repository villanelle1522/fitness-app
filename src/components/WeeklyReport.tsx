import React, { useMemo, useState } from "react";
import { DBState, Settings, isMealGroup, MealRecord } from "../types";
import { getTodayString } from "../utils/nutrition";
import { 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  AlertCircle, 
  DollarSign, 
  Coins, 
  Scale, 
  Sparkles, 
  Timer, 
  Info, 
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Flame,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface WeeklyReportProps {
  db: DBState;
  currentDate: string;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ db, currentDate }) => {
  const [showScientificFastingInfo, setShowScientificFastingInfo] = useState(false);
  const [showPriceTip, setShowPriceTip] = useState(false);

  const report = useMemo(() => {
    // 1. 找出過去 7 天的資料 (包含今天)
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

    last7Days.forEach((dStr) => {
      const day = db.days[dStr];
      if (day) {
        let dayKcal = 0;
        (Object.values(day.meals).flat() as MealRecord[]).forEach((m) => {
          if (isMealGroup(m)) {
            dayKcal += m.items.reduce((sum, item) => sum + (item.kcal || 0), 0);
          } else {
            dayKcal += m.kcal || 0;
          }
        });
        
        if (dayKcal > 0) {
          totalKcal += dayKcal;
          daysWithFood++;
        }

        if (day.weight) {
          if (startWeight === null) startWeight = day.weight;
          endWeight = day.weight;
        }
      }
    });

    const avgKcal = daysWithFood > 0 ? Math.round(totalKcal / daysWithFood) : 0;
    const weightDiff = (startWeight && endWeight) ? (endWeight - startWeight) : 0;
    
    // 原始目標建議邏輯
    let suggestion = "";
    let targetAdjustment = 0;
    let icon = <Minus className="w-5 h-5 text-zinc-400" />;

    const targetKcal = db.settings.targets?.kcal || 1510;

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

    // 2. 多維斷食與體重下降幅度精算 (Fasting vs Weight Loss Correlation)
    const deepFastDiffs: number[] = [];  // >= 16 小時
    const mildFastDiffs: number[] = [];  // 12 - 16 小時
    const shortFastDiffs: number[] = []; // < 12 小時 (或無斷食)

    const allDates = Object.keys(db.days).sort();
    for (let i = 0; i < allDates.length - 1; i++) {
      const todayStr = allDates[i];
      const nextDayStr = allDates[i + 1];
      const todayData = db.days[todayStr];
      const nextDayData = db.days[nextDayStr];
      
      const t1 = new Date(todayStr).getTime();
      const t2 = new Date(nextDayStr).getTime();
      if (t2 - t1 <= 86400000 * 1.5) { // 連續天
        if (todayData.weight !== null && todayData.weight !== undefined &&
            nextDayData.weight !== null && nextDayData.weight !== undefined) {
          const diff = nextDayData.weight - todayData.weight;
          const fastingHours = todayData.fastingHours || 0;
          if (fastingHours >= 16) {
            deepFastDiffs.push(diff);
          } else if (fastingHours >= 12) {
            mildFastDiffs.push(diff);
          } else {
            shortFastDiffs.push(diff);
          }
        }
      }
    }

    const avgDeepDiff = deepFastDiffs.length > 0 ? (deepFastDiffs.reduce((a, b) => a + b, 0) / deepFastDiffs.length) : null;
    const avgMildDiff = mildFastDiffs.length > 0 ? (mildFastDiffs.reduce((a, b) => a + b, 0) / mildFastDiffs.length) : null;
    const avgShortDiff = shortFastDiffs.length > 0 ? (shortFastDiffs.reduce((a, b) => a + b, 0) / shortFastDiffs.length) : null;

    // 判斷最具顯著相關性的斷食時長
    let fastingCorrelationInsight = "";
    const hasAnyFastingData = deepFastDiffs.length > 0 || mildFastDiffs.length > 0;
    
    if (hasAnyFastingData) {
      const deepVal = avgDeepDiff !== null ? avgDeepDiff : 0;
      const mildVal = avgMildDiff !== null ? avgMildDiff : 0;
      const shortVal = avgShortDiff !== null ? avgShortDiff : 0;

      if (avgDeepDiff !== null && deepVal < mildVal && deepVal < shortVal) {
        fastingCorrelationInsight = `📊 數據分析：進行 16 小時以上「進階斷食」時，您隔天的體重降幅最大 (平均 ${deepVal.toFixed(2)} kg)。這證實了 16 小時以上能觸發更深度的肝糖消耗與脂肪動員，對您的減重方案極具成效！`;
      } else if (avgMildDiff !== null && mildVal < shortVal) {
        fastingCorrelationInsight = `📊 數據分析：進行 12-16 小時「溫和斷食」已能為您帶來良好的隔天體重變化 (平均 ${mildVal.toFixed(2)} kg)。若希望突破，可嘗試逐步將斷食時間拉長至 16 小時。`;
      } else {
        fastingCorrelationInsight = `📊 數據分析：目前數據顯示不同斷食長度對體重的即時降幅接近。建議拉長觀察期，或結合低碳水飲食，讓身體能更順暢地在斷食期間利用脂肪。`;
      }
    } else {
      fastingCorrelationInsight = "💡 快來開始您的首次斷食吧！連續記錄斷食時長與體重，AI 會自動為您計算出「最適合您的黃金斷食區間（如 168 或 186）與體重降幅關聯」。";
    }

    // 3. 💰 金額/餐費開銷與營養 CP 值 (性價比) 深度分析
    interface PricedMeal {
      name: string;
      price: number;
      protein: number;
      kcal: number;
      date: string;
    }
    const pricedMeals: PricedMeal[] = [];
    let totalSpentLast7Days = 0;
    let pricedDaysCount7Days = 0;
    
    const last30Days: string[] = [];
    const max30 = new Date(currentDate);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(max30);
      d.setDate(max30.getDate() - i);
      last30Days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    last30Days.forEach(dStr => {
      const day = db.days[dStr];
      if (!day) return;

      let daySpend = 0;
      (Object.values(day.meals).flat() as MealRecord[]).forEach(m => {
        if (isMealGroup(m)) {
          if (m.price !== undefined && m.price > 0) {
            daySpend += m.price;
            pricedMeals.push({
              name: m.name || "餐點組合",
              price: m.price,
              protein: m.items.reduce((s, it) => s + (it.protein || 0), 0),
              kcal: m.items.reduce((s, it) => s + (it.kcal || 0), 0),
              date: dStr
            });
          } else {
            m.items.forEach(it => {
              if (it.price !== undefined && it.price > 0) {
                daySpend += it.price;
                pricedMeals.push({
                  name: it.name,
                  price: it.price,
                  protein: it.protein || 0,
                  kcal: it.kcal || 0,
                  date: dStr
                });
              }
            });
          }
        } else {
          if (m.price !== undefined && m.price > 0) {
            daySpend += m.price;
            pricedMeals.push({
              name: m.name,
              price: m.price,
              protein: m.protein || 0,
              kcal: m.kcal || 0,
              date: dStr
            });
          }
        }
      });

      if (daySpend > 0) {
        if (last7Days.includes(dStr)) {
          totalSpentLast7Days += daySpend;
          pricedDaysCount7Days++;
        }
      }
    });

    const hasPriceLogs = pricedMeals.length > 0;

    // 計算蛋白質 CP 值 (每花費 100 元可獲得多少公克蛋白質)
    const proteinCpList = pricedMeals
      .filter(m => m.price > 0 && m.protein > 0)
      .map(m => ({
        name: m.name,
        price: m.price,
        protein: m.protein,
        cp: (m.protein / m.price) * 100 // 克蛋白質 / 100 元
      }));

    // 去除重複，同名食物取 CP 值最高者
    const uniqueCpMap: Record<string, typeof proteinCpList[0]> = {};
    proteinCpList.forEach(item => {
      if (!uniqueCpMap[item.name] || uniqueCpMap[item.name].cp < item.cp) {
        uniqueCpMap[item.name] = item;
      }
    });
    const topProteinCpItems = Object.values(uniqueCpMap).sort((a, b) => b.cp - a.cp).slice(0, 3);

    // 交叉分析：熱量控制 vs 飲食開銷 (最後30天)
    let metSpendSum = 0;
    let metDaysCount = 0;
    let overSpendSum = 0;
    let overDaysCount = 0;

    last30Days.forEach(dStr => {
      const day = db.days[dStr];
      if (!day) return;

      let dayKcal = 0;
      let daySpend = 0;
      (Object.values(day.meals).flat() as MealRecord[]).forEach(m => {
        if (isMealGroup(m)) {
          dayKcal += m.items.reduce((s, it) => s + (it.kcal || 0), 0);
          daySpend += m.price || m.items.reduce((s, it) => s + (it.price || 0), 0);
        } else {
          dayKcal += m.kcal || 0;
          daySpend += m.price || 0;
        }
      });

      if (daySpend > 0 && dayKcal > 0) {
        if (dayKcal <= targetKcal) {
          metSpendSum += daySpend;
          metDaysCount++;
        } else {
          overSpendSum += daySpend;
          overDaysCount++;
        }
      }
    });

    const avgMetSpend = metDaysCount > 0 ? Math.round(metSpendSum / metDaysCount) : 0;
    const avgOverSpend = overDaysCount > 0 ? Math.round(overSpendSum / overDaysCount) : 0;

    return {
      avgKcal,
      startWeight,
      endWeight,
      weightDiff,
      suggestion,
      targetAdjustment,
      icon,
      targetKcal,
      
      // 斷食相關
      deepFastCount: deepFastDiffs.length,
      avgDeepDiff,
      mildFastCount: mildFastDiffs.length,
      avgMildDiff,
      shortFastCount: shortFastDiffs.length,
      avgShortDiff,
      fastingCorrelationInsight,
      hasAnyFastingData,

      // 金額相關
      hasPriceLogs,
      totalSpentLast7Days,
      avgDailySpend: pricedDaysCount7Days > 0 ? Math.round(totalSpentLast7Days / pricedDaysCount7Days) : 0,
      pricedDaysCount7Days,
      topProteinCpItems,
      avgMetSpend,
      avgOverSpend,
      hasComplianceComparison: metDaysCount > 0 && overDaysCount > 0
    };
  }, [db, currentDate]);

  return (
    <div className="space-y-6">
      
      {/* ────────────────── SECTION 1: AI GENERAL WEEKLY REPORT ────────────────── */}
      <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-5">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Target className="w-24 h-24" />
        </div>
        
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <AlertCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">AI 週報表與健康動態</h3>
              <p className="text-xs text-zinc-400 font-bold">根據您過去 7 天的數據分析與建議</p>
            </div>
          </div>
        
          {/* Suggestion Box */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
            <p className="text-sm text-zinc-300 font-bold leading-relaxed">
              {report.suggestion}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
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

        {report.targetAdjustment !== 0 && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-300 font-bold">目前熱量目標: {report.targetKcal} kcal</span>
              <span className="text-xs text-indigo-200 font-black">AI 建議下調: {report.targetKcal + report.targetAdjustment} kcal</span>
            </div>
            <p className="text-[11px] text-indigo-300/80 leading-relaxed font-bold">
              調降目標有助於維持穩定的熱量赤字，搭配每天記錄的體重與飲食，下週系統會依據體重表現重新評估您的動態平衡點。
            </p>
          </div>
        )}
      </div>

      {/* ────────────────── SECTION 2: FASTING VS WEIGHT LOSS CORRELATION ────────────────── */}
      <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-tight">Fasting vs. Weight 斷食與體重關聯分析</h3>
              <p className="text-[10px] text-zinc-400 font-bold">精算斷食長度對您翌日體重變化的影響</p>
            </div>
          </div>
          <button 
            onClick={() => setShowScientificFastingInfo(!showScientificFastingInfo)}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <Info className="w-4 h-4"/>
            <span className="hidden sm:inline">科學原理</span>
          </button>
        </div>

        {/* Brackets Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Deep Fasting Card */}
          <div className="bg-black/30 border border-emerald-500/15 rounded-2xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-emerald-400 font-black tracking-wide">進階斷食 (168/186)</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                  {report.deepFastCount} 次記錄
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 font-bold mb-2">斷食持續 16 小時以上</p>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-black text-white">
                {report.avgDeepDiff !== null ? `${report.avgDeepDiff > 0 ? "+" : ""}${report.avgDeepDiff.toFixed(2)}` : "--"}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">kg / 天</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full" 
                style={{ width: report.avgDeepDiff !== null ? `${Math.min(100, Math.abs(report.avgDeepDiff) * 200)}%` : "0%" }}
              />
            </div>
          </div>

          {/* Mild Fasting Card */}
          <div className="bg-black/30 border border-amber-500/15 rounded-2xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-amber-400 font-black tracking-wide">溫和斷食 (12-16h)</span>
                <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded-full font-mono font-bold">
                  {report.mildFastCount} 次記錄
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 font-bold mb-2">斷食持續 12 到 16 小時</p>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-black text-white">
                {report.avgMildDiff !== null ? `${report.avgMildDiff > 0 ? "+" : ""}${report.avgMildDiff.toFixed(2)}` : "--"}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">kg / 天</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full" 
                style={{ width: report.avgMildDiff !== null ? `${Math.min(100, Math.abs(report.avgMildDiff) * 200)}%` : "0%" }}
              />
            </div>
          </div>

          {/* Short Fasting Card */}
          <div className="bg-black/30 border border-zinc-800 rounded-2xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-400 font-black tracking-wide">無/短斷食 (&lt; 12h)</span>
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                  {report.shortFastCount} 次記錄
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 font-bold mb-2">斷食短於 12 小時或未執行</p>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl font-black text-white">
                {report.avgShortDiff !== null ? `${report.avgShortDiff > 0 ? "+" : ""}${report.avgShortDiff.toFixed(2)}` : "--"}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">kg / 天</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden">
              <div 
                className="h-full bg-zinc-600 rounded-full" 
                style={{ width: report.avgShortDiff !== null ? `${Math.min(100, Math.abs(report.avgShortDiff) * 200)}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic AI Analysis Conclusion */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5">
          <p className="text-xs text-emerald-300 font-bold leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{report.fastingCorrelationInsight}</span>
          </p>
        </div>

        {/* Interactive Scientific Principles Accordion */}
        {showScientificFastingInfo && (
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3 text-xs text-zinc-300 animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-extrabold text-white flex items-center gap-1 text-xs">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              12-16-18 小時斷食對脂肪代謝與細胞自噬的醫學臨床原理
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                <span className="text-sky-300 font-black block mb-1">12 小時 ➔ 肝糖耗盡</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  人體在最後一餐後約 12 小時開始耗盡儲存於肝臟的醣分，此時身體燃料會轉換為脂肪分解生成的酮體，開始微量燃燒脂肪。
                </p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                <span className="text-emerald-300 font-black block mb-1">16 小時 ➔ 自噬修復門檻</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  達到 16 小時 (經典 168) 是臨床認定細胞開啟「細胞自噬 (Autophagy)」的黃金時間。細胞會主動吞噬老舊或病變的蛋白質，進行大掃除與新生，脂肪燃燒效率進入陡峭期。
                </p>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                <span className="text-purple-300 font-black block mb-1">18 小時以上 ➔ 代謝高峰</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  18 到 20 小時斷食能讓細胞自噬達到極限。人體生長激素 (HGH) 加倍分泌，抗發炎反應與胰島素敏感度提升到最高峰，對減脂停滯期有極強突破效果。
                </p>
              </div>
            </div>
            
            <p className="text-[10px] text-zinc-500 font-bold text-center">
              ⚠️ 註：執行 16 小時以上斷食時，請確保於進食窗口攝取足夠水分與充足蛋白質，以防止肌肉流失。
            </p>
          </div>
        )}
      </div>

      {/* ────────────────── SECTION 3: DIET EXPENSE & CP VALUE ANALYTICS ────────────────── */}
      <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <PiggyBank className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-white text-base tracking-tight">💰 飲食開銷與營養 CP 值 (性價比) 分析</h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">選填</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold">掌握健康飲食與預算控制的完美平衡點</p>
            </div>
          </div>
          <button 
            onClick={() => setShowPriceTip(!showPriceTip)}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <HelpCircle className="w-4 h-4"/>
            <span className="hidden sm:inline">如何運作？</span>
          </button>
        </div>

        {showPriceTip && (
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 text-xs text-zinc-300 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-extrabold text-white flex items-center gap-1 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              如何啟動這項功能？
            </h4>
            <p className="leading-relaxed text-[11px] text-zinc-400">
              在記錄今日餐點時，每一個食物項目都有一個可供輸入的<strong>「金額」</strong>欄位（這不是必填項目）。
              當您養成隨手填寫金額的習慣，系統便能自動計算您在不同類別食物上的支出，並進一步計算哪一種餐點、哪一種食物提供給您的「蛋白質」或「熱量」性價比最高，讓您「聰明增肌、省錢減脂」！
            </p>
          </div>
        )}

        {/* Conditionally Render: Real Data Analysis VS. Fully Interactive Demo Guide */}
        {report.hasPriceLogs ? (
          <div className="space-y-4">
            {/* Overview Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/30 border border-zinc-850 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">近 7 天飲食總花費</span>
                  <span className="text-2xl font-black text-white">${report.totalSpentLast7Days} <span className="text-xs text-zinc-500 font-bold">元</span></span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                  <Coins className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="bg-black/30 border border-zinc-850 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">有記帳日之日均餐費</span>
                  <span className="text-2xl font-black text-white">${report.avgDailySpend} <span className="text-xs text-zinc-500 font-bold">元 / 天</span></span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10">
                  <DollarSign className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* Protein CP Kings (Highest protein value per dollar spent) */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
              <span className="text-xs text-zinc-300 font-extrabold block">🏆 蛋白質 CP 值之王 (本週最划算高蛋白食物)</span>
              
              {report.topProteinCpItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.topProteinCpItems.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`text-[10px] font-black h-4 px-1 rounded flex items-center justify-center ${
                            idx === 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                            idx === 1 ? "bg-zinc-300/20 text-zinc-300 border border-zinc-300/30" :
                            "bg-orange-900/20 text-orange-300 border border-orange-900/30"
                          }`}>
                            No.{idx + 1}
                          </span>
                          <span className="text-xs font-black text-zinc-200 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block">單價: ${item.price} / 蛋白質: {item.protein}g</span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] text-zinc-400 font-bold">每百元獲取</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">{item.cp.toFixed(1)}g 蛋白</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-[11px] text-zinc-500 font-bold">
                  請填寫餐點中的「金額」與「蛋白質」，系統即可為您計算並推薦高蛋白質性價比的神級食物！
                </div>
              )}
            </div>

            {/* Calorie Control VS Wallet Cost Cross Analysis */}
            {report.hasComplianceComparison && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-300 font-extrabold">📊 卡路里合規度與飲食開銷交叉洞察</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] text-zinc-500 font-bold block mb-1">飲食合規日平均餐費</span>
                    <span className="text-lg font-black text-emerald-400">${report.avgMetSpend} 元</span>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] text-zinc-500 font-bold block mb-1">熱量超標日平均餐費</span>
                    <span className="text-lg font-black text-rose-400">${report.avgOverSpend} 元</span>
                  </div>
                </div>

                {report.avgOverSpend > report.avgMetSpend ? (
                  <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">
                    💡 數據分析結論：當您熱量不超標的日子，日平均餐費比超標日<strong>省下了 ${report.avgOverSpend - report.avgMetSpend} 元</strong> (約可省下 <strong>{Math.round((1 - report.avgMetSpend / report.avgOverSpend) * 100)}%</strong> 的開銷)！這說明精確控制分量、減少外送大餐或點心，<strong>不僅能順利達成減脂目標，更是極致的省錢之道！</strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">
                    💡 數據分析結論：健康乾淨飲食與日常飲食開銷相當平穩。請繼續保持原型食物的攝取，這能確保您每一分錢都花在最高 CP 值的營養素上！
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Premium Interactive Demo Card (If no price data has been logged yet) */
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 rounded-2xl pointer-events-none blur" />
            <div className="relative bg-black/40 border border-white/[0.08] rounded-2xl p-4 space-y-4">
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full inline-block mb-1.5 animate-pulse">
                  未啟動 ➔ 互動範例展示 (Demo Mode)
                </span>
                <p className="text-xs text-zinc-300 font-bold">
                  填寫餐點「金額」即可啟動本分析。下方為您模擬成功記帳後的極致 AI 洞察分析：
                </p>
              </div>

              {/* Demo Overviews */}
              <div className="grid grid-cols-2 gap-3 opacity-60">
                <div className="bg-black/50 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-0.5">預估近 7 天飲食總花費</span>
                  <span className="text-lg font-black text-zinc-300">$1,850 <span className="text-[10px] text-zinc-500 font-bold">元</span></span>
                </div>
                <div className="bg-black/50 border border-zinc-800 rounded-xl p-3">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-0.5">預估單日平均餐費</span>
                  <span className="text-lg font-black text-zinc-300">$264 <span className="text-[10px] text-zinc-500 font-bold">元 / 天</span></span>
                </div>
              </div>

              {/* Demo Top CP Items */}
              <div className="space-y-2 opacity-75 bg-black/40 border border-zinc-850 p-3 rounded-xl">
                <span className="text-[11px] text-zinc-400 font-black block">🏆 蛋白質 CP 值之王 (每 100 元可買到最多蛋白質的食物)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] bg-amber-500/15 text-amber-300 px-1 rounded font-black inline-block mb-1">No.1 茶葉蛋</span>
                      <p className="text-[9px] text-zinc-500 font-bold">單價: $15 / 蛋白: 14g</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black text-right block mt-2 font-mono">93.3g 蛋白質 /百元</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] bg-zinc-400/15 text-zinc-300 px-1 rounded font-black inline-block mb-1">No.2 舒肥雞胸肉</span>
                      <p className="text-[9px] text-zinc-500 font-bold">單價: $65 / 蛋白: 32g</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black text-right block mt-2 font-mono font-bold">49.2g 蛋白質 /百元</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] bg-orange-950/20 text-orange-300 px-1 rounded font-black inline-block mb-1">No.3 無糖豆漿</span>
                      <p className="text-[9px] text-zinc-500 font-bold">單價: $35 / 蛋白: 15g</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black text-right block mt-2 font-mono font-bold">42.8g 蛋白質 /百元</span>
                  </div>
                </div>
              </div>

              {/* Demo Correlation Insights */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 opacity-75">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[11px] text-amber-300 font-extrabold">卡路里與飲食預算交叉洞察 (模擬分析)</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">
                  💡 數據結論：在您飲食熱量守規的日子裡，日平均餐費為 $180 元，超標大餐日為 $350 元。<strong>精確克制飲食，每週可自動幫您存下 $1,190 元！</strong> 讓健康和荷包在不知不覺中完美升級！
                </p>
              </div>

              <div className="text-[10px] text-zinc-500 text-center font-bold">
                💡 馬上在「今日記錄」中填寫餐點金額（選填），讓 AI 計算出專屬於您的飲食經濟週報吧！
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
