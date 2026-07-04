import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { 
  DBState, MealItem, MealGroup, MealRecord, DayRecord, Settings, 
  DEFAULT_SETTINGS, isMealGroup, NutritionTargets
} from "./types";
import { 
  getTodayString, getDateString, formatFriendlyDate, 
  calculateTargets, getRecentWeightTrend, getRecordMacros 
} from "./utils/nutrition";
import { MouseGlow } from "./components/MouseGlow";
import { Charts } from "./components/Charts";
import { HistoryCalendar } from "./components/HistoryCalendar";
import { AIFoodAnalyzer } from "./components/AIFoodAnalyzer";
import { ShareCardModal } from "./components/ShareCardModal";
import { WeeklyReport } from "./components/WeeklyReport";
import { SwipeToDelete } from "./components/SwipeToDelete";
import { AICoach } from "./components/AICoach";
import { FastingTracker } from "./components/FastingTracker";
import { FastingFloatingWidget } from "./components/FastingFloatingWidget";
import { StoreMealPlanner } from "./components/StoreMealPlanner";
import { STORE_FOODS_DATABASE } from "./data/storeFoods";
import localforage from "localforage";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Calendar, Settings as SettingsIcon, Salad, PlusCircle, Trash2, Copy,
  Flame, Droplet, Dumbbell, Scale, ChevronRight, Edit2, Download, Upload, 
  Link2, Trash, Sliders, Check, HelpCircle, X, ChevronDown, Sparkles, Zap,
  Crown, ShieldCheck, Target, Camera, Share2, RotateCcw
} from "lucide-react";

//  常用基礎食物範本庫 (Preset Foods Database)
export const FOOD_PRESETS: MealItem[] = [
  { id: -1, name: "熟白米飯 (1 碗/200g)", kcal: 280, protein: 6, carb: 62, fat: 1, fiber: 1.2, sugar: 0, sodium: 4, amount: 200, count: 1, category: "澱粉"},
  { id: -2, name: "乾煎雞胸肉 (100g)", kcal: 150, protein: 31, carb: 0, fat: 2.5, fiber: 0, sugar: 0, sodium: 65, amount: 100, count: 1, category: "蛋白質"},
  { id: -3, name: "水煮蛋 (1 顆/55g)", kcal: 75, protein: 7, carb: 0.6, fat: 5, fiber: 0, sugar: 0, sodium: 70, amount: 55, count: 1, category: "蛋白質"},
  { id: -4, name: "烤地瓜/番薯 (100g)", kcal: 120, protein: 1.5, carb: 28, fat: 0.2, fiber: 3, sugar: 4.2, sodium: 40, amount: 100, count: 1, category: "澱粉"},
  { id: -5, name: "即食大燕麥片 (50g)", kcal: 185, protein: 6.5, carb: 33, fat: 4, fiber: 4.7, sugar: 0.5, sodium: 2, amount: 50, count: 1, category: "澱粉"},
  { id: -6, name: "無糖豆漿 (300ml)", kcal: 95, protein: 10, carb: 4, fat: 4.5, fiber: 1.5, sugar: 1, sodium: 15, amount: 300, count: 1, category: "飲料"},
  { id: -7, name: "水煮綠花椰菜 (100g)", kcal: 28, protein: 2.5, carb: 5, fat: 0.3, fiber: 2.5, sugar: 1.5, sodium: 25, amount: 100, count: 1, category: "蔬菜"},
  { id: -8, name: "義式番茄嫩雞義大利麵", kcal: 480, protein: 28, carb: 72, fat: 12, fiber: 4, sugar: 6, sodium: 850, amount: 400, count: 1, category: "澱粉"},
  { id: -9, name: "綜合堅果 (1 包/25g)", kcal: 160, protein: 5, carb: 4.5, fat: 14, fiber: 2, sugar: 1, sodium: 5, amount: 25, count: 1, category: "點心"},
  { id: -10, name: "希臘式無糖優格 (100g)", kcal: 65, protein: 9, carb: 3.5, fat: 1.5, fiber: 0, sugar: 2.5, sodium: 35, amount: 100, count: 1, category: "蛋白質"},
  { id: -11, name: "清炒高麗菜 (100g)", kcal: 24, protein: 1.3, carb: 5.2, fat: 0.1, fiber: 1.6, sugar: 2, sodium: 12, amount: 100, count: 1, category: "蔬菜"},
  { id: -12, name: "低脂鮮乳 (250ml)", kcal: 110, protein: 8, carb: 12, fat: 3.5, fiber: 0, sugar: 12, sodium: 105, amount: 250, count: 1, category: "飲料"}
];

// 智能判定未分類食物的分類歸屬，提升舊資料與手動新增體驗
export const detectCategory = (item: MealRecord): string => {
  if ("type" in item && item.type === "group") {
    return (item as MealGroup).category || "其他";
  }
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

export const getCurrentMealCategory = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return "早餐";
  if (hour < 16) return "午餐";
  if (hour < 21) return "晚餐";
  return "點心";
};

