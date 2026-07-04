import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DBState } from "../types";
import { Flame, Timer, Minimize2, Sun, Moon } from "lucide-react";

interface FastingFloatingWidgetProps {
  db: DBState;
  updateDb: (newDb: DBState) => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

const FASTING_STAGES = [
  {
    id: 1,
    name: "血糖穩定",
    hoursRange: "0-4h",
    minHours: 0,
    maxHours: 4,
    color: "#38bdf8", // sky-400
    glowColor: "rgba(56,189,248,0.25)",
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
    coachLine: "⚡ 生酮高峰！身體開始大量利用高能量酮體，大腦專注力與抗發炎反應拉滿！"
  }
];

export const FastingFloatingWidget: React.FC<FastingFloatingWidgetProps> = ({ db, updateDb, showToast }) => {
  const fasting = db.fasting || { isFasting: false, startTime: null, targetHours: 16 };
  
  // If not fasting, do not show the widget
  if (!fasting.isFasting || !fasting.startTime) return null;

  const [isMinimized, setIsMinimized] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Periodic elapsed hours update
  useEffect(() => {
    const updateElapsed = () => {
      if (fasting.startTime) {
        const diffMs = Date.now() - fasting.startTime;
        setElapsed(Math.max(0, diffMs / (1000 * 60 * 60)));
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000); // update every 30 seconds
    return () => clearInterval(interval);
  }, [fasting.startTime]);

  const elapsedHours = elapsed;
  const targetHours = fasting.targetHours || 16;
  const progressPct = Math.max(0, Math.min(100, (elapsedHours / targetHours) * 100));

  // Determine active stage
  const currentStage = [...FASTING_STAGES]
    .reverse()
    .find(stage => elapsedHours >= stage.minHours) || FASTING_STAGES[0];

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[999] select-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* MINIMIZED VIEW: Pulsing pill widget */
          <motion.div
            key="minimized"
            layoutId="fasting-widget-container"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(50);
              setIsMinimized(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950/90 border border-white/10 rounded-full shadow-2xl cursor-pointer backdrop-blur-md hover:border-white/20 transition-all"
            style={{
              boxShadow: `0 0 15px ${currentStage.glowColor}`
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Radial pulsing ring representing the stage */}
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full opacity-75 animate-ping" style={{ backgroundColor: currentStage.color }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: currentStage.color }} />
            </div>
            
            <span className="text-[10px] font-black tracking-wide text-zinc-100 font-mono">
              {elapsedHours.toFixed(1)}h / {targetHours}h
            </span>

            <div className="flex items-center gap-0.5 text-[9px] font-black text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded-full">
              <Flame className="w-2.5 h-2.5 animate-pulse" style={{ color: currentStage.color }} />
              <span>{currentStage.name.replace("啟動", "")}</span>
            </div>
          </motion.div>
        ) : (
          /* EXPANDED VIEW: Locked screen simulator widget */
          <motion.div
            key="expanded"
            layoutId="fasting-widget-container"
            className="w-[260px] p-4 bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3.5"
            style={{
              boxShadow: `0 0 25px ${currentStage.glowColor}`
            }}
          >
            {/* Header row */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 animate-pulse" style={{ color: currentStage.color }} />
                <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">斷食階段監控</span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(50);
                  setIsMinimized(true);
                }}
                className="p-1 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Circular Progress & Visual Timer */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-zinc-900 fill-none"
                    strokeWidth="5"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="fill-none transition-all duration-[1000ms]"
                    strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - progressPct / 100)}
                    strokeLinecap="round"
                    style={{ stroke: currentStage.color }}
                  />
                </svg>

                {/* Core text metrics in circle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white font-mono leading-none">
                    {progressPct.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold mt-1 uppercase font-mono tracking-wider">
                    {elapsedHours.toFixed(1)} / {targetHours}h
                  </span>
                </div>
              </div>

              {/* Pulsing glow behind the circle */}
              <div 
                className="absolute inset-0 w-28 h-28 mx-auto my-auto rounded-full blur-2xl opacity-20 transition-all duration-1000 pointer-events-none"
                style={{ backgroundColor: currentStage.color }}
              />
            </div>

            {/* Current Stage Badge & Name */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase block text-zinc-450">當前生理進程</span>
              <div className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentStage.color }} />
                <span className="text-xs font-black text-white">{currentStage.name}</span>
              </div>
            </div>

            {/* Coach Line Tip */}
            <p className="text-[10px] text-zinc-400 leading-relaxed text-center italic bg-white/[0.02] border border-white/[0.03] p-2.5 rounded-xl font-medium">
              "{currentStage.coachLine}"
            </p>

            {/* Minimize footer button */}
            <button
              onClick={() => {
                triggerHaptic(50);
                setIsMinimized(true);
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-extrabold text-[10px] py-2 rounded-xl border border-white/5 transition-colors cursor-pointer text-center"
            >
              縮小至桌面小貼紙
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
