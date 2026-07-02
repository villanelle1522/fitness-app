import React, { useState, useEffect } from "react";
import { Timer, X, Flame, Sparkles, Activity } from "lucide-react";
import { DBState, DayRecord } from "../types";
import { getTodayString } from "../utils/nutrition";

interface FastingTrackerProps {
  db: DBState;
  updateDb: (newDb: DBState) => void;
}

export const FastingTracker: React.FC<FastingTrackerProps> = ({ db, updateDb }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!db.fasting?.isFasting) return;
    setNow(Date.now()); // 確保切換狀態時立即更新當前時間
    const interval = setInterval(() => setNow(Date.now()), 10000); // 改為每 10 秒更新一次，讓畫面更即時
    return () => clearInterval(interval);
  }, [db.fasting?.isFasting]);

  const fasting = db.fasting || { isFasting: false, startTime: null, targetHours: 16 };
  
  const handleToggle = () => {
    const newFasting = { ...fasting };
    const newDb = { ...db, fasting: newFasting };

    if (newFasting.isFasting) {
      // stop fasting
      const elapsedHours = (Date.now() - (newFasting.startTime || Date.now())) / (1000 * 60 * 60);
      newFasting.isFasting = false;
      newFasting.startTime = null;

      // Save elapsed hours to today's record if it's meaningful (e.g. > 0.1 hours)
      if (elapsedHours > 0.1) {
        const todayStr = getTodayString();
        const currentDay: DayRecord = newDb.days[todayStr] || {
          meals: { 早餐: [], 午餐: [], 晚餐: [], 點心: [] },
          waterLog: [],
          exercise: 0,
          weight: null,
          bodyfat: null
        };
        // Add to existing or set new (maybe user did multiple fasts, we keep the longest or sum? usually max is fine)
        currentDay.fastingHours = Math.max(currentDay.fastingHours || 0, elapsedHours);
        newDb.days[todayStr] = currentDay;
      }

    } else {
      // start fasting
      newFasting.isFasting = true;
      newFasting.startTime = Date.now();
      setNow(Date.now()); // 開始斷食時立即同步時間
    }
    updateDb(newDb);
  };

  const handleAdjustTarget = (delta: number) => {
    const newTarget = Math.max(1, Math.min(24, fasting.targetHours + delta));
    updateDb({ ...db, fasting: { ...fasting, targetHours: newTarget } });
  };

  if (!fasting.isFasting) {
    return (
      <div key="fasting-inactive" className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-sm backdrop-blur-xl p-3 flex flex-wrap justify-between items-center gap-3 group transition-all duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shrink-0">
            <Timer className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-300 truncate">斷食追蹤</h4>
            {db.days[getTodayString()]?.fastingHours ? (
              <p className="text-[10px] text-emerald-400/80 truncate">
                今日已紀錄: {Math.floor(db.days[getTodayString()].fastingHours!)}h {Math.round((db.days[getTodayString()].fastingHours! % 1) * 60)}m
              </p>
            ) : (
              <p className="text-[10px] text-zinc-500 hidden sm:block truncate">目前不在斷食中</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1 bg-black/20 rounded-lg py-1 border border-white/5">
            <button onClick={() => handleAdjustTarget(-1)} className="px-2 text-zinc-500 hover:text-white">-</button>
            <span className="text-xs font-mono text-zinc-300 w-5 text-center">{fasting.targetHours}h</span>
            <button onClick={() => handleAdjustTarget(1)} className="px-2 text-zinc-500 hover:text-white">+</button>
          </div>
          <button 
            onClick={handleToggle}
            className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            開始斷食
          </button>
        </div>
      </div>
    );
  }

  // Calculate elapsed
  const elapsedMs = Math.max(0, now - (fasting.startTime || now));
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const targetMs = fasting.targetHours * 60 * 60 * 1000;
  const progressPct = Math.max(0, Math.min(100, (elapsedMs / targetMs) * 100));
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  
  const formatDuration = (ms: number) => {
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const isCompleted = elapsedMs >= targetMs;

  let dynamicMsg = "💪 剛開始斷食，請多補充水分！";
  let dynamicIcon = <Activity className="w-3 h-3 text-sky-400" />;
  let msgColor = "text-sky-400";
  let bgGlow = "bg-sky-500/10 border-sky-500/20";

  if (elapsedHours >= Math.max(16, fasting.targetHours)) {
    dynamicMsg = "✨ 目標達成！細胞自噬修復啟動中！";
    dynamicIcon = <Sparkles className="w-3 h-3 text-emerald-400" />;
    msgColor = "text-emerald-400";
    bgGlow = "bg-emerald-500/10 border-emerald-500/20";
  } else if (elapsedHours >= fasting.targetHours) {
    dynamicMsg = "✨ 目標達成！做得好！";
    dynamicIcon = <Sparkles className="w-3 h-3 text-emerald-400" />;
    msgColor = "text-emerald-400";
    bgGlow = "bg-emerald-500/10 border-emerald-500/20";
  } else if (elapsedHours >= 14) {
    dynamicMsg = "🚀 脂肪加速燃燒中，堅持住！";
    dynamicIcon = <Flame className="w-3 h-3 text-orange-400" />;
    msgColor = "text-orange-400";
    bgGlow = "bg-orange-500/10 border-orange-500/20";
  } else if (elapsedHours >= 12) {
    dynamicMsg = "🔥 肝糖耗盡，正式進入燃脂模式！";
    dynamicIcon = <Flame className="w-3 h-3 text-amber-400" />;
    msgColor = "text-amber-400";
    bgGlow = "bg-amber-500/10 border-amber-500/20";
  } else if (elapsedHours >= 4) {
    dynamicMsg = "💧 身體正在穩定血糖與消化...";
    dynamicIcon = <Activity className="w-3 h-3 text-sky-400" />;
    msgColor = "text-sky-400";
    bgGlow = "bg-sky-500/10 border-sky-500/20";
  }

  return (
    <div key="fasting-active" className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-sm backdrop-blur-xl p-3 flex flex-col gap-3 relative overflow-hidden transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100 whitespace-nowrap">
              {isCompleted ? "目標達成！" : `斷食目標 ${fasting.targetHours}h`}
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
              已進行 {formatDuration(elapsedMs)}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end shrink-0">
          <button 
            onClick={handleToggle}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold bg-black/20 hover:bg-black/40 border border-white/5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            結束斷食
          </button>
          {!isCompleted && (
            <span className="text-[9px] text-zinc-500 font-mono mt-1 whitespace-nowrap hidden sm:block">
              剩餘 {formatDuration(remainingMs)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full relative z-10">
        {/* Progress Bar */}
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden w-full relative">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-emerald-500/80'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        
        {/* Dynamic Indicator */}
        <div className={`flex items-center gap-1.5 self-start px-2 py-1 rounded-md border ${bgGlow} transition-colors duration-500`}>
          {dynamicIcon}
          <span className={`text-[10px] font-bold ${msgColor} tracking-wide`}>
            {dynamicMsg}
          </span>
        </div>
      </div>
    </div>
  );
};