export default function App() {
  // ─── Core States ───
  const [currentDate, setCurrentDate] = useState<string>(getTodayString());
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [db, setDb] = useState<DBState>({
    settings: { ...DEFAULT_SETTINGS },
    days: {},
    foods: [],
    fasting: { isFasting: false, startTime: null, targetHours: 16 },
  });
  const [activeTab, setActiveTab] = useState<"today"| "history"| "foods"| "settings">("today");

  // Water micro-interaction states
  const [waterBubbles, setWaterBubbles] = useState<{ id: number; left: number; size: number; delay: number; duration: number }[]>([]);
  const [waterRipple, setWaterRipple] = useState(false);

  // Mobile Swipe Gesture State & Handlers
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const photoGalleryRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "history" && photoGalleryRef.current) {
      setTimeout(() => {
        const selectedPhoto = photoGalleryRef.current?.querySelector(`[data-date="${currentDate}"]`);
        if (selectedPhoto) {
          selectedPhoto.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  }, [currentDate, activeTab]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT"||
      target.tagName === "TEXTAREA"||
      target.tagName === "SELECT"||
      target.tagName === "BUTTON"||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select") ||
      target.isContentEditable
    ) {
      return;
    }

    // Prevent swiping if within a horizontal scroll container
    let el: HTMLElement | null = target;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (
        style.overflowX === "auto"|| 
        style.overflowX === "scroll"|| 
        el.classList.contains("overflow-x-auto") || 
        el.classList.contains("overflow-x-scroll")
      ) {
        return;
      }
      el = el.parentElement;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    
    // Swipe left/right threshold: 50px
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (activeTab === "today") {
        if (diffX > 0) {
          // Swipe Right -> Previous Day
          const parts = currentDate.split("-");
          const prev = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          prev.setDate(prev.getDate() - 1);
          setCurrentDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`);
          showToast("已切換至前一日", "info");
        } else {
          // Swipe Left -> Next Day
          const parts = currentDate.split("-");
          const next = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          next.setDate(next.getDate() + 1);
          setCurrentDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
          showToast("已切換至後一日", "info");
        }
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };
  
  // ─── Modal & Form States ───
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBeforeAfterModal, setShowBeforeAfterModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [addModalCategory, setAddModalCategory] = useState("早餐");
  const [addModalTargetGroupIndex, setAddModalTargetGroupIndex] = useState<number | undefined>(undefined);
  const [addModalTab, setAddModalTab] = useState<"quick"| "manual"| "ai">("quick");
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  
  // Manual Add Form State
  const [mName, setMName] = useState("");
  const [mGroup, setMGroup] = useState("");
  const [mAmount, setMAmount] = useState<number | "">("");
  const [mPrice, setMPrice] = useState<number | "">("");
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
  const [ePrice, setEPrice] = useState<number | "">("");
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);
  const [editedGroupItems, setEditedGroupItems] = useState<MealItem[]>([]);

  // Meal accordion expand state
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [collapsedGroupItems, setCollapsedGroupItems] = useState<Record<string, boolean>>({});

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustContext, setAdjustContext] = useState<{
    type: "item"| "sub"| "group"| "lib";
    meal?: string;
    idx?: number;
    subIdx?: number;
    origItem: MealItem | { name: string; kcal: number };
    customRatio: number;
    customGram: number;
    customCount: number;
    customName?: string;
    customPrice?: number | "";
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
  const [nutrientAddKey, setNutrientAddKey] = useState<"protein"| "carb"| "fat"| "fiber"| "sugar"| "sodium"| null>(null);
  const [nutrientAddVal, setNutrientAddVal] = useState<number | "">("");

  // Confirmation Modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copiedHealthUrl, setCopiedHealthUrl] = useState(false);
  const [showHealthTutorial, setShowHealthTutorial] = useState(false);

  // ─── Image Upload for Meals ───
  const handleItemImageUpload = (category: string, index: number, subIndex: number | null, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const day = { ...getDayRecord(currentDate) };
      const updatedMeals = { ...day.meals };
      const list = [...updatedMeals[category as keyof typeof day.meals]];
      
      if (subIndex !== null) {
        // Sub-item image
        const grp = { ...(list[index] as MealGroup) };
        const newItems = [...grp.items];
        newItems[subIndex] = { ...newItems[subIndex], image: base64 };
        grp.items = newItems;
        list[index] = grp;
      } else {
        // Group or single item image
        list[index] = { ...list[index], image: base64 };
      }

      updatedMeals[category as keyof typeof day.meals] = list;
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
    reader.readAsDataURL(file);
  };
  
  // Hydration Custom input
  const [customWaterInput, setCustomWaterInput] = useState<number | "">("");

  // Food Library Search and Management States
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryFilterCategory, setLibraryFilterCategory] = useState<string>("全部");
  const [librarySortBy, setLibrarySortBy] = useState<string>("recent");
  
  const filteredFoods = useMemo(() => {
    const storeFoodsMapped = librarySearchQuery.trim() ? STORE_FOODS_DATABASE.map((f, i) => ({
      id: -1000 - i, // negative ID for store foods
      name: `[${f.store}] ${f.name}`,
      kcal: f.kcal,
      protein: f.protein,
      carb: f.carb,
      fat: f.fat,
      sodium: f.sodium,
      price: f.price,
      fiber: f.category === "蔬菜" ? 2.5 : 0,
      sugar: f.category === "飲料" ? 2.0 : 0,
      category: f.category
    })) : [];
    const combinedFoods = [...db.foods, ...storeFoodsMapped];

    return combinedFoods
      .filter((f) => {
        const matchesSearch = f.name.toLowerCase().includes(librarySearchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (libraryFilterCategory === "全部") return true;
        return detectCategory(f) === libraryFilterCategory;
      })
      .sort((a, b) => {
        const getKcal = (x: MealRecord): number => {
          if ("type"in x && x.type === "group") {
            return (x as MealGroup).items.reduce((s, u) => s + (u.kcal || 0), 0);
          }
          return (x as MealItem).kcal || 0;
        };
        const getProtein = (x: MealRecord): number => {
          if ("type"in x && x.type === "group") {
            return (x as MealGroup).items.reduce((s, u) => s + (u.protein || 0), 0);
          }
          return (x as MealItem).protein || 0;
        };
        const getFiber = (x: MealRecord): number => {
          if ("type"in x && x.type === "group") {
            return (x as MealGroup).items.reduce((s, u) => s + (u.fiber || 0), 0);
          }
          return (x as MealItem).fiber || 0;
        };

        if (librarySortBy === "kcalAsc") return getKcal(a) - getKcal(b);
        if (librarySortBy === "kcalDesc") return getKcal(b) - getKcal(a);
        if (librarySortBy === "proteinDesc") return getProtein(b) - getProtein(a);
        if (librarySortBy === "fiberDesc") return getFiber(b) - getFiber(a);
        return combinedFoods.indexOf(b) - combinedFoods.indexOf(a); // recent
      });
  }, [db.foods, librarySearchQuery, libraryFilterCategory, librarySortBy]);

  const libraryChunks = useMemo(() => {
    // Determine chunks for responsive grid
    const isMd = typeof window !== 'undefined' && window.innerWidth >= 768;
    const cols = isMd ? 2 : 1;
    const chunks: MealRecord[][] = [];
    for (let i = 0; i < filteredFoods.length; i += cols) {
      chunks.push(filteredFoods.slice(i, i + cols));
    }
    return chunks;
  }, [filteredFoods]);

  const libraryParentRef = React.useRef<HTMLDivElement>(null);
  const libraryRowVirtualizer = useVirtualizer({
    count: libraryChunks.length,
    getScrollElement: () => libraryParentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  });

  const [selectedLibItems, setSelectedLibItems] = useState<number[]>([]);
  const [mCategory, setMCategory] = useState<string>("其他");
  const [showIndicatorDetails, setShowIndicatorDetails] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  // Sync URL State
  const [syncUrl, setSyncUrl] = useState<string>("");
  const [syncWarning, setSyncWarning] = useState<string>("");

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success"| "error"| "info"} | null>(null);

  const showToast = (message: string, type: "success"| "error"| "info"= "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Database from Local Storage / IndexedDB or URL parameter
  useEffect(() => {
    const loadData = async () => {
      let initialDb: DBState = {
        settings: { ...DEFAULT_SETTINGS },
        days: {},
        foods: [],
        fasting: { isFasting: false, startTime: null, targetHours: 16 },
      };

      try {
        let raw = await localforage.getItem<string>("fitness_db");
        // Fallback to localStorage migration
        if (!raw) {
          raw = localStorage.getItem("fitness_db");
          if (raw) {
            // Migrate to localforage
            await localforage.setItem("fitness_db", raw);
          }
        }
        
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
            initialDb = {
              ...parsed,
              settings: mergedSettings,
            };
          }
        }
      } catch (e) {
        console.error("Local storage load failed:", e);
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const sharedData = params.get("data");
        const action = params.get("action");

        if (sharedData) {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
          if (decoded && decoded.settings && decoded.days) {
            initialDb = decoded;
            showToast("匯入雲端同步資料成功！", "success");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (action === "syncHealth") {
          const date = params.get("date") || getTodayString();
          const weightStr = params.get("weight");
          const exerciseStr = params.get("exercise");
          const stepsStr = params.get("steps");
          const mode = params.get("mode") || "overwrite"; // 預設覆寫
          
          let updated = false;
          const currentDay = initialDb.days[date] || { meals: { "早餐": [], "午餐": [], "晚餐": [], "點心": [] }, waterLog: [], exercise: 0, steps: 0, weight: null, bodyfat: null, photos: [] };
          
          if (weightStr) {
            const w = parseFloat(weightStr);
            if (!isNaN(w) && w > 0) {
              currentDay.weight = w;
              updated = true;
            }
          }
          
          if (exerciseStr) {
            const ex = parseInt(exerciseStr, 10);
            if (!isNaN(ex) && ex >= 0) {
              if (mode === "add") {
                currentDay.exercise = (currentDay.exercise || 0) + ex;
              } else {
                currentDay.exercise = ex;
              }
              updated = true;
            }
          }

          if (stepsStr) {
            const st = parseInt(stepsStr, 10);
            if (!isNaN(st) && st >= 0) {
              if (mode === "add") {
                currentDay.steps = (currentDay.steps || 0) + st;
              } else {
                currentDay.steps = st;
              }
              updated = true;
            }
          }
          
          if (updated) {
            initialDb = {
              ...initialDb,
              days: {
                ...initialDb.days,
                [date]: currentDay
              }
            };
            showToast(`已從 Apple Health 同步 ${date} 數據！`, "success");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (e) {
        console.warn("URL data parse failed:", e);
      }

      setDb(initialDb);
      setIsLoadingDb(false);
      localforage.setItem("fitness_db", JSON.stringify(initialDb)).catch(console.error);
    };

    loadData();
  }, []);

  // Save changes to localforage
  const saveDb = (updatedDb: DBState) => {
    setDb(updatedDb);
    localforage.setItem("fitness_db", JSON.stringify(updatedDb)).catch((e) => {
      console.error("Local storage save failed:", e);
    });
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

  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
    const timeStr = getCurrentTimeStr();
    const updatedMeals = { ...day.meals };

    if (addModalTargetGroupIndex !== undefined) {
      // Append items to an existing group
      const targetGroup = updatedMeals[category as keyof typeof day.meals][addModalTargetGroupIndex];
      if (targetGroup && "type" in targetGroup && targetGroup.type === "group") {
        targetGroup.items = [
          ...targetGroup.items,
          ...items.map((it, i) => ({ ...it, id: dateNow + 100 + i }))
        ];
      }
    } else {
      let newRecord: MealRecord;
      if (groupTitle.trim()) {
        newRecord = {
          type: "group",
          id: dateNow,
          name: groupTitle.trim(),
          items: items.map((it, i) => ({ ...it, id: dateNow + 100 + i })),
          time: timeStr,
        };
      } else {
        newRecord = {
          ...items[0],
          id: dateNow,
          time: timeStr,
        };
      }

      // Append to Day meals
      updatedMeals[category as keyof typeof day.meals] = [
        ...updatedMeals[category as keyof typeof day.meals],
        newRecord,
      ];
    }

    const updatedDay = {
      ...day,
      meals: updatedMeals,
    };

    // Auto-save to food library if not already present, avoiding duplicates
    let updatedFoods = [...db.foods];
    const checkAndAdd = (nameStr: string, foodRecord: MealRecord) => {
      if (!nameStr || nameStr.startsWith("快速補充")) return;
      const exists = updatedFoods.some(
        (f) => f.name.trim().toLowerCase() === nameStr.trim().toLowerCase()
      );
      if (!exists) {
        if ("type" in foodRecord && foodRecord.type === "group") {
          const cleanGroup: MealGroup = {
            type: "group",
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: foodRecord.name,
            items: foodRecord.items.map((it, i) => {
              const { id, ...rest } = it;
              return { ...rest, id: Date.now() + 100 + i };
            }),
            price: foodRecord.price,
            category: foodRecord.category,
          };
          updatedFoods.push(cleanGroup);
        } else {
          const singleItem = foodRecord as MealItem;
          const { id, time, ...rest } = singleItem;
          updatedFoods.push({
            ...rest,
            id: Date.now() + Math.random(),
          });
        }
      }
    };

    if (groupTitle.trim()) {
      const groupRec: MealGroup = {
        type: "group",
        id: dateNow,
        name: groupTitle.trim(),
        items: items.map((it, i) => ({ ...it, id: dateNow + 100 + i })),
        price: items.reduce((s, u) => s + (u.price || 0), 0) || undefined,
      };
      checkAndAdd(groupTitle.trim(), groupRec);
    } else {
      items.forEach((it) => {
        checkAndAdd(it.name, it);
      });
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
    setAddModalTargetGroupIndex(undefined); // Reset
  };

  const handleManualAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!mName.trim()) {
      showToast("請輸入食物名稱！", "error");
      return;
    }
    if (mKcal === "") {
      showToast("請輸入估計熱量！", "error");
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
      price: mPrice === "" ? undefined : Number(mPrice),
    };

    addMealsToDay(addModalCategory, [newItem], mGroup, mSaveToLib);
    
    // Reset manual form
    setMName("");
    setMGroup("");
    setMAmount("");
    setMPrice("");
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

  const deleteMealSubItem = (category: string, index: number, subIndex: number) => {
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };
    const targetMealList = [...updatedMeals[category as keyof typeof day.meals]];
    const group = targetMealList[index];
    if (group && "type" in group && group.type === "group") {
      const updatedGroup = { ...group, items: [...group.items] };
      updatedGroup.items.splice(subIndex, 1);
      if (updatedGroup.items.length === 0) {
        targetMealList.splice(index, 1);
      } else {
        targetMealList[index] = updatedGroup;
      }
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
    }
  };

  // ─── Adjustments ───
  const openAdjustItemModal = (category: string, idx: number) => {
    const day = getDayRecord(currentDate);
    const item = day.meals[category as keyof typeof day.meals][idx];
    if (!item) return;

    if ("type"in item && item.type === "group") {
      // Adjust group aggregate ratio
      const gKcal = item.items.reduce((sum, s) => sum + (s.kcal || 0), 0);
      const dummyGroup = { name: item.name, kcal: gKcal };
      setAdjustContext({
        type: "group",
        meal: category,
        idx,
        origItem: dummyGroup,
        customName: dummyGroup.name,
        customPrice: item.price !== undefined ? item.price : "",
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
        customName: singleItem.name,
        customPrice: singleItem.price !== undefined ? singleItem.price : "",
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
    if (!grp || !("type"in grp) || grp.type !== "group") return;
    const item = grp.items[subIdx];
    if (!item) return;

    setAdjustContext({
      type: "sub",
      meal: category,
      idx,
      subIdx,
      origItem: { ...item },
      customName: item.name,
      customPrice: item.price !== undefined ? item.price : "",
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
    const { type, meal, idx, subIdx, editedNutrients, customGram, customCount, customName, customPrice, adjustMode } = adjustContext;
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
          name: customName || target.name,
          price: customPrice === "" ? undefined : Number(customPrice),
        };
        saveDb({ ...db, foods: updatedFoods });
      }
    } else if (type === "group") {
      // Group calorie ratio scaling
      const grp = updatedMeals[meal as keyof typeof updatedMeals][idx!] as MealGroup;
      if (grp) {
        grp.name = customName || grp.name;
        grp.price = customPrice === "" ? undefined : Number(customPrice);
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
          name: customName || grp.items[subIdx!].name,
          amount: adjustMode === "gram"? customGram : grp.items[subIdx!].amount,
          count: adjustMode === "count"? customCount : grp.items[subIdx!].count,
          price: customPrice === "" ? undefined : Number(customPrice),
        };
      }
    } else {
      // Adjust standard single item
      const item = updatedMeals[meal as keyof typeof updatedMeals][idx!] as MealItem;
      if (item) {
        updatedMeals[meal as keyof typeof updatedMeals][idx!] = {
          ...item,
          ...editedNutrients,
          name: customName || item.name,
          amount: adjustMode === "gram"? customGram : item.amount,
          count: adjustMode === "count"? customCount : item.count,
          price: customPrice === "" ? undefined : Number(customPrice),
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

    // Trigger ripple animation
    setWaterRipple(true);
    setTimeout(() => setWaterRipple(false), 1200);

    // Generate bubbles
    const newBubbles = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 90 + 5, // percentage
      size: Math.random() * 10 + 6, // 6px to 16px
      delay: Math.random() * 0.5, // delay in seconds
      duration: 1.5 + Math.random() * 1.0, // duration in seconds
    }));
    setWaterBubbles(newBubbles);
    setTimeout(() => {
      setWaterBubbles([]);
    }, 3000);
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
  const saveDailyIndicators = (weight: number | null, bodyfat: number | null, exercise: number, steps: number = 0) => {
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
          steps,
        },
      },
    });
    showToast("今日身體與運動數據儲存成功！", "success");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64Str = canvas.toDataURL("image/jpeg", 0.7);
        
        const day = { ...getDayRecord(currentDate) };
        const updatedPhotos = [...(day.photos || [])];
        
        updatedPhotos.push({
          id: Date.now().toString(),
          url: base64Str,
          timestamp: Date.now()
        });

        saveDb({
          ...db,
          days: {
            ...db.days,
            [currentDate]: {
              ...day,
              photos: updatedPhotos
            }
          }
        });
        showToast("體態照片已上傳", "success");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // clear input
    e.target.value = '';
  };

  const handleDeletePhoto = (photoId: string, targetDate: string) => {
    const day = { ...getDayRecord(targetDate) };
    if (!day.photos) return;
    
    saveDb({
      ...db,
      days: {
        ...db.days,
        [targetDate]: {
          ...day,
          photos: day.photos.filter(p => p.id !== photoId)
        }
      }
    });
    showToast("照片已刪除", "success");
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
    if (nutrientAddVal === ""|| !nutrientAddKey) return;
    const v = Number(nutrientAddVal);
    if (v <= 0) return;

    // Estimate calorie equivalent
    const multipliers = { protein: 4, carb: 4, fat: 9, fiber: 2, sugar: 4, sodium: 0 };
    const kcalEst = Math.round(v * (multipliers[nutrientAddKey] || 0));

    const newItem: MealItem = {
      id: Date.now(),
      name: `快速補充${{protein: '蛋白質', carb: '碳水', fat: '脂肪', fiber: '膳食纖維', sugar: '糖', sodium: '鈉'}[nutrientAddKey]}`,
      kcal: kcalEst,
      protein: nutrientAddKey === "protein"? v : 0,
      carb: nutrientAddKey === "carb"? v : 0,
      fat: nutrientAddKey === "fat"? v : 0,
      fiber: nutrientAddKey === "fiber"? v : 0,
      sugar: nutrientAddKey === "sugar"? v : 0,
      sodium: nutrientAddKey === "sodium"? v : 0,
    };

    addMealsToDay("點心", [newItem]);
    setShowNutrientModal(false);
  };

  // ─── Calculations and stats variables ───
  const dayRecord = getDayRecord(currentDate);
  
  // Calculate total calories & macro values logged for the current active date
  const loggedTotals = useMemo(() => {
    const totals = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, price: 0 };
    Object.values(dayRecord.meals).forEach((mealList) => {
      mealList.forEach((it) => {
        if ("type"in it && it.type === "group") {
          totals.price += it.price || 0;
          it.items.forEach((sub) => {
            totals.kcal += sub.kcal || 0;
            totals.protein += sub.protein || 0;
            totals.carb += sub.carb || 0;
            totals.fat += sub.fat || 0;
            totals.fiber += sub.fiber || 0;
            totals.sugar += sub.sugar || 0;
            totals.sodium += sub.sodium || 0;
            if (it.price === undefined || it.price === 0) {
              totals.price += sub.price || 0;
            }
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
          totals.price += singleItem.price || 0;
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
      price: Math.round(totals.price),
    };
  }, [dayRecord.meals]);

  const waterTotalLogged = useMemo(() => dayRecord.waterLog.reduce((sum, w) => sum + w.ml, 0), [dayRecord.waterLog]);
  const settings = db.settings;
  const targets = settings.targets;
  
  // Calorie progress circle parameters
  const kcalTarget = targets.kcal || 1800;
  const loggedKcalPercentage = Math.min(loggedTotals.kcal / kcalTarget, 1.05);
  const circleRadius = 41;
  const circleStrokeCircumference = 2 * Math.PI * circleRadius;
  const calorieRemain = Math.max(0, kcalTarget - loggedTotals.kcal);
  const calorieOver = Math.max(0, loggedTotals.kcal - kcalTarget);
  const exerciseBurn = dayRecord.exercise || 0;
  const netCalorieRemain = Math.max(0, kcalTarget - loggedTotals.kcal + exerciseBurn);
  const netCalorieOver = Math.max(0, loggedTotals.kcal - (kcalTarget + exerciseBurn));

  const theoreticalEKcal = Math.round(
    (Number(eProtein) || 0) * 4 + 
    (Number(eCarb) || 0) * 4 + 
    (Number(eFat) || 0) * 9
  );
  const showEKcalDiffAlert = eKcal !== ""&& theoreticalEKcal > 0 && Math.abs(Number(eKcal) - theoreticalEKcal) > Math.max(20, theoreticalEKcal * 0.15);

  // Latest logged weight/bodyfat across past records if not logged today
  const getLatestLogVal = (field: "weight"| "bodyfat"): number | null => {
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
      return { text: "今日尚無飲食紀錄，點選下方餐點或利用 AI 剖析開始記錄", style: "border-amber-500/55 text-amber-300 bg-amber-500/10"};
    }
    if (calorieOver > 50) {
      return { text: "今日熱量攝取已超標，請留意後續飲食搭配，加強運動", style: "border-rose-500/55 text-rose-300 bg-rose-500/10"};
    }
    if (proteinPct < 0.6) {
      return { text: `今日蛋白質攝取不足，建議補充肉蛋類以利肌肉修復 (尚缺 ${Math.round(targets.protein - loggedTotals.protein)} 克)`, style: "border-yellow-500/55 text-yellow-300 bg-yellow-500/10"};
    }
    if (calorieRemain >= 0 && calorieRemain <= 200 && proteinPct >= 0.85) {
      return { text: "今日飲食控制極其精準！熱量與蛋白質完美符合目標", style: "border-green-500/55 text-green-300 bg-green-500/10"};
    }
    return { text: "飲食熱量與微量營養素控制良好，繼續保持下去", style: "border-indigo-500/55 text-indigo-300 bg-indigo-500/10"};
  };

  const summaryText = getDailySummary();

  // ─── 遊戲化成就系統：堅持與習慣勳章 ───
  const getBadges = () => {
    const dates = Object.keys(db.days).sort();
    
    // 1. 滴水不漏 (Hydration Master) - 連續 3 天水分攝取達標 (總量 >= settings.waterTarget)
    let maxConsecutiveWaterDays = 0;
    let consecutiveWaterDays = 0;
    
    dates.forEach((dateStr) => {
      const dRec = db.days[dateStr];
      if (!dRec) return;
      const waterSum = dRec.waterLog ? dRec.waterLog.reduce((s, w) => s + w.ml, 0) : 0;
      if (waterSum >= (settings.waterTarget || 1800)) {
        consecutiveWaterDays += 1;
        if (consecutiveWaterDays > maxConsecutiveWaterDays) {
          maxConsecutiveWaterDays = consecutiveWaterDays;
        }
      } else {
        consecutiveWaterDays = 0;
      }
    });
    const isHydrationMaster = maxConsecutiveWaterDays >= 3;

    // 2. 黃金控制者 (Golden Controller) - 今日攝取熱量與 TDEE 目標誤差在 ±50 大卡內且攝取過食物
    let isGoldenController = false;
    if (loggedTotals.kcal > 0 && Math.abs(loggedTotals.kcal - kcalTarget) <= 50) {
      isGoldenController = true;
    }

    // 3. 鋼鐵意志 (Iron Will) - 連續記錄飲食達 7 天 (每天至少有一餐有食物紀錄)
    let maxConsecutiveMealDays = 0;
    const sortedDatesWithMeals = dates.filter(dStr => {
      const dRec = db.days[dStr];
      if (!dRec || !dRec.meals) return false;
      return ["早餐", "午餐", "晚餐", "點心"].some(cat => {
        const list = dRec.meals[cat as keyof typeof dRec.meals] || [];
        return list.length > 0;
      });
    });

    if (sortedDatesWithMeals.length > 0) {
      let currentConsec = 1;
      let maxConsec = 1;
      for (let i = 1; i < sortedDatesWithMeals.length; i++) {
        const prev = new Date(sortedDatesWithMeals[i - 1]);
        const curr = new Date(sortedDatesWithMeals[i]);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentConsec += 1;
          if (currentConsec > maxConsec) {
            maxConsec = currentConsec;
          }
        } else if (diffDays > 1) {
          currentConsec = 1;
        }
      }
      maxConsecutiveMealDays = maxConsec;
    }
    const isIronWill = maxConsecutiveMealDays >= 7;

    // 4. 蛋白質達人 (Protein Pro) - 今日蛋白質達標
    const isProteinPro = loggedTotals.protein >= targets.protein && loggedTotals.protein > 0;

    // 5. 斷食自噬者 (Fasting Pro) - 今日斷食達標 (至少 16 小時)
    const isFastingPro = (getDayRecord(currentDate).fastingHours || 0) >= 16 || (db.fasting?.isFasting && ((Date.now() - (db.fasting.startTime || Date.now())) / 3600000 >= 16));

    return [
      {
        id: "hydration_master",
        name: "滴水不漏",
        desc: "連續 3 天水分達標",
        icon: <Droplet className="w-5 h-5"strokeWidth={1.5} />,
        unlocked: isHydrationMaster,
        progress: `${Math.min(maxConsecutiveWaterDays, 3)}/3 天`,
        color: "text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        glowBg: "bg-sky-500",
        hexColor: "rgba(14, 165, 233, 0.5)",
      },
      {
        id: "golden_controller",
        name: "黃金控制者",
        desc: "熱量落入目標 ±50 kcal 內",
        icon: <Target className="w-5 h-5"strokeWidth={1.5} />,
        unlocked: isGoldenController,
        progress: isGoldenController ? "已達成": "未達成",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        glowBg: "bg-amber-500",
        hexColor: "rgba(245, 158, 11, 0.5)",
      },
      {
        id: "iron_will",
        name: "鋼鐵意志",
        desc: "連續 7 天完成飲食記錄",
        icon: <ShieldCheck className="w-5 h-5"strokeWidth={1.5} />,
        unlocked: isIronWill,
        progress: `${Math.min(maxConsecutiveMealDays, 7)}/7 天`,
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        glowBg: "bg-purple-500",
        hexColor: "rgba(168, 85, 247, 0.5)",
      },
      {
        id: "protein_pro",
        name: "蛋白質達人",
        desc: "今日蛋白質攝取量達標",
        icon: <Dumbbell className="w-5 h-5"strokeWidth={1.5} />,
        unlocked: isProteinPro,
        progress: isProteinPro ? "已達成": "未達成",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        glowBg: "bg-emerald-500",
        hexColor: "rgba(16, 185, 129, 0.5)",
      },
      {
        id: "fasting_pro",
        name: "斷食自噬者",
        desc: "今日斷食時間達 16 小時以上",
        icon: <Sparkles className="w-5 h-5"strokeWidth={1.5} />,
        unlocked: isFastingPro,
        progress: isFastingPro ? "已達成": "未達成",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        glowBg: "bg-rose-500",
        hexColor: "rgba(244, 63, 94, 0.5)",
      }
    ];
  };

  // Settings Panel triggers
  const handleUpdateSettings = (updated: Partial<Settings>) => {
    const newSettings = { ...db.settings, ...updated };
    const isAutoWater = newSettings.autoWaterTarget ?? true;
    
    // Auto-calculate water target if auto adjustment is toggled or weight is changed
    if (isAutoWater && (updated.weight !== undefined || updated.autoWaterTarget !== undefined)) {
      newSettings.waterTarget = Math.round(newSettings.weight * 30);
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
    showToast("系統已根據運動科學公式自動更新您的熱量及三大營養素目標！", "success");
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
    const blob = new Blob([JSON.stringify(exportState)], { type: "application/json"});
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
          showToast("資料庫備份還原成功！", "success");
        } else {
          showToast("檔案格式不符合備份標準格式，還原失敗。", "error");
        }
      } catch (err) {
        showToast("解析備份檔案時發生錯誤，請確認為正確的 JSON 備份檔案。", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const generateSyncUrl = () => {
    const jsonStr = JSON.stringify(db);
    const sizeKB = Math.round(jsonStr.length / 1024);
    
    if (sizeKB > 8) {
      setSyncWarning(` 資料包容量為 ${sizeKB}KB (超出雲端瀏覽器網址容量上限 8KB)。若欲轉移資料，強烈建議使用「手動匯出 JSON 備份」！`);
      setSyncUrl("");
    } else {
      if (sizeKB > 5) {
        setSyncWarning(` 目前資料量 ${sizeKB}KB 較多，某些行動裝置瀏覽器開啟可能不穩定。`);
      } else {
        setSyncWarning("");
      }
      try {
        const url = `${window.location.origin}${window.location.pathname}?data=${btoa(unescape(encodeURIComponent(jsonStr)))}`;
        setSyncUrl(url);
      } catch (err) {
        showToast("產生同步連結失敗，請直接匯出 JSON 備份檔。", "error");
      }
    }
  };

  // Add from Food Library directly to today
  const addLibItemToToday = (record: MealRecord, category: string) => {
    const dateNow = Date.now();
    const timeStr = getCurrentTimeStr();
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };

    // If we are adding as a sub-item to an existing group
    if (addModalTargetGroupIndex !== undefined) {
      const targetGroup = updatedMeals[category as keyof typeof day.meals][addModalTargetGroupIndex];
      if (targetGroup && "type" in targetGroup && targetGroup.type === "group") {
        let itemsToAdd: MealItem[] = [];
        if ("type" in record && record.type === "group") {
          // If trying to add a group as a sub-item, unpack it
          itemsToAdd = record.items;
        } else {
          itemsToAdd = [record as MealItem];
        }
        
        targetGroup.items = [
          ...targetGroup.items,
          ...itemsToAdd.map((it, i) => ({ ...it, id: dateNow + 100 + i }))
        ];
      }
    } else {
      let cloned: MealRecord;
      if ("type" in record && record.type === "group") {
        cloned = {
          ...record,
          id: dateNow,
          items: record.items.map((sub, i) => ({ ...sub, id: dateNow + 100 + i })),
          time: timeStr,
        };
      } else {
        cloned = {
          ...record,
          id: dateNow,
          time: timeStr,
        };
      }

      updatedMeals[category as keyof typeof day.meals] = [
        ...updatedMeals[category as keyof typeof day.meals],
        cloned,
      ];
    }

    // Auto save to custom library if not already present
    let updatedFoods = [...db.foods];
    const existsInLib = updatedFoods.some(
      (f) => f.name.trim().toLowerCase() === record.name.trim().toLowerCase()
    );
    if (!existsInLib && !record.name.startsWith("快速補充")) {
      if ("type" in record && record.type === "group") {
        updatedFoods.push({
          type: "group",
          id: Date.now() + 500,
          name: record.name,
          items: record.items.map((sub, i) => {
            const { id, ...rest } = sub;
            return { ...rest, id: Date.now() + 600 + i };
          }),
          category: record.category,
          price: record.price,
        });
      } else {
        const { id, time, ...rest } = record as MealItem;
        updatedFoods.push({
          ...rest,
          id: Date.now() + Math.random(),
        });
      }
    }

    saveDb({
      ...db,
      days: {
        ...db.days,
        [currentDate]: {
          ...day,
          meals: updatedMeals,
        },
      },
      foods: updatedFoods,
    });
    setExpandedMeals(prev => ({ ...prev, [category]: true }));
    setAddModalTargetGroupIndex(undefined); // Reset
    showToast(` 已加選 ${record.name} 至今日 ${category} 紀錄！`, "success");
  };

  // 取得特定餐別歷史上最常吃/最近吃的前 3 個品項
  const getRecentFrequentMeals = (category: string, limit = 3): MealRecord[] => {
    const allRecords: { record: MealRecord; count: number; lastDate: string }[] = [];
    
    Object.entries(db.days).forEach(([dateStr, d]) => {
      const day = d as DayRecord;
      if (!day || !day.meals) return;
      const list = day.meals[category as keyof typeof day.meals] || [];
      list.forEach((item) => {
        const found = allRecords.find(r => r.record.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        if (found) {
          found.count += 1;
          if (dateStr > found.lastDate) {
            found.lastDate = dateStr;
            found.record = item;
          }
        } else {
          allRecords.push({
            record: item,
            count: 1,
            lastDate: dateStr,
          });
        }
      });
    });

    allRecords.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastDate.localeCompare(a.lastDate);
    });

    return allRecords.slice(0, limit).map(r => r.record);
  };

  // 快速將克隆的食物記錄加入到特定餐別
  const addClonedMealToCategory = (category: string, record: MealRecord) => {
    const day = { ...getDayRecord(currentDate) };
    const updatedMeals = { ...day.meals };
    
    const dateNow = Date.now();
    const timeStr = getCurrentTimeStr();
    let cloned: MealRecord;
    if ("type"in record && record.type === "group") {
      cloned = {
        ...record,
        id: dateNow,
        items: record.items.map((sub, sIdx) => ({ ...sub, id: dateNow + 100 + sIdx })),
        time: timeStr,
      };
    } else {
      cloned = {
        ...record,
        id: dateNow,
        time: timeStr,
      };
    }

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
    showToast(` 快速加選「${record.name}」成功！`, "success");
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
      if (rec.type === "group"&& rec.items) {
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
    
    showToast(` 已自 ${formatFriendlyDate(sourceDayStr)} 複製 ${cat} 紀錄！`, "success");
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
    setEPrice(item.price ?? "");
    setECategory(detectCategory(item));
    if ("type"in item && item.type === "group") {
      setEKcal("");
      setEProtein("");
      setECarb("");
      setEFat("");
      setEFiber("");
      setESugar("");
      setESodium("");
      setEAmount("");
      setEditedGroupItems(JSON.parse(JSON.stringify(item.items || [])));
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
      setEditedGroupItems([]);
    }
    setShowEditAdvanced(false);
    setShowEditFoodModal(true);
  };

  const saveEditedFoodLibraryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editFoodIndex === null) return;
    const item = db.foods[editFoodIndex];
    const updatedFoods = [...db.foods];
    if ("type"in item && item.type === "group") {
      updatedFoods[editFoodIndex] = {
        ...item,
        name: eName,
        price: ePrice === "" ? undefined : Number(ePrice),
        items: editedGroupItems,
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
        amount: eAmount === ""? null : Number(eAmount),
        price: ePrice === "" ? undefined : Number(ePrice),
      } as MealItem;
    }
    saveDb({ ...db, foods: updatedFoods });
    setShowEditFoodModal(false);
    setEditFoodIndex(null);
    showToast("食物品項已成功更新！", "success");
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
      if ("type"in record && record.type === "group") {
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
    showToast(` 已成功將已選取的 ${records.length} 項食物批次新增至今日 ${category}！`, "success");
  };

  // 一鍵儲存基礎範本到個人食物庫
  const addPresetToLibrary = (preset: MealItem) => {
    if (db.foods.some(f => !("type"in f && f.type === "group") && f.name === preset.name)) {
      showToast(` 「${preset.name}」已經存在於您的食物庫中囉！`, "info");
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
    showToast(` 「${preset.name}」已成功儲存到您的個人食物庫！`, "success");
  };

  // 增加 global pointer 追蹤，提供給背光與毛玻璃呈現更好的游標懸浮回饋感
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      document.documentElement.style.setProperty('--mouse-x', `${clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${clientY}px`);
    };
    
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  if (isLoadingDb) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507] text-zinc-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          載入資料庫中...
        </div>
      </div>
    );
  }

  return (
    <div id="root"className="min-h-screen flex flex-col bg-[#050507] text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white pb-[80px] md:pb-0 relative overflow-x-hidden max-w-[480px] md:max-w-none mx-auto w-full">
      
      {/* Premium Tech Dot Grid & Faint Ambient Light (Allows Glassmorphism to Blur and Stand Out) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#040406]">
        {/* Dot Grid Matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1.2px,transparent_1.2px)] [background-size:24px_24px]"/>
        
        {/* Elegantly soft indigo gradient highlight behind the sidebar */}
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-[130px]"/>
        
        {/* Soft, extremely dim emerald light in the lower right bottom */}
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[140px]"/>
      </div>
      
      {/* Responsive Left Fixed Sidebar for Desktop / Bottom Nav for Mobile */}
      <div className="flex flex-col md:flex-row min-h-screen md:h-screen md:overflow-hidden relative z-10 w-full">
        
        {/* Desktop Left Navigation Sidebar */}
        <nav className="hidden md:flex flex-col w-[250px] bg-zinc-950/80 border-r border-white/10 backdrop-blur-2xl shrink-0 h-screen sticky top-0 p-5 justify-between relative z-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white p-2 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-white/10">
                <Flame className="w-5 h-5 animate-pulse"/>
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
                <Flame className="w-4 h-4"/>
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
                <Calendar className="w-4 h-4"/>
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
                <Salad className="w-4 h-4"/>
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
                <SettingsIcon className="w-4 h-4"/>
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
        <header className="md:hidden flex justify-between items-center w-full max-w-[480px] mx-auto bg-transparent p-4 z-40 relative">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo-400"/>
            <h1 className="text-sm font-black tracking-tight">健身飲食紀錄</h1>
          </div>
          <span className="text-[10px] font-extrabold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 py-1 px-2.5 rounded-full">
            {settings.mode}
          </span>
        </header>

        {/* Main Dashboard Panel */}
        <main 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 w-full p-4 sm:p-6 md:p-8 md:h-full md:overflow-y-auto"
        >
          
          {/* Header Action / Date Navigator (Active only when activeTab is "today"or "history") */}
          {activeTab === "today"&& (
            <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-6 bg-white/[0.04] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4 shadow-xl">
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

              <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap xl:flex-nowrap gap-2.5 w-full xl:w-auto mt-2 xl:mt-0">
                {db.settings.geminiApiKey && (
                  <button
                    onClick={() => setShowAICoach(true)}
                    className="h-11 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-extrabold text-xs px-3 rounded-xl cursor-pointer border border-purple-500/20 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse shrink-0"/>
                    <span>AI 教練</span>
                  </button>
                )}
                <button
                  onClick={() => setShowShareModal(true)}
                  className="h-11 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-extrabold text-xs px-3 rounded-xl cursor-pointer border border-indigo-500/20 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 shrink-0"/>
                  <span>分享卡片</span>
                </button>
                <button
                  onClick={() => setCurrentDate(getTodayString())}
                  className="h-11 bg-zinc-800/50 hover:bg-zinc-800/80 active:scale-95 border border-zinc-700/50 text-zinc-300 font-extrabold text-xs px-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 shrink-0"/>
                  <span>回到今天</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className={`h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold text-xs px-3 rounded-xl cursor-pointer border border-rose-500/20 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${!db.settings.geminiApiKey ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <Trash2 className="w-4 h-4 shrink-0"/>
                  <span>清空資料</span>
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
              {activeTab === "today"&& (
                <div className="space-y-6">
                  
                  {/* Summary alert banner */}
                  <div className={`border-l-4 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${summaryText.style}`}>
                    <span>{summaryText.text}</span>
                  </div>

                  {/* Fasting Tracker Widget */}
                  {(db.settings.enableFasting || db.fasting?.isFasting) && (
                    <FastingTracker db={db} updateDb={setDb} />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column - Rings, Target breakdown and Quick inputs */}
                    <div className="space-y-6 lg:col-span-5">
                      
                      {/* Calories & Macros Bento Rings Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Calories Ring Card */}
                        <div className="relative group h-full">
                          <MouseGlow />
                          <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex flex-col justify-between h-full space-y-4">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-2">
                                <Flame className="w-4 h-4 text-indigo-400"/>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">今日熱量攝取</span>
                              </div>
                              {loggedTotals.price > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <span className="text-[10px] text-emerald-400 font-black">今日花費 ${loggedTotals.price}</span>
                                </div>
                              )}
                            </div>
                          
                          <div className="flex items-center gap-4">
                            {/* SVG Progress Ring */}
                            <div className="relative w-18 h-18 shrink-0">
                              {loggedTotals.kcal >= kcalTarget && (
                                <motion.div
                                  className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 1.4] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                />
                              )}
                              <svg className="-rotate-90 w-full h-full relative z-10"viewBox="0 0 96 96">
                                <circle cx="48"cy="48"r={circleRadius} fill="none"stroke="#222227"strokeWidth="10"/>
                                <motion.circle 
                                  cx="48"
                                  cy="48"
                                  r={circleRadius} 
                                  fill="none"
                                  stroke={loggedTotals.kcal > kcalTarget ? "#f43f5e": "#6366f1"} 
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                  initial={{ strokeDashoffset: circleStrokeCircumference }}
                                  animate={{ strokeDashoffset: circleStrokeCircumference * (1 - loggedKcalPercentage) }}
                                  transition={{ duration: 0.6, ease: "easeOut"}}
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
                                {netCalorieRemain > 0 ? (
                                  <span className="text-indigo-400">可用餘額 {netCalorieRemain}</span>
                                ) : (
                                  <span className="text-rose-500">超量 {netCalorieOver}</span>
                                )}
                              </div>
                              {exerciseBurn > 0 && (
                                <span className="text-[9px] text-emerald-400 font-bold block animate-pulse">
                                   運動增加 +{exerciseBurn} 大卡額度
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold border-t border-zinc-850 pt-2">
                            <span>運動: <span className="text-green-400">-{dayRecord.exercise || 0}</span></span>
                            <span>淨熱量: <span className="text-zinc-300">{Math.round(loggedTotals.kcal - (dayRecord.exercise || 0))}</span></span>
                          </div>
                        </div>
                        </div>

                        {/* Macros Doughnut Card */}
                        <div className="relative group h-full">
                          <MouseGlow />
                          <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex flex-col justify-between h-full space-y-4">
                            <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
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
                                  <svg className="-rotate-90 w-full h-full"viewBox="0 0 40 40">
                                    {totalActualMacroKcal === 0 ? (
                                      <circle cx="20"cy="20"r="16"fill="none"stroke="#222227"strokeWidth="4.5"/>
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
                            蛋白比例越高，飽足感與燃脂力越強
                          </div>
                        </div>
                        </div>
                      </div>

                      {/* Macronutrients Progress Grid */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日微量營養素分配</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { key: "protein", label: "蛋白質", color: "bg-emerald-500", text: "text-emerald-400", unit: "g"},
                            { key: "carb", label: "碳水化合物", color: "bg-orange-500", text: "text-orange-400", unit: "g"},
                            { key: "fat", label: "脂肪", color: "bg-amber-400", text: "text-amber-400", unit: "g"},
                            { key: "fiber", label: "膳食纖維", color: "bg-purple-500", text: "text-purple-400", unit: "g"},
                            { key: "sugar", label: "精緻糖", color: "bg-zinc-400", text: "text-zinc-400", unit: "g"},
                            { key: "sodium", label: "鈉離子", color: "bg-rose-500", text: "text-rose-400", unit: "mg"},
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

                      {/* 智慧「下一餐」推薦模組 */}
                      <div className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <h3 className="text-xs font-black tracking-widest text-indigo-400 uppercase">根據今日剩餘配額推薦</h3>
                        </div>
                        {(() => {
                          const pRatio = targets.protein ? loggedTotals.protein / targets.protein : 0;
                          const kRatio = targets.kcal ? loggedTotals.kcal / targets.kcal : 0;
                          const cRatio = targets.carb ? loggedTotals.carb / targets.carb : 0;
                          
                          let reason = "";
                          let recs: { name: string; desc: string; }[] = [];
                          
                          if (pRatio < 0.7 && kRatio > 0.8) {
                            reason = "蛋白質尚不足，但熱量已接近上限，建議補充低脂高蛋白食物：";
                            recs = [
                              { name: "無糖豆漿", desc: "約 130 kcal, 14g 蛋白質" },
                              { name: "舒肥雞胸", desc: "約 110 kcal, 23g 蛋白質" },
                              { name: "茶葉蛋", desc: "約 75 kcal, 7g 蛋白質" },
                            ];
                          } else if (pRatio < 0.7 && kRatio <= 0.8) {
                            reason = "蛋白質尚有缺口，且熱量還有空間，可選擇優質蛋白質來源：";
                            recs = [
                              { name: "烤鮭魚", desc: "富含 Omega-3，約 200 kcal" },
                              { name: "希臘優格", desc: "約 100 kcal, 10g 蛋白質" },
                            ];
                          } else if (cRatio < 0.5 && kRatio <= 0.8) {
                            reason = "碳水化合物攝取偏低，若有運動需求可適度補充：";
                            recs = [
                              { name: "烤地瓜", desc: "優質複合碳水，約 130 kcal" },
                              { name: "香蕉", desc: "快速補充能量，約 90 kcal" },
                            ];
                          } else if (kRatio >= 1) {
                            reason = "熱量已達標，若有飢餓感建議以零熱量或極低熱量為主：";
                            recs = [
                              { name: "氣泡水", desc: "無熱量，增加飽足感" },
                              { name: "無糖綠茶", desc: "抗氧化且無負擔" },
                            ];
                          } else {
                            reason = "目前各項營養攝取比例良好！繼續保持，若需加餐可選擇：";
                            recs = [
                              { name: "綜合堅果", desc: "優質油脂，約 150 kcal" },
                              { name: "蘋果", desc: "富含膳食纖維，約 60 kcal" },
                            ];
                          }

                          return (
                            <div className="space-y-3">
                              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{reason}</p>
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {recs.map((r, i) => (
                                  <div key={i} className="flex-shrink-0 bg-black/40 border border-zinc-800 rounded-xl px-3 py-2 flex flex-col justify-center min-w-[110px]">
                                    <span className="text-xs font-bold text-zinc-200">{r.name}</span>
                                    <span className="text-[9px] text-zinc-500 mt-0.5">{r.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                    </div>

                    {/* Right Column - Meals list and Hydration tracking */}
                    <div className="space-y-6 lg:col-span-7">
                      
                      {/* Meals list */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日飲食紀錄</h3>
                          <span className="text-xs text-zinc-400">點選各餐「＋」按鈕或下方食物</span>
                        </div>

                        {(() => {
                          const mealsData = [
                            { cat: "早餐", ratio: 0.3, label: "30%" },
                            { cat: "午餐", ratio: 0.35, label: "35%" },
                            { cat: "晚餐", ratio: 0.25, label: "25%" },
                            { cat: "點心", ratio: 0.10, label: "10%" }
                          ];
                          
                          return mealsData.map((mealDef, index) => {
                            const cat = mealDef.cat;
                            const list = dayRecord.meals[cat as keyof typeof dayRecord.meals] || [];
                            const mealKcal = Math.round(list.reduce((sum, item) => {
                              if ("type"in item && item.type === "group") {
                                return sum + item.items.reduce((acc, sub) => acc + (sub.kcal || 0), 0);
                              }
                              const singleItem = item as MealItem;
                              return sum + (singleItem.kcal || 0);
                            }, 0));
                            
                            const mealPrice = Math.round(list.reduce((sum, item) => {
                              if ("type"in item && item.type === "group") {
                                if (item.price !== undefined && item.price !== 0) {
                                  return sum + item.price;
                                }
                                return sum + item.items.reduce((acc, sub) => acc + (sub.price || 0), 0);
                              }
                              const singleItem = item as MealItem;
                              return sum + (singleItem.price || 0);
                            }, 0));
                            
                            const maxKcal = Math.round(kcalTarget * mealDef.ratio);

                            const isExpanded = !!expandedMeals[cat];
                            const recentMeals = getRecentFrequentMeals(cat);
                            const isOver = mealKcal > maxKcal;

                            return (
                              <div key={cat} className="relative group">
                                <MouseGlow />
                                <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden shadow-sm">
                                
                                {/* Meal category Header */}
                                <div 
                                  onClick={() => setExpandedMeals(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                  className="flex justify-between items-center bg-zinc-900/60 p-4 border-b border-zinc-850 cursor-pointer select-none hover:bg-zinc-900/80 transition-colors flex-wrap gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-zinc-400"/>
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-zinc-400"/>
                                    )}
                                    <span className="text-xs font-black text-zinc-100">{cat}</span>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isOver ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-zinc-800 border-zinc-750 text-zinc-400'}`}>
                                      {mealKcal} <span className="opacity-60 font-medium">/ {maxKcal}</span> 大卡
                                    </span>
                                    {mealPrice > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        ${mealPrice}
                                      </span>
                                    )}
                                  </div>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => copyPreviousDayMeal(cat)}
                                    title="複製前一日此餐飲食紀錄"
                                    className="text-[10px] font-bold border border-zinc-850 hover:border-zinc-750 bg-black/50/40 hover:bg-black/50 text-indigo-400 hover:text-indigo-300 p-1.5 sm:py-1.5 sm:px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-indigo-400 shrink-0"/>
                                    <span className="hidden sm:inline">複製前日</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setAddModalCategory(cat);
                                      setAddModalTab("quick");
                                      setShowAddModal(true);
                                    }}
                                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white p-1.5 sm:py-1.5 sm:px-3 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0"/>
                                    <span className="hidden sm:inline">新增</span>
                                  </button>
                                </div>
                              </div>

                              {/* Meal items container */}
                              {isExpanded && (
                                <div className="p-3 divide-y divide-zinc-850 animate-in fade-in duration-205">
                                  {/* 快速推薦氣泡 */}
                                  {recentMeals.length > 0 && (
                                    <div className="pb-3 flex flex-wrap items-center gap-1.5 border-b border-zinc-850/40">
                                      <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 shrink-0 select-none mr-1">
                                        <Zap className="w-3 h-3 text-amber-400"/>
                                        常用推薦:
                                      </span>
                                      {recentMeals.map((recMeal, rmIdx) => {
                                        const rKcal = "type"in recMeal && recMeal.type === "group"
                                          ? recMeal.items.reduce((s, it) => s + (it.kcal || 0), 0)
                                          : (recMeal as MealItem).kcal;
                                        return (
                                          <button
                                            key={rmIdx}
                                            type="button"
                                            onClick={() => addClonedMealToCategory(cat, recMeal)}
                                            title={`快速加入 ${recMeal.name}`}
                                            className="text-[10px] font-bold bg-zinc-800/20 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-850 text-zinc-300 hover:text-indigo-400 px-2 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-0.5 shrink-0 active:scale-95"
                                          >
                                            <span>{recMeal.name}</span>
                                            <span className="text-[8px] text-zinc-500 font-normal">({rKcal}大卡)</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {list.length === 0 ? (
                                    <div className="text-center text-zinc-400 text-xs py-6">
                                      尚無此餐飲食紀錄
                                    </div>
                                  ) : (
                                    list.map((item, idx) => {
                                      // Render Group Items
                                      if ("type"in item && item.type === "group") {
                                        const groupKcal = item.items.reduce((s, it) => s + (it.kcal || 0), 0);
                                        const groupProtein = item.items.reduce((s, it) => s + (it.protein || 0), 0);
                                        return (
                                          <SwipeToDelete 
                                            key={item.id} 
                                            onDelete={() => deleteMealItem(cat, idx)}
                                            onEdit={() => openAdjustItemModal(cat, idx)}
                                          >
                                            <div className="py-3 first:pt-0 last:pb-0 space-y-2">
                                              <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => {
                                                const key = `${cat}-${idx}`;
                                                setCollapsedGroupItems(prev => ({ ...prev, [key]: !prev[key] }));
                                              }}>
                                                <div>
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    {collapsedGroupItems[`${cat}-${idx}`] ? (
                                                      <ChevronRight className="w-4 h-4 text-zinc-500"/>
                                                    ) : (
                                                      <ChevronDown className="w-4 h-4 text-zinc-500"/>
                                                    )}
                                                    <span className="text-xs font-bold text-zinc-300 block"> {item.name}</span>
                                                    {item.time && (
                                                      <span className="inline-flex items-center px-1 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[8px] font-mono select-none border border-zinc-700/30">
                                                         {item.time}
                                                      </span>
                                                    )}
                                                    {item.price !== undefined && (
                                                      <span className="inline-flex items-center px-1 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-mono select-none border border-emerald-500/20">
                                                        ${item.price}
                                                      </span>
                                                    )}
                                                    {item.image && (
                                                      <img 
                                                        src={item.image} 
                                                        alt="Meal" 
                                                        className="w-5 h-5 object-cover rounded cursor-pointer border border-zinc-700 hover:border-indigo-400"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(item.image!); }}
                                                      />
                                                    )}
                                                    <label className="cursor-pointer text-zinc-500 hover:text-indigo-400 p-0.5" onClick={e => e.stopPropagation()}>
                                                      <Camera className="w-3.5 h-3.5" />
                                                      <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleItemImageUpload(cat, idx, null, e)}
                                                      />
                                                    </label>
                                                  </div>
                                                  <div className="flex items-center gap-2 ml-5">
                                                    <span className="text-[10px] text-zinc-400 font-bold">
                                                      餐點共 {item.items.length} 項目 · {groupKcal} kcal
                                                    </span>
                                                    {item.price !== undefined && item.price !== 0 && (
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        ${item.price}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              {/* Subitems lists */}
                                              {!collapsedGroupItems[`${cat}-${idx}`] && (
                                                <div className="pl-3 border-l-2 border-zinc-800 space-y-1.5 pt-1 animate-in fade-in duration-200">
                                                  {item.items.map((sub, sIdx) => (
                                                    <SwipeToDelete 
                                                      key={sub.id} 
                                                      onDelete={() => deleteMealSubItem(cat, idx, sIdx)}
                                                      onEdit={() => openAdjustSubItemModal(cat, idx, sIdx)}
                                                      bgClass="bg-zinc-900"
                                                      roundedClass="rounded-md"
                                                    >
                                                      <div className="flex justify-between items-center py-1.5 px-2 text-[11px] text-zinc-400 hover:text-zinc-300">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                          <span>{sub.name} ({sub.amount ? `${sub.amount}g` : '份'})</span>
                                                          {sub.price !== undefined && (
                                                            <span className="inline-flex items-center px-1 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-mono select-none border border-emerald-500/20">
                                                              ${sub.price}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                          <span className="font-mono text-[10px]">{sub.kcal} kcal · 蛋 {sub.protein}g</span>
                                                        </div>
                                                      </div>
                                                    </SwipeToDelete>
                                                  ))}
                                                  <button 
                                                    onClick={() => {
                                                      setAddModalCategory(cat);
                                                      setAddModalTargetGroupIndex(idx);
                                                      setShowAddModal(true);
                                                    }}
                                                    className="text-[10px] text-indigo-400 font-bold mt-1.5 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                                  >
                                                    <Plus className="w-3 h-3" /> 新增子項目
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </SwipeToDelete>
                                        );
                                      }

                                      // Render Standard single MealItem
                                      const singleItem = item as MealItem;
                                      return (
                                        <SwipeToDelete 
                                          key={singleItem.id} 
                                          onDelete={() => deleteMealItem(cat, idx)}
                                          onEdit={() => openAdjustItemModal(cat, idx)}
                                        >
                                          <div className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs">
                                            <div className="min-w-0 flex-1 pr-3">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-extrabold text-zinc-200 block truncate">{singleItem.name}</span>
                                                {singleItem.time && (
                                                  <span className="inline-flex items-center px-1 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[8px] font-mono select-none border border-zinc-700/30 animate-fade-in">
                                                     {singleItem.time}
                                                  </span>
                                                )}
                                                {singleItem.price !== undefined && (
                                                  <span className="inline-flex items-center px-1 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-mono select-none border border-emerald-500/20 animate-fade-in">
                                                    ${singleItem.price}
                                                  </span>
                                                )}
                                                {singleItem.image && (
                                                  <img 
                                                    src={singleItem.image} 
                                                    alt="Meal" 
                                                    className="w-5 h-5 object-cover rounded cursor-pointer border border-zinc-700 hover:border-indigo-400"
                                                    onClick={() => setSelectedImage(singleItem.image!)}
                                                  />
                                                )}
                                                <label className="cursor-pointer text-zinc-500 hover:text-indigo-400 p-0.5 ml-1">
                                                  <Camera className="w-3.5 h-3.5" />
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => handleItemImageUpload(cat, idx, null, e)}
                                                  />
                                                </label>
                                              </div>
                                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                                {singleItem.amount ? `${singleItem.amount}克 · ` : ""}{singleItem.count && singleItem.count !== 1 ? `${singleItem.count}份 · ` : ""}{singleItem.kcal} kcal · 蛋 {singleItem.protein}g · 碳 {singleItem.carb}g · 脂 {singleItem.fat}g
                                              </span>
                                            </div>
                                          </div>
                                        </SwipeToDelete>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                           </div>
                          );
                        });
                      })()}
                      </div>

                      {/* Hydration Tracker */}
                      <div className="relative group">
                        <MouseGlow />
                        <div className="relative overflow-hidden bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-2xl backdrop-blur-xl p-5 space-y-4">
                          {/* Rising bubbles animation layer */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                          {waterBubbles.map((bubble) => (
                            <div
                              key={bubble.id}
                              className="absolute bottom-0 bg-sky-400/30 rounded-full animate-bubble"
                              style={{
                                left: `${bubble.left}%`,
                                width: `${bubble.size}px`,
                                height: `${bubble.size}px`,
                                animationDelay: `${bubble.delay}s`,
                                animationDuration: `${bubble.duration}s`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Circular ripple animation layer */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                          {waterRipple && (
                            <motion.div 
                              className="w-24 h-24 rounded-full border border-sky-400/80 bg-sky-500/20"
                              initial={{ scale: 0.5, opacity: 1 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          )}
                          {waterTotalLogged >= (settings.waterTarget || 2000) && (
                            <motion.div 
                              className="w-full h-full absolute rounded-full border-2 border-sky-400/20"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: [0.8, 1.1, 1.2], opacity: [0, 0.5, 0] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            />
                          )}
                        </div>

                        <div className="relative z-10 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Droplet className="w-4 h-4 text-sky-400"/>
                            <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">每日飲水記錄</h3>
                          </div>
                          <span className="text-base font-black text-sky-400">{waterTotalLogged} / {settings.waterTarget} ml</span>
                        </div>

                        {/* Hydration progress bar */}
                        <div className="relative z-10 w-full bg-black/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-sky-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((waterTotalLogged / (settings.waterTarget || 2000)) * 100, 100)}%` }}
                          />
                        </div>

                        {/* Quick Add buttons */}
                        <div className="relative z-10 grid grid-cols-4 gap-2">
                          {Array.from(new Set([150, 250, 350, settings.customWaterCup || 500])).sort((a, b) => a - b).map((ml) => {
                            const isCustom = ml === settings.customWaterCup;
                            return (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                key={ml}
                                onClick={() => quickWaterAdd(ml)}
                                className={`relative bg-black/50 border text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer overflow-hidden ${
                                  isCustom 
                                    ? "border-sky-500/50 bg-sky-950/20 text-sky-300 hover:bg-sky-500/20"
                                    : "border-zinc-800 hover:border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                                }`}
                              >
                                {isCustom && (
                                  <span className="absolute -top-1 -right-1 text-[8px] bg-sky-500 text-zinc-950 font-black px-1 rounded-full scale-75">
                                    
                                  </span>
                                )}
                                +{ml} ml
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Custom milliliter intake */}
                        <div className="relative z-10 flex gap-2">
                          <input 
                            type="number"
                            className="bg-black/50 border border-zinc-850 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none flex-1 font-semibold"
                            placeholder="自訂飲水毫升數"
                            value={customWaterInput}
                            onChange={(e) => setCustomWaterInput(e.target.value === ""? "": Number(e.target.value))}
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
                          <div className="relative z-10 space-y-1.5 pt-2 border-t border-zinc-850 max-h-[110px] overflow-y-auto pr-1">
                            {dayRecord.waterLog.map((log, index) => (
                              <SwipeToDelete key={index} onDelete={() => deleteWaterLog(index)} bgClass="bg-zinc-900" roundedClass="rounded-lg">
                                <div className="flex justify-between items-center text-xs text-zinc-400 py-1.5 border-b border-zinc-850/60 last:border-0 hover:bg-zinc-800/10 rounded px-1 transition-all">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"/>
                                    <span className="font-extrabold text-sky-400">{log.ml} ml</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 font-bold bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
                                       {log.time}
                                    </span>
                                    <button 
                                      onClick={() => deleteWaterLog(index)}
                                      className="text-zinc-600 hover:text-rose-400 p-0.5 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </SwipeToDelete>
                            ))}
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                  {/* Daily weight, fat percentage, and exercise tracking */}
                  <div className="relative group">
                    <MouseGlow />
                    <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-zinc-400"/>
                      <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">今日身體指標與消耗</h3>
                    </div>

                    {/* Interactive fields */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-zinc-400 font-bold">體重 (公斤):</span>
                        <input 
                          key={`weight-${currentDate}-${dayRecord.weight || ""}`}
                          type="number"
                          className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                          placeholder="例: 70.2"
                          defaultValue={dayRecord.weight || ""}
                          onBlur={(e) => {
                            const val = e.target.value === ""? null : Number(e.target.value);
                            saveDailyIndicators(val, dayRecord.bodyfat, dayRecord.exercise, dayRecord.steps);
                          }}
                          step="0.1"
                        />
                        <span className="text-zinc-600 w-8 text-right font-bold">kg</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-zinc-400 font-bold">體脂率 (%):</span>
                        <input 
                          key={`bodyfat-${currentDate}-${dayRecord.bodyfat || ""}`}
                          type="number"
                          className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                          placeholder="例: 18.5"
                          defaultValue={dayRecord.bodyfat || ""}
                          onBlur={(e) => {
                            const val = e.target.value === ""? null : Number(e.target.value);
                            saveDailyIndicators(dayRecord.weight, val, dayRecord.exercise, dayRecord.steps);
                          }}
                          step="0.1"
                        />
                        <span className="text-zinc-600 w-8 text-right font-bold">%</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-zinc-400 font-bold">運動消耗:</span>
                        <input 
                          key={`exercise-${currentDate}-${dayRecord.exercise || ""}`}
                          type="number"
                          className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                          placeholder="重訓或跑步卡路里"
                          defaultValue={dayRecord.exercise || ""}
                          onBlur={(e) => {
                            const val = Number(e.target.value) || 0;
                            saveDailyIndicators(dayRecord.weight, dayRecord.bodyfat, val, dayRecord.steps);
                          }}
                        />
                        <span className="text-zinc-600 w-8 text-right font-bold">kcal</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-zinc-400 font-bold">今日步數:</span>
                        <input 
                          key={`steps-${currentDate}-${dayRecord.steps || ""}`}
                          type="number"
                          className="bg-black/50 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-semibold"
                          placeholder="例如: 8000"
                          defaultValue={dayRecord.steps || ""}
                          onBlur={(e) => {
                            const val = Number(e.target.value) || 0;
                            saveDailyIndicators(dayRecord.weight, dayRecord.bodyfat, dayRecord.exercise, val);
                          }}
                        />
                        <span className="text-zinc-600 w-8 text-right font-bold">步</span>
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

                </div>
              )}

              {/* ────────────────── 2. HISTORY TAB ────────────────── */}
              {activeTab === "history"&& (
                <div className="space-y-6">
                  
                  {/* Calendar Widget */}
                  <HistoryCalendar 
                    currentDate={currentDate} 
                    daysData={db.days} 
                    targets={targets}
                    requireFastingForPerfectDay={db.settings.requireFastingForPerfectDay}
                    activeFastingHours={db.fasting?.isFasting ? ((Date.now() - (db.fasting.startTime || Date.now())) / 3600000) : 0}
                    onSelectDate={(dateStr) => {
                      setCurrentDate(dateStr);
                    }} 
                  />

                  {/* Weekly Report & Dynamic Goals */}
                  <WeeklyReport db={db} currentDate={currentDate} showToast={showToast}>
                    {/* Visual charts wrapper */}
                    <Charts days={db.days} targets={targets} goalWeight={settings.goalWeight || 52} />
                  </WeeklyReport>

                  {/* Progress Photos Timeline */}
                  <div className="relative group">
                    <MouseGlow />
                    <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-purple-400"/>
                          <h4 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">體態紀錄照片</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setShowBeforeAfterModal(true)}
                            className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3 h-3"/> 體態對比
                          </button>
                          <label className="bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 font-bold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5">
                            <Plus className="w-3 h-3"/> 上傳今日自拍
                            <input type="file"accept="image/*"className="hidden"onChange={handlePhotoUpload} />
                          </label>
                        </div>
                      </div>
                      
                      {(() => {
                        const allPhotos = Object.entries(db.days)
                          .flatMap(([dStr, rec]) => ((rec as DayRecord).photos || []).map(p => ({ dateStr: dStr, ...p })))
                          .sort((a, b) => a.timestamp - b.timestamp);
                          
                        if (allPhotos.length === 0) {
                          return (
                            <div className="text-center py-6 border border-dashed border-zinc-700/50 rounded-xl bg-black/20">
                              <p className="text-xs text-zinc-500">目前還沒有上傳照片，立刻來一張對鏡自拍吧！</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div ref={photoGalleryRef} className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-smooth">
                            {allPhotos.map((photo, i) => (
                              <div key={photo.id} data-date={photo.dateStr} className={`relative group/photo shrink-0 w-32 sm:w-40 snap-center ${photo.dateStr === currentDate ? "ring-2 ring-indigo-500 rounded-xl" : ""}`}>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end p-2 rounded-xl pointer-events-none">
                                  <button onClick={() => handleDeletePhoto(photo.id, photo.dateStr)} className="text-rose-400 hover:text-rose-300 text-[10px] font-bold self-end pointer-events-auto bg-black/50 px-2 py-1 rounded">刪除</button>
                                </div>
                                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center relative shadow-md">
                                  <img src={photo.url} className="w-full h-full object-cover"alt="Progress"/>
                                </div>
                                <div className="text-center mt-2">
                                  <span className="text-[10px] font-mono text-zinc-400 block">{photo.dateStr}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Weight Predictor ETA summary */}
                  {settings.goalWeight > 0 && settings.weight > 0 && (
                    <div className="relative group">
                      <MouseGlow />
                      <div className="relative bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
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
                              return "賀！體重目標已達成，請保持良好習慣與生活型態！";
                            }
                            if (actualSpeed !== null) {
                              const headingCorrectDir = (settings.goalWeight < latestWeight && actualSpeed < 0) || (settings.goalWeight > latestWeight && actualSpeed > 0);
                              if (!headingCorrectDir || Math.abs(actualSpeed) < 0.01) {
                                return "觀測到近期體重並未朝著目標方向前進，可以調整每日總熱量 TDEE 設定。";
                              } else {
                                const weeksNeeded = diff / Math.abs(actualSpeed);
                                return ` 依據您過去 14 天的實際速度 (每週 ${Math.abs(actualSpeed).toFixed(2)}kg)，預估約 ${Math.round(weeksNeeded)} 週可順利達標！`;
                              }
                            } else {
                              const planSpeed = settings.weeklyGoal || 0.5;
                              const weeksNeeded = diff / planSpeed;
                              return ` 依據您設定的每週規劃速度 (${planSpeed}kg)，預估約 ${Math.round(weeksNeeded)} 週可達標。`;
                            }
                          })()}
                        </div>
                      </div>

                      {/* Weight Progress Bar with zero-division safeguard */}
                      {(() => {
                        const startW = settings.weight || 0;
                        const goalW = settings.goalWeight || 0;
                        let progPct = 0;
                        if (startW === goalW) {
                          progPct = latestWeight === goalW ? 100 : 0;
                        } else if (startW > goalW) {
                          // Losing weight
                          if (latestWeight <= goalW) {
                            progPct = 100;
                          } else if (latestWeight >= startW) {
                            progPct = 0;
                          } else {
                            progPct = ((startW - latestWeight) / (startW - goalW)) * 100;
                          }
                        } else {
                          // Gaining weight
                          if (latestWeight >= goalW) {
                            progPct = 100;
                          } else if (latestWeight <= startW) {
                            progPct = 0;
                          } else {
                            progPct = ((latestWeight - startW) / (goalW - startW)) * 100;
                          }
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
                    </div>
                  )}

                  {/*Achievement Badges */}
                  <div className="mt-8 pt-6 border-t border-zinc-850/60 pb-8">
                    <div className="flex items-center gap-2 mb-6 px-1">
                      <Crown className="w-4 h-4 text-zinc-500"/>
                      <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">里程碑與成就</h3>
                    </div>
                    <div className="flex justify-between items-start w-full">
                      {getBadges().map((badge) => (
                        <div key={badge.id} className="relative group flex flex-col items-center gap-2 flex-1 min-w-0"title={badge.desc}>
                          {badge.unlocked && (
                            <div className={`absolute top-0 w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-full opacity-[0.15] blur-xl ${badge.glowBg} group-hover:opacity-40 transition-opacity duration-500`} />
                          )}
                          <div 
                            className={`relative w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-full border flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 active:scale-95 ${badge.unlocked ? `bg-white/[0.04] border-white/[0.08] shadow-2xl backdrop-blur-xl ${badge.color}` : 'bg-white/[0.04] border-white/5 text-zinc-700 grayscale opacity-60'}`}
                          >
                             {badge.unlocked && (
                               <div className={`absolute inset-0 rounded-full opacity-10 ${badge.bg}`} />
                             )}
                             <div className="scale-[0.85] sm:scale-100 relative z-10">
                               {badge.icon}
                             </div>
                          </div>
                          <div className="text-center w-full px-1">
                            <div className={`text-[10px] sm:text-[11px] font-bold truncate leading-tight ${badge.unlocked ? 'text-zinc-200' : 'text-zinc-500'}`}>{badge.name}</div>
                            <div className="text-[8px] sm:text-[9px] font-medium text-zinc-500 truncate mt-0.5">{badge.progress}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────── 3. FOODS LIBRARY TAB ────────────────── */}
              {activeTab === "foods"&& (
                <div className="space-y-6">
                  
                  {/* Upgrade Alert banner */}
                  <div className="bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20">
                        <Sparkles className="w-5 h-5 animate-pulse"/>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-zinc-100">智慧升級版：個人食物庫</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          支援智慧關鍵字分類、多維度排序、批量勾選加入，並提供健康高頻基礎食物範本！
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 🏪 Taiwan Convenience Store Smart Meal Planner/Recommender Section */}
                  <StoreMealPlanner db={db} updateDb={setDb} showToast={showToast} currentDate={currentDate} />

                  {/* Header Search & Direct adding manual trigger */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    <div className="lg:col-span-7 relative">
                      <input 
                        type="text"
                        placeholder="搜尋我的食物庫中的食物..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-500 font-medium"
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="lg:col-span-5 flex gap-2">
                      {/* Sort selection */}
                      <select
                        value={librarySortBy}
                        onChange={(e) => setLibrarySortBy(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-3 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer flex-1"
                      >
                        <option value="recent">最近新增</option>
                        <option value="kcalDesc">熱量：高  低</option>
                        <option value="kcalAsc">熱量：低  高</option>
                        <option value="proteinDesc">蛋白質：高  低</option>
                        <option value="fiberDesc">膳食纖維：高  低</option>
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
                      const count = db.foods.filter(f => cat === "全部"|| detectCategory(f) === cat).length;
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
                        if (filteredFoods.length === 0) {
                          return (
                            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.04] border border-zinc-800/85 rounded-2xl p-10 text-center text-zinc-400 text-xs">
                              找不到符合篩選條件的食物。
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredFoods.map((f, i) => {
                              const isSelected = selectedLibItems.includes(db.foods.indexOf(f));
                              const isGrp = isMealGroup(f);
                              const itemCat = f.category || "其他";
                              const catColors: Record<string, string> = {
                                "澱粉": "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                "蛋白質": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                                "蔬菜": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                "點心": "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                "飲料": "bg-sky-500/10 text-sky-400 border-sky-500/20",
                                "水果": "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                "其他": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                              };

                              return (
                                      <SwipeToDelete 
                                        key={f.id || db.foods.indexOf(f)} 
                                        onDelete={() => deleteFoodLibraryItem(db.foods.indexOf(f))}
                                        onEdit={() => openEditFoodLibraryItem(db.foods.indexOf(f))}
                                        bgClass="bg-[#121214]"
                                        roundedClass="rounded-2xl"
                                      >
                                        <div 
                                          className={`bg-white/[0.04] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 ${
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
                                            setSelectedLibItems(selectedLibItems.filter(id => id !== db.foods.indexOf(f)));
                                          } else {
                                            setSelectedLibItems([...selectedLibItems, db.foods.indexOf(f)]);
                                          }
                                        }}
                                        className="mt-1 rounded bg-black/50 border-zinc-800 text-indigo-500 focus:ring-0 w-4.5 h-4.5 accent-indigo-500 cursor-pointer"
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 className="font-extrabold text-xs sm:text-sm text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">{isGrp ? "": ""}{f.name}</h4>
                                          <span className={`text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${catColors[itemCat] || "bg-zinc-800 text-zinc-400 border-zinc-750"}`}>
                                            {itemCat}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                                          {"amount"in f && f.amount ? `${f.amount}g/ml · ` : ""}熱量 {getRecordMacros(f).kcal} kcal
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nutrition Grid */}
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-y border-zinc-850/60 py-2.5 bg-black/50/20 rounded-xl px-1">
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">蛋白質</span>
                                      <span className="font-extrabold text-zinc-300">{getRecordMacros(f).protein || 0}g</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">碳水</span>
                                      <span className="font-extrabold text-zinc-300">{getRecordMacros(f).carb || 0}g</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 text-[9px] block font-bold">脂肪</span>
                                      <span className="font-extrabold text-zinc-300">{getRecordMacros(f).fat || 0}g</span>
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
                                                                    </SwipeToDelete>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}

                  {/*  HEALTHY FOODS PRESETS CORNER */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Salad className="w-4 h-4 text-emerald-400 animate-pulse"/>
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
                      <div className={`p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750 transition-all ${showPresets ? "bg-black/50": "bg-transparent"}`}>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showPresets ? "rotate-180": ""}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {showPresets && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto"}}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 border-t border-zinc-850/60 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {FOOD_PRESETS.map((preset) => {
                              const inLib = db.foods.some(f => !("type"in f && f.type === "group") && f.name === preset.name);
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
                                        ? "bg-white/[0.04] backdrop-blur-md border border-white/[0.04] border-zinc-900 text-zinc-700 cursor-not-allowed"
                                        : "bg-emerald-600/10 hover:bg-emerald-650 border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white"
                                    }`}
                                  >
                                    {inLib ? "已在食物庫中": "＋ 儲存至食物庫"}
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
              {activeTab === "settings"&& (
                <div className="space-y-6 max-w-xl mx-auto">
                  
                  {/* TDEE Mode selector */}
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">當前計畫目標模式</h3>
                      <p className="text-[10px] text-zinc-500 font-bold mt-1">變更目標與參數不會影響您過去的歷史紀錄，請放心調整。</p>
                    </div>
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
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
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
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
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
                            disabled={settings.autoWaterTarget ?? true}
                            className={`bg-black/50 border border-zinc-850 rounded-lg px-3 py-1.5 text-right font-bold w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200 ${
                              (settings.autoWaterTarget ?? true) ? "opacity-60 cursor-not-allowed select-none": ""
                            }`}
                            value={settings.waterTarget || ""}
                            onChange={(e) => handleUpdateSettings({ waterTarget: Number(e.target.value) || 0 })}
                            placeholder="自動計算中"
                          />
                          <span className="text-zinc-600 font-bold w-6">毫升</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center -mt-2.5">
                        <span className="text-[10px] text-zinc-500 font-bold ml-1"></span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-zinc-450 hover:text-zinc-350 font-bold">
                          <input 
                            type="checkbox"
                            className="rounded bg-black/50 border border-zinc-850 text-indigo-500 focus:ring-0 w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                            checked={settings.autoWaterTarget ?? true}
                            onChange={(e) => handleUpdateSettings({ autoWaterTarget: e.target.checked })}
                          />
                          <span> 自動隨體重同步調整 (體重 × 30ml)</span>
                        </label>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold text-sky-400">自訂常用杯容量 (快速補水)：</span>
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

                      <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-4">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold">啟用斷食追蹤：</span>
                          <span className="text-[10px] text-zinc-500">在首頁顯示計時器，輔助168等間歇性斷食法</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.enableFasting || false}
                            onChange={(e) => handleUpdateSettings({ enableFasting: e.target.checked })}
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-4">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold">嚴格完美達標模式：</span>
                          <span className="text-[10px] text-zinc-500">勾選後，日曆上的「連續完美達標」將要求當日也必須達成斷食目標</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={settings.requireFastingForPerfectDay || false}
                            onChange={(e) => handleUpdateSettings({ requireFastingForPerfectDay: e.target.checked })}
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={recalculateAITargets}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition-colors cursor-pointer text-center"
                    >
                       根據上述資料，自動重新計算科學營養素目標
                    </button>
                  </div>

                  {/* Manual Target Override Sliders */}
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">手動覆蓋或微調各項指標目標值</h3>
                    
                    <div className="space-y-3.5">
                      {[
                        { key: "kcal", label: "熱量 (大卡)", unit: "kcal"},
                        { key: "protein", label: "蛋白質 (克)", unit: "g"},
                        { key: "carb", label: "碳水化合物 (克)", unit: "g"},
                        { key: "fat", label: "脂肪 (克)", unit: "g"},
                        { key: "fiber", label: "膳食纖維 (克)", unit: "g"},
                        { key: "sugar", label: "精緻糖 (克)", unit: "g"},
                        { key: "sodium", label: "鈉離子 (毫克)", unit: "mg"},
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
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-4">
                    <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">備份、還原與同步管理</h3>
                    
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={triggerDataExport}
                        className="w-full bg-black/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4"/>
                        手動下載匯出備份 JSON 檔
                      </button>
                      
                      <button
                        onClick={() => document.getElementById("import-file-input")?.click()}
                        className="w-full bg-black/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4"/>
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
                        <Link2 className="w-4 h-4"/>
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
                              showToast("同步網址連結已順利複製到您的剪貼簿中！", "success");
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Integrations & API Configuration Section */}
                  <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl p-5 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-400"/>
                      <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase">外部整合與 API 金鑰 (Integrations & API)</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Gemini Section */}
                      <div className="space-y-2 border-b border-white/[0.05] pb-4">
                        <p className="text-[11px] text-zinc-400 font-bold">
                          1. Gemini AI 智慧剖析
                        </p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          設定個人金鑰後將解鎖「AI 專屬教練」與「內建 AI 影像與文字餐點辨識」功能。金鑰僅安全儲存於您目前的瀏覽器中。
                        </p>
                        <div className="flex gap-1.5 pt-1">
                          <input 
                            type="password"
                            className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs flex-1"
                            placeholder="自訂 Gemini API Key (選填)"
                            value={settings.geminiApiKey || ""}
                            onChange={(e) => handleUpdateSettings({ geminiApiKey: e.target.value })}
                          />
                          <button
                            onClick={() => showToast("API 金鑰已安全儲存於您的裝置！", "success")}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                          >
                            確認
                          </button>
                        </div>
                      </div>

                      {/* Apple Health Section */}
                      <div className="space-y-3 border-t border-white/[0.05] pt-4 mt-2">
                        <p className="text-[11px] text-zinc-500 leading-relaxed font-bold flex justify-between items-center">
                          <span>2. Apple Health 同步</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-black tracking-wider">iOS 捷徑 API</span>
                        </p>
                        
                        <div className="bg-black/30 border border-zinc-800 rounded-lg p-3 space-y-3">
                          <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                            請在 Safari 網頁中使用本軟體 (避免加入主畫面導致空間隔離)。透過 iOS 捷徑「開啟 URL」發送數據：
                          </p>
                          
                          <div className="relative bg-zinc-950 p-2.5 rounded border border-zinc-850 flex items-center justify-between gap-2 overflow-hidden">
                            <div className="overflow-x-auto scrollbar-none flex-1 pr-1">
                              <code className="text-[10px] text-indigo-300 font-mono whitespace-nowrap">
                                {window.location.origin}/?action=syncHealth&amp;weight=[體重]&amp;exercise=[運動大卡]&amp;steps=[步數]&amp;mode=overwrite
                              </code>
                            </div>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/?action=syncHealth&weight=[體重]&exercise=[運動大卡]&steps=[步數]&mode=overwrite`;
                                navigator.clipboard.writeText(url);
                                setCopiedHealthUrl(true);
                                showToast("健康同步 API 網址已複製！", "success");
                                setTimeout(() => setCopiedHealthUrl(false), 2000);
                              }}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0 ${
                                copiedHealthUrl 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                  : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
                              }`}
                            >
                              {copiedHealthUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="text-[10px] font-bold hidden sm:inline">{copiedHealthUrl ? "已複製" : "複製網址"}</span>
                            </button>
                          </div>
                          
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            參數：<code className="text-zinc-400">weight</code> (體重), <code className="text-zinc-400">exercise</code> (運動大卡), <code className="text-zinc-400">steps</code> (步數), <code className="text-zinc-400">mode=overwrite</code> (覆寫，若為 <code className="text-zinc-400">add</code> 則為累加)
                          </p>

                          {/* Collapsible Tutorial Accordion */}
                          <div className="border-t border-zinc-850/60 pt-2.5 mt-2">
                            <button
                              onClick={() => setShowHealthTutorial(!showHealthTutorial)}
                              className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1 cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>如何設定 iOS 「健康」自動同步捷徑？</span>
                              </span>
                              {showHealthTutorial ? <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-200" /> : <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />}
                            </button>

                            {showHealthTutorial && (
                              <div className="mt-2.5 space-y-3 pl-1 text-[11px] text-zinc-400 leading-relaxed border-l-2 border-indigo-500/20 pl-3 py-1 animate-in slide-in-from-top-1 duration-150">
                                <div>
                                  <span className="font-extrabold text-indigo-400 block mb-0.5">步驟 1：建立全新捷徑</span>
                                  在 iPhone 中開啟<strong className="text-zinc-100 font-extrabold">「捷徑」App</strong>，點選右上角<strong className="text-zinc-100 font-extrabold">「＋」</strong>建立一個新的捷徑，將其命名為例如<strong className="text-zinc-100 font-extrabold">「同步健康數據」</strong>。
                                </div>
                                <div>
                                  <span className="font-extrabold text-indigo-400 block mb-0.5">步驟 2：獲取 Apple 內建健康資料</span>
                                  搜尋並加入<strong className="text-zinc-100 font-extrabold">「尋找健康樣本」</strong>或<strong className="text-zinc-100 font-extrabold">「獲取健康樣本」</strong>動作（如：類型選<strong className="text-zinc-100 font-extrabold">「體重」、「活動能量」或「步數」</strong>），將值存入變數。
                                </div>
                                <div>
                                  <span className="font-extrabold text-indigo-400 block mb-0.5">步驟 3：設定傳輸網址</span>
                                  加入<strong className="text-zinc-100 font-extrabold">「URL」動作</strong>，<strong className="text-zinc-100 font-extrabold">貼上剛剛複製的 API 網址</strong>。將網址內預設的預留標籤（如 <code className="text-zinc-300 font-mono">[體重]</code>、<code className="text-zinc-300 font-mono">[運動大卡]</code>、<code className="text-zinc-300 font-mono">[步數]</code>）<strong className="text-indigo-300 font-extrabold">刪除並替換</strong>為剛才步驟 2 獲取到的健康資料<strong className="text-indigo-400 font-extrabold">「變數」</strong>。
                                </div>
                                <div>
                                  <span className="font-extrabold text-indigo-400 block mb-0.5">步驟 4：執行開啟同步</span>
                                  加入<strong className="text-zinc-100 font-extrabold">「開啟 URL」動作</strong>，將對象設為前一步的 URL 動作結果。
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[10px] text-amber-400 mt-1">
                                  <span className="font-bold block mb-0.5">關鍵提醒：</span>
                                  本系統為離線優先設計，數據保存在 <strong className="text-amber-300 font-extrabold">Safari 瀏覽器</strong>中。捷徑在背景執行時，最後一步「開啟 URL」會<strong className="text-amber-300 font-extrabold">自動啟動 Safari 瀏覽器</strong>，開啟網頁的瞬間即會將健康數據寫入您的本機紀錄中。
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-2xl z-40 flex items-center justify-between p-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex-[0.8] flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "today"? "text-indigo-400": "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Flame className={`w-[22px] h-[22px] ${activeTab === "today" ? "fill-indigo-500/20" : ""}`}/>
          <span className="text-[10px] font-bold tracking-wide">今日</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-[0.8] flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "history"? "text-indigo-400": "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Calendar className={`w-[22px] h-[22px] ${activeTab === "history" ? "fill-indigo-500/20" : ""}`}/>
          <span className="text-[10px] font-bold tracking-wide">歷史</span>
        </button>

        {/* Central Add Button */}
        <div className="flex-[1] flex justify-center items-center relative -top-5">
          <button
            onClick={() => {
              setAddModalCategory(getCurrentMealCategory());
              setAddModalTab(db.settings.geminiApiKey ? "ai" : "quick");
              setShowAddModal(true);
            }}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border-4 border-zinc-950 hover:scale-105 transition-transform active:scale-95"
          >
            {db.settings.geminiApiKey ? <Sparkles className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </button>
        </div>

        <button
          onClick={() => setActiveTab("foods")}
          className={`flex-[0.8] flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "foods"? "text-indigo-400": "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Salad className={`w-[22px] h-[22px] ${activeTab === "foods" ? "fill-indigo-500/20" : ""}`}/>
          <span className="text-[10px] font-bold tracking-wide">食物</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-[0.8] flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl transition-all ${
            activeTab === "settings"? "text-indigo-400": "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <SettingsIcon className={`w-[22px] h-[22px] ${activeTab === "settings" ? "fill-indigo-500/20" : ""}`}/>
          <span className="text-[10px] font-bold tracking-wide">設定</span>
        </button>
      </nav>

      {/* ────────────────── MODAL: SHARE CARD ────────────────── */}
      {showShareModal && (
        <ShareCardModal
          dayRecord={getDayRecord(currentDate)}
          settings={db.settings}
          dateStr={currentDate}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* ────────────────── MODAL: BEFORE & AFTER ────────────────── */}
      {showBeforeAfterModal && (() => {
        const allPhotos = Object.entries(db.days)
          .flatMap(([dStr, rec]) => ((rec as DayRecord).photos || []).map(p => ({ dateStr: dStr, ...p })))
          .sort((a, b) => a.timestamp - b.timestamp);
        
        const oldestPhoto = allPhotos[0];
        const newestPhoto = allPhotos[allPhotos.length - 1];

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowBeforeAfterModal(false)}>
            <div className="w-full max-w-[800px] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center w-full">
                <h3 className="text-lg font-black text-white">體態對比 (Before & After)</h3>
                <button onClick={() => setShowBeforeAfterModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              {!oldestPhoto ? (
                <div className="bg-white/5 border border-white/10 p-10 rounded-2xl text-center w-full">
                  <p className="text-zinc-400">目前還沒有紀錄照片，快去上傳吧！</p>
                </div>
              ) : oldestPhoto.id === newestPhoto.id ? (
                <div className="bg-white/5 border border-white/10 p-10 rounded-2xl text-center w-full">
                  <p className="text-zinc-400">目前只有一張照片，上傳第二張照片即可顯示對比！</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-4 w-full">
                  {/* Before */}
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative group">
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full z-10 flex items-center gap-2">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Before</span>
                      <span className="text-[10px] text-zinc-300 font-mono">{oldestPhoto.dateStr}</span>
                    </div>
                    <img src={oldestPhoto.url} className="w-full h-auto max-h-[60vh] object-contain bg-black/50" alt="Before" />
                  </div>
                  
                  {/* After */}
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative group">
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full z-10 flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">After</span>
                      <span className="text-[10px] text-zinc-300 font-mono">{newestPhoto.dateStr}</span>
                    </div>
                    <img src={newestPhoto.url} className="w-full h-auto max-h-[60vh] object-contain bg-black/50" alt="After" />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Lockscreen Fasting Stage Floating Widget */}
      <FastingFloatingWidget db={db} updateDb={setDb} showToast={showToast} />

      {/* ────────────────── MODAL: ADD FOOD ────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end items-center md:justify-center">
          <div className="bg-zinc-950 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-850/60 bg-zinc-900/20">
              <h3 className="text-[15px] font-black text-zinc-100 tracking-wide">
                {addModalTargetGroupIndex !== undefined ? `新增項目至 ${addModalCategory}` : `新增食物至 ${addModalCategory}`}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalTargetGroupIndex(undefined);
                }}
                className="text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full transition-colors"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-850/60 px-4 py-3 gap-2 bg-zinc-900/30">
              <button
                onClick={() => setAddModalTab("quick")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "quick"? "bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/50": "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30"
                }`}
              >
                選取食物庫
              </button>
              <button
                onClick={() => setAddModalTab("manual")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "manual"? "bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/50": "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30"
                }`}
              >
                手動填寫
              </button>
              <button
                onClick={() => setAddModalTab("ai")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  addModalTab === "ai"? "bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700/50": "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30"
                }`}
              >
                {db.settings.geminiApiKey ? "AI 影像辨識" : "AI 輔助"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              
              {/* TAB 3: AI FOOD ANALYZER */}
              {addModalTab === "ai"&& (
                <AIFoodAnalyzer 
                  mealCategory={addModalCategory}
                  customApiKey={settings.geminiApiKey}
                  customFoods={db.foods}
                  onAddParsedMeals={(cat, items, gTitle, saveToLib) => {
                    addMealsToDay(cat, items, gTitle, saveToLib);
                    setShowAddModal(false);
                    showToast(` 智慧辨識成果已成功登錄至今日 ${cat} 紀錄！`, "success");
                  }}
                />
              )}

              {/* TAB 1: QUICK ADD FROM FOOD LIBRARY */}
              {addModalTab === "quick"&& (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="搜尋已有食物記錄..."
                    className="w-full bg-black/50 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                  />

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {
                      (() => {
                        const storeFoodsMapped = quickSearchQuery.trim() ? STORE_FOODS_DATABASE.map((f, i) => ({
                          id: -1000 - i,
                          name: `[${f.store}] ${f.name}`,
                          kcal: f.kcal,
                          protein: f.protein,
                          carb: f.carb,
                          fat: f.fat,
                          sodium: f.sodium,
                          price: f.price,
                          fiber: f.category === "蔬菜" ? 2.5 : 0,
                          sugar: f.category === "飲料" ? 2.0 : 0,
                          category: f.category
                        })) : [];
                        const combinedFoods = [...db.foods, ...storeFoodsMapped];
                        const filtered = combinedFoods.filter((f) => f.name.toLowerCase().includes(quickSearchQuery.toLowerCase()));
                        
                        if (filtered.length === 0) {
                          return (
                            <div className="text-center text-zinc-400 text-xs py-10">
                              無相符品項。您可輸入「7-11」或「全家」搜尋超商食物，或使用 AI 辨識。
                            </div>
                          );
                        }
                        
                        return filtered.map((f, idx) => {
                          const itemKcal = getRecordMacros(f).kcal;

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
                                <span className="text-xs font-bold text-zinc-300 block">{"type"in f && f.type === "group"? "": ""}{f.name}</span>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                  蛋白 {getRecordMacros(f).protein}g · 碳水 {getRecordMacros(f).carb}g · 脂肪 {getRecordMacros(f).fat}g
                                </span>
                              </div>
                              <span className="text-xs font-black text-indigo-400 pr-1">{itemKcal} kcal</span>
                            </div>
                          );
                        });
                      })()
                    }
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL DATA FILL FORM */}
              {addModalTab === "manual"&& (
                <form onSubmit={handleManualAddSubmit} className="space-y-5 text-xs">
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">食物名稱*</span>
                    <input 
                      type="text"
                      required
                      placeholder="例如：茶葉蛋 / 滷肉飯"
                      className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 font-semibold placeholder-zinc-600"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">食物分類</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {["澱粉", "蛋白質", "蔬菜", "飲料", "點心", "其他"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMCategory(cat)}
                          className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                            mCategory === cat
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 font-black shadow-sm"
                              : "bg-zinc-900/30 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {addModalTargetGroupIndex === undefined && (
                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">餐點名稱 (選填)</span>
                      <input 
                        type="text"
                        placeholder="例：午餐便當、超商套餐"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 placeholder-zinc-600"
                        value={mGroup}
                        onChange={(e) => setMGroup(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">估計份量 (g)</span>
                      <input 
                        type="number"
                        placeholder="選填克數"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right placeholder-zinc-600"
                        value={mAmount}
                        onChange={(e) => setMAmount(e.target.value === ""? "": Number(e.target.value))}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">金額 (TWD)</span>
                      <input 
                        type="number"
                        placeholder="價格"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right placeholder-zinc-600"
                        value={mPrice}
                        onChange={(e) => setMPrice(e.target.value === ""? "": Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">數量 (份)</span>
                      <input 
                        type="number"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                        value={mCount}
                        onChange={(e) => setMCount(Number(e.target.value) || 1)}
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-850/60 pt-5">
                    <div className="flex flex-col gap-2 relative">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" />熱量* (大卡)</span>
                      <div className="flex w-full gap-1.5 items-center">
                        <input 
                          type="number"
                          required
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 w-full text-zinc-200 text-right font-semibold"
                          value={mKcal}
                          onChange={(e) => setMKcal(e.target.value === ""? "": Number(e.target.value))}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const theoretical = Math.round(
                              (Number(mProtein) || 0) * 4 + 
                              (Number(mCarb) || 0) * 4 + 
                              (Number(mFat) || 0) * 9
                            );
                            if (theoretical > 0) setMKcal(theoretical);
                          }}
                          title="根據三大營養素計算理論熱量 (P*4 + C*4 + F*9)"
                          className="text-[10px] font-black border border-zinc-700 hover:border-zinc-600 bg-zinc-800 text-indigo-400 px-2.5 py-2.5 rounded-xl cursor-pointer hover:bg-zinc-700 whitespace-nowrap shrink-0 transition-colors shadow-sm"
                        >
                           估算
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><Dumbbell className="w-3 h-3 text-emerald-400" />蛋白質* (g)</span>
                      <input 
                        type="number"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                        value={mProtein}
                        onChange={(e) => setMProtein(e.target.value === ""? "": Number(e.target.value))}
                        required
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>

                  {(() => {
                    const theoreticalMKcal = Math.round(
                      (Number(mProtein) || 0) * 4 + 
                      (Number(mCarb) || 0) * 4 + 
                      (Number(mFat) || 0) * 9
                    );
                    const showMKcalDiffAlert = mKcal !== ""&& theoreticalMKcal > 0 && Math.abs(Number(mKcal) - theoreticalMKcal) > Math.max(20, theoreticalMKcal * 0.15);
                    if (!showMKcalDiffAlert) return null;
                    return (
                      <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center animate-in fade-in">
                        <span> 熱量與三大營養素估算理論值 ({theoreticalMKcal} 大卡) 有落差</span>
                        <button
                          type="button"
                          onClick={() => setMKcal(theoreticalMKcal)}
                          className="text-amber-300 hover:text-amber-200 font-extrabold cursor-pointer hover:underline"
                        >
                          一鍵校正
                        </button>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><span className="text-orange-400 text-[10px]">●</span>碳水* (g)</span>
                      <input 
                        type="number"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                        value={mCarb}
                        onChange={(e) => setMCarb(e.target.value === ""? "": Number(e.target.value))}
                        required
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><span className="text-yellow-400 text-[10px]">●</span>脂肪* (g)</span>
                      <input 
                        type="number"
                        className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                        value={mFat}
                        onChange={(e) => setMFat(e.target.value === ""? "": Number(e.target.value))}
                        required
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>

                  {/* Advanced inputs expansion */}
                  <div 
                    onClick={() => setShowAdvancedForm(!showAdvancedForm)}
                    className="text-zinc-400 hover:text-zinc-300 font-bold flex items-center gap-1.5 cursor-pointer select-none py-1.5 mt-2"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedForm ? "rotate-180": ""}`} />
                    進階成分微調 (纖維、精緻糖、鈉離子)
                  </div>

                  {showAdvancedForm && (
                    <div className="space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/60 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">膳食纖維：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={mFiber}
                            onChange={(e) => setMFiber(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">精製糖：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={mSugar}
                            onChange={(e) => setMSugar(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">鈉離子：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={mSodium}
                            onChange={(e) => setMSodium(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">毫克</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 select-none py-2 border-t border-zinc-850/60">
                    <input 
                      type="checkbox"
                      id="mSaveToLibCheck"
                      className="rounded bg-black/50 border-zinc-850 text-indigo-500 focus:ring-0 w-4 h-4 accent-indigo-500 cursor-pointer"
                      checked={mSaveToLib}
                      onChange={(e) => setMSaveToLib(e.target.checked)}
                    />
                    <label htmlFor="mSaveToLibCheck"className="text-zinc-400 font-bold cursor-pointer">
                      同時儲存此品項到食物庫
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] text-white font-bold text-sm py-3.5 rounded-xl cursor-pointer mt-4 transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end items-center md:justify-center">
          <div className="bg-zinc-900 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-[460px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-850">
              <h3 className="text-sm font-black text-zinc-100">
                重估比例 / 份量調整
              </h3>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="text-zinc-400 hover:text-zinc-300 bg-black/50 p-1.5 rounded-lg border border-zinc-850"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">當前調整品項 / 名稱</span>
                <input 
                  type="text"
                  className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-2 text-sm font-extrabold w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-100"
                  value={adjustContext.customName !== undefined ? adjustContext.customName : adjustContext.origItem.name}
                  onChange={(e) => setAdjustContext({ ...adjustContext, customName: e.target.value })}
                  placeholder="項目名稱"
                />
              </div>
              
              <div>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">金額 (TWD)</span>
                <input 
                  type="number"
                  className="bg-black/50 border border-zinc-850 rounded-lg px-3 py-2 text-sm font-extrabold w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-100"
                  value={adjustContext.customPrice !== undefined ? adjustContext.customPrice : ""}
                  onChange={(e) => setAdjustContext({ ...adjustContext, customPrice: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="留空即無金額"
                />
              </div>

              {/* Adjustment Mode Selector */}
              <div className="grid grid-cols-3 gap-2 bg-black/50 p-1 rounded-xl border border-zinc-850">
                {["ratio", "gram", "count"].map((m) => {
                  if (m === "gram"&& !("amount"in adjustContext.origItem && adjustContext.origItem.amount)) return null;
                  if (m === "count"&& !("count"in adjustContext.origItem)) return null;

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
                      {{ ratio: "依比例", gram: "依克數", count: "依份數"}[m]}
                    </button>
                  );
                })}
              </div>

              {/* Adjust value fields based on Mode */}
              {adjustContext.adjustMode === "ratio"&& (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400 font-bold">調整倍率滑桿：</span>
                    <span className="text-indigo-400 font-black text-lg bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">{adjustContext.customRatio}x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    value={adjustContext.customRatio}
                    onChange={(e) => applyAdjustmentRatio(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold px-1">
                    <span>0x</span>
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>1.5x</span>
                    <span>2.0x</span>
                    <span>3.0x</span>
                  </div>
                </div>
              )}

              {adjustContext.adjustMode === "gram"&& (
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

              {adjustContext.adjustMode === "count"&& (
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
                  { key: "kcal", label: "熱量", unit: "大卡", color: "text-zinc-200"},
                  { key: "protein", label: "蛋白質", unit: "克", color: "text-emerald-400"},
                  { key: "carb", label: "碳水化合物", unit: "克", color: "text-orange-400"},
                  { key: "fat", label: "脂肪", unit: "克", color: "text-amber-400"},
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
                            {diff > 0 ? "+": ""}{diff.toFixed(1)}
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
                <Check className="w-4 h-4"/>
                儲存重估變更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: SUPPLEMENT NUTRIENT ────────────────── */}
      {showNutrientModal && nutrientAddKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl w-full max-w-[340px] p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-sm font-extrabold text-zinc-100">
                快速追加補給
              </h3>
              <button onClick={() => setShowNutrientModal(false)} className="text-zinc-400 hover:text-zinc-300">
                <X className="w-4 h-4"/>
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
                onChange={(e) => setNutrientAddVal(e.target.value === ""? "": Number(e.target.value))}
              />
              <span className="text-zinc-650 font-bold">
                {nutrientAddKey === "sodium"? "mg": "g"}
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end items-center md:justify-center">
            <div className="bg-zinc-950 border-t md:border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 shadow-2xl">
              <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-850/60 bg-zinc-900/20">
                <h3 className="text-[15px] font-black text-zinc-100 tracking-wide">編輯食物庫品項</h3>
                <button 
                  onClick={() => {
                    setShowEditFoodModal(false);
                    setEditFoodIndex(null);
                  }}
                  className="text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <form onSubmit={saveEditedFoodLibraryItem} className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
                <div className="flex flex-col gap-2">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">食物名稱*</span>
                  <input 
                    type="text"
                    required
                    placeholder="例如：茶葉蛋"
                    className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 font-semibold placeholder-zinc-600"
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 mt-3">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">食物分類</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {["澱粉", "蛋白質", "蔬菜", "飲料", "點心", "其他"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setECategory(cat)}
                        className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                          eCategory === cat
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 font-black shadow-sm"
                            : "bg-zinc-900/30 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 複合餐點 (Group) 的精細化子項目編輯 */}
                {editFoodIndex !== null && "type"in db.foods[editFoodIndex] && db.foods[editFoodIndex].type === "group"&& (
                  <div className="space-y-3.5 border-t border-zinc-850 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-bold">餐點內項目 ({editedGroupItems.length})</span>
                      <span className="text-[10px] text-zinc-500 font-bold">可調整預設克數或移除</span>
                    </div>
                    
                    {editedGroupItems.length === 0 ? (
                      <div className="text-center text-zinc-500 py-4 italic">此餐點目前無任何項目</div>
                    ) : (
                      <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                        {editedGroupItems.map((subItem, sIdx) => (
                          <div key={subItem.id || sIdx} className="bg-black/40 border border-zinc-850 rounded-xl p-2.5 space-y-2 text-[11px]">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-extrabold text-zinc-300 truncate flex-1">
                                {subItem.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditedGroupItems(prev => prev.filter((_, i) => i !== sIdx));
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="移除此子項目"
                              >
                                <Trash className="w-3 h-3"/>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 items-center">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-zinc-500 text-[9px] font-bold">份量 (g)</span>
                                <input 
                                  type="number"
                                  className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right text-zinc-200"
                                  value={subItem.amount || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === ""? null : Number(e.target.value);
                                    setEditedGroupItems(prev => prev.map((item, i) => {
                                      if (i === sIdx) {
                                        const ratio = (val && item.amount) ? (val / item.amount) : 1;
                                        return {
                                          ...item,
                                          amount: val,
                                          kcal: (val && item.amount) ? Math.round(item.kcal * ratio) : item.kcal,
                                          protein: (val && item.amount) ? Number((item.protein * ratio).toFixed(1)) : item.protein,
                                          carb: (val && item.amount) ? Number((item.carb * ratio).toFixed(1)) : item.carb,
                                          fat: (val && item.amount) ? Number((item.fat * ratio).toFixed(1)) : item.fat,
                                        };
                                      }
                                      return item;
                                    }));
                                  }}
                                />
                              </div>
                              
                              <div className="flex flex-col gap-0.5">
                                <span className="text-zinc-500 text-[9px] font-bold">熱量 (大卡)</span>
                                <input 
                                  type="number"
                                  className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right text-zinc-200"
                                  value={subItem.kcal || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setEditedGroupItems(prev => prev.map((item, i) => i === sIdx ? { ...item, kcal: val } : item));
                                  }}
                                />
                              </div>
                              
                              <div className="flex flex-col gap-0.5">
                                <span className="text-zinc-500 text-[9px] font-bold">蛋白 (g)</span>
                                <input 
                                  type="number"
                                  className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right text-zinc-200"
                                  value={subItem.protein || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setEditedGroupItems(prev => prev.map((item, i) => i === sIdx ? { ...item, protein: val } : item));
                                  }}
                                />
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <span className="text-zinc-500 text-[9px] font-bold">碳水 (g)</span>
                                <input 
                                  type="number"
                                  className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right text-zinc-200"
                                  value={subItem.carb || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setEditedGroupItems(prev => prev.map((item, i) => i === sIdx ? { ...item, carb: val } : item));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editFoodIndex !== null && !("type"in db.foods[editFoodIndex] && db.foods[editFoodIndex].type === "group") && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">估計份量 (g)</span>
                        <input 
                          type="number"
                          placeholder="選填克數"
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right placeholder-zinc-600"
                          value={eAmount}
                          onChange={(e) => setEAmount(e.target.value === ""? "": Number(e.target.value))}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">金額 (TWD)</span>
                        <input 
                          type="number"
                          placeholder="價格"
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right placeholder-zinc-600"
                          value={ePrice}
                          onChange={(e) => setEPrice(e.target.value === ""? "": Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-850/60 pt-5 mt-2">
                      <div className="flex flex-col gap-2 relative">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" />熱量* (大卡)</span>
                        <div className="flex w-full gap-1.5 items-center">
                          <input 
                            type="number"
                            required
                            className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 w-full text-zinc-200 text-right font-semibold"
                            value={eKcal}
                            onChange={(e) => setEKcal(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (theoreticalEKcal > 0) setEKcal(theoreticalEKcal);
                            }}
                            title="根據三大營養素計算理論熱量 (P*4 + C*4 + F*9)"
                            className="text-[10px] font-black border border-zinc-700 hover:border-zinc-600 bg-zinc-800 text-indigo-400 px-2.5 py-2.5 rounded-xl cursor-pointer hover:bg-zinc-700 whitespace-nowrap shrink-0 transition-colors shadow-sm"
                          >
                             估算
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><Dumbbell className="w-3 h-3 text-emerald-400" />蛋白質* (g)</span>
                        <input 
                          type="number"
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eProtein}
                          onChange={(e) => setEProtein(e.target.value === ""? "": Number(e.target.value))}
                          required
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {showEKcalDiffAlert && (
                      <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center animate-in fade-in">
                        <span> 設定熱量與三大營養素估算理論值 ({theoreticalEKcal} 大卡) 有落差</span>
                        <button
                          type="button"
                          onClick={() => setEKcal(theoreticalEKcal)}
                          className="text-amber-300 hover:text-amber-200 font-extrabold cursor-pointer hover:underline"
                        >
                          一鍵校正
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><span className="text-orange-400 text-[10px]">●</span>碳水* (g)</span>
                        <input 
                          type="number"
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eCarb}
                          onChange={(e) => setECarb(e.target.value === ""? "": Number(e.target.value))}
                          required
                          min="0"
                          step="0.1"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"><span className="text-yellow-400 text-[10px]">●</span>脂肪* (g)</span>
                        <input 
                          type="number"
                          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-zinc-200 text-right"
                          value={eFat}
                          onChange={(e) => setEFat(e.target.value === ""? "": Number(e.target.value))}
                          required
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                  {/* Advanced inputs expansion */}
                  <div 
                    onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                    className="text-zinc-400 hover:text-zinc-300 font-bold flex items-center gap-1.5 cursor-pointer select-none py-1.5 mt-2"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showEditAdvanced ? "rotate-180": ""}`} />
                    進階成分微調 (纖維、精緻糖、鈉離子)
                  </div>

                  {showEditAdvanced && (
                    <div className="space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/60 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">膳食纖維：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={eFiber}
                            onChange={(e) => setEFiber(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">精製糖：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={eSugar}
                            onChange={(e) => setESugar(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">克</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold">鈉離子：</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-right w-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                            value={eSodium}
                            onChange={(e) => setESodium(e.target.value === ""? "": Number(e.target.value))}
                          />
                          <span className="text-zinc-600 font-bold">mg</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-6 border-t border-zinc-850/60 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditFoodModal(false);
                    setEditFoodIndex(null);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white py-3.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 cursor-pointer transition-all border border-indigo-500/50"
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
          <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-xl backdrop-blur-xl w-full max-w-[340px] p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-zinc-100 flex items-center gap-2 text-rose-400">
              <Trash2 className="w-4 h-4"/>
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

      {/* ────────────────── MODAL: IMAGE VIEWER ────────────────── */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size meal" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg animate-in zoom-in-95 duration-200"
          />
          <button 
            className="absolute top-6 right-6 p-2 bg-black/50 border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ────────────────── MODAL: AI COACH ────────────────── */}
      <AnimatePresence>
        {showAICoach && (
          <AICoach
            isOpen={showAICoach}
            onClose={() => setShowAICoach(false)}
            settings={db.settings}
            todayStats={{
              kcal: loggedTotals.kcal,
              protein: loggedTotals.protein,
              carb: loggedTotals.carb,
              fat: loggedTotals.fat,
              fiber: loggedTotals.fiber,
              sugar: loggedTotals.sugar,
              sodium: loggedTotals.sodium,
              water: waterTotalLogged,
              price: loggedTotals.price,
            }}
            weightTrend={getRecentWeightTrend(db.days)}
          />
        )}
      </AnimatePresence>

      {/* ────────────────── GLOBAL TOAST NOTIFICATION ────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-8 left-1/2 z-[100] w-[max-content] max-w-[85vw] flex items-center bg-zinc-900 border-2 border-zinc-700 rounded-2xl px-5 py-3.5 shadow-2xl drop-shadow-2xl"
          >
            <div className="flex items-center gap-2.5 w-full">
              {toast.type === "success" && <span className="text-emerald-400 font-extrabold text-sm shrink-0">✓</span>}
              {toast.type === "error" && <span className="text-rose-400 font-extrabold text-sm shrink-0">✕</span>}
              {toast.type === "info" && <span className="text-sky-400 font-extrabold text-sm shrink-0">ℹ</span>}
              <span className="text-xs font-bold text-zinc-100 break-words leading-relaxed text-left">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
