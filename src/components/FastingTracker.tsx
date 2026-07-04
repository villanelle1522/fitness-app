import React, { useState, useEffect, useRef } from "react";
import { Timer, X, Flame, Sparkles, Activity, CheckCircle2, ShieldAlert } from "lucide-react";
import { DBState, DayRecord } from "../types";
import { getTodayString } from "../utils/nutrition";

interface FastingTrackerProps {
  db: DBState;
  updateDb: (newDb: DBState) => void;
}

interface FastingStage {
  id: number;
  name: string;
  hoursRange: string;
  minHours: number;
  maxHours: number;
  color: string;
  glowColor: string;
  accentClass: string;
  coachLine: string;
}

const FASTING_STAGES: FastingStage[] = [
  {
    id: 1,
    name: "血糖穩定",
    hoursRange: "0-4h",
    minHours: 0,
    maxHours: 4,
    color: "#38bdf8", // sky-400
    glowColor: "rgba(56,189,248,0.25)",
    accentClass: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    coachLine: "身體正在平穩血糖並完成前一餐消化。多喝溫水可以加速體內循環喔！"
  },
  {
    id: 2,
    name: "燃脂啟動",
    hoursRange: "4-12h",
    minHours: 4,
    maxHours: 12,
    color: "#fbbf24", // amber-400
    glowColor: "rgba(251,191,36,0.25)",
    accentClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    coachLine: "肝糖逐漸消耗完畢，油脂燃燒引擎正式啟動！您正一步步邁向輕盈！"
  },
  {
    id: 3,
    name: "細胞自噬啟動",
    hoursRange: "12-16h",
    minHours: 12,
    maxHours: 16,
    color: "#10b981", // emerald-500
    glowColor: "rgba(16,185,129,0.35)",
    accentClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    coachLine: "🌟 黃金修復期！老舊損壞的蛋白質正在進行大掃除，加速細胞代謝新生！"
  },
  {
    id: 4,
    name: "酮體產生",
    hoursRange: "16-24h+",
    minHours: 16,
    maxHours: 24,
    color: "#a78bfa", // purple-400
    glowColor: "rgba(167,139,250,0.4)",
    accentClass: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    coachLine: "⚡ 生酮高峰！身體開始大量利用高能量酮體，大腦專注力與抗發炎反應拉滿！"
  }
];

