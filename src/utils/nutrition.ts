import { Settings, DayRecord, NutritionTargets } from "../types";

export function calculateBMR(sex: "男" | "女", age: number, height: number, weight: number): number {
  if (sex === "男") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

export function calculateTDEE(bmr: number, activity: number): number {
  return Math.round(bmr * activity);
}

export function calculateTargets(settings: Settings): NutritionTargets {
  const { sex, age, height, weight, activity, mode, weeklyGoal } = settings;
  if (!age || !height || !weight) {
    return { ...settings.targets };
  }

  const bmr = calculateBMR(sex, age, height, weight);
  const tdee = calculateTDEE(bmr, activity);
  
  // Weekly goal weight change calories (approx 7700 kcal per kg)
  const dailyCalorieAdj = Math.round((weeklyGoal * 7700) / 7);
  
  let kcal = tdee;
  if (mode === "減脂") {
    // Keep a healthy floor of at least bmr * 0.9 or tdee - adjustment
    kcal = Math.max(Math.round(bmr * 0.9), tdee - dailyCalorieAdj);
  } else if (mode === "增肌") {
    kcal = tdee + dailyCalorieAdj;
  }

  // Sports science guidelines:
  // - Protein: ~2.2g per kg of bodyweight
  // - Fat: ~25% of total calorie intake
  // - Carbohydrates: Remaining calories
  const protein = Math.round(weight * 2.2);
  const fat = Math.round((kcal * 0.25) / 9);
  const carb = Math.round((kcal - (protein * 4) - (fat * 9)) / 4);

  return {
    kcal,
    protein,
    carb: Math.max(50, carb),
    fat: Math.max(30, fat),
    fiber: 25,
    sugar: Math.round((kcal * 0.10) / 4), // 10% of total calories max
    sodium: 2300,
  };
}

export function getRecentWeightTrend(days: Record<string, DayRecord>): number | null {
  const datesWithWeight = Object.keys(days)
    .filter((d) => days[d].weight !== null && days[d].weight !== undefined)
    .sort();

  if (datesWithWeight.length < 2) return null;

  // Use up to the last 14 dates with weight
  const activeDates = datesWithWeight.slice(-14);
  const firstDate = activeDates[0];
  const lastDate = activeDates[activeDates.length - 1];

  const firstWeight = days[firstDate].weight!;
  const lastWeight = days[lastDate].weight!;

  const daysDiff = (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff < 1) return null;

  // Return weekly speed (positive is gaining weight, negative is losing weight)
  return ((lastWeight - firstWeight) / daysDiff) * 7;
}

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDateString(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatFriendlyDate(dateStr: string): string {
  const today = getTodayString();
  const yesterday = getDateString(-1);
  const tomorrow = getDateString(1);

  if (dateStr === today) return "今天";
  if (dateStr === yesterday) return "昨天";
  if (dateStr === tomorrow) return "明天";

  const parts = dateStr.split("-");
  return `${parts[1]}月${parts[2]}日`;
}

export function getRecordMacros(record: import("../types").MealRecord) {
  if ("type" in record && (record as any).type === "group") {
    return {
      kcal: record.items.reduce((sum, item) => sum + (item.kcal || 0), 0),
      protein: record.items.reduce((sum, item) => sum + (item.protein || 0), 0),
      carb: record.items.reduce((sum, item) => sum + (item.carb || 0), 0),
      fat: record.items.reduce((sum, item) => sum + (item.fat || 0), 0)
    };
  }
  return {
    kcal: (record as any).kcal || 0,
    protein: (record as any).protein || 0,
    carb: (record as any).carb || 0,
    fat: (record as any).fat || 0
  };
}
