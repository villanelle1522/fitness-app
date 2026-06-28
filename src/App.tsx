import React, { useState, useEffect, FormEvent } from "react";
import { 
  DBState, MealItem, MealGroup, MealRecord, DayRecord, Settings, 
  DEFAULT_SETTINGS, isMealGroup, NutritionTargets
} from "./types";
import { 
  getTodayString, getDateString, formatFriendlyDate, 
  calculateTargets, getRecentWeightTrend 
} from "./utils/nutrition";
import { Charts } from "./components/Charts";
import { AIFoodAnalyzer } from "./components/AIFoodAnalyzer";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Calendar, Settings as SettingsIcon, Salad, PlusCircle, Trash2, Copy,
  Flame, Droplet, Dumbbell, Scale, ChevronRight, Edit2, Download, Upload, 
  Link2, Trash, Sliders, Check, HelpCircle, X, ChevronDown, Sparkles
} from "lucide-react";

// 💡 常用基礎食物範本庫 (Preset Foods Database)
export const FOOD_PRESETS: MealItem[] = [
  { id: -1, name: "熟白米飯 (1 碗/200g)", kcal: 280, protein: 6, carb: 62, fat: 1, fiber: 1.2, sugar: 0, sodium: 4, amount: 200, count: 1, category: "澱粉" },
  { id: -2, name: "乾煎雞胸肉 (100g)", kcal: 150, protein: 31, carb: 0, fat: 2.5, fiber: 0, sugar: 0, sodium: 65, amount: 100, count: 1, category: "蛋白質" },
  { id: -3, name: "水煮蛋 (1 顆/55g)", kcal: 75, protein: 7, carb: 0.6, fat: 5, fiber: 0, sugar: 0, sodium: 70, amount: 55, count: 1, category: "蛋白質" },
  { id: -4, name: "烤地瓜/番薯 (100g)", kcal: 120, protein: 1.5, carb: 28, fat: 0.2, fiber: 3, sugar: 4.2, sodium: 40, amount: 100, count: 1, category: "澱粉" },
  { id: -5, name: "即食大燕麥片 (50g)", kcal: 185, protein: 6.5, carb: 33, fat: 4, fiber: 4.7, sugar: 0.5, sodium: 2, amount: 50, count: 1, category: "澱粉" },
  { id: -6, name: "無糖豆漿 (300ml)", kcal: 95, protein: 10, carb: 4, fat: 4.5, fiber: 1.5, sugar: 1, sodium: 15, amount: 300, count: 1, category: "飲料" },
  { id: -7, name: "水煮綠花椰菜 (100g)", kcal: 28, protein: 2.5, carb: 5, fat: 0.3, fiber: 2.5, sugar: 1.5, sodium: 25, amount: 100, count: 1, category: "蔬菜" },
  { id: -8, name: "義式番茄嫩雞義大利麵", kcal: 480, protein: 28, carb: 72, fat: 12, fiber: 4, sugar: 6, sodium: 850, amount: 400, count: 1, category: "澱粉" },
  { id: -9, name: "綜合堅果 (1 包/25g)", kcal: 160, protein: 5, carb: 4.5, fat: 14, fiber: 2, sugar: 1, sodium: 5, amount: 25, count: 1, category: "點心" },
  { id: -10, name: "希臘式無糖優格 (100g)", kcal: 65, protein: 9, carb: 3.5, fat: 1.5, fiber: 0, sugar: 2.5, sodium: 35, amount: 100, count: 1, category: "蛋白質" },
  { id: -11, name: "清炒高麗菜 (100g)", kcal: 24, protein: 1.3, carb: 5.2, fat: 0.1, fiber: 1.6, sugar: 2, sodium: 12, amount: 100, count: 1, category: "蔬菜" },
  { id: -12, name: "低脂鮮乳 (250ml)", kcal: 110, protein: 8, carb: 12, fat: 3.5, fiber: 0, sugar: 12, sodium: 105, amount: 250, count: 1, category: "飲料" }
];

// 智能判定未分類食物的分類歸屬，提升舊資料與手動新增體驗
export const detectCategory = (item: MealRecord): string => {
  if ("type" in item && item.type === "group") return "其他";
  const f = item as MealItem;
  if (f.category) return f.category;
  
  const name = f.name.toLowerCase();
  if (
    name.includes("飯") || name.includes("麵") || name.includes("地瓜") || 
    name.includes("燕麥") || name.includes("吐司") || name.includes("麵包") || 
    name.includes("薯") || name.includes("碳水") || name.includes("澱粉") || 
    name.includes("麥片") || name.includes("南瓜") || name.includes("芋頭") || 
    name.includes("粥") || name.includes("冬粉") || name.includes("貝果")
  ) return "澱粉";
  
  if (
    name.includes("肉") || name.includes("蛋") || name.includes("豆腐") || 
    name.includes("魚") || name.includes("蝦") || name.includes("奶") || 
    name.includes("乳清") || name.includes("優格") || name.includes("蛋白") || 
    name.includes("豆漿") || name.includes("豆乾") || name.includes("牛") || 
    name.includes("豬") || name.includes("雞") || name.includes("海鮮")
  ) return "蛋白質";
  
  if (
    name.includes("菜") || name.includes("菇") || name.includes("筍") || 
    name.includes("沙拉") || name.includes("椰菜花") || name.includes("瓜") || 
    name.includes("茄") || name.includes("藻") || name.includes("耳") || 
    name.includes("纖維") || name.includes("番茄") || name.includes("西紅柿")
  ) return "蔬菜";
  
  if (
    name.includes("茶") || name.includes("咖啡") || name.includes("水") || 
    name.includes("飲") || name.includes("汁") || name.includes("湯") || 
    name.includes("可樂") || name.includes("汽水")
  ) return "飲料";
  
  if (
    name.includes("餅") || name.includes("糖") || name.includes("蛋糕") || 
    name.includes("巧克力") || name.includes("零食") || name.includes("薯條") || 
    name.includes("洋芋片") || name.includes("冰") || name.includes("甜") || 
    name.includes("派") || name.includes("點品") || name.includes("酥")
  ) return "點心";
  
  return "其他";
};

