import React, { useMemo, useState, useRef } from "react";
import { DBState, Settings, isMealGroup, MealRecord, MealItem } from "../types";
import { getTodayString } from "../utils/nutrition";
import { toPng } from "html-to-image";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip as RechartsTooltip
} from "recharts";
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
  FileDown,
  ClipboardCopy,
  X,
  User,
  Activity,
  Sun,
  Moon
} from "lucide-react";

interface WeeklyReportProps {
  db: DBState;
  currentDate: string;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  children?: React.ReactNode;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ db, currentDate, showToast, children }) => {
  const [showScientificFastingInfo, setShowScientificFastingInfo] = useState(false);
  const [showPriceTip, setShowPriceTip] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isPrintCardDarkMode, setIsPrintCardDarkMode] = useState(false);
  
  const resumeRef = useRef<HTMLDivElement>(null);

  // Trigger tactile haptic vibration (wrapped to catch safe area/iframe constraints)
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently capture iframe vibration blocks
      }
    }
  };

  const report = useMemo(() => {
    // 1. Calculate past 7 days dates (including current date)
    const today = new Date(currentDate);
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      last7Days.push(dStr);
    }

    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarb = 0;
    let totalFat = 0;
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
            totalProtein += m.items.reduce((sum, item) => sum + (item.protein || 0), 0);
            totalCarb += m.items.reduce((sum, item) => sum + (item.carb || 0), 0);
            totalFat += m.items.reduce((sum, item) => sum + (item.fat || 0), 0);
          } else {
            dayKcal += m.kcal || 0;
            totalProtein += m.protein || 0;
            totalCarb += m.carb || 0;
            totalFat += m.fat || 0;
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
    const avgProtein = daysWithFood > 0 ? Math.round(totalProtein / daysWithFood) : 0;
    const avgCarb = daysWithFood > 0 ? Math.round(totalCarb / daysWithFood) : 0;
    const avgFat = daysWithFood > 0 ? Math.round(totalFat / daysWithFood) : 0;
    const weightDiff = (startWeight && endWeight) ? (endWeight - startWeight) : 0;
    
    // Original goal suggestions
    let suggestion = "";
    let targetAdjustment = 0;
    let icon = <Minus className="w-5 h-5 text-zinc-400" />;

    const targetKcal = db.settings.targets?.kcal || 1510;
    const targetProtein = db.settings.targets?.protein || 132;
    const targetCarb = db.settings.targets?.carb || 151;

    // Macro insight
    let macroInsight = "";
    if (daysWithFood >= 3) {
      if (avgProtein < targetProtein * 0.8) {
        macroInsight = `蛋白質嚴重不足 (平均 ${avgProtein}g / 目標 ${targetProtein}g)。這會導致肌肉流失並降低基礎代謝率。建議多攝取雞胸肉、雞蛋或豆腐。`;
      } else if (avgCarb > targetCarb * 1.2) {
        macroInsight = `碳水化合物攝取過量 (平均 ${avgCarb}g / 目標 ${targetCarb}g)。過多的碳水會影響胰島素阻抗，減緩脂肪燃燒。建議減少澱粉比例。`;
      } else if (avgProtein >= targetProtein * 0.9) {
        macroInsight = `蛋白質攝取極佳！維持高蛋白飲食有助於增肌減脂，讓您在減重過程保持良好代謝。`;
      } else {
        macroInsight = `營養素攝取穩定，請繼續保持目前的飲食結構。`;
      }
    } else {
      macroInsight = `記錄天數不足，請持續記錄以獲得營養素偏差分析。`;
    }

    // Predictive forecasting
    const { sex, weight: currentW, height, age, activity, goalWeight, mode } = db.settings;
    let bmr = 10 * (endWeight || currentW || 60) + 6.25 * (height || 160) - 5 * (age || 30);
    bmr += sex === '男' ? 5 : -161;
    const tdee = Math.round(bmr * (activity || 1.2));

    const deficitPerDay = tdee - avgKcal;
    let predictionInsight = "";

    if (daysWithFood >= 4 && deficitPerDay > 100) {
      const weeklyLoss = (deficitPerDay * 7) / 7700;
      const weightToLose = (endWeight || currentW || 60) - (goalWeight || 50);
      
      if (weightToLose > 0) {
        const predictedWeeks = Math.ceil(weightToLose / weeklyLoss);
        predictionInsight = `達標預測：過去一週平均每天產生 ${deficitPerDay} kcal 熱量赤字。繼續保持，預計約 ${predictedWeeks} 週後達到目標體重 (${goalWeight}kg)！`;
      } else {
        predictionInsight = `您已達標！建議切換為「維持體重」模式，將熱量調整至 ${tdee} kcal。`;
      }
    } else if (daysWithFood >= 4 && deficitPerDay <= 0) {
      predictionInsight = `狀態預測：您目前的熱量攝取與消耗達到平衡 (無赤字)。若希望減重，請增加運動量或稍微減少每日攝取。`;
    } else {
      predictionInsight = "記錄天數不足或未產生赤字，尚無法準確預測達標時間。";
    }

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

    // 2. Fasting vs Weight Loss Correlation
    const deepFastDiffs: number[] = [];  // >= 16 小時
    const mildFastDiffs: number[] = [];  // 12 - 16 小時
    const shortFastDiffs: number[] = []; // < 12 小時 (或無斷食)

    let totalFastingHours = 0;
    let fastingDaysCount = 0;

    const allDates = Object.keys(db.days).sort();
    allDates.forEach(dStr => {
      const day = db.days[dStr];
      if (day && day.fastingHours) {
        totalFastingHours += day.fastingHours;
        fastingDaysCount++;
      }
    });

    for (let i = 0; i < allDates.length - 1; i++) {
      const todayStr = allDates[i];
      const nextDayStr = allDates[i + 1];
      const todayData = db.days[todayStr];
      const nextDayData = db.days[nextDayStr];
      
      const t1 = new Date(todayStr).getTime();
      const t2 = new Date(nextDayStr).getTime();
      if (t2 - t1 <= 86400000 * 1.5) { // Consecutive days
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

    let fastingCorrelationInsight = "";
    const hasAnyFastingData = deepFastDiffs.length > 0 || mildFastDiffs.length > 0;
    
    if (hasAnyFastingData) {
      const deepVal = avgDeepDiff !== null ? avgDeepDiff : 0;
      const mildVal = avgMildDiff !== null ? avgMildDiff : 0;
      const shortVal = avgShortDiff !== null ? avgShortDiff : 0;

      if (avgDeepDiff !== null && deepVal < mildVal && deepVal < shortVal) {
        fastingCorrelationInsight = `數據顯示：16 小時以上「進階斷食」隔天體重降幅最大 (平均 ${deepVal.toFixed(2)} kg)。`;
      } else if (avgMildDiff !== null && mildVal < shortVal) {
        fastingCorrelationInsight = `數據顯示：12-16 小時「溫和斷食」隔天體重降幅良好 (平均 ${mildVal.toFixed(2)} kg)。若欲突破，可漸進拉長至 16 小時。`;
      } else {
        fastingCorrelationInsight = `數據顯示：不同斷食長度降幅接近。建議拉長觀察期，或結合低碳水飲食。`;
      }
    } else {
      fastingCorrelationInsight = "連續記錄斷食時長與體重，分析您的黃金斷食區間。";
    }

    // 3. Price & CP Value Analytics
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

    const proteinCpList = pricedMeals
      .filter(m => m.price > 0 && m.protein > 0)
      .map(m => ({
        name: m.name,
        price: m.price,
        protein: m.protein,
        cp: (m.protein / m.price) * 100 // Protein grams per $100
      }));

    const uniqueCpMap: Record<string, typeof proteinCpList[0]> = {};
    proteinCpList.forEach(item => {
      if (!uniqueCpMap[item.name] || uniqueCpMap[item.name].cp < item.cp) {
        uniqueCpMap[item.name] = item;
      }
    });
    const topProteinCpItems = Object.values(uniqueCpMap).sort((a, b) => b.cp - a.cp).slice(0, 3);

    // Compliance comparison
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

    // --- Dynamic Target Ratio Calculations ---
    let targetP = 30;
    let targetC = 40;
    let targetF = 30;
    const targetMode = (mode || "減脂") as string;

    if (targetMode === "增肌") {
      targetP = 40;
      targetC = 40;
      targetF = 20;
    } else if (targetMode === "生酮") {
      targetP = 20;
      targetC = 5;
      targetF = 75;
    } else if (targetMode === "維持") {
      targetP = 25;
      targetC = 45;
      targetF = 30;
    }

    const totalMacros = totalProtein + totalCarb + totalFat;
    const actualP = totalMacros > 0 ? Math.round((totalProtein / totalMacros) * 100) : 0;
    const actualC = totalMacros > 0 ? Math.round((totalCarb / totalMacros) * 100) : 0;
    const actualF = totalMacros > 0 ? Math.round((totalFat / totalMacros) * 100) : 0;

    const radarData = [
      { subject: "蛋白質 (Protein)", actual: actualP, target: targetP },
      { subject: "碳水化合物 (Carb)", actual: actualC, target: targetC },
      { subject: "脂肪 (Fat)", actual: actualF, target: targetF }
    ];

    const pDiff = actualP - targetP;
    const cDiff = actualC - targetC;
    const fDiff = actualF - targetF;

    let smallestDiff = Math.min(pDiff, cDiff, fDiff);
    let radarInsight = "";

    if (totalMacros === 0) {
      radarInsight = "尚無足夠飲食紀錄。請開始記錄您的每日餐點，以生成本週宏量營養比例平衡分析！";
    } else if (smallestDiff === pDiff) {
      radarInsight = "💡 營養平衡關鍵：您本週的【蛋白質】比例偏低。蛋白質是修復肌肉與維持基礎代謝的基石，建議晚餐多補充雞肉、茶葉蛋或無糖豆漿！";
    } else if (smallestDiff === cDiff) {
      radarInsight = "💡 營養平衡關鍵：您本週的【碳水】比例偏低。這非常適合減脂！但若感到訓練無力，可適度在運動前後補充地瓜或燕麥。";
    } else if (smallestDiff === fDiff) {
      radarInsight = "💡 營養平衡關鍵：您本週的【脂肪】比例低於目標。適量優質油脂有利於維持內分泌與荷爾蒙穩定，建議多補充酪梨或堅果！";
    } else {
      radarInsight = "💡 營養平衡關鍵：本週宏量營養配比極其平衡！實際飲食結構與您的健身目標高度吻合，請繼續保持這份完美的自律！";
    }

    return {
      last7Days,
      totalProtein,
      totalCarb,
      totalFat,
      avgKcal,
      startWeight,
      endWeight,
      weightDiff,
      suggestion,
      targetAdjustment,
      icon,
      targetKcal,
      macroInsight,
      predictionInsight,
      
      // Fasting
      totalFastingHours,
      fastingDaysCount,
      deepFastCount: deepFastDiffs.length,
      avgDeepDiff,
      mildFastCount: mildFastDiffs.length,
      avgMildDiff,
      shortFastCount: shortFastDiffs.length,
      avgShortDiff,
      fastingCorrelationInsight,
      hasAnyFastingData,

      // Expenses
      hasPriceLogs,
      totalSpentLast7Days,
      avgDailySpend: pricedDaysCount7Days > 0 ? Math.round(totalSpentLast7Days / pricedDaysCount7Days) : 0,
      pricedDaysCount7Days,
      topProteinCpItems,
      avgMetSpend,
      avgOverSpend,
      hasComplianceComparison: metDaysCount > 0 && overSpendSum > 0,

      // Radar details
      radarData,
      actualP,
      actualC,
      actualF,
      targetP,
      targetC,
      targetF,
      targetMode,
      radarInsight
    };
  }, [db, currentDate]);

  // Helper to list foods day-by-day for resume
  const getDayMealsList = (dStr: string) => {
    const day = db.days[dStr];
    if (!day) return [];
    
    const itemsList: { cat: string; name: string; kcal: number }[] = [];
    const categories: ("早餐" | "午餐" | "晚餐" | "點心")[] = ["早餐", "午餐", "晚餐", "點心"];
    
    categories.forEach(cat => {
      const records = day.meals[cat] || [];
      records.forEach(r => {
        if (isMealGroup(r)) {
          const names = r.items.map(it => it.name).join("+");
          const kc = r.items.reduce((sum, item) => sum + (item.kcal || 0), 0);
          itemsList.push({ cat, name: `${r.name || "組合"} (${names})`, kcal: kc });
        } else {
          itemsList.push({ cat, name: r.name, kcal: r.kcal || 0 });
        }
      });
    });
    return itemsList;
  };

  // Generate Markdown summary for clipboard export
  const handleCopyMarkdown = () => {
    triggerHaptic(80);
    const { sex, age, height, goalWeight, mode } = db.settings;
    
    let md = `# 🌟 每週健康與飲食履歷 (Weekly Health Resume)\n`;
    md += `**生成日期**: ${currentDate}\n\n`;
    
    md += `## 👤 個人基本檔案 (Profile)\n`;
    md += `- **基本資料**: ${sex}性 | ${age}歲 | ${height}cm\n`;
    md += `- **體重狀態**: 目前 ${report.endWeight || db.settings.weight}kg | 目標 ${goalWeight}kg\n`;
    md += `- **訓練模式**: ${report.targetMode} 模式 (目標比例：蛋白 ${report.targetP}% | 碳水 ${report.targetC}% | 脂肪 ${report.targetF}%)\n\n`;
    
    md += `## 📊 本週數據總覽 (Weekly Stats Summary)\n`;
    md += `- **平均每日攝取**: ${report.avgKcal} kcal / 天\n`;
    md += `- **本週體重變化**: ${report.weightDiff > 0 ? "+" : ""}${report.weightDiff.toFixed(1)} kg\n`;
    md += `- **累計斷食時數**: ${Math.round(report.totalFastingHours)} 小時 (完成 ${report.fastingDaysCount} 次)\n`;
    if (report.hasPriceLogs) {
      md += `- **本週飲食花費**: $${report.totalSpentLast7Days} 元 (記帳日均: $${report.avgDailySpend} 元)\n`;
    }
    md += `\n`;

    md += `## ⚖️ 宏量營養平衡比例 (Macro-Nutrient Balance)\n`;
    md += `- **實際攝取比例**: 蛋白質 ${report.actualP}% | 碳水化合物 ${report.actualC}% | 脂肪 ${report.actualF}%\n`;
    md += `- **精準營養建議**: ${report.radarInsight}\n\n`;

    md += `## 🍽️ 每日飲食與生理數據詳細記錄 (Daily Diet Logs)\n`;
    
    report.last7Days.forEach(dStr => {
      const day = db.days[dStr];
      const weightLabel = day?.weight ? ` | 體重: ${day.weight}kg` : "";
      const fastingLabel = day?.fastingHours ? ` | 斷食: ${day.fastingHours.toFixed(1)}小時` : "";
      
      md += `### 📅 ${dStr}${weightLabel}${fastingLabel}\n`;
      
      const meals = getDayMealsList(dStr);
      if (meals.length > 0) {
        meals.forEach(m => {
          md += `- [${m.cat}] ${m.name} (${m.kcal} kcal)\n`;
        });
      } else {
        md += `- *(當日無飲食紀錄)*\n`;
      }
      md += `\n`;
    });

    md += `---\n*本履歷由行動健康管理系統自動生成，極簡北歐風飲食記錄格式。*\n`;

    navigator.clipboard.writeText(md).then(() => {
      showToast?.("Markdown 履歷已成功複製到剪貼簿！", "success");
    }).catch(() => {
      showToast?.("複製失敗，請手動複製", "error");
    });
  };

  // Convert element to PNG and download
  const handleExportPNG = async () => {
    if (!resumeRef.current) return;
    triggerHaptic([100, 50, 100]);
    showToast?.("正在生成極簡北歐風健康履歷圖...", "info");

    try {
      const dataUrl = await toPng(resumeRef.current, {
        quality: 1,
        pixelRatio: 2.5, // Crisp high-definition
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left"
        }
      });
      
      const link = document.createElement("a");
      link.download = `健康履歷_${getTodayString()}.png`;
      link.href = dataUrl;
      link.click();
      
      showToast?.("健康履歷圖片已成功匯出並下載！", "success");
    } catch (err) {
      console.error("Failed to render resume to image", err);
      showToast?.("匯出圖片失敗，建議直接複製 Markdown", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* ────────────────── SECTION 1: AI GENERAL WEEKLY REPORT ────────────────── */}
      <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-5">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Target className="w-24 h-24" />
        </div>
        
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-tight">週報表與健康動態</h3>
                <p className="text-xs text-zinc-400 font-bold">根據您過去 7 天的數據分析與建議</p>
              </div>
            </div>

            {/* Resume Export Launcher Button */}
            <button
              onClick={() => {
                triggerHaptic(40);
                setShowExportModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>導出健康履歷</span>
            </button>
          </div>
        
          {/* Suggestion Box */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
            <p className="text-sm text-zinc-300 font-bold leading-relaxed">
              {report.suggestion}
            </p>
          </div>

          {/* New Macro Insight Box */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mt-2">
            <p className="text-sm text-amber-200 font-bold leading-relaxed">
              {report.macroInsight}
            </p>
          </div>

          {/* New Prediction Insight Box */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mt-2">
            <p className="text-sm text-purple-200 font-bold leading-relaxed">
              {report.predictionInsight}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10 mt-2">
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
              <span className="text-xs text-indigo-200 font-black">
                {report.targetAdjustment < 0 ? "建議調降至" : "建議調升至"}: {report.targetKcal + report.targetAdjustment} kcal
              </span>
            </div>
            <p className="text-[11px] text-indigo-300/80 leading-relaxed font-bold">
              {report.targetAdjustment < 0 
                ? "調降目標有助於維持穩定的熱量赤字，搭配每天記錄的體重與飲食，下週系統會依據體重表現重新評估您的動態平衡點。" 
                : "適度調升目標有助於提供充足的能量與營養，搭配每天記錄的體重與飲食，下週系統會重新評估您的動態平衡點。"}
            </p>
          </div>
        )}
      </div>

      {/* ────────────────── SECTION 2: MACRONUTRIENT BALANCE RADAR CHART ────────────────── */}
      <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-base tracking-tight">宏量營養素平衡雷達圖</h3>
            <p className="text-[10px] text-zinc-400 font-bold">對比本週實際攝取比例與您的「{report.targetMode}」理想目標配比</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Radar Chart Visual */}
          <div className="md:col-span-5 h-[210px] w-full flex items-center justify-center bg-black/20 rounded-2xl border border-zinc-850 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={report.radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 9, fontWeight: "bold" }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: "rgba(255, 255, 255, 0.3)", fontSize: 7 }} 
                />
                <Radar 
                  name="實際攝取 %" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.35} 
                />
                <Radar 
                  name="目標配比 %" 
                  dataKey="target" 
                  stroke="#6366f1" 
                  fill="#6366f1" 
                  fillOpacity={0.15} 
                  strokeDasharray="4,4" 
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: "#18181b", 
                    borderColor: "#27272a", 
                    borderRadius: "8px", 
                    color: "#fff", 
                    fontSize: "10px" 
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Details & AI Deficit Suggestion */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="bg-black/20 rounded-2xl border border-zinc-850 p-4 space-y-2.5">
              <span className="text-xs text-zinc-400 font-black tracking-wider block uppercase">本週平均比例數據對比</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">蛋白質 P</span>
                  <div className="text-sm font-black text-white">實際 {report.actualP}%</div>
                  <div className="text-[9px] text-zinc-500 font-semibold font-mono">目標 {report.targetP}%</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">碳水化合物 C</span>
                  <div className="text-sm font-black text-white">實際 {report.actualC}%</div>
                  <div className="text-[9px] text-zinc-500 font-semibold font-mono">目標 {report.targetC}%</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">脂肪 F</span>
                  <div className="text-sm font-black text-white">實際 {report.actualF}%</div>
                  <div className="text-[9px] text-zinc-500 font-semibold font-mono">目標 {report.targetF}%</div>
                </div>
              </div>
            </div>

            {/* AI Suggestion Box */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-xs text-emerald-300 font-bold leading-relaxed">
                {report.radarInsight}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────── SECTION 3: FASTING VS WEIGHT LOSS CORRELATION ────────────────── */}
      {report.hasAnyFastingData && (
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
              onClick={() => {
                triggerHaptic(30);
                setShowScientificFastingInfo(!showScientificFastingInfo);
              }}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
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

          {/* Scientific Principles Accordion */}
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
                註：執行 16 小時以上斷食時，請確保於進食窗口裝足夠水分與充足蛋白質，以防止肌肉流失。
              </p>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── SECTION 4: DIET EXPENSE & CP VALUE ANALYTICS ────────────────── */}
      {(report.hasPriceLogs || true) && (
        <div className="bg-white/[0.04] border border-white/[0.05] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <PiggyBank className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-white text-base tracking-tight">飲食開銷與營養 CP 值 (性價比) 分析</h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">選填</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold">掌握健康飲食與預算控制的完美平衡點</p>
              </div>
            </div>
            <button 
              onClick={() => {
                triggerHaptic(30);
                setShowPriceTip(!showPriceTip);
              }}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
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

          {report.hasPriceLogs ? (
            <div className="space-y-4">
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

              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-xs text-zinc-300 font-extrabold block">蛋白質 CP 值之王 (本週最劃算高蛋白食物)</span>
                
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

              {report.hasComplianceComparison && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-300 font-extrabold">卡路里與預算關聯分析</span>
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
                      結論：不超標日平均餐費比超標日<strong>省下 ${report.avgOverSpend - report.avgMetSpend} 元</strong> (約 <strong>{Math.round((1 - report.avgMetSpend / report.avgOverSpend) * 100)}%</strong>)。精確控制分量不僅有助減脂，還能省錢！
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400 font-bold leading-relaxed">
                      結論：健康飲食與日常開銷相當平穩。請繼續保持原型食物攝取，確保營養高 CP 值。
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Premium Interactive Demo Card (If no price data logged yet) */
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 rounded-2xl pointer-events-none blur" />
              <div className="relative bg-black/40 border border-white/[0.08] rounded-2xl p-4 space-y-4">
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full inline-block mb-1.5 font-bold">
                    範例展示
                  </span>
                  <p className="text-xs text-zinc-300 font-bold">
                    紀錄餐點「金額」解鎖開銷分析，下方為模擬範例：
                  </p>
                </div>

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

                <div className="space-y-2 opacity-75 bg-black/40 border border-zinc-850 p-3 rounded-xl">
                  <span className="text-[11px] text-zinc-400 font-black block">蛋白質 CP 值之王 (每 100 元可買到最多蛋白質的食物)</span>
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

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 opacity-75">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="text-[11px] text-amber-300 font-extrabold">預算關聯分析 (範例)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">
                    數據結論：在您飲食熱量守規的日子裡，日平均餐費為 $180 元，超標大餐日為 $350 元。<strong>精確克制飲食，每週可自動幫您存下 $1,190 元！</strong> 讓健康和荷包在不知不覺中完美升級！
                  </p>
                </div>

                <div className="text-[10px] text-zinc-500 text-center font-bold">
                  在「今日記錄」中填寫餐點金額（選填），解鎖開銷分析。
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {children}

      {/* ────────────────── NORDIC MINIMALIST A4 RESUME EXPORT DIALOG MODAL ────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Intense dark backdrop blur */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md animate-fade-in" 
            onClick={() => setShowExportModal(false)}
          />

          <div 
            className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-10 animate-scale-up"
          >
            {/* Modal Controls Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-zinc-900/40 shrink-0">
              <div className="flex items-center gap-2">
                <FileDown className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="font-black text-white text-sm">每週健康履歷導出管理 (Export Center)</h3>
              </div>
              
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="p-3 bg-zinc-900/50 border-b border-white/5 flex gap-2 justify-end items-center shrink-0">
              <button
                onClick={() => {
                  triggerHaptic(50);
                  setIsPrintCardDarkMode(!isPrintCardDarkMode);
                }}
                className="mr-auto flex items-center gap-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                {isPrintCardDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>切換為優雅北歐白</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>切換為極致曜石黑</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                <span>一鍵複製 Markdown</span>
              </button>

              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>一鍵轉存圖片 (PNG)</span>
              </button>
            </div>

            {/* A4 Styled Nordic Printable Card Scroll Area */}
            <div className="flex-grow overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-zinc-900/30 flex justify-start md:justify-center items-start">
              
              {/* PRINTABLE CANVAS ELEMENT */}
              <div 
                ref={resumeRef}
                className="w-[595px] p-6 sm:p-8 shadow-2xl rounded-sm border select-text flex flex-col gap-6 shrink-0 transition-colors duration-300"
                style={{ 
                  fontFamily: "'Inter', system-ui, sans-serif",
                  backgroundColor: isPrintCardDarkMode ? "#09090b" : "#ffffff",
                  color: isPrintCardDarkMode ? "#e4e4e7" : "#1e293b",
                  borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0"
                }}
              >
                {/* Visual Cover Header */}
                <div className="border-b-[3px] pb-5" style={{ borderColor: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-black tracking-tight uppercase" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>每週健康與飲食履歷</h1>
                      <p className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>Weekly Health & Diet Resume / Nordic Minimalist</p>
                    </div>
                    <div className="text-right text-[10px] font-mono font-bold" style={{ color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>
                      <div>系統日期: {currentDate}</div>
                      <div>週報區間: 過去 7 天記錄</div>
                    </div>
                  </div>
                </div>

                {/* Profile Grid Block */}
                <div className="grid grid-cols-2 gap-6 border p-4 rounded-sm" style={{ backgroundColor: isPrintCardDarkMode ? "#18181b" : "#f8fafc", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                  {/* Left Column: Personal Metadata */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black border-b pb-1 flex items-center gap-1" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                      <User className="w-3.5 h-3.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#475569" }} />
                      基本檔案 Profile
                    </h3>
                    <ul className="text-xs space-y-1 font-semibold" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#475569" }}>
                      <li>• 性別: <span className="font-bold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{db.settings.sex || "女"}性</span></li>
                      <li>• 年齡: <span className="font-bold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{db.settings.age || 22} 歲</span></li>
                      <li>• 身高: <span className="font-bold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{db.settings.height || 160} cm</span></li>
                      <li>• 體重: <span className="font-bold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>目前 {report.endWeight || db.settings.weight}kg | 目標 {db.settings.goalWeight}kg</span></li>
                    </ul>
                  </div>

                  {/* Right Column: Dynamic Targets Summary */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black border-b pb-1 flex items-center gap-1" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                      <Activity className="w-3.5 h-3.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#475569" }} />
                      設定目標與指標 Target
                    </h3>
                    <ul className="text-xs space-y-1 font-semibold font-bold" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#475569" }}>
                      <li>• 訓練模式: <span className="font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.targetMode}</span></li>
                      <li>• 目標比例: <span className="font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>蛋白 {report.targetP}% | 碳水 {report.targetC}% | 脂肪 {report.targetF}%</span></li>
                      <li>• 建議日熱量: <span className="font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.targetKcal} kcal</span></li>
                      <li>• 每日水目標: <span className="font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{db.settings.waterTarget} ml</span></li>
                    </ul>
                  </div>
                </div>

                {/* Key Summary KPI Counters */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border p-3 rounded-sm text-center transition-all" style={{ backgroundColor: isPrintCardDarkMode ? "#18181b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                    <span className="text-[9px] font-bold block mb-0.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>平均每日熱量</span>
                    <span className="text-lg font-black" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.avgKcal} <span className="text-[10px] font-bold" style={{ color: isPrintCardDarkMode ? "#71717a" : "#64748b" }}>kcal</span></span>
                  </div>
                  <div className="border p-3 rounded-sm text-center transition-all" style={{ backgroundColor: isPrintCardDarkMode ? "#18181b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                    <span className="text-[9px] font-bold block mb-0.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>本週體重變化</span>
                    <span className={`text-lg font-black`} style={{ color: report.weightDiff > 0 ? (isPrintCardDarkMode ? "#f87171" : "#dc2626") : (isPrintCardDarkMode ? "#34d399" : "#059669") }}>
                      {report.weightDiff > 0 ? "+" : ""}{report.weightDiff.toFixed(1)} <span className="text-[10px] font-bold" style={{ color: isPrintCardDarkMode ? "#71717a" : "#64748b" }}>kg</span>
                    </span>
                  </div>
                  <div className="border p-3 rounded-sm text-center transition-all" style={{ backgroundColor: isPrintCardDarkMode ? "#18181b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                    <span className="text-[9px] font-bold block mb-0.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>完成斷食時數</span>
                    <span className="text-lg font-black" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{Math.round(report.totalFastingHours)} <span className="text-[10px] font-bold" style={{ color: isPrintCardDarkMode ? "#71717a" : "#64748b" }}>小時</span></span>
                  </div>
                </div>

                {/* Macro Nutrition Balance Box */}
                <div className="border p-4 rounded-sm space-y-2 transition-all" style={{ backgroundColor: isPrintCardDarkMode ? "#18181b" : "#f8fafc", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#334155" }} />
                    三大營養素實際攝取比例
                  </h3>
                  <div className="grid grid-cols-3 gap-2 py-1 text-center font-bold">
                    <div className="border p-2 rounded-sm" style={{ backgroundColor: isPrintCardDarkMode ? "#09090b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                      <span className="text-[9px] block" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>實際蛋白質 P</span>
                      <span className="text-xs font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.actualP}% <span className="text-[9px]" style={{ color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>(目標 {report.targetP}%)</span></span>
                    </div>
                    <div className="border p-2 rounded-sm" style={{ backgroundColor: isPrintCardDarkMode ? "#09090b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                      <span className="text-[9px] block" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>實際碳水化合物 C</span>
                      <span className="text-xs font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.actualC}% <span className="text-[9px]" style={{ color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>(目標 {report.targetC}%)</span></span>
                    </div>
                    <div className="border p-2 rounded-sm" style={{ backgroundColor: isPrintCardDarkMode ? "#09090b" : "#ffffff", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                      <span className="text-[9px] block" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>實際脂肪 F</span>
                      <span className="text-xs font-extrabold" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>{report.actualF}% <span className="text-[9px]" style={{ color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>(目標 {report.targetF}%)</span></span>
                    </div>
                  </div>
                  <p className="text-[11px] italic font-semibold leading-relaxed pt-1 border-t transition-all" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#475569", borderColor: isPrintCardDarkMode ? "#27272a" : "#e2e8f0" }}>
                    {report.radarInsight}
                  </p>
                </div>

                {/* Daily Detailed Meals List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider border-b pb-1 transition-all" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a", borderColor: isPrintCardDarkMode ? "#27272a" : "#cbd5e1" }}>
                    本週每日飲食詳細履歷 Daily Details
                  </h3>
                  
                  <div className="space-y-3">
                    {report.last7Days.map((dStr) => {
                      const day = db.days[dStr];
                      const meals = getDayMealsList(dStr);
                      const weightText = day?.weight ? ` | 體重: ${day.weight}kg` : "";
                      const fastText = day?.fastingHours ? ` | 斷食: ${day.fastingHours.toFixed(1)}h` : "";
                      
                      return (
                        <div key={dStr} className="text-[11px] border-b pb-2 last:border-0 transition-all" style={{ borderColor: isPrintCardDarkMode ? "#27272a" : "#f1f5f9" }}>
                          <div className="flex justify-between font-bold mb-1" style={{ color: isPrintCardDarkMode ? "#ffffff" : "#0f172a" }}>
                            <span>📅 日期: {dStr}</span>
                            <span className="font-mono font-bold" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>{weightText}{fastText}</span>
                          </div>
                          
                          {meals.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1 pl-2" style={{ color: isPrintCardDarkMode ? "#d4d4d8" : "#475569" }}>
                              {meals.map((m, idx) => (
                                <div key={idx} className="flex justify-between items-center font-semibold">
                                  <span>• [{m.cat}] {m.name}</span>
                                  <span className="font-mono font-bold" style={{ color: isPrintCardDarkMode ? "#a1a1aa" : "#64748b" }}>{m.kcal} kcal</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="italic font-semibold pl-2" style={{ color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>無飲食紀錄</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Nordic Minimalist Footer */}
                <div className="mt-auto border-t pt-4 text-center text-[9px] font-semibold font-mono uppercase tracking-widest transition-all" style={{ borderColor: isPrintCardDarkMode ? "#27272a" : "#cbd5e1", color: isPrintCardDarkMode ? "#71717a" : "#94a3b8" }}>
                  Clean Nordic Diet Diary • Empowered by AI Coach
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
