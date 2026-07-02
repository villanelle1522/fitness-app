export interface MealItem {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  amount?: number | null;
  count?: number;
  category?: string; // e.g. "澱粉", "蛋白質", "蔬菜", "點心", "飲料", "其他"
  time?: string; // e.g. "12:35"
  image?: string; // Base64 image
  price?: number; // Optional price
}

export interface MealGroup {
  type: 'group';
  id: number;
  name: string;
  items: MealItem[];
  time?: string; // e.g. "12:35"
  category?: string; // e.g. "澱粉", "蛋白質", "蔬菜", "點心", "飲料", "其他"
  image?: string; // Base64 image
  price?: number; // Optional price for the group
}

export type MealRecord = MealItem | MealGroup;

export function isMealGroup(record: MealRecord): record is MealGroup {
  return (record as any).type === 'group';
}

export interface WaterLogItem {
  ml: number;
  time: string;
}

export interface DayRecord {
  meals: {
    早餐: MealRecord[];
    午餐: MealRecord[];
    晚餐: MealRecord[];
    點心: MealRecord[];
  };
  waterLog: WaterLogItem[];
  exercise: number;
  steps?: number;
  weight: number | null;
  bodyfat: number | null;
  photos?: { id: string; url: string; timestamp: number }[];
  fastingHours?: number; // 記錄當天完成的斷食時長
}

export interface NutritionTargets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface Settings {
  mode: '減脂' | '增肌' | '維持';
  sex: '男' | '女';
  age: number;
  height: number;
  weight: number;
  activity: number;
  goalWeight: number;
  weeklyGoal: number;
  waterTarget: number;
  lastExportDate: number;
  targets: NutritionTargets;
  customWaterCup?: number;
  geminiApiKey?: string;
  autoWaterTarget?: boolean;
  requireFastingForPerfectDay?: boolean;
}

export interface FastingState {
  isFasting: boolean;
  startTime: number | null; // timestamp in ms
  targetHours: number; // default 16
}

export interface DBState {
  settings: Settings;
  days: Record<string, DayRecord>;
  foods: MealRecord[];
  fasting?: FastingState;
}

export const DEFAULT_TARGETS: NutritionTargets = {
  kcal: 1510,
  protein: 132,
  carb: 151,
  fat: 42,
  fiber: 25,
  sugar: 38,
  sodium: 2300,
};

export const DEFAULT_SETTINGS: Settings = {
  mode: '減脂',
  sex: '女',
  age: 22,
  height: 160,
  weight: 60,
  activity: 1.55,
  goalWeight: 52,
  weeklyGoal: 0.5,
  waterTarget: 1800,
  lastExportDate: 0,
  targets: DEFAULT_TARGETS,
  customWaterCup: 500,
  geminiApiKey: "",
  autoWaterTarget: true,
};