export default function App() {
  // ─── Core States ───
  const [currentDate, setCurrentDate] = useState<string>(getTodayString());
  const [db, setDb] = useState<DBState>({
    settings: { ...DEFAULT_SETTINGS },
    days: {},
    foods: [],
  });
  const [activeTab, setActiveTab] = useState<"today" | "history" | "foods" | "settings">("today");
  
  // ─── Modal & Form States ───
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalCategory, setAddModalCategory] = useState("早餐");
  const [addModalTab, setAddModalTab] = useState<"quick" | "manual" | "ai">("quick");
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  
  // Manual Add Form State
  const [mName, setMName] = useState("");
  const [mGroup, setMGroup] = useState("");
  const [mAmount, setMAmount] = useState<number | "">("");
  const [mCount, setMCount] = useState<number>(1);
  const [mKcal, setMKcal] = useState<number | "">("");
  const [mProtein, setMProtein] = useState<number | "">("");
  const [mCarb, setMCarb] = useState<number | "">("");
  const [mFat, setMFat] = useState<number | "">("");
  const [mFiber, setMFiber] = useState<number | "">("");
  const [mSugar, setMSugar] = useState<number | "">("");
  const [mSodium, setMSodium] = useState<number | "">("");
  const [mSaveToLib, setMSaveToLib] = useState(true);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  // Edit Food Library Modal State
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [editFoodIndex, setEditFoodIndex] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eCategory, setECategory] = useState("其他");
  const [eKcal, setEKcal] = useState<number | "">("");
  const [eProtein, setEProtein] = useState<number | "">("");
  const [eCarb, setECarb] = useState<number | "">("");
  const [eFat, setEFat] = useState<number | "">("");
  const [eFiber, setEFiber] = useState<number | "">("");
  const [eSugar, setESugar] = useState<number | "">("");
  const [eSodium, setESodium] = useState<number | "">("");
  const [eAmount, setEAmount] = useState<number | "">("");
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);

  // Meal accordion expand state
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustContext, setAdjustContext] = useState<{
    type: "item" | "sub" | "group" | "lib";
    meal?: string;
    idx?: number;
    subIdx?: number;
    origItem: MealItem | { name: string; kcal: number };
    customRatio: number;
    customGram: number;
    customCount: number;
    adjustMode: "ratio" | "gram" | "count";
    isLib?: boolean;
    editedNutrients: {
      kcal: number;
      protein: number;
      carb: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
    };
  } | null>(null);

  // Quick Nutrient Add Modal State
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [nutrientAddKey, setNutrientAddKey] = useState<"protein" | "carb" | "fat" | "fiber" | "sugar" | "sodium" | null>(null);
  const [nutrientAddVal, setNutrientAddVal] = useState<number | "">("");

  // Confirmation Modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Hydration Custom input
  const [customWaterInput, setCustomWaterInput] = useState<number | "">("");

  // Food Library Search and Management States
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryFilterCategory, setLibraryFilterCategory] = useState<string>("全部");
  const [librarySortBy, setLibrarySortBy] = useState<string>("recent");
  const [selectedLibItems, setSelectedLibItems] = useState<number[]>([]);
  const [mCategory, setMCategory] = useState<string>("其他");
  const [showIndicatorDetails, setShowIndicatorDetails] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  // Sync URL State
  const [syncUrl, setSyncUrl] = useState<string>("");
  const [syncWarning, setSyncWarning] = useState<string>("");

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Database from Local Storage or URL parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedData = params.get("data");
      if (sharedData) {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
        if (decoded && decoded.settings && decoded.days) {
          setDb(decoded);
          localStorage.setItem("fitness_db", JSON.stringify(decoded));
          alert("🎉 匯入雲端同步資料成功！");
          // Clear query params without reloading
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
      }
    } catch (e) {
      console.warn("URL data parse failed:", e);
    }

    try {
      const raw = localStorage.getItem("fitness_db");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.settings && parsed.days) {
          // Merge potential missing default settings fields (to ensure forward compatibility)
          const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
            targets: {
              ...DEFAULT_SETTINGS.targets,
              ...(parsed.settings?.targets || {}),
            },
          };
          setDb({
            ...parsed,
            settings: mergedSettings,
          });
        }
      }
    } catch (e) {
      console.error("Local storage load failed:", e);
    }
  }, []);

  // Save changes to localStorage with debouncing helper
  const saveDb = (updatedDb: DBState) => {
    setDb(updatedDb);
    try {
      localStorage.setItem("fitness_db", JSON.stringify(updatedDb));
    } catch (e) {
      console.error("Local storage save failed:", e);
    }
  };

  // Synchronize meal accordion expansion based on whether meals have food items initially/on date change
  useEffect(() => {
    const dayRec = db.days[currentDate] || { meals: { "早餐": [], "午餐": [], "晚餐": [], "點心": [] } };
    const newExpanded: Record<string, boolean> = {};
    ["早餐", "午餐", "晚餐", "點心"].forEach((cat) => {
      const list = dayRec.meals[cat as keyof typeof dayRec.meals] || [];
      newExpanded[cat] = list.length > 0;
    });
    setExpandedMeals(newExpanded);
  }, [currentDate]);

  // Helper to fetch day record or create new
  const getDayRecord = (dateStr: string): DayRecord => {
    if (db.days[dateStr]) return db.days[dateStr];
    return {
      meals: { 早餐: [], 午餐: [], 晚餐: [], 點心: [] },
      waterLog: [],
      exercise: 0,
      weight: null,
      bodyfat: null,
    };
  };

  // ─── Add items ───
  const addMealsToDay = (
    category: string,
    items: MealItem[],
    groupTitle: string = "",
    saveToLib: boolean = false
  ) => {
    const day = { ...getDayRecord(currentDate) };
    const dateNow = Date.now();

    let newRecord: MealRecord;
    if (groupTitle.trim()) {
      newRecord = {
        type: "group",
        id: dateNow,
        name: groupTitle.trim(),
        items: items.map((it, i) => ({ ...it, id: dateNow + 100 + i })),
      };
    } else {
      newRecord = {
        ...items[0],
        id: dateNow,
      };
    }

    // Append to Day meals
    const updatedMeals = { ...day.meals };
    updatedMeals[category as keyof typeof day.meals] = [
      ...updatedMeals[category as keyof typeof day.meals],
      newRecord,
    ];

    const updatedDay = {
      ...day,
      meals: updatedMeals,
    };

    // If check save to library
    let updatedFoods = [...db.foods];
    if (saveToLib) {
      if (groupTitle.trim()) {
        const cleanGroup: MealGroup = {
          type: "group",
          id: dateNow + 500,
          name: groupTitle.trim(),
          items: items.map((it, i) => {
            const { id, ...rest } = it;
            return { ...rest, id: dateNow + 600 + i };
          }),
        };
        updatedFoods.push(cleanGroup);
      } else {
        items.forEach((it) => {
          const { id, ...rest } = it;
          updatedFoods.push({
            ...rest,
            id: Date.now() + Math.random(),
          });
        });
      }
    }

    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: updatedDay,
      },
      foods: updatedFoods,
    });
    setExpandedMeals(prev => ({ ...prev, [category]: true }));
  };

  const handleManualAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!mName.trim()) {
      alert("請輸入食物名稱！");
      return;
    }
    if (mKcal === "") {
      alert("請輸入估計熱量！");
      return;
    }

    const newItem: MealItem = {
      id: Date.now(),
      name: mName.trim(),
      kcal: Number(mKcal),
      protein: Number(mProtein) || 0,
      carb: Number(mCarb) || 0,
      fat: Number(mFat) || 0,
      fiber: Number(mFiber) || 0,
      sugar: Number(mSugar) || 0,
      sodium: Number(mSodium) || 0,
      amount: mAmount === "" ? null : Number(mAmount),
      count: mCount || 1,
      category: mCategory,
    };

    addMealsToDay(addModalCategory, [newItem], mGroup, mSaveToLib);
    
    // Reset manual form
    setMName("");
    setMGroup("");
    setMAmount("");
    setMCount(1);
    setMKcal("");
    setMProtein("");
    setMCarb("");
    setMFat("");
    setMFiber("");
    setMSugar("");
    setMSodium("");
    setMCategory("其他");
    setShowAddModal(false);
  };

  const deleteMealItem = (category: string, index: number) => {
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };
    const targetMealList = [...updatedMeals[category as keyof typeof day.meals]];
    targetMealList.splice(index, 1);
    updatedMeals[category as keyof typeof day.meals] = targetMealList;

    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          meals: updatedMeals,
        },
      },
    });
  };

  // ─── Adjustments ───
  const openAdjustItemModal = (category: string, idx: number) => {
    const day = getDayRecord(currentDate);
    const item = day.meals[category as keyof typeof day.meals][idx];
    if (!item) return;

    if ("type" in item && item.type === "group") {
      // Adjust group aggregate ratio
      const gKcal = item.items.reduce((sum, s) => sum + (s.kcal || 0), 0);
      const dummyGroup = { name: item.name, kcal: gKcal };
      setAdjustContext({
        type: "group",
        meal: category,
        idx,
        origItem: dummyGroup,
        customRatio: 1,
        customGram: 0,
        customCount: 1,
        adjustMode: "ratio",
        editedNutrients: {
          kcal: gKcal,
          protein: item.items.reduce((sum, s) => sum + (s.protein || 0), 0),
          carb: item.items.reduce((sum, s) => sum + (s.carb || 0), 0),
          fat: item.items.reduce((sum, s) => sum + (s.fat || 0), 0),
          fiber: item.items.reduce((sum, s) => sum + (s.fiber || 0), 0),
          sugar: item.items.reduce((sum, s) => sum + (s.sugar || 0), 0),
          sodium: item.items.reduce((sum, s) => sum + (s.sodium || 0), 0),
        },
      });
    } else {
      const singleItem = item as MealItem;
      setAdjustContext({
        type: "item",
        meal: category,
        idx,
        origItem: { ...singleItem },
        customRatio: 1,
        customGram: singleItem.amount || 0,
        customCount: singleItem.count || 1,
        adjustMode: "ratio",
        editedNutrients: {
          kcal: singleItem.kcal || 0,
          protein: singleItem.protein || 0,
          carb: singleItem.carb || 0,
          fat: singleItem.fat || 0,
          fiber: singleItem.fiber || 0,
          sugar: singleItem.sugar || 0,
          sodium: singleItem.sodium || 0,
        },
      });
    }
    setShowAdjustModal(true);
  };

  const openAdjustSubItemModal = (category: string, idx: number, subIdx: number) => {
    const day = getDayRecord(currentDate);
    const grp = day.meals[category as keyof typeof day.meals][idx];
    if (!grp || !("type" in grp) || grp.type !== "group") return;
    const item = grp.items[subIdx];
    if (!item) return;

    setAdjustContext({
      type: "sub",
      meal: category,
      idx,
      subIdx,
      origItem: { ...item },
      customRatio: 1,
      customGram: item.amount || 0,
      customCount: item.count || 1,
      adjustMode: "ratio",
      editedNutrients: {
        kcal: item.kcal || 0,
        protein: item.protein || 0,
        carb: item.carb || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
      },
    });
    setShowAdjustModal(true);
  };

  const applyAdjustmentRatio = (ratio: number) => {
    if (!adjustContext) return;
    const orig = adjustContext.origItem as MealItem;
    setAdjustContext({
      ...adjustContext,
      customRatio: ratio,
      editedNutrients: {
        kcal: Math.round((orig.kcal || 0) * ratio),
        protein: Math.round((orig.protein || 0) * ratio * 10) / 10,
        carb: Math.round((orig.carb || 0) * ratio * 10) / 10,
        fat: Math.round((orig.fat || 0) * ratio * 10) / 10,
        fiber: Math.round((orig.fiber || 0) * ratio * 10) / 10,
        sugar: Math.round((orig.sugar || 0) * ratio * 10) / 10,
        sodium: Math.round((orig.sodium || 0) * ratio),
      },
    });
  };

  const handleAdjustGramInput = (gram: number) => {
    if (!adjustContext) return;
    const orig = adjustContext.origItem as MealItem;
    const origAmount = orig.amount || 0;
    if (origAmount <= 0) return;

    const ratio = gram / origAmount;
    setAdjustContext({
      ...adjustContext,
      customGram: gram,
      customRatio: ratio,
      editedNutrients: {
        kcal: Math.round((orig.kcal || 0) * ratio),
        protein: Math.round((orig.protein || 0) * ratio * 10) / 10,
        carb: Math.round((orig.carb || 0) * ratio * 10) / 10,
        fat: Math.round((orig.fat || 0) * ratio * 10) / 10,
        fiber: Math.round((orig.fiber || 0) * ratio * 10) / 10,
        sugar: Math.round((orig.sugar || 0) * ratio * 10) / 10,
        sodium: Math.round((orig.sodium || 0) * ratio),
      },
    });
  };

  const handleAdjustCountInput = (count: number) => {
    if (!adjustContext) return;
    const orig = adjustContext.origItem as MealItem;
    const origCount = orig.count || 1;
    const ratio = count / origCount;

    setAdjustContext({
      ...adjustContext,
      customCount: count,
      customRatio: ratio,
      editedNutrients: {
        kcal: Math.round((orig.kcal || 0) * ratio),
        protein: Math.round((orig.protein || 0) * ratio * 10) / 10,
        carb: Math.round((orig.carb || 0) * ratio * 10) / 10,
        fat: Math.round((orig.fat || 0) * ratio * 10) / 10,
        fiber: Math.round((orig.fiber || 0) * ratio * 10) / 10,
        sugar: Math.round((orig.sugar || 0) * ratio * 10) / 10,
        sodium: Math.round((orig.sodium || 0) * ratio),
      },
    });
  };

  const saveAdjustment = () => {
    if (!adjustContext) return;
    const { type, meal, idx, subIdx, editedNutrients, customGram, customCount, adjustMode } = adjustContext;
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };

    if (type === "lib") {
      // Library edit
      const updatedFoods = [...db.foods];
      const target = updatedFoods[idx!] as MealItem;
      if (target) {
        updatedFoods[idx!] = {
          ...target,
          ...editedNutrients,
        };
        saveDb({ ...db, foods: updatedFoods });
      }
    } else if (type === "group") {
      // Group calorie ratio scaling
      const grp = updatedMeals[meal as keyof typeof updatedMeals][idx!] as MealGroup;
      if (grp) {
        const origKcal = grp.items.reduce((sum, s) => sum + (s.kcal || 0), 0) || 1;
        const newKcal = editedNutrients.kcal;
        const ratio = newKcal / origKcal;

        grp.items = grp.items.map((sub) => ({
          ...sub,
          kcal: Math.round((sub.kcal || 0) * ratio),
          protein: Math.round((sub.protein || 0) * ratio * 10) / 10,
          carb: Math.round((sub.carb || 0) * ratio * 10) / 10,
          fat: Math.round((sub.fat || 0) * ratio * 10) / 10,
          fiber: Math.round((sub.fiber || 0) * ratio * 10) / 10,
          sugar: Math.round((sub.sugar || 0) * ratio * 10) / 10,
          sodium: Math.round((sub.sodium || 0) * ratio),
        }));
      }
    } else if (type === "sub") {
      // Adjust sub element in group
      const grp = updatedMeals[meal as keyof typeof updatedMeals][idx!] as MealGroup;
      if (grp && grp.items[subIdx!]) {
        grp.items[subIdx!] = {
          ...grp.items[subIdx!],
          ...editedNutrients,
          amount: adjustMode === "gram" ? customGram : grp.items[subIdx!].amount,
          count: adjustMode === "count" ? customCount : grp.items[subIdx!].count,
        };
      }
    } else {
      // Adjust standard single item
      const item = updatedMeals[meal as keyof typeof updatedMeals][idx!] as MealItem;
      if (item) {
        updatedMeals[meal as keyof typeof updatedMeals][idx!] = {
          ...item,
          ...editedNutrients,
          amount: adjustMode === "gram" ? customGram : item.amount,
          count: adjustMode === "count" ? customCount : item.count,
        };
      }
    }

    if (type !== "lib") {
      saveDb({
        ...db,
        days: {
          ...db.days,
          [currentDate]: {
            ...day,
            meals: updatedMeals,
          },
        },
      });
    }

    setShowAdjustModal(false);
    setAdjustContext(null);
  };

  // ─── Water Logs ───
  const quickWaterAdd = (ml: number) => {
    const day = { ...getDayRecord(currentDate) };
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    
    const updatedWaterLog = [...day.waterLog, { ml, time: timeStr }];
    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          waterLog: updatedWaterLog,
        },
      },
    });
  };

  const deleteWaterLog = (index: number) => {
    const day = { ...getDayRecord(currentDate) };
    const updatedWaterLog = [...day.waterLog];
    updatedWaterLog.splice(index, 1);
    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          waterLog: updatedWaterLog,
        },
      },
    });
  };

  // ─── Daily health indicators (weight, bodyfat, exercise) ───
  const saveDailyIndicators = (weight: number | null, bodyfat: number | null, exercise: number) => {
    const day = { ...getDayRecord(currentDate) };
    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          weight,
          bodyfat,
          exercise,
        },
      },
    });
    showToast("💾 今日身體與運動數據儲存成功！", "success");
  };

  const handleClearTodayRecord = () => {
    const day = { ...getDayRecord(currentDate) };
    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          meals: { 早餐: [], 午餐: [], 晚餐: [], 點心: [] },
          waterLog: [],
          exercise: 0,
        },
      },
    });
    setShowClearConfirm(false);
  };

  // ─── Nutrient quick replenishment ───
  const openNutrientSupplement = (key: typeof nutrientAddKey) => {
    setNutrientAddKey(key);
    setNutrientAddVal("");
    setShowNutrientModal(true);
  };

  const confirmNutrientSupplementSubmit = () => {
    if (nutrientAddVal === "" || !nutrientAddKey) return;
    const v = Number(nutrientAddVal);
    if (v <= 0) return;

    // Estimate calorie equivalent
    const multipliers = { protein: 4, carb: 4, fat: 9, fiber: 2, sugar: 4, sodium: 0 };
    const kcalEst = Math.round(v * (multipliers[nutrientAddKey] || 0));

    const newItem: MealItem = {
      id: Date.now(),
      name: `快速補充${{protein: '蛋白質', carb: '碳水', fat: '脂肪', fiber: '膳食纖維', sugar: '糖', sodium: '鈉'}[nutrientAddKey]}`,
      kcal: kcalEst,
      protein: nutrientAddKey === "protein" ? v : 0,
      carb: nutrientAddKey === "carb" ? v : 0,
      fat: nutrientAddKey === "fat" ? v : 0,
      fiber: nutrientAddKey === "fiber" ? v : 0,
      sugar: nutrientAddKey === "sugar" ? v : 0,
      sodium: nutrientAddKey === "sodium" ? v : 0,
    };

    addMealsToDay("點心", [newItem]);
    setShowNutrientModal(false);
  };

  // ─── Calculations and stats variables ───
  const dayRecord = getDayRecord(currentDate);
  
  // Calculate total calories & macro values logged for the current active date
  const loggedTotals = (() => {
    const totals = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    Object.values(dayRecord.meals).forEach((mealList) => {
      mealList.forEach((it) => {
        if ("type" in it && it.type === "group") {
          it.items.forEach((sub) => {
            totals.kcal += sub.kcal || 0;
            totals.protein += sub.protein || 0;
            totals.carb += sub.carb || 0;
            totals.fat += sub.fat || 0;
            totals.fiber += sub.fiber || 0;
            totals.sugar += sub.sugar || 0;
            totals.sodium += sub.sodium || 0;
          });
        } else {
          const singleItem = it as MealItem;
          totals.kcal += singleItem.kcal || 0;
          totals.protein += singleItem.protein || 0;
          totals.carb += singleItem.carb || 0;
          totals.fat += singleItem.fat || 0;
          totals.fiber += singleItem.fiber || 0;
          totals.sugar += singleItem.sugar || 0;
          totals.sodium += singleItem.sodium || 0;
        }
      });
    });
    // rounding helpers
    return {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein * 10) / 10,
      carb: Math.round(totals.carb * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
      sugar: Math.round(totals.sugar * 10) / 10,
      sodium: Math.round(totals.sodium),
    };
  })();

  const waterTotalLogged = dayRecord.waterLog.reduce((sum, w) => sum + w.ml, 0);
  const settings = db.settings;
  const targets = settings.targets;
  
  // Calorie progress circle parameters
  const kcalTarget = targets.kcal || 1800;
  const loggedKcalPercentage = Math.min(loggedTotals.kcal / kcalTarget, 1.05);
  const circleRadius = 41;
  const circleStrokeCircumference = 2 * Math.PI * circleRadius;
  const calorieRemain = Math.max(0, kcalTarget - loggedTotals.kcal);
  const calorieOver = Math.max(0, loggedTotals.kcal - kcalTarget);

  // Latest logged weight/bodyfat across past records if not logged today
  const getLatestLogVal = (field: "weight" | "bodyfat"): number | null => {
    if (dayRecord[field] !== null) return dayRecord[field];
    const dates = Object.keys(db.days)
      .filter((d) => db.days[d][field] !== null)
      .sort();
    return dates.length ? db.days[dates[dates.length - 1]][field] : null;
  };

  const latestWeight = getLatestLogVal("weight") || settings.weight || 0;
  const latestBodyfat = getLatestLogVal("bodyfat");

  // Summary generation block
  const getDailySummary = () => {
    const proteinPct = loggedTotals.protein / Math.max(targets.protein, 1);
    if (loggedTotals.kcal === 0) {
      return { text: "今日尚無飲食紀錄，點選下方餐點或利用 AI 剖析開始記錄", style: "border-amber-500/55 text-amber-300 bg-amber-500/10" };
    }
    if (calorieOver > 50) {
      return { text: "今日熱量攝取已超標，請留意後續飲食搭配，加強運動", style: "border-rose-500/55 text-rose-300 bg-rose-500/10" };
    }
    if (proteinPct < 0.6) {
      return { text: `今日蛋白質攝取不足，建議補充肉蛋類以利肌肉修復 (尚缺 ${Math.round(targets.protein - loggedTotals.protein)} 克)`, style: "border-yellow-500/55 text-yellow-300 bg-yellow-500/10" };
    }
    if (calorieRemain >= 0 && calorieRemain <= 200 && proteinPct >= 0.85) {
      return { text: "今日飲食控制極其精準！熱量與蛋白質完美符合目標", style: "border-green-500/55 text-green-300 bg-green-500/10" };
    }
    return { text: "飲食熱量與微量營養素控制良好，繼續保持下去", style: "border-indigo-500/55 text-indigo-300 bg-indigo-500/10" };
  };

  const summaryText = getDailySummary();

  // Settings Panel triggers
  const handleUpdateSettings = (updated: Partial<Settings>) => {
    const newSettings = { ...db.settings, ...updated };
    // Auto-calculate water target if custom isn't specified
    if (updated.weight && !updated.waterTarget) {
      newSettings.waterTarget = Math.round(updated.weight * 30);
    }
    saveDb({ ...db, settings: newSettings });
  };

  const recalculateAITargets = () => {
    const computedTargets = calculateTargets(db.settings);
    saveDb({
      ...db,
      settings: {
        ...db.settings,
        targets: computedTargets,
      },
    });
    alert("💪 系統已根據運動科學公式自動更新您的熱量及三大營養素目標！");
  };

  // ─── Data Management ───
  const triggerDataExport = () => {
    const exportState = {
      ...db,
      settings: {
        ...db.settings,
        lastExportDate: Date.now(),
      },
    };
    saveDb(exportState);
    const blob = new Blob([JSON.stringify(exportState)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `卡路里健身紀錄備份_${getTodayString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDataImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.settings && parsed.days) {
          saveDb(parsed);
          alert("📥 資料庫備份還原成功！");
        } else {
          alert("❌ 檔案格式不符合備份標準格式，還原失敗。");
        }
      } catch (err) {
        alert("❌ 解析備份檔案時發生錯誤，請確認為正確的 JSON 備份檔案。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const generateSyncUrl = () => {
    const jsonStr = JSON.stringify(db);
    const sizeKB = Math.round(jsonStr.length / 1024);
    
    if (sizeKB > 8) {
      setSyncWarning(`🚨 資料包容量為 ${sizeKB}KB (超出雲端瀏覽器網址容量上限 8KB)。若欲轉移資料，強烈建議使用「手動匯出 JSON 備份」！`);
      setSyncUrl("");
    } else {
      if (sizeKB > 5) {
        setSyncWarning(`⚠️ 目前資料量 ${sizeKB}KB 較多，某些行動裝置瀏覽器開啟可能不穩定。`);
      } else {
        setSyncWarning("");
      }
      try {
        const url = `${window.location.origin}${window.location.pathname}?data=${btoa(unescape(encodeURIComponent(jsonStr)))}`;
        setSyncUrl(url);
      } catch (err) {
        alert("產生同步連結失敗，請直接匯出 JSON 備份檔。");
      }
    }
  };

  // Add from Food Library directly to today
  const addLibItemToToday = (record: MealRecord, category: string) => {
    const dateNow = Date.now();
    let cloned: MealRecord;

    if ("type" in record && record.type === "group") {
      cloned = {
        ...record,
        id: dateNow,
        items: record.items.map((sub, i) => ({ ...sub, id: dateNow + 100 + i })),
      };
    } else {
      cloned = {
        ...record,
        id: dateNow,
      };
    }

    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };
    updatedMeals[category as keyof typeof day.meals] = [
      ...updatedMeals[category as keyof typeof day.meals],
      cloned,
    ];

    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          meals: updatedMeals,
        },
      },
    });
    setExpandedMeals(prev => ({ ...prev, [category]: true }));
    showToast(`✅ 已加選 ${record.name} 至今日 ${category} 紀錄！`, "success");
  };

  // Copy specific meal category from the most recent day that has records
  const copyPreviousDayMeal = (cat: string) => {
    const todayStr = currentDate;
    const dateKeys = Object.keys(db.days).sort().reverse();
    
    let sourceDayStr: string | null = null;
    let sourceMealRecords: MealRecord[] = [];
    
    for (const dStr of dateKeys) {
      if (dStr < todayStr) {
        const day = db.days[dStr];
        if (day && day.meals && day.meals[cat as keyof typeof day.meals] && day.meals[cat as keyof typeof day.meals].length > 0) {
          sourceDayStr = dStr;
          sourceMealRecords = day.meals[cat as keyof typeof day.meals];
          break;
        }
      }
    }
    
    if (!sourceDayStr || sourceMealRecords.length === 0) {
      showToast("找不到過去有紀錄的此餐內容以供複製！", "error");
      return;
    }
    
    const day = { ...getDayRecord(todayStr) };
    const updatedMeals = { ...day.meals };
    
    // Deep copy records to prevent reference sharing, generating unique IDs
    const copiedItems: MealRecord[] = JSON.parse(JSON.stringify(sourceMealRecords)).map((rec: any, idx: number) => {
      rec.id = Date.now() + Math.floor(Math.random() * 10000) + idx;
      if (rec.type === "group" && rec.items) {
        rec.items = rec.items.map((sub: any, sIdx: number) => ({
          ...sub,
          id: Date.now() + 20000 + Math.floor(Math.random() * 10000) + sIdx
        }));
      }
      return rec;
    });
    
    updatedMeals[cat as keyof typeof day.meals] = [
      ...(updatedMeals[cat as keyof typeof day.meals] || []),
      ...copiedItems
    ];
    
    saveDb({
      ...db,
      days: {
        ...db.days,
        [todayStr]: {
          ...day,
          meals: updatedMeals
        }
      }
    });
    
    showToast(`📋 已自 ${formatFriendlyDate(sourceDayStr)} 複製 ${cat} 紀錄！`, "success");
  };

  const deleteFoodLibraryItem = (idx: number) => {
    if (!confirm("確定要刪除此食物庫品項嗎？")) return;
    const updatedFoods = [...db.foods];
    updatedFoods.splice(idx, 1);
    saveDb({ ...db, foods: updatedFoods });
  };

  const openEditFoodLibraryItem = (idx: number) => {
    const item = db.foods[idx];
    setEditFoodIndex(idx);
    setEName(item.name);
    setECategory(detectCategory(item));
    if ("type" in item && item.type === "group") {
      setEKcal("");
      setEProtein("");
      setECarb("");
      setEFat("");
      setEFiber("");
      setESugar("");
      setESodium("");
      setEAmount("");
    } else {
      const single = item as MealItem;
      setEKcal(single.kcal || 0);
      setEProtein(single.protein || 0);
      setECarb(single.carb || 0);
      setEFat(single.fat || 0);
      setEFiber(single.fiber || 0);
      setESugar(single.sugar || 0);
      setESodium(single.sodium || 0);
      setEAmount(single.amount || "");
    }
    setShowEditAdvanced(false);
    setShowEditFoodModal(true);
  };

  const saveEditedFoodLibraryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editFoodIndex === null) return;
    const item = db.foods[editFoodIndex];
    const updatedFoods = [...db.foods];
    if ("type" in item && item.type === "group") {
      updatedFoods[editFoodIndex] = {
        ...item,
        name: eName,
      };
    } else {
      updatedFoods[editFoodIndex] = {
        ...item,
        name: eName,
        category: eCategory,
        kcal: Number(eKcal) || 0,
        protein: Number(eProtein) || 0,
        carb: Number(eCarb) || 0,
        fat: Number(eFat) || 0,
        fiber: Number(eFiber) || 0,
        sugar: Number(eSugar) || 0,
        sodium: Number(eSodium) || 0,
        amount: eAmount === "" ? null : Number(eAmount),
      } as MealItem;
    }
    saveDb({ ...db, foods: updatedFoods });
    setShowEditFoodModal(false);
    setEditFoodIndex(null);
    showToast("💾 食物品項已成功更新！", "success");
  };

  // 批次加入已勾選的食物庫品項到今日記錄
  const batchAddLibItemsToToday = (records: MealRecord[], category: string) => {
    if (records.length === 0) {
      showToast("請先勾選食物品項！", "info");
      return;
    }
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };
    
    let baseTime = Date.now();
    const newRecords = records.map((record, index) => {
      const dateNow = baseTime + index;
      let cloned: MealRecord;
      if ("type" in record && record.type === "group") {
        cloned = {
          ...record,
          id: dateNow,
          items: record.items.map((sub, sIdx) => ({ ...sub, id: dateNow + 100 + sIdx })),
        };
      } else {
        cloned = {
          ...record,
          id: dateNow,
        };
      }
      return cloned;
    });

    updatedMeals[category as keyof typeof day.meals] = [
      ...updatedMeals[category as keyof typeof day.meals],
      ...newRecords,
    ];

    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          meals: updatedMeals,
        },
      },
    });
    setSelectedLibItems([]); // 清空已選取項目
    showToast(`✅ 已成功將已選取的 ${records.length} 項食物批次新增至今日 ${category}！`, "success");
  };

  // 一鍵儲存基礎範本到個人食物庫
  const addPresetToLibrary = (preset: MealItem) => {
    if (db.foods.some(f => !("type" in f && f.type === "group") && f.name === preset.name)) {
      showToast(`💡 「${preset.name}」已經存在於您的食物庫中囉！`, "info");
      return;
    }
    const newItem: MealItem = {
      ...preset,
      id: Date.now() + Math.round(Math.random() * 1000)
    };
    saveDb({
      ...db,
      foods: [...db.foods, newItem]
    });
    showToast(`🎉 「${preset.name}」已成功儲存到您的個人食物庫！`, "success");
  };

  return (
    <div id="root" className="min-h-screen flex flex-col bg-[#050507] text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white pb-[80px] lg:pb-0 relative overflow-x-hidden max-w-[480px] lg:max-w-none mx-auto w-full">
      
      {/* Premium Tech Dot Grid & Faint Ambient Light (Allows Glassmorphism to Blur and Stand Out) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#040406]">
        {/* Dot Grid Matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.2px,transparent_1.2px)] [background-size:24px_24px]" />
        
        {/* Elegantly soft indigo gradient highlight behind the sidebar */}
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-[130px]" />
        
        {/* Soft, extremely dim emerald light in the lower right bottom */}
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[140px]" />
      </div>
      
      {/* Responsive Left Fixed Sidebar for Desktop / Bottom Nav for Mobile */}
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden relative z-10 w-full">
        
        {/* Desktop Left Navigation Sidebar */}
        <nav className="hidden lg:flex flex-col w-[250px] bg-zinc-950/80 border-r border-white/10 backdrop-blur-2xl shrink-0 h-screen sticky top-0 p-5 justify-between relative z-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white p-2 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-white/10">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  健身飲食紀錄
                </h1>
                <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-widest">
                  Calorie Dashboard
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-4">
              <span className="text-[10px] font-black tracking-widest text-zinc-600 uppercase block pl-3 pb-1">
                功能導航
              </span>
              <button
                onClick={() => setActiveTab("today")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "today"
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Flame className="w-4 h-4" />
                今日紀錄主頁
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Calendar className="w-4 h-4" />
                歷史統計趨勢
              </button>
              <button
                onClick={() => setActiveTab("foods")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "foods"
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Salad className="w-4 h-4" />
                我的個人食物庫
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "settings"
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                目標與身體設定
              </button>
            </div>
          </div>

          {/* Desktop Left Sidebar Footer Widgets */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2 backdrop-blur-md shadow-lg">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold tracking-wider">
              <span>本日熱量進度</span>
              <span>{Math.round(loggedKcalPercentage * 100)}%</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${loggedTotals.kcal > targets.kcal ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(loggedKcalPercentage * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-zinc-400">攝入: {loggedTotals.kcal}</span>
              <span className="text-zinc-650">/ 目標 {targets.kcal}</span>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Header */}
        <header className="lg:hidden flex justify-between items-center w-full max-w-[480px] mx-auto bg-zinc-950/75 backdrop-blur-xl border-b border-white/10 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo-400" />
            <h1 className="text-sm font-black tracking-tight">健身飲食紀錄</h1>
          </div>
          <span className="text-[10px] font-extrabold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 py-1 px-2.5 rounded-full">
            {settings.mode}
          </span>
        </header>

        {/* Main Dashboard Panel */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 lg:h-full lg:overflow-y-auto overflow-x-hidden">
          
          {/* Header Action / Date Navigator (Active only when activeTab is "today" or "history") */}
          {activeTab === "today" && (
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <button 
                  onClick={() => {
                    const parts = currentDate.split("-");
                    const prev = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    prev.setDate(prev.getDate() - 1);
                    setCurrentDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`);
                  }}
                  className="bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.05] text-zinc-200 text-zinc-300 w-9 h-9 flex items-center justify-center rounded-xl font-bold cursor-pointer transition-colors"
                >
                  ‹
                </button>
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-zinc-400 font-bold tracking-wider block uppercase">當前記錄日期</span>
                  <span className="text-sm font-extrabold text-zinc-100">{formatFriendlyDate(currentDate)} ({currentDate})</span>
                </div>
                <button 
                  onClick={() => {
                    const parts = currentDate.split("-");
                    const next = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    next.setDate(next.getDate() + 1);
                    setCurrentDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
                  }}
                  className="bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.05] text-zinc-200 text-zinc-300 w-9 h-9 flex items-center justify-center rounded-xl font-bold cursor-pointer transition-colors"
                >
                  ›
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate(getTodayString())}
                  className="bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.05] text-zinc-200 text-zinc-300 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer transition-colors flex-1 text-center"
                >
                  回到今天
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空今日
                </button>
              </div>
            </div>
          )}

          {/* Render Tab Contents */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* ────────────────── 1. TODAY TAB ────────────────── */}
              {activeTab === "today" && (
                <div className="space-y-6">
                  
                  {/* Summary alert banner */}
                  <div className={`border-l-4 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${summaryText.style}`}>
                    <span>{summaryText.text}</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column - Rings, Target breakdown and Quick inputs */}
                    <div className="space-y-6 lg:col-span-5">
                      
                      {/* Calories & Macros Bento Rings Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Calories Ring Card */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-4 flex flex-col justify-between h-full space-y-4">
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">熱量消耗進度</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* SVG Progress Ring */}
                            <div className="relative w-18 h-18 shrink-0">
                              <svg className="-rotate-90 w-full h-full" viewBox="0 0 96 96">
                                <circle cx="48" cy="48" r={circleRadius} fill="none" stroke="#222227" strokeWidth="10" />
                                <motion.circle 
                                  cx="48" 
                                  cy="48" 
                                  r={circleRadius} 
                                  fill="none" 
                                  stroke={loggedTotals.kcal > kcalTarget ? "#f43f5e" : "#6366f1"} 
                                  strokeWidth="10" 
                                  strokeLinecap="round"
                                  initial={{ strokeDashoffset: circleStrokeCircumference }}
                                  animate={{ strokeDashoffset: circleStrokeCircumference * (1 - loggedKcalPercentage) }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  style={{ strokeDasharray: circleStrokeCircumference }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-black text-zinc-100">{loggedTotals.kcal}</span>
                                <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">大卡</span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[9px] text-zinc-400 block">目標 {kcalTarget} kcal</span>
                              <div className="text-[11px] font-bold">
                                {calorieRemain > 0 ? (
                                  <span className="text-indigo-400">剩餘 {calorieRemain}</span>
                                ) : (
                                  <span className="text-rose-500">超量 {calorieOver}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold border-t border-zinc-850 pt-2">
                            <span>運動: <span className="text-green-400">-{dayRecord.exercise || 0}</span></span>
                            <span>淨熱量: <span className="text-zinc-300">{Math.round(loggedTotals.kcal - (dayRecord.exercise || 0))}</span></span>
                          </div>
                        </div>

                        {/* Macros Doughnut Card */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-4 flex flex-col justify-between h-full space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              三大營養素比例 (熱量)
                            </span>
                          </div>

                          {(() => {
                            const actualCarbKcal = loggedTotals.carb * 4;
                            const actualProteinKcal = loggedTotals.protein * 4;
                            const actualFatKcal = loggedTotals.fat * 9;
                            const totalActualMacroKcal = actualCarbKcal + actualProteinKcal + actualFatKcal;

                            const carbRatio = totalActualMacroKcal > 0 ? (actualCarbKcal / totalActualMacroKcal) : 0.40;
                            const proteinRatio = totalActualMacroKcal > 0 ? (actualProteinKcal / totalActualMacroKcal) : 0.30;
                            const fatRatio = totalActualMacroKcal > 0 ? (actualFatKcal / totalActualMacroKcal) : 0.30;

                            const targetCarbKcal = targets.carb * 4;
                            const targetProteinKcal = targets.protein * 4;
                            const targetFatKcal = targets.fat * 9;
                            const totalTargetMacroKcal = targetCarbKcal + targetProteinKcal + targetFatKcal;

                            const targetCarbRatio = totalTargetMacroKcal > 0 ? (targetCarbKcal / totalTargetMacroKcal) : 0.40;
                            const targetProteinRatio = totalTargetMacroKcal > 0 ? (targetProteinKcal / totalTargetMacroKcal) : 0.30;
                            const targetFatRatio = totalTargetMacroKcal > 0 ? (targetFatKcal / totalTargetMacroKcal) : 0.30;

                            return (
                              <div className="flex items-center gap-4">
                                {/* Segmented Doughnut SVG */}
                                <div className="relative w-18 h-18 shrink-0">
                                  <svg className="-rotate-90 w-full h-full" viewBox="0 0 40 40">
                                    {totalActualMacroKcal === 0 ? (
                                      <circle cx="20" cy="20" r="16" fill="none" stroke="#222227" strokeWidth="4.5" />
                                    ) : (
                                      <>
                                        {/* Carbs Segment (Orange #f97316) */}
                                        {carbRatio > 0 && (
                                          <circle 
                                            cx="20" 
                                            cy="20" 
                                            r="16" 
                                            fill="none" 
                                            stroke="#f97316" 
                                            strokeWidth="4.5"
                                            strokeDasharray={`${carbRatio * 100.5} 100.5`}
                                            strokeDashoffset={0}
                                          />
                                        )}
                                        {/* Protein Segment (Green #10b981) */}
                                        {proteinRatio > 0 && (
                                          <circle 
                                            cx="20" 
                                            cy="20" 
                                            r="16" 
                                            fill="none" 
                                            stroke="#10b981" 
                                            strokeWidth="4.5"
                                            strokeDasharray={`${proteinRatio * 100.5} 100.5`}
                                            strokeDashoffset={-carbRatio * 100.5}
                                          />
                                        )}
                                        {/* Fat Segment (Yellow #facc15) */}
                                        {fatRatio > 0 && (
                                          <circle 
                                            cx="20" 
                                            cy="20" 
                                            r="16" 
                                            fill="none" 
                                            stroke="#facc15" 
                                            strokeWidth="4.5"
                                            strokeDasharray={`${fatRatio * 100.5} 100.5`}
                                            strokeDashoffset={-(carbRatio + proteinRatio) * 100.5}
                                          />
                                        )}
                                      </>
                                    )}
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-black text-zinc-200">
                                      {totalActualMacroKcal > 0 ? `${Math.round(proteinRatio * 100)}%` : "0%"}
                                    </span>
                                    <span className="text-[6px] text-zinc-400 font-extrabold uppercase tracking-tighter">蛋白質</span>
                                  </div>
                                </div>

                                {/* Macro Legend and ratios vs target ratios */}
                                <div className="flex-1 min-w-0 space-y-1 text-[10px]">
                                  <div className="flex items-center justify-between text-orange-400 font-bold">
                                    <span>碳水: {totalActualMacroKcal > 0 ? `${Math.round(carbRatio * 100)}%` : "0%"}</span>
                                    <span className="text-zinc-650 font-medium text-[8px]">標 {Math.round(targetCarbRatio * 100)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                                    <span>蛋白: {totalActualMacroKcal > 0 ? `${Math.round(proteinRatio * 100)}%` : "0%"}</span>
                                    <span className="text-zinc-650 font-medium text-[8px]">標 {Math.round(targetProteinRatio * 100)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-yellow-400 font-bold">
                                    <span>脂肪: {totalActualMacroKcal > 0 ? `${Math.round(fatRatio * 100)}%` : "0%"}</span>
                                    <span className="text-zinc-650 font-medium text-[8px]">標 {Math.round(targetFatRatio * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="text-[9px] text-zinc-400 font-bold text-center border-t border-zinc-850 pt-2 truncate">
                            蛋白比例越高，飽足感與燃脂力越強 🎯
                          </div>
                        </div>
                      </div>

                      {/* Macronutrients Progress Grid */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日微量營養素分配</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { key: "protein", label: "蛋白質", color: "bg-emerald-500", text: "text-emerald-400", unit: "g" },
                            { key: "carb", label: "碳水化合物", color: "bg-orange-500", text: "text-orange-400", unit: "g" },
                            { key: "fat", label: "脂肪", color: "bg-amber-400", text: "text-amber-400", unit: "g" },
                            { key: "fiber", label: "膳食纖維", color: "bg-purple-500", text: "text-purple-400", unit: "g" },
                            { key: "sugar", label: "精緻糖", color: "bg-zinc-400", text: "text-zinc-400", unit: "g" },
                            { key: "sodium", label: "鈉離子", color: "bg-rose-500", text: "text-rose-400", unit: "mg" },
                          ].map((macro) => {
                            const val = loggedTotals[macro.key as keyof typeof loggedTotals];
                            const tgt = targets[macro.key as keyof typeof targets];
                            const pct = Math.min((val / (tgt || 1)) * 100, 100);
                            const isExceeded = val > tgt;

                            return (
                              <div 
                                key={macro.key} 
                                onClick={() => openNutrientSupplement(macro.key as any)}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:border-zinc-700 transition-all flex flex-col justify-between"
                              >
                                <span className="text-[11px] text-zinc-400 font-bold block">{macro.label}</span>
                                <div className="flex items-baseline gap-1 my-1.5">
                                  <span className={`text-base font-extrabold ${isExceeded && macro.key !== 'fiber' ? 'text-rose-500' : macro.text}`}>
                                    {val}
                                  </span>
                                  <span className="text-[10px] text-zinc-600 font-bold">/ {tgt}{macro.unit}</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-1 overflow-hidden mt-1">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${isExceeded && macro.key !== 'fiber' ? 'bg-rose-500' : macro.color}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-zinc-600 block mt-2 text-right">點此快速追加</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Daily weight, fat percentage, and exercise tracking */}
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-zinc-400" />
                          <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日身體指標與消耗</h3>
                        </div>

                        {/* Interactive fields */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-zinc-400 font-bold">體重 (公斤):</span>
                            <input 
                              type="number" 
                              className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                              placeholder="例: 70.2"
                              defaultValue={dayRecord.weight || ""}
                              onBlur={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                saveDailyIndicators(val, dayRecord.bodyfat, dayRecord.exercise);
                              }}
                              step="0.1"
                            />
                            <span className="text-zinc-600 w-8 text-right font-bold">kg</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-zinc-400 font-bold">體脂率 (%):</span>
                            <input 
                              type="number" 
                              className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                              placeholder="例: 18.5"
                              defaultValue={dayRecord.bodyfat || ""}
                              onBlur={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                saveDailyIndicators(dayRecord.weight, val, dayRecord.exercise);
                              }}
                              step="0.1"
                            />
                            <span className="text-zinc-600 w-8 text-right font-bold">%</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-zinc-400 font-bold">運動消耗:</span>
                            <input 
                              type="number" 
                              className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                              placeholder="重訓或跑步卡路里"
                              defaultValue={dayRecord.exercise || ""}
                              onBlur={(e) => {
                                const val = Number(e.target.value) || 0;
                                saveDailyIndicators(dayRecord.weight, dayRecord.bodyfat, val);
                              }}
                            />
                            <span className="text-zinc-600 w-8 text-right font-bold">kcal</span>
                          </div>
                        </div>

                        {/* Calculated Muscle & Fat indicators */}
                        {latestBodyfat !== null && latestWeight > 0 && (
                          <div className="bg-black/50 p-3 rounded-xl border border-zinc-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                            <div>
                              <span className="text-zinc-400 text-[10px] block font-bold">脂肪淨重</span>
                              <span className="text-sm font-extrabold text-orange-400">
                                {((latestWeight * latestBodyfat) / 100).toFixed(1)} kg
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-400 text-[10px] block font-bold">無脂體重 (估算肌肉)</span>
                              <span className="text-sm font-extrabold text-emerald-400">
                                {(latestWeight - (latestWeight * latestBodyfat) / 100).toFixed(1)} kg
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Meals list and Hydration tracking */}
                    <div className="space-y-6 lg:col-span-7">
                      
                      {/* Meals list */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日飲食紀錄</h3>
                          <span className="text-xs text-zinc-400">點選各餐「＋新增」或下方食物</span>
                        </div>

                        {["早餐", "午餐", "晚餐", "點心"].map((cat) => {
                          const list = dayRecord.meals[cat as keyof typeof dayRecord.meals] || [];
                          const mealKcal = list.reduce((sum, item) => {
                            if ("type" in item && item.type === "group") {
                              return sum + item.items.reduce((acc, sub) => acc + (sub.kcal || 0), 0);
                            }
                            const singleItem = item as MealItem;
                            return sum + (singleItem.kcal || 0);
                          }, 0);
                          const isExpanded = !!expandedMeals[cat];

                          return (
                            <div key={cat} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl overflow-hidden shadow-sm">
                              
                              {/* Meal category Header */}
                              <div 
                                onClick={() => setExpandedMeals(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                className="flex justify-between items-center bg-zinc-900/60 p-4 border-b border-zinc-850 cursor-pointer select-none hover:bg-zinc-900/80 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                                  )}
                                  <span className="text-xs font-black text-zinc-100">{cat}</span>
                                  {mealKcal > 0 && (
                                    <span className="text-[10px] font-bold bg-zinc-800 border border-zinc-750 text-zinc-400 px-2.5 py-0.5 rounded-full">
                                      {mealKcal} 大卡
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => copyPreviousDayMeal(cat)}
                                    title="複製前一日此餐飲食紀錄"
                                    className="text-[10px] font-bold border border-zinc-850 hover:border-zinc-750 bg-black/50/40 hover:bg-black/50 text-indigo-400 hover:text-indigo-300 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3 text-indigo-400" />
                                    <span>複製前日</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setAddModalCategory(cat);
                                      setAddModalTab("quick");
                                      setShowAddModal(true);
                                    }}
                                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white py-1.5 px-3 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    新增
                                  </button>
                                </div>
                              </div>

                              {/* Meal items container */}
                              {isExpanded && (
                                <div className="p-3 divide-y divide-zinc-850 animate-in fade-in duration-205">
                                  {list.length === 0 ? (
                                    <div className="text-center text-zinc-400 text-xs py-6">
                                      尚無此餐飲食紀錄
                                    </div>
                                  ) : (
                                    list.map((item, idx) => {
                                      // Render Group Items
                                      if ("type" in item && item.type === "group") {
                                        const groupKcal = item.items.reduce((s, it) => s + (it.kcal || 0), 0);
                                        const groupProtein = item.items.reduce((s, it) => s + (it.protein || 0), 0);
                                        return (
                                          <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <span className="text-xs font-bold text-zinc-300 block">📦 {item.name}</span>
                                                <span className="text-[10px] text-zinc-400 font-bold">
                                                  複合包共 {item.items.length} 項目 · {groupKcal} kcal
                                                </span>
                                              </div>
                                              <div className="flex gap-1.5">
                                                <button 
                                                  onClick={() => openAdjustItemModal(cat, idx)}
                                                  className="text-[10px] font-bold border border-zinc-800 hover:border-zinc-700 bg-black/50 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg"
                                                >
                                                  重估群組
                                                </button>
                                                <button 
                                                  onClick={() => deleteMealItem(cat, idx)}
                                                  className="text-[10px] font-bold border border-rose-500/10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-lg"
                                                >
                                                  移除
                                                </button>
                                              </div>
                                            </div>
                                            {/* Subitems lists */}
                                            <div className="pl-3 border-l-2 border-zinc-800 space-y-1.5 pt-1">
                                              {item.items.map((sub, sIdx) => (
                                                <div key={sub.id} className="flex justify-between items-center text-[11px] text-zinc-400 hover:text-zinc-300">
                                                  <span>{sub.name} ({sub.amount ? `${sub.amount}g` : '份'})</span>
                                                  <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[10px]">{sub.kcal} kcal · 蛋 {sub.protein}g</span>
                                                    <button 
                                                      onClick={() => openAdjustSubItemModal(cat, idx, sIdx)}
                                                      className="text-zinc-400 hover:text-indigo-400 p-0.5 cursor-pointer"
                                                      title="微調此項目"
                                                    >
                                                      <Edit2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Render Standard single MealItem
                                      const singleItem = item as MealItem;
                                      return (
                                        <div key={singleItem.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs">
                                          <div className="min-w-0 flex-1 pr-3">
                                            <span className="font-extrabold text-zinc-200 block truncate">{singleItem.name}</span>
                                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                                              {singleItem.amount ? `${singleItem.amount}克 · ` : ""}{singleItem.count && singleItem.count !== 1 ? `${singleItem.count}份 · ` : ""}{singleItem.kcal} kcal · 蛋 {singleItem.protein}g · 碳 {singleItem.carb}g · 脂 {singleItem.fat}g
                                            </span>
                                          </div>
                                          <div className="flex gap-2 shrink-0">
                                            <button 
                                              onClick={() => openAdjustItemModal(cat, idx)}
                                              className="text-zinc-400 hover:text-zinc-200 p-1 bg-black/50 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-colors cursor-pointer"
                                              title="微調比例 / 克數 / 數量"
                                            >
                                              <Sliders className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={() => deleteMealItem(cat, idx)}
                                              className="text-zinc-400 hover:text-rose-400 p-1 bg-black/50 border border-zinc-850 hover:border-zinc-800 rounded-lg transition-colors cursor-pointer"
                                              title="刪除"
                                            >
                                              <Trash className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Hydration Tracker */}
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Droplet className="w-4 h-4 text-sky-400" />
                            <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">每日飲水記錄</h3>
                          </div>
                          <span className="text-base font-black text-sky-400">{waterTotalLogged} / {settings.waterTarget} ml</span>
                        </div>

                        {/* Hydration progress bar */}
                        <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-sky-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((waterTotalLogged / (settings.waterTarget || 2000)) * 100, 100)}%` }}
                          />
                        </div>

                        {/* Quick Add buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from(new Set([150, 250, 350, settings.customWaterCup || 500])).sort((a, b) => a - b).map((ml) => {
                            const isCustom = ml === settings.customWaterCup;
                            return (
                              <button
                                key={ml}
                                onClick={() => quickWaterAdd(ml)}
                                className={`relative bg-black/50 border text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer ${
                                  isCustom 
                                    ? "border-sky-500/50 bg-sky-950/20 text-sky-300 hover:bg-sky-500/20" 
                                    : "border-zinc-800 hover:border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                                }`}
                              >
                                {isCustom && (
                                  <span className="absolute -top-1 -right-1 text-[8px] bg-sky-500 text-zinc-950 font-black px-1 rounded-full scale-75">
                                    ⭐
                                  </span>
                                )}
                                +{ml} ml
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom milliliter intake */}
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none flex-1 font-semibold"
                            placeholder="自訂飲水毫升數"
                            value={customWaterInput}
                            onChange={(e) => setCustomWaterInput(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <button
                            onClick={() => {
                              if (Number(customWaterInput) > 0) {
                                quickWaterAdd(Number(customWaterInput));
                                setCustomWaterInput("");
                              }
                            }}
                            className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs px-4 rounded-xl cursor-pointer"
                          >
                            補水
                          </button>
                        </div>

                        {/* Today's water log entries */}
                        {dayRecord.waterLog && dayRecord.waterLog.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-zinc-850 max-h-[110px] overflow-y-auto pr-1">
                            {dayRecord.waterLog.map((log, index) => (
                              <div key={index} className="flex justify-between items-center text-xs text-zinc-400 py-1 border-b border-zinc-850/60 last:border-0">
                                <span className="font-bold">{log.ml} ml</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-zinc-600 font-mono">{log.time}</span>
                                  <button 
                                    onClick={() => deleteWaterLog(index)}
                                    className="text-zinc-600 hover:text-rose-400 p-0.5"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────── 2. HISTORY TAB ────────────────── */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  {/* Visual charts wrapper */}
                  <Charts days={db.days} targets={targets} goalWeight={settings.goalWeight || 52} />

                  {/* Weight Predictor ETA summary */}
                  {settings.goalWeight > 0 && settings.weight > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-1">體重管理進度預估</h4>
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        <div>
                          <span className="text-xs text-zinc-400 block font-semibold">目標：{settings.goalWeight} 公斤 (目前基準：{latestWeight.toFixed(1)} 公斤)</span>
                          <span className="text-sm font-black text-indigo-400">
                            距離目標體重還差 {Math.abs(latestWeight - settings.goalWeight).toFixed(1)} 公斤
                          </span>
                        </div>
                        <div className="bg-black/50 p-3 rounded-xl border border-zinc-800 max-w-sm text-xs font-semibold text-zinc-300">
                          {(() => {
                            const diff = Math.abs(latestWeight - settings.goalWeight);
                            const actualSpeed = getRecentWeightTrend(db.days);
                            if (diff < 0.2) {
                              return "🎉 賀！體重目標已達成，請保持良好習慣與生活型態！";
                            }
                            if (actualSpeed !== null) {
                              const headingCorrectDir = (settings.goalWeight < latestWeight && actualSpeed < 0) || (settings.goalWeight > latestWeight && actualSpeed > 0);
                              if (!headingCorrectDir || Math.abs(actualSpeed) < 0.01) {
                                return "📊 觀測到近期體重並未朝著目標方向前進，可以調整每日總熱量 TDEE 設定。";
                              } else {
                                const weeksNeeded = diff / Math.abs(actualSpeed);
                                return `📈 依據您過去 14 天的實際速度 (每週 ${Math.abs(actualSpeed).toFixed(2)}kg)，預估約 ${Math.round(weeksNeeded)} 週可順利達標！`;
                              }
                            } else {
                              const planSpeed = settings.weeklyGoal || 0.5;
                              const weeksNeeded = diff / planSpeed;
                              return `📋 依據您設定的每週規劃速度 (${planSpeed}kg)，預估約 ${Math.round(weeksNeeded)} 週可達標。`;
                            }
                          })()}
                        </div>
                      </div>

                      {/* Weight Progress Bar with zero-division safeguard */}
                      {(() => {
                        const startW = settings.weight || 0;
                        const goalW = settings.goalWeight || 0;
                        const totalDiff = Math.abs(startW - goalW);
                        const leftDiff = Math.abs(latestWeight - goalW);
                        let progPct = 0;
                        if (totalDiff > 0) {
                          progPct = Math.min(100, Math.max(0, (1 - leftDiff / totalDiff) * 100));
                        } else if (latestWeight === goalW) {
                          progPct = 100;
                        }

                        return (
                          <div className="border-t border-zinc-850/60 pt-3.5">
                            <div className="flex justify-between text-[10px] text-zinc-400 font-extrabold mb-2">
                              <span>起始基準 ({startW} kg)</span>
                              <span className="text-indigo-400">進度: {progPct.toFixed(0)}%</span>
                              <span>目標體重 ({goalW} kg)</span>
                            </div>
                            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden relative border border-zinc-850/80">
                              <div 
                                className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${progPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────── 3. FOODS LIBRARY TAB ────────────────── */}
              {activeTab === "foods" && (
                <div className="space-y-6">
                  
                  {/* Upgrade Alert banner */}
                  <div className="bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-zinc-100">智慧升級版：個人食物庫</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          支援智慧關鍵字分類、多維度排序、批量勾選加入，並提供健康高頻基礎食物範本！
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Header Search & Direct adding manual trigger */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-7 relative">
                      <input 
                        type="text" 
                        placeholder="🔍 搜尋我的食物庫中的食物..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-500 font-medium"
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="md:col-span-5 flex gap-2">
                      {/* Sort selection */}
                      <select
                        value={librarySortBy}
                        onChange={(e) => setLibrarySortBy(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-3 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer flex-1"
                      >
                        <option value="recent">最近新增</option>
                        <option value="kcalDesc">熱量：高 ➜ 低</option>
                        <option value="kcalAsc">熱量：低 ➜ 高</option>
                        <option value="proteinDesc">蛋白質：高 ➜ 低</option>
                        <option value="fiberDesc">膳食纖維：高 ➜ 低</option>
                      </select>

                      <button
                        onClick={() => {
                          setAddModalCategory("早餐");
                          setAddModalTab("manual");
                          setShowAddModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-xs py-3 px-4 rounded-xl cursor-pointer transition-colors text-center whitespace-nowrap shrink-0"
                      >
                        ＋ 自訂食物
                      </button>
                    </div>
                  </div>

                  {/* Categories Pills Filter */}
                  <div className="flex flex-wrap gap-1.5 pb-1 overflow-x-auto">
                    {["全部", "澱粉", "蛋白質", "蔬菜", "飲料", "點心", "其他"].map((cat) => {
                      // count how many matches in this category
                      const count = db.foods.filter(f => cat === "全部" || detectCategory(f) === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setLibraryFilterCategory(cat);
                            setSelectedLibItems([]); // Clear selection when switching tab to avoid mistakes
                          }}
                          className={`text-xs font-bold py-1.5 px-3 rounded-full cursor-pointer transition-all border ${
                            libraryFilterCategory === cat
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                              : "bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {cat} <span className="text-[9px] opacity-70 ml-1">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Batch Actions Bar (Only displays when items are ticked/selected) */}
                  <AnimatePresence>
                    {selectedLibItems.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-indigo-950/90 border border-indigo-500/40 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-lg"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="bg-indigo-650 border border-indigo-400/30 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
                            {selectedLibItems.length}
                          </div>
                          <span className="text-xs font-black text-indigo-100">已選取 {selectedLibItems.length} 項品項，批次加入至：</span>
                        </div>
                        <div className="flex gap-1.5 w-full md:w-auto">
                          {["早餐", "午餐", "晚餐", "點心"].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                // Find selected records
                                const recordsToImport = selectedLibItems.map(idx => db.foods[idx]).filter(Boolean);
                                batchAddLibItemsToToday(recordsToImport, cat);
                              }}
                              className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer transition-all text-center"
                            >
                              {cat}
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedLibItems([])}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs py-2 px-3 rounded-xl cursor-pointer border border-zinc-800 transition-all text-center"
                          >
                            取消
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Foods Grid */}
                  {db.foods.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center text-zinc-400 text-sm space-y-3">
                      <p>
                        您的專屬食物庫目前沒有自訂品項。<br />
                        <span className="text-xs text-zinc-400 mt-2 block">
                          在今日記錄主頁「手動新增」時，勾選「儲存到食物庫」，或使用 AI 辨識，即可在此儲存。
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400">或是，您可以從下方的常用原型食物範本中一鍵儲存熱門品項！</p>
                    </div>
                  ) : (
                    <>
                      {/* Grid layout of saved library foods */}
                      {(() => {
                        const filtered = db.foods
                          .filter((f) => {
                            const matchesSearch = f.name.toLowerCase().includes(librarySearchQuery.toLowerCase());
                            if (!matchesSearch) return false;
                            if (libraryFilterCategory === "全部") return true;
                            return detectCategory(f) === libraryFilterCategory;
                          })
                          .sort((a, b) => {
                            const getKcal = (x: MealRecord): number => {
                              if ("type" in x && x.type === "group") {
                                return (x as MealGroup).items.reduce((s, u) => s + (u.kcal || 0), 0);
                              }
                              return (x as MealItem).kcal || 0;
                            };
                            const getProtein = (x: MealRecord): number => {
                              if ("type" in x && x.type === "group") {
                                return (x as MealGroup).items.reduce((s, u) => s + (u.protein || 0), 0);
                              }
                              return (x as MealItem).protein || 0;
                            };
                            const getFiber = (x: MealRecord): number => {
                              if ("type" in x && x.type === "group") {
                                return (x as MealGroup).items.reduce((s, u) => s + (u.fiber || 0), 0);
                              }
                              return (x as MealItem).fiber || 0;
                            };

                            if (librarySortBy === "kcalAsc") return getKcal(a) - getKcal(b);
                            if (librarySortBy === "kcalDesc") return getKcal(b) - getKcal(a);
                            if (librarySortBy === "proteinDesc") return getProtein(b) - getProtein(a);
                            if (librarySortBy === "fiberDesc") return getFiber(b) - getFiber(a);
                            return db.foods.indexOf(b) - db.foods.indexOf(a); // recent
                          });

                        if (filtered.length === 0) {
                          return (
                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.04] border border-zinc-800/85 rounded-2xl p-10 text-center text-zinc-400 text-xs">
                              沒有找到符合篩選條件的食物。
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.map((f, i) => {
                              const realIdx = db.foods.indexOf(f);
                              const isSelected = selectedLibItems.includes(realIdx);
                              const isGrp = "type" in f && f.type === "group";
                              const itemCat = detectCategory(f);
                              
                              // Badge colors
                              const catColors: Record<string, string> = {
                                "澱粉": "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                "蛋白質": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                "蔬菜": "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                "飲料": "bg-sky-500/10 text-sky-400 border-sky-500/20",
                                "點心": "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                "其他": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                              };

                              return (
                                <div 
                                  key={f.id || realIdx} 
                                  className={`bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-3xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 ${
                                    isSelected 
                                      ? "border-indigo-500 ring-1 ring-indigo-500/40 bg-zinc-900 shadow-md shadow-indigo-500/5" 
                                      : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/70"
                                  }`}
                                >
                                  {/* Top Title & select check box */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => {
                                          if (isSelected) {
                                            setSelectedLibItems(selectedLibItems.filter(id => id !== realIdx));
                                          } else {
                                            setSelectedLibItems([...selectedLibItems, realIdx]);
                                          }
                                        }}
                                        className="mt-1 rounded bg-black/50 border-zinc-800 text-indigo-500 focus:ring-0 w-4.5 h-4.5 accent-indigo-500 cursor-pointer"
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 className="font-extrabold text-xs sm:text-sm text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">{isGrp ? "📦 " : ""}{f.name}</h4>
                                          <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${catColors[itemCat] || "bg-zinc-800 text-zinc-400 border-zinc-750"}`}>
                                            {itemCat}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                                          {"amount" in f && f.amount ? `${f.amount}g/ml · ` : ""}熱量 {f.kcal} kcal
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => openEditFoodLibraryItem(realIdx)}
                                        className="text-zinc-600 hover:text-indigo-400 p-1.5 bg-black/50 border border-zinc-850 rounded-lg hover:border-indigo-500/10 transition-colors cursor-pointer shrink-0"
                                        title="編輯品項"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteFoodLibraryItem(realIdx)}
                                        className="text-zinc-600 hover:text-rose-400 p-1.5 bg-black/50 border border-zinc-850 rounded-lg hover:border-rose-500/10 transition-colors cursor-pointer shrink-0"
                                        title="刪除品項"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Nutrition Grid */}
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-y border-zinc-850/60 py-2.5 bg-black/50/20 rounded-xl px-1">
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">蛋白質</span>
                                      <span className="font-extrabold text-zinc-300">{f.protein || 0}g</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">碳水</span>
                                      <span className="font-extrabold text-zinc-300">{f.carb || 0}g</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">脂肪</span>
                                      <span className="font-extrabold text-zinc-300">{f.fat || 0}g</span>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center justify-between text-xs gap-1.5 pt-0.5">
                                    <span className="text-[10px] text-zinc-400 font-extrabold">直接加入今天：</span>
                                    <div className="flex gap-1 flex-1 max-w-[200px]">
                                      {["早餐", "午餐", "晚餐", "點心"].map((cat) => (
                                        <button
                                          key={cat}
                                          onClick={() => addLibItemToToday(f, cat)}
                                          className="flex-1 bg-black/50 hover:bg-indigo-600 border border-zinc-850 hover:border-indigo-500 text-zinc-400 hover:text-white text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer text-center"
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* 💡 HEALTHY FOODS PRESETS CORNER */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Salad className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-zinc-100 flex items-center gap-1.5">
                            常用高頻健康原型食物範本
                            <span className="text-[9px] bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              推薦
                            </span>
                          </h4>
                          <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold mt-0.5">
                            內建 12 種經典的高頻減脂原型食物範本，點擊可自由展開 / 收起
                          </p>
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750 transition-all ${showPresets ? "bg-black/50" : "bg-transparent"}`}>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showPresets ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {showPresets && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 border-t border-zinc-850/60 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {FOOD_PRESETS.map((preset) => {
                              const inLib = db.foods.some(f => !("type" in f && f.type === "group") && f.name === preset.name);
                              return (
                                <div 
                                  key={preset.id} 
                                  className="bg-black/50 border border-zinc-850 rounded-2xl p-2.5 flex flex-col justify-between gap-2 hover:border-zinc-750 transition-all"
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-1.5">
                                      <span className="font-extrabold text-xs text-zinc-200 line-clamp-1">{preset.name}</span>
                                      <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-black px-1.5 py-0.5 rounded shrink-0">
                                        {preset.category}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-[9px] text-zinc-400 mt-2 font-semibold">
                                      <div>
                                        <span className="text-[8px] text-zinc-650 block">熱量</span>
                                        <span className="text-zinc-300 font-extrabold">{preset.kcal}k</span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-zinc-650 block">蛋白</span>
                                        <span className="text-zinc-300 font-extrabold">{preset.protein}g</span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-zinc-650 block">碳水</span>
                                        <span className="text-zinc-300 font-extrabold">{preset.carb}g</span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] text-zinc-650 block">脂肪</span>
                                        <span className="text-zinc-300 font-extrabold">{preset.fat}g</span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    disabled={inLib}
                                    onClick={() => addPresetToLibrary(preset)}
                                    className={`w-full py-1 px-1.5 rounded-lg text-[9px] font-bold text-center cursor-pointer transition-all border ${
                                      inLib 
                                        ? "bg-white/[0.02] backdrop-blur-md border border-white/[0.04] border-zinc-900 text-zinc-700 cursor-not-allowed" 
                                        : "bg-emerald-600/10 hover:bg-emerald-650 border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white"
                                    }`}
                                  >
                                    {inLib ? "✓ 已在食物庫中" : "＋ 儲存至食物庫"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              )}

              {/* ────────────────── 4. SETTINGS TAB ────────────────── */}
              {activeTab === "settings" && (
                <div className="space-y-6 max-w-xl mx-auto">
                  
                  {/* TDEE Mode selector */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">當前計畫目標模式</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {["減脂", "增肌", "維持"].map((m) => (
                        <button
                          key={m}
                          onClick={() => handleUpdateSettings({ mode: m as any })}
                          className={`py-3 rounded-xl font-bold text-sm transition-all text-center cursor-pointer ${
                            settings.mode === m
                              ? "bg-indigo-600 text-white border border-indigo-500 shadow-md"
                              : "bg-black/50 text-zinc-400 border border-zinc-850 hover:border-zinc-800"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Base demographic parameters */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">個人生理基準資訊</h3>
                    
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">生理性別：</span>
                        <div className="flex gap-1.5 bg-black/50 p-1 border border-zinc-850 rounded-xl">
                          {["男", "女"].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdateSettings({ sex: s as any })}
                              className={`py-1.5 px-4 rounded-lg font-bold transition-all text-center cursor-pointer ${
                                settings.sex === s
                                  ? "bg-zinc-900 text-white shadow-sm"
                                  : "text-zinc-400 hover:text-zinc-300"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">年齡：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.age || ""}
                            onChange={(e) => handleUpdateSettings({ age: Number(e.target.value) || 0 })}
                          />
                          <span className="text-zinc-600 font-bold w-6">歲</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">身高：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.height || ""}
                            onChange={(e) => handleUpdateSettings({ height: Number(e.target.value) || 0 })}
                          />
                          <span className="text-zinc-600 font-bold w-6">公分</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">體重：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.weight || ""}
                            onChange={(e) => handleUpdateSettings({ weight: Number(e.target.value) || 0 })}
                          />
                          <span className="text-zinc-600 font-bold w-6">公斤</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">生活活動強度：</span>
                        <select
                          className="bg-black/50 border border-zinc-850 rounded-lg px-2 py-1.5 font-semibold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
                          value={settings.activity}
                          onChange={(e) => handleUpdateSettings({ activity: Number(e.target.value) })}
                        >
                          <option value="1.2">久坐辦公 (1.2)</option>
                          <option value="1.375">輕度活動 1-3天/週 (1.375)</option>
                          <option value="1.55">中度活動 3-5天/週 (1.55)</option>
                          <option value="1.725">高強度運動 6-7天/週 (1.725)</option>
                          <option value="1.9">頂尖或每天雙練極高 (1.9)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Custom program parameters */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">階段體重管理規劃</h3>
                    
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">理想目標體重：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.goalWeight || ""}
                            onChange={(e) => handleUpdateSettings({ goalWeight: Number(e.target.value) || 0 })}
                          />
                          <span className="text-zinc-600 font-bold w-6">公斤</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">期望進度 (每週增減)：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.weeklyGoal || ""}
                            onChange={(e) => handleUpdateSettings({ weeklyGoal: Number(e.target.value) || 0 })}
                            step="0.1"
                          />
                          <span className="text-zinc-600 font-bold w-6">公斤</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">每日補水目標：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={settings.waterTarget || ""}
                            onChange={(e) => handleUpdateSettings({ waterTarget: Number(e.target.value) || 0 })}
                            placeholder="留空自動計算"
                          />
                          <span className="text-zinc-600 font-bold w-6">毫升</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold text-sky-400">⭐ 自訂常用杯容量 (快速補水)：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-black/50 border border-zinc-850 focus:border-sky-500 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-sky-500 text-sky-300"
                            value={settings.customWaterCup || ""}
                            onChange={(e) => handleUpdateSettings({ customWaterCup: Number(e.target.value) || 0 })}
                            placeholder="如: 480"
                          />
                          <span className="text-zinc-650 font-bold w-6">毫升</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={recalculateAITargets}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition-colors cursor-pointer text-center"
                    >
                      🧪 根據上述資料，自動重新計算科學營養素目標
                    </button>
                  </div>

                  {/* Manual Target Override Sliders */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">手動覆蓋或微調各項指標目標值</h3>
                    
                    <div className="space-y-3.5">
                      {[
                        { key: "kcal", label: "熱量 (大卡)", unit: "kcal" },
                        { key: "protein", label: "蛋白質 (克)", unit: "g" },
                        { key: "carb", label: "碳水化合物 (克)", unit: "g" },
                        { key: "fat", label: "脂肪 (克)", unit: "g" },
                        { key: "fiber", label: "膳食纖維 (克)", unit: "g" },
                        { key: "sugar", label: "精緻糖 (克)", unit: "g" },
                        { key: "sodium", label: "鈉離子 (毫克)", unit: "mg" },
                      ].map((tgtField) => (
                        <div key={tgtField.key} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold">{tgtField.label}：</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                              value={settings.targets[tgtField.key as keyof NutritionTargets] || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                handleUpdateSettings({
                                  targets: {
                                    ...settings.targets,
                                    [tgtField.key]: val,
                                  },
                                });
                              }}
                            />
                            <span className="text-zinc-650 font-bold w-10 text-right">{tgtField.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Local backup data syncing */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">備份、還原與同步管理</h3>
                    
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={triggerDataExport}
                        className="w-full bg-black/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        手動下載匯出備份 JSON 檔
                      </button>
                      
                      <button
                        onClick={() => document.getElementById("import-file-input")?.click()}
                        className="w-full bg-black/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        匯入備份 JSON 檔案還原
                      </button>
                      <input 
                        type="file" 
                        id="import-file-input" 
                        className="hidden" 
                        accept=".json"
                        onChange={handleDataImport}
                      />

                      <button
                        onClick={generateSyncUrl}
                        className="w-full bg-black/50 hover:bg-indigo-600/10 hover:text-indigo-400 border border-zinc-850 hover:border-indigo-500/20 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Link2 className="w-4 h-4" />
                        產生雲端同步連結 (跨瀏覽器轉移)
                      </button>

                      {syncWarning && (
                        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg font-bold">
                          {syncWarning}
                        </div>
                      )}

                      {syncUrl && (
                        <div className="space-y-2 mt-1">
                          <span className="text-[10px] text-zinc-400 block font-bold">同步連結 (複製此網址於其他設備瀏覽器開啟即可載入)：</span>
                          <textarea 
                            readOnly 
                            className="w-full bg-black/50 border border-zinc-850 rounded-lg p-2.5 text-[10px] text-zinc-400 font-mono h-[70px] focus:outline-none"
                            value={syncUrl}
                            onClick={(e) => {
                              (e.target as HTMLTextAreaElement).select();
                              navigator.clipboard.writeText(syncUrl);
                              showToast("📋 同步網址連結已順利複製到您的剪貼簿中！", "success");
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gemini AI Key Configuration Section */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">Gemini AI 智慧剖析金鑰</h3>
                    </div>
                    
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      本軟體提供 AI 智慧影像及文字辨識餐點。
                      <br />
                      標準方式為直接在 Google AI Studio 的 <strong className="text-indigo-400">Settings &gt; Secrets</strong> 項目中新增 <code className="bg-zinc-900 text-zinc-300 px-1 py-0.5 rounded border border-zinc-850">GEMINI_API_KEY</code> 金鑰。
                      若您想要使用您自己的個人專屬金鑰，亦可在下方欄位中貼上，系統將會優先使用此金鑰。
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-400 font-bold">個人專屬 Gemini API 金鑰 (API Key)：</label>
                        <input 
                          type="password" 
                          className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs w-full"
                          placeholder="例如: AIzaSy..."
                          value={settings.geminiApiKey || ""}
                          onChange={(e) => handleUpdateSettings({ geminiApiKey: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-600">金鑰僅存儲於您的本機瀏覽器 localStorage，傳輸過程加密，非常安全。</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ─── Bottom Navigation bar on Mobile ─── */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-2xl z-40 flex items-center justify-between p-1.5 pb-[env(safe-area-inset-bottom,6px)] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "today" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Flame className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-bold tracking-wide">今日</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "history" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Calendar className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-bold tracking-wide">歷史</span>
        </button>
        <button
          onClick={() => setActiveTab("foods")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "foods" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Salad className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-bold tracking-wide">食物庫</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "settings" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <SettingsIcon className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-bold tracking-wide">設定</span>
        </button>
      </nav>

      {/* ────────────────── MODAL: ADD FOOD ────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="bg-zinc-900 border-t lg:border border-zinc-800 rounded-t-3xl lg:rounded-3xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="text-sm font-black text-zinc-100">新增食物至 {addModalCategory}</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-300 bg-black/50 p-1.5 rounded-lg border border-zinc-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-850 p-2 gap-1.5 bg-black/50/40">
              <button
                onClick={() => setAddModalTab("quick")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "quick" ? "bg-zinc-900 text-indigo-400 shadow-sm border border-zinc-800" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                選取食物庫
              </button>
              <button
                onClick={() => setAddModalTab("manual")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "manual" ? "bg-zinc-900 text-indigo-400 shadow-sm border border-zinc-800" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                手動填寫
              </button>
              <button
                onClick={() => setAddModalTab("ai")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "ai" ? "bg-zinc-900 text-indigo-400 shadow-sm border border-zinc-800" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                AI 影像辨識
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* TAB 3: AI FOOD ANALYZER */}
              {addModalTab === "ai" && (
                <AIFoodAnalyzer 
                  mealCategory={addModalCategory}
                  customApiKey={settings.geminiApiKey}
                  onAddParsedMeals={(cat, items, gTitle, saveToLib) => {
                    addMealsToDay(cat, items, gTitle, saveToLib);
                    setShowAddModal(false);
                    showToast(`🎉 智慧辨識成果已成功登錄至今日 ${cat} 紀錄！`, "success");
                  }}
                />
              )}

              {/* TAB 1: QUICK ADD FROM FOOD LIBRARY */}
              {addModalTab === "quick" && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="🔍 搜尋已有食物記錄..."
                    className="w-full bg-black/50 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                  />

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {db.foods.length === 0 ? (
                      <div className="text-center text-zinc-400 text-xs py-10">
                        食物庫無品項，請手動新增或使用 AI 辨識自動帶入。
                      </div>
                    ) : (
                      db.foods
                        .filter((f) => f.name.toLowerCase().includes(quickSearchQuery.toLowerCase()))
                        .map((f, idx) => {
                          const itemKcal = "type" in f && f.type === "group" 
                            ? f.items.reduce((s, sub) => s + (sub.kcal || 0), 0)
                            : (f.kcal || 0);

                          return (
                            <div 
                              key={f.id || idx}
                              onClick={() => {
                                addLibItemToToday(f, addModalCategory);
                                setShowAddModal(false);
                              }}
                              className="bg-black/50 hover:bg-zinc-850/50 border border-zinc-850 rounded-xl p-3 flex justify-between items-center cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="text-xs font-bold text-zinc-300 block">{"type" in f && f.type === "group" ? "📦 " : ""}{f.name}</span>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                  蛋白 {f.protein}g · 碳水 {f.carb}g · 脂肪 {f.fat}g
                                </span>
                              </div>
                              <span className="text-xs font-black text-indigo-400 pr-1">{itemKcal} kcal</span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL DATA FILL FORM */}
              {addModalTab === "manual" && (
                <form onSubmit={handleManualAddSubmit} className="space-y-3.5 text-xs">
                  
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-zinc-400 font-bold">食物名稱*</span>
                    <input 
                      type="text" 
                      required
                      placeholder="例如：茶葉蛋 / 滷肉飯"
                      className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 font-semibold"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-zinc-400 font-bold">食物分類</span>
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {["澱粉", "蛋白質", "蔬菜", "飲料", "點心", "其他"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMCategory(cat)}
                          className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                            mCategory === cat
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-black shadow-sm"
                              : "bg-black/50 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-zinc-400 font-bold">打包群組</span>
                    <input 
                      type="text" 
                      placeholder="例：午餐便當套餐 (選填)"
                      className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200"
                      value={mGroup}
                      onChange={(e) => setMGroup(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">估計份量</span>
                      <input 
                        type="number" 
                        placeholder="選填克數"
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={mAmount}
                        onChange={(e) => setMAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">g</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">數量</span>
                      <input 
                        type="number" 
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={mCount}
                        onChange={(e) => setMCount(Number(e.target.value) || 1)}
                        min="0.1"
                        step="0.1"
                      />
                      <span className="text-zinc-600 font-bold w-4">份</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-zinc-850 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">熱量*</span>
                      <input 
                        type="number" 
                        required
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right font-semibold"
                        value={mKcal}
                        onChange={(e) => setMKcal(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">大卡</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">蛋白質*</span>
                      <input 
                        type="number" 
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={mProtein}
                        onChange={(e) => setMProtein(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">克</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">碳水</span>
                      <input 
                        type="number" 
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={mCarb}
                        onChange={(e) => setMCarb(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">克</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">脂肪</span>
                      <input 
                        type="number" 
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={mFat}
                        onChange={(e) => setMFat(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">克</span>
                    </div>
                  </div>

                  {/* Advanced inputs expansion */}
                  <div 
                    onClick={() => setShowAdvancedForm(!showAdvancedForm)}
                    className="text-zinc-400 hover:text-zinc-300 font-bold flex items-center gap-1 cursor-pointer select-none py-1"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedForm ? "rotate-180" : ""}`} />
                    進階成分微調 (纖維、精緻糖、鈉離子)
                  </div>

                  {showAdvancedForm && (
                    <div className="space-y-3 bg-black/50/60 p-3 rounded-xl border border-zinc-850 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">膳食纖維：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={mFiber}
                            onChange={(e) => setMFiber(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">精製糖：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={mSugar}
                            onChange={(e) => setMSugar(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">鈉離子：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={mSodium}
                            onChange={(e) => setMSodium(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">毫克</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 select-none py-1">
                    <input 
                      type="checkbox" 
                      id="mSaveToLibCheck"
                      className="rounded bg-black/50 border-zinc-850 text-indigo-500 focus:ring-0 w-4 h-4 accent-indigo-500"
                      checked={mSaveToLib}
                      onChange={(e) => setMSaveToLib(e.target.checked)}
                    />
                    <label htmlFor="mSaveToLibCheck" className="text-zinc-400 font-bold cursor-pointer">
                      同時儲存此品項到食物庫
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-sm py-3 rounded-xl cursor-pointer shadow-lg mt-3 transition-colors"
                  >
                    確認新增品項
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: ADJUST MEAL ────────────────── */}
      {showAdjustModal && adjustContext && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="bg-zinc-900 border-t lg:border border-zinc-800 rounded-t-3xl lg:rounded-3xl w-full max-w-[460px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="text-sm font-black text-zinc-100">
                重估比例 / 份量調整
              </h3>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="text-zinc-400 hover:text-zinc-300 bg-black/50 p-1.5 rounded-lg border border-zinc-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block">當前調整品項</span>
                <span className="text-sm font-extrabold text-zinc-100">{adjustContext.origItem.name}</span>
              </div>

              {/* Adjustment Mode Selector */}
              <div className="grid grid-cols-3 gap-2 bg-black/50 p-1 rounded-xl border border-zinc-850">
                {["ratio", "gram", "count"].map((m) => {
                  if (m === "gram" && !("amount" in adjustContext.origItem && adjustContext.origItem.amount)) return null;
                  if (m === "count" && !("count" in adjustContext.origItem)) return null;

                  return (
                    <button
                      key={m}
                      onClick={() => setAdjustContext({ ...adjustContext, adjustMode: m as any })}
                      className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                        adjustContext.adjustMode === m
                          ? "bg-zinc-900 text-indigo-400 border border-zinc-800 shadow"
                          : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      {{ ratio: "依比例", gram: "依克數", count: "依份數" }[m]}
                    </button>
                  );
                })}
              </div>

              {/* Adjust value fields based on Mode */}
              {adjustContext.adjustMode === "ratio" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5">
                    {[0.25, 0.5, 0.75, 1, 1.5, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => applyAdjustmentRatio(r)}
                        className={`py-2 rounded-lg text-xs font-extrabold text-center transition-all ${
                          adjustContext.customRatio === r
                            ? "bg-indigo-600 text-white"
                            : "bg-black/50 text-zinc-400 border border-zinc-850 hover:border-zinc-800"
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-400 font-bold">自訂調整倍率：</span>
                    <input 
                      type="number" 
                      className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-right font-bold w-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                      value={adjustContext.customRatio}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        applyAdjustmentRatio(val);
                      }}
                      step="0.1"
                    />
                  </div>
                </div>
              )}

              {adjustContext.adjustMode === "gram" && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">
                    設定實際攝取克數 (原始: {(adjustContext.origItem as MealItem).amount}g)：
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                      value={adjustContext.customGram || ""}
                      onChange={(e) => handleAdjustGramInput(Number(e.target.value) || 0)}
                    />
                    <span className="text-zinc-650 font-bold">g</span>
                  </div>
                </div>
              )}

              {adjustContext.adjustMode === "count" && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">
                    設定攝取份數 (原始: {(adjustContext.origItem as MealItem).count || 1} 份)：
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                      value={adjustContext.customCount || ""}
                      onChange={(e) => handleAdjustCountInput(Number(e.target.value) || 0)}
                      step="0.1"
                    />
                    <span className="text-zinc-650 font-bold">份</span>
                  </div>
                </div>
              )}

              {/* Adjust results preview values table */}
              <div className="border-t border-zinc-850 pt-4 space-y-2 text-xs">
                <span className="text-zinc-400 font-bold tracking-widest uppercase block mb-1">重估後營養成分預覽</span>
                
                {[
                  { key: "kcal", label: "熱量", unit: "大卡", color: "text-zinc-200" },
                  { key: "protein", label: "蛋白質", unit: "克", color: "text-emerald-400" },
                  { key: "carb", label: "碳水化合物", unit: "克", color: "text-orange-400" },
                  { key: "fat", label: "脂肪", unit: "克", color: "text-amber-400" },
                ].map((field) => {
                  const origVal = (adjustContext.origItem as any)[field.key] || 0;
                  const newVal = (adjustContext.editedNutrients as any)[field.key] || 0;
                  const diff = newVal - origVal;

                  return (
                    <div key={field.key} className="flex justify-between items-center">
                      <span className="text-zinc-400">{field.label}：</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-extrabold ${field.color}`}>{newVal} {field.unit}</span>
                        {diff !== 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${diff > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={saveAdjustment}
                className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-sm py-3 rounded-xl cursor-pointer shadow-lg mt-2 transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                儲存重估變更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: SUPPLEMENT NUTRIENT ────────────────── */}
      {showNutrientModal && nutrientAddKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl w-full max-w-[340px] p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-sm font-extrabold text-zinc-100">
                快速追加補給
              </h3>
              <button onClick={() => setShowNutrientModal(false)} className="text-zinc-400 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed">
              您在此追加的營養素將會以熱量自動折合（如：蛋白質每克 4 大卡）的形式，直接在今日的「點心」類別中新增一筆快速紀錄，方便您加總今日統計。
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 font-bold">
                補充{{protein: '蛋白質', carb: '碳水', fat: '脂肪', fiber: '膳食纖維', sugar: '糖', sodium: '鈉'}[nutrientAddKey]}：
              </span>
              <input 
                type="number" 
                className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-right font-bold flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                placeholder="輸入補充數值"
                value={nutrientAddVal}
                onChange={(e) => setNutrientAddVal(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="text-zinc-650 font-bold">
                {nutrientAddKey === "sodium" ? "mg" : "g"}
              </span>
            </div>

            <button
              onClick={confirmNutrientSupplementSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
            >
              確認登錄追加
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: EDIT FOOD LIBRARY ITEM ────────────────── */}
      {showEditFoodModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="bg-zinc-900 border-t lg:border border-zinc-800 rounded-t-3xl lg:rounded-3xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="text-sm font-black text-zinc-100">編輯食物庫品項</h3>
              <button 
                onClick={() => {
                  setShowEditFoodModal(false);
                  setEditFoodIndex(null);
                }}
                className="text-zinc-400 hover:text-zinc-300 bg-black/50 p-1.5 rounded-lg border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveEditedFoodLibraryItem} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-16 text-zinc-400 font-bold">食物名稱*</span>
                <input 
                  type="text" 
                  required
                  placeholder="例如：茶葉蛋"
                  className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 font-semibold"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                />
              </div>

              {editFoodIndex !== null && !("type" in db.foods[editFoodIndex] && db.foods[editFoodIndex].type === "group") && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-zinc-400 font-bold">食物分類</span>
                    <div className="flex gap-1.5 flex-wrap flex-1">
                      {["澱粉", "蛋白質", "蔬菜", "飲料", "點心", "其他"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setECategory(cat)}
                          className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                            eCategory === cat
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-black shadow-sm"
                              : "bg-black/50 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">估計份量</span>
                      <input 
                        type="number" 
                        placeholder="選填克數"
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right"
                        value={eAmount}
                        onChange={(e) => setEAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">g</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 text-zinc-400 font-bold">熱量*</span>
                      <input 
                        type="number" 
                        required
                        className="bg-black/50 border border-zinc-850 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 text-zinc-200 text-right font-semibold"
                        value={eKcal}
                        onChange={(e) => setEKcal(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                      <span className="text-zinc-600 font-bold w-4">大卡</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-zinc-850 pt-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-400 font-bold">蛋白質*</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          required
                          className="bg-black/50 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eProtein}
                          onChange={(e) => setEProtein(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                        <span className="text-zinc-600 font-bold">g</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-400 font-bold">碳水</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          className="bg-black/50 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eCarb}
                          onChange={(e) => setECarb(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                        <span className="text-zinc-600 font-bold">g</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-400 font-bold">脂肪</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          className="bg-black/50 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eFat}
                          onChange={(e) => setEFat(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                        <span className="text-zinc-600 font-bold">g</span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced inputs expansion */}
                  <div 
                    onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                    className="text-zinc-400 hover:text-zinc-300 font-bold flex items-center gap-1 cursor-pointer select-none py-1"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showEditAdvanced ? "rotate-180" : ""}`} />
                    進階成分微調 (纖維、精緻糖、鈉離子)
                  </div>

                  {showEditAdvanced && (
                    <div className="space-y-3 bg-black/50/60 p-3 rounded-xl border border-zinc-850 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">膳食纖維：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={eFiber}
                            onChange={(e) => setEFiber(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">精製糖：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={eSugar}
                            onChange={(e) => setESugar(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">鈉離子：</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            className="bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-right w-[80px] focus:outline-none text-zinc-200"
                            value={eSodium}
                            onChange={(e) => setESodium(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">mg</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2.5 pt-4 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditFoodModal(false);
                    setEditFoodIndex(null);
                  }}
                  className="flex-1 bg-black/50 hover:bg-zinc-850 text-zinc-400 border border-zinc-850 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  儲存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: CLEAR CONFIRM ────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-3xl w-full max-w-[340px] p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-zinc-100 flex items-center gap-2 text-rose-400">
              <Trash2 className="w-4 h-4" />
              確定清除今日記錄？
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              此操作將會清空您在 <span className="text-zinc-200 font-bold">{currentDate}</span> 的所有餐點記錄、水分補充、以及運動消耗紀錄。您所輸入的每日體重、體脂率等身體基準資料將會予以保留。
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-black/50 hover:bg-zinc-850 text-zinc-400 border border-zinc-850 py-2 rounded-xl text-xs font-bold"
              >
                取消
              </button>
              <button
                onClick={handleClearTodayRecord}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold shadow"
              >
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── GLOBAL TOAST NOTIFICATION ────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-black/50/90 border border-zinc-800 rounded-2xl px-4.5 py-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            {toast.type === "success" && <span className="text-emerald-400 font-extrabold text-sm">✓</span>}
            {toast.type === "error" && <span className="text-rose-400 font-extrabold text-sm">✕</span>}
            {toast.type === "info" && <span className="text-sky-400 font-extrabold text-sm">ℹ</span>}
            <span className="text-xs font-bold text-zinc-100">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