export const FastingTracker: React.FC<FastingTrackerProps> = ({ db, updateDb }) => {
  const [now, setNow] = useState(Date.now());
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Periodic timer update for active fasting
  useEffect(() => {
    if (!db.fasting?.isFasting) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000); // Update every 10 seconds for smoothness
    return () => clearInterval(interval);
  }, [db.fasting?.isFasting]);

  const fasting = db.fasting || { isFasting: false, startTime: null, targetHours: 16 };
  
  // Dynamic elapsed calculations
  const elapsedMs = fasting.startTime ? Math.max(0, now - fasting.startTime) : 0;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const targetMs = fasting.targetHours * 60 * 60 * 1000;
  const progressPct = Math.max(0, Math.min(100, (elapsedMs / targetMs) * 100));
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const isCompleted = elapsedMs >= targetMs;

  // Determine current fasting stage
  const currentStage = [...FASTING_STAGES]
    .reverse()
    .find(stage => elapsedHours >= stage.minHours) || FASTING_STAGES[0];

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently catch iframe permission errors
      }
    }
  };

  const handleStartFasting = () => {
    triggerHaptic(80); // Quick haptic vibration
    const newFasting = { ...fasting, isFasting: true, startTime: Date.now() };
    setNow(Date.now());
    updateDb({ ...db, fasting: newFasting });
  };

  // Safe end fasting (either direct or confirmed via guard)
  const executeEndFasting = () => {
    triggerHaptic([100, 50, 100]); // Rich double vibration on completion
    const elapsedHoursFinal = (Date.now() - (fasting.startTime || Date.now())) / (1000 * 60 * 60);
    const newFasting = { ...fasting, isFasting: false, startTime: null };
    const newDb = { ...db, fasting: newFasting };

    if (elapsedHoursFinal > 0.05) { // Meaningful duration (> 3 minutes)
      const todayStr = getTodayString();
      const currentDay: DayRecord = newDb.days[todayStr] || {
        meals: { 早餐: [], 午餐: [], 晚餐: [], 點心: [] },
        waterLog: [],
        exercise: 0,
        weight: null,
        bodyfat: null
      };
      currentDay.fastingHours = Math.max(currentDay.fastingHours || 0, elapsedHoursFinal);
      newDb.days[todayStr] = currentDay;
    }

    updateDb(newDb);
    setShowGuardModal(false);
    setHoldProgress(0);
  };

  const handleToggleClick = () => {
    if (fasting.isFasting) {
      // If target not reached yet, trigger the Smart Guard modal
      if (!isCompleted) {
        triggerHaptic(40);
        setShowGuardModal(true);
      } else {
        executeEndFasting();
      }
    } else {
      handleStartFasting();
    }
  };

  const handleAdjustTarget = (delta: number) => {
    triggerHaptic(30);
    const newTarget = Math.max(1, Math.min(24, fasting.targetHours + delta));
    updateDb({ ...db, fasting: { ...fasting, targetHours: newTarget } });
  };

  // --- Long Press Handlers for Smart Guard ---
  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    triggerHaptic(30);
    setHoldProgress(0);

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 2.5; // Fills up in 1.6 seconds
      
      // Haptic feedback tick milestones
      if (Math.round(progress) === 30 || Math.round(progress) === 65 || Math.round(progress) === 90) {
        triggerHaptic(15);
      }

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        setHoldProgress(100);
        executeEndFasting();
      } else {
        setHoldProgress(progress);
      }
    }, 40);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    // Smooth release transition or direct reset
    setHoldProgress(0);
  };

  const formatDuration = (ms: number) => {
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs} 小時 ${mins} 分`;
  };

  // Circular progress dimensions
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <>
      {/* ────────────────── ACTIVE FASTING VIEW ────────────────── */}
      {fasting.isFasting ? (
        <div 
          key="fasting-active" 
          className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl transition-all duration-500"
          style={{
            boxShadow: `inset 0 0 40px rgba(0,0,0,0.2), 0 10px 30px rgba(0,0,0,0.15), 0 0 35px ${currentStage.glowColor}`
          }}
        >
          {/* Subtle Ambient Background Gradient Glow */}
          <div 
            className="absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-all duration-1000" 
            style={{ backgroundColor: currentStage.color, opacity: 0.12 }}
          />
          
          <div className="flex flex-col gap-5">
            {/* Header Area */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors duration-500"
                  style={{ 
                    borderColor: `${currentStage.color}40`, 
                    backgroundColor: `${currentStage.color}15`,
                    boxShadow: `0 0 12px ${currentStage.color}30`
                  }}
                >
                  <Timer className="w-3.5 h-3.5 transition-colors duration-500" style={{ color: currentStage.color }} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white leading-tight">行動斷食教練</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">實時生理階段追蹤</p>
                </div>
              </div>

              <button
                onClick={handleToggleClick}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-extrabold bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
              >
                結束斷食
              </button>
            </div>

            {/* Circular Ring & Clock Center Layout */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              {/* Outer Glow Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track Circle */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="transparent" 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeWidth="6.5" 
                  />
                  {/* Progress Circle with active dynamic coloring */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="transparent" 
                    stroke={currentStage.color} 
                    strokeWidth="6.5" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    strokeLinecap="round" 
                    className="transition-all duration-1000"
                    style={{ filter: `drop-shadow(0 0 4px ${currentStage.color}80)` }}
                  />
                </svg>

                {/* Inside Circle Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-zinc-400 font-black tracking-wide">已斷食</span>
                  <span className="text-2xl font-black text-white font-mono leading-none my-1 tracking-tight">
                    {Math.floor(elapsedHours)}h {Math.floor((elapsedHours % 1) * 60)}m
                  </span>
                  <span className="text-[9px] text-zinc-500 font-semibold font-mono">
                    目標: {fasting.targetHours} 小時
                  </span>
                </div>
              </div>
            </div>

            {/* Scientific Biological Stage Indicator Badge */}
            <div className="flex flex-col gap-2.5">
              <div className={`flex items-start gap-2 p-3 rounded-xl border transition-colors duration-500 ${currentStage.accentClass}`}>
                <div className="shrink-0 mt-0.5">
                  <Flame className="w-4 h-4 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wide">目前階段：{currentStage.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 font-mono font-extrabold">{currentStage.hoursRange}</span>
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed opacity-90">
                    {currentStage.coachLine}
                  </p>
                </div>
              </div>

              {/* Progress Bar Label Details */}
              <div className="flex justify-between items-center text-[10px] text-zinc-500 px-1 font-mono">
                <span>進度 {Math.round(progressPct)}%</span>
                {!isCompleted ? (
                  <span>剩餘 {formatDuration(remainingMs)}</span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 已達標
                  </span>
                )}
              </div>
            </div>

            {/* Stages Grid Timeline Tracker */}
            <div className="grid grid-cols-4 gap-1.5 border-t border-white/5 pt-4">
              {FASTING_STAGES.map((stage) => {
                const isPassed = elapsedHours >= stage.minHours;
                const isCurrent = currentStage.id === stage.id;
                
                return (
                  <div key={stage.id} className="flex flex-col items-center text-center gap-1 group">
                    <div 
                      className="w-full h-1 rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: isPassed ? stage.color : "rgba(255,255,255,0.06)",
                        boxShadow: isCurrent ? `0 0 8px ${stage.color}` : "none"
                      }}
                    />
                    <span 
                      className={`text-[9px] font-black transition-colors duration-500 truncate w-full ${
                        isCurrent ? "text-white" : isPassed ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {stage.name.replace("啟動", "")}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono font-bold leading-none">
                      {stage.hoursRange}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      ) : (
        /* ────────────────── INACTIVE FASTING VIEW ────────────────── */
        <div key="fasting-inactive" className="bg-white/[0.04] border border-white/[0.05] rounded-2xl shadow-sm backdrop-blur-xl p-3 flex flex-wrap justify-between items-center gap-3 group transition-all duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shrink-0">
              <Timer className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-300 truncate">斷食計時器</h4>
              {db.days[getTodayString()]?.fastingHours ? (
                <p className="text-[10px] text-emerald-400/80 truncate font-bold">
                  今日已完成: {Math.floor(db.days[getTodayString()].fastingHours!)} 小時 {Math.round((db.days[getTodayString()].fastingHours! % 1) * 60)} 分
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500 truncate font-semibold">設定目標並一鍵開啟斷食</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="flex items-center gap-1 bg-black/40 rounded-lg py-1 border border-white/5">
              <button onClick={() => handleAdjustTarget(-1)} className="px-2 text-zinc-400 hover:text-white font-bold transition-colors">-</button>
              <span className="text-xs font-mono text-zinc-300 w-5 text-center font-bold">{fasting.targetHours}h</span>
              <button onClick={() => handleAdjustTarget(1)} className="px-2 text-zinc-400 hover:text-white font-bold transition-colors">+</button>
            </div>
            <button 
              onClick={handleToggleClick}
              className="bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-3.5 py-1.5 rounded-lg transition-all"
            >
              開始斷食
            </button>
          </div>
        </div>
      )}

      {/* ────────────────── SMART GUARD BACKDROP BLUR SCRAM SCRIM MODAL ────────────────── */}
      {showGuardModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Intense Backdrop Blur Panel Scrim */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in" 
            onClick={() => setShowGuardModal(false)}
          />

          <div 
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl animate-scale-up z-10 flex flex-col items-center text-center gap-4"
          >
            {/* Alert Icon Header */}
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-white">您尚未達到設定的斷食目標！</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                目前僅進行了 <strong className="text-white font-mono">{formatDuration(elapsedMs)}</strong>，距離目標還有 <strong className="text-amber-400 font-mono">{formatDuration(remainingMs)}</strong>。提前結束將無法完全發揮「細胞自噬」最佳修復效果。
              </p>
            </div>

            {/* Smart Dual-Guard Long-Press Visual Circle & Button */}
            <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">防誤觸智慧解鎖鎖定</span>
              
              <button
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                className="relative w-full h-11 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl overflow-hidden font-black text-rose-400 text-xs flex items-center justify-center transition-all select-none active:scale-98 cursor-pointer"
              >
                {/* Visual Fill-Up Progress Layer */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-rose-500/30 transition-all duration-75 pointer-events-none"
                  style={{ width: `${holdProgress}%` }}
                />
                
                <span className="relative z-10 font-bold flex items-center gap-1">
                  🔥 {holdProgress > 0 ? `解鎖中 ${Math.round(holdProgress)}%` : "長按此處 1.5 秒確認終止"}
                </span>
              </button>

              <div className="flex items-center gap-2 w-full mt-1.5">
                <div className="h-px bg-white/5 flex-grow" />
                <span className="text-[9px] text-zinc-500 font-black">或</span>
                <div className="h-px bg-white/5 flex-grow" />
              </div>

              {/* Robust Double Click confirmation button */}
              <button
                onDoubleClick={executeEndFasting}
                className="text-[10px] text-zinc-400 hover:text-white font-extrabold bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/5 transition-colors cursor-pointer"
              >
                雙擊此處快速中止
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                triggerHaptic(30);
                setShowGuardModal(false);
              }}
              className="text-xs font-bold text-zinc-400 hover:text-white underline mt-1 cursor-pointer"
            >
              不，我繼續堅持！
            </button>
          </div>
        </div>
      )}
    </>
  );
};
