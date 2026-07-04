import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DBState, DayRecord, MealRecord, MealItem, MealGroup } from "../types";
import { STORE_FOODS_DATABASE, StoreFoodItem } from "../data/storeFoods";
import { 
  Sparkles, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Flame, 
  CheckCircle2, 
  HelpCircle,
  Plus,
  Scale,
  Smile,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface StoreMealPlannerProps {
  db: DBState;
  updateDb: (newDb: DBState) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  currentDate: string;
}

export const StoreMealPlanner: React.FC<StoreMealPlannerProps> = ({ 
  db, 
  updateDb, 
  showToast, 
  currentDate 
}) => {
  // --- UI Filter States ---
  const [budget, setBudget] = useState<number>(150);
  const [selectedStore, setSelectedStore] = useState<"全部" | "7-11" | "全家">("全部");
  const [goalType, setGoalType] = useState<"high-protein" | "low-kcal" | "cp-value" | "balanced">("high-protein");
  const [mealCategory, setMealCategory] = useState<"早餐" | "午餐" | "晚餐" | "點心">("午餐");
  const [activeExplainItem, setActiveExplainItem] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // --- Haptic Feedback helper ---
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  // --- Filter individual database list ---
  const filteredDatabaseFoods = useMemo(() => {
    return STORE_FOODS_DATABASE.filter(item => {
      if (selectedStore !== "全部" && item.store !== selectedStore) return false;
      return true;
    });
  }, [selectedStore]);

  // --- Generate Combinations ---
  const recommendedCombos = useMemo(() => {
    const list = filteredDatabaseFoods;
    const combos: {
      items: StoreFoodItem[];
      totalPrice: number;
      totalKcal: number;
      totalProtein: number;
      totalCarb: number;
      totalFat: number;
      totalSodium: number;
      cpRatio: number;
    }[] = [];

    // 1-Item Combos
    for (let i = 0; i < list.length; i++) {
      const f1 = list[i];
      if (f1.price <= budget) {
        combos.push({
          items: [f1],
          totalPrice: f1.price,
          totalKcal: f1.kcal,
          totalProtein: f1.protein,
          totalCarb: f1.carb,
          totalFat: f1.fat,
          totalSodium: f1.sodium,
          cpRatio: f1.protein / f1.price,
        });
      }

      // 2-Item Combos
      for (let j = i + 1; j < list.length; j++) {
        const f2 = list[j];
        // Don't mix stores in a single meal combo unless "全部" is chosen
        if (f1.store !== f2.store) continue; 
        
        const price2 = f1.price + f2.price;
        if (price2 <= budget) {
          combos.push({
            items: [f1, f2],
            totalPrice: price2,
            totalKcal: f1.kcal + f2.kcal,
            totalProtein: f1.protein + f2.protein,
            totalCarb: f1.carb + f2.carb,
            totalFat: f1.fat + f2.fat,
            totalSodium: f1.sodium + f2.sodium,
            cpRatio: (f1.protein + f2.protein) / price2,
          });
        }

        // 3-Item Combos
        for (let k = j + 1; k < list.length; k++) {
          const f3 = list[k];
          if (f1.store !== f3.store) continue;

          const price3 = f1.price + f2.price + f3.price;
          if (price3 <= budget) {
            combos.push({
              items: [f1, f2, f3],
              totalPrice: price3,
              totalKcal: f1.kcal + f2.kcal + f3.kcal,
              totalProtein: f1.protein + f2.protein + f3.protein,
              totalCarb: f1.carb + f2.carb + f3.carb,
              totalFat: f1.fat + f2.fat + f3.fat,
              totalSodium: f1.sodium + f2.sodium + f3.sodium,
              cpRatio: (f1.protein + f2.protein + f3.protein) / price3,
            });
          }
        }
      }
    }

    // --- Optimization Sorting Algorithm ---
    if (goalType === "high-protein") {
      // Maximize absolute protein
      combos.sort((a, b) => {
        if (b.totalProtein !== a.totalProtein) {
          return b.totalProtein - a.totalProtein;
        }
        return a.totalPrice - b.totalPrice; // Cheaper first if protein matches
      });
    } else if (goalType === "low-kcal") {
      // Keep protein >= 15g to be a robust fitness meal, then sort by kcal ascending
      const viable = combos.filter(c => c.totalProtein >= 15);
      viable.sort((a, b) => a.totalKcal - b.totalKcal);
      return viable.slice(0, 10);
    } else if (goalType === "cp-value") {
      // Maximize protein per TWD dollar
      combos.sort((a, b) => b.cpRatio - a.cpRatio);
    } else if (goalType === "balanced") {
      // Balanced fitness score: rich protein, controlled sodium, ideal calorie size (400-600)
      combos.sort((a, b) => {
        const scoreA = a.totalProtein * 2.5 - Math.abs(a.totalKcal - 450) * 0.08 - (a.totalSodium > 800 ? (a.totalSodium - 800) * 0.03 : 0);
        const scoreB = b.totalProtein * 2.5 - Math.abs(b.totalKcal - 450) * 0.08 - (b.totalSodium > 800 ? (b.totalSodium - 800) * 0.03 : 0);
        return scoreB - scoreA;
      });
    }

    return combos.slice(0, 10);
  }, [filteredDatabaseFoods, budget, goalType]);

  // --- Add Recommended Combo to User Diary ---
  const handleAddComboToToday = (combo: typeof recommendedCombos[0]) => {
    triggerHaptic([50, 30, 50]);

    // Format current date structure
    const dateStr = currentDate;
    const dayData: DayRecord = db.days[dateStr] || {
      meals: { 早餐: [], 午餐: [], 晚餐: [], 點心: [] },
      waterLog: [],
      exercise: 0,
      steps: 0,
      weight: null,
      bodyfat: null,
      photos: []
    };

    const updatedMeals = { ...dayData.meals };
    const currentPeriodList = [...(updatedMeals[mealCategory] || [])];

    // Generate individual MealItem elements from the StoreFoodItem
    const timeStr = new Date().toLocaleTimeString("zh-TW", { hour12: false, hour: "2-digit", minute: "2-digit" });
    const timestamp = Date.now();

    const mealItems: MealItem[] = combo.items.map((item, idx) => ({
      id: timestamp + idx + 100,
      name: `[${item.store}] ${item.name}`,
      kcal: item.kcal,
      protein: item.protein,
      carb: item.carb,
      fat: item.fat,
      fiber: item.category === "蔬菜" ? 2.5 : 0, // standard estimate
      sugar: item.category === "飲料" ? 2.0 : 0,
      sodium: item.sodium,
      amount: null,
      category: item.category,
      time: timeStr,
      price: item.price
    }));

    // Package as a cohesive MealGroup
    const groupName = `${combo.items[0].store} 智慧推薦組合 (NT$ ${combo.totalPrice})`;
    const newGroup: MealGroup = {
      type: "group",
      id: timestamp,
      name: groupName,
      items: mealItems,
      time: timeStr,
      price: combo.totalPrice,
      category: "其他"
    };

    // Save back
    updatedMeals[mealCategory] = [...currentPeriodList, newGroup];

    const newDb: DBState = {
      ...db,
      days: {
        ...db.days,
        [dateStr]: {
          ...dayData,
          meals: updatedMeals
        }
      }
    };

    updateDb(newDb);
    if (showToast) {
      showToast(`🎉 已成功將 ${groupName} 一鍵登錄至 ${mealCategory}！`, "success");
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-5 md:p-6 relative overflow-hidden backdrop-blur-xl transition-all">
      
      {/* Visual background accents */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Title & badge header */}
      <div 
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer group select-none ${isExpanded ? 'border-b border-white/5 pb-4 mb-6' : ''}`}
        onClick={() => {
          triggerHaptic(20);
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600/20 text-emerald-400 p-2.5 rounded-xl border border-indigo-500/20 shadow-md group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-widest text-zinc-100 uppercase group-hover:text-emerald-300 transition-colors">超商智慧高 CP 推薦引擎</h3>
              <span className="text-[9px] font-black tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md uppercase">OFFLINE CACHED</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              免串接、零延遲！依預算與生理目標自動計算 7-11 與全家最佳餐點組合
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 pt-2">
              {/* Form Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                
                {/* Left Column: Input Panel */}
                <div className="md:col-span-5 space-y-4 bg-black/30 p-4 rounded-xl border border-white/5">
          
          {/* Target Budget slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-extrabold text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                最高單餐預算
              </label>
              <span className="font-black text-emerald-400 text-sm font-mono">{budget} 元</span>
            </div>
            <input 
              type="range"
              min="30"
              max="250"
              step="5"
              value={budget}
              onChange={(e) => {
                triggerHaptic(10);
                setBudget(Number(e.target.value));
              }}
              className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[80, 100, 120, 150].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    triggerHaptic(30);
                    setBudget(preset);
                  }}
                  className={`text-[10px] font-bold py-1 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                    budget === preset 
                      ? "bg-indigo-500/20 text-emerald-400 border-indigo-500/40" 
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  NT$ {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Store select chips */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-zinc-300 block">偏好超商通路</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "全部", colors: "peer-checked:bg-zinc-800 peer-checked:text-zinc-100 border-zinc-800" },
                { name: "7-11", colors: "peer-checked:bg-orange-600/20 peer-checked:text-orange-400 peer-checked:border-orange-500/40 border-zinc-800" },
                { name: "全家", colors: "peer-checked:bg-orange-600/20 peer-checked:text-orange-400 peer-checked:border-orange-500/40 border-zinc-800" }
              ].map((item) => (
                <label key={item.name} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="storePreference"
                    value={item.name}
                    checked={selectedStore === item.name}
                    onChange={() => {
                      triggerHaptic(30);
                      setSelectedStore(item.name as any);
                    }}
                    className="sr-only peer"
                  />
                  <div className={`w-full text-center text-[10px] sm:text-xs font-black py-2 rounded-xl border bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 transition-all ${item.colors}`}>
                    {item.name}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Goal selection */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-zinc-300 block">推薦演算法核心</label>
            <div className="space-y-1.5">
              {[
                { id: "high-protein", label: "🚀 極限高蛋白優先", desc: "追求單餐蛋白質克數最大化" },
                { id: "low-kcal", label: "🥗 低卡飽足選", desc: "蛋白質高於15g，並追求熱量最低" },
                { id: "cp-value", label: "⚡ CP 值之王", desc: "追求每一元能買到最多蛋白質" },
                { id: "balanced", label: "⚖️ 宏量平衡推薦", desc: "均衡膳食比例，少鹽低鈉" }
              ].map((item) => (
                <label key={item.id} className="relative flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/50 cursor-pointer transition-all">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-zinc-100">{item.label}</span>
                    <span className="text-[9px] text-zinc-500 font-bold mt-0.5">{item.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="goalType"
                    value={item.id}
                    checked={goalType === item.id}
                    onChange={() => {
                      triggerHaptic(40);
                      setGoalType(item.id as any);
                    }}
                    className="rounded-full bg-black border-zinc-800 text-emerald-500 focus:ring-0 w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Target meal category to record to */}
          <div className="space-y-2 border-t border-white/5 pt-3">
            <label className="text-[10px] font-black text-zinc-400 block uppercase tracking-wider">點選加入後，自動登錄至：</label>
            <div className="grid grid-cols-4 gap-1">
              {(["早餐", "午餐", "晚餐", "點心"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    triggerHaptic(20);
                    setMealCategory(period);
                  }}
                  className={`text-[10px] font-black py-1.5 rounded-lg border transition-all cursor-pointer text-center ${
                    mealCategory === period 
                      ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40" 
                      : "bg-zinc-900/50 text-zinc-450 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Recommendations Results List */}
        <div className="md:col-span-7 space-y-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">
              符合條件的最佳搭配 ({recommendedCombos.length} 款)
            </span>
            <span className="text-[9px] text-zinc-500 font-bold">按演算分數排序</span>
          </div>

          <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {recommendedCombos.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-zinc-950/20 border border-zinc-850/40 rounded-2xl"
                >
                  <Scale className="w-8 h-8 text-zinc-600 animate-bounce" />
                  <p className="text-xs text-zinc-400 font-bold">
                    唉呀！在這個預算下找不到合適的組合
                  </p>
                  <p className="text-[10px] text-zinc-500 max-w-[200px]">
                    請將預算拉高一點點 (如 100 元以上)，或切換通路篩選試試。
                  </p>
                </motion.div>
              ) : (
                recommendedCombos.map((combo, idx) => {
                  const is711 = combo.items[0].store === "7-11";
                  const storeColor = is711 
                    ? "from-orange-500/10 to-emerald-500/10 border-orange-500/20 hover:border-orange-500/40"
                    : "from-sky-500/10 to-indigo-500/10 border-sky-500/20 hover:border-sky-500/40";
                  
                  const isExplainActive = activeExplainItem === combo.items.map(it => it.id).join("_");

                  return (
                    <motion.div
                      key={combo.items.map(it => it.id).join("_")}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`relative overflow-hidden bg-gradient-to-r ${storeColor} border rounded-2xl p-4 transition-all duration-300 group`}
                    >
                      {/* Price Badge */}
                      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full border border-white/5">
                        <span className="text-[9px] text-zinc-400 font-bold">總花費</span>
                        <span className="text-xs font-black text-white font-mono">NT$ {combo.totalPrice}</span>
                      </div>

                      {/* Header Title with Logo/Tag */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          is711 
                            ? "bg-indigo-500/20 text-emerald-400 border-indigo-500/30" 
                            : "bg-indigo-500/20 text-emerald-400 border-indigo-500/30"
                        }`}>
                          {combo.items[0].store}
                        </span>
                        <h4 className="text-xs font-black text-zinc-200">
                          {is711 ? "經典高優蛋白配" : "健康活力代餐選"} #{idx + 1}
                        </h4>
                        
                        {combo.cpRatio > 0.3 && (
                          <div className="flex items-center gap-0.5 text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase animate-pulse">
                            <Zap className="w-2 h-2" />
                            高CP
                          </div>
                        )}
                      </div>

                      {/* Food list items inside combo */}
                      <div className="mt-3 space-y-1">
                        {combo.items.map((food) => (
                          <div key={food.id} className="flex justify-between items-center text-xs font-medium text-zinc-300">
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-zinc-600" />
                              {food.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold font-mono">NT$ {food.price}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mini dashboard metrics */}
                      <div className="mt-4 grid grid-cols-4 gap-1.5 text-center bg-black/40 rounded-xl py-2 px-1 border border-white/[0.02]">
                        <div>
                          <span className="text-zinc-500 text-[8px] block font-bold">熱量</span>
                          <span className="font-extrabold text-xs text-zinc-100 font-mono">{combo.totalKcal} <span className="text-[8px] text-zinc-500 font-bold">卡</span></span>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-[8px] block font-bold">蛋白質</span>
                          <span className="font-black text-xs text-emerald-400 font-mono">{combo.totalProtein.toFixed(1)} <span className="text-[8px] text-emerald-500/60 font-bold">克</span></span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[8px] block font-bold">碳水</span>
                          <span className="font-extrabold text-xs text-zinc-100 font-mono">{combo.totalCarb.toFixed(1)} <span className="text-[8px] text-zinc-500 font-bold">克</span></span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[8px] block font-bold">鈉含量</span>
                          <span className={`font-extrabold text-xs font-mono ${combo.totalSodium > 1000 ? "text-amber-400" : "text-zinc-100"}`}>{combo.totalSodium} <span className="text-[8px] text-zinc-500 font-bold">毫克</span></span>
                        </div>
                      </div>

                      {/* Expandable Coach Insight details */}
                      <AnimatePresence>
                        {isExplainActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 text-[10px] text-zinc-400 leading-relaxed border-t border-white/5 pt-2.5 font-medium"
                          >
                            <span className="text-[9px] font-black text-emerald-400 block mb-1">💡 營養大師短評：</span>
                            此組合提供充足的優質蛋白質，熱量控制得宜。
                            {combo.totalSodium > 1000 ? " 由於鈉含量較高，建議下一餐可多補充富含鉀的深綠色蔬菜與溫水促進排鈉喔！" : " 鈉含量完全在健康標準內，是增肌減脂期間非常乾淨、無負擔的超完美代餐！"}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action buttons (Direct add and help) */}
                      <div className="mt-3.5 flex items-center justify-between gap-2.5">
                        <button
                          onClick={() => {
                            triggerHaptic(20);
                            const currentKey = combo.items.map(it => it.id).join("_");
                            setActiveExplainItem(isExplainActive ? null : currentKey);
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {isExplainActive ? "隱藏營養短評" : "查看搭配分析"}
                        </button>

                        <button
                          onClick={() => handleAddComboToToday(combo)}
                          className="bg-zinc-950/80 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500/50 text-zinc-200 hover:text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3" />
                          一鍵加到今日 {mealCategory}
                        </button>
                      </div>

                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* General education notice footer */}
      <div className="flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl mt-6">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 leading-relaxed font-bold">
          超商飲食優勢：便利超商食品有著極為精確的 CNS 國家標準營養標示，沒有街邊便當店的「隱形熱量/過度用油」問題，是健身人士精確控卡控鈉的最佳起手式！
        </p>
      </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
