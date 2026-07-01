import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, X, Bot, User, TrendingUp, Droplet, Flame, Zap, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Settings } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AICoachProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  todayStats: {
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    water: number;
    price: number;
  };
  weightTrend: number | null;
}

export const AICoach: React.FC<AICoachProps> = ({
  isOpen,
  onClose,
  settings,
  todayStats,
  weightTrend,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when component opens or key data changes
  useEffect(() => {
    if (messages.length === 0) {
      const modeText = settings.mode || "減脂";
      const goalText = settings.goalWeight ? ` ➡️ 目標 ${settings.goalWeight}kg` : "";
      const proteinPercent = settings.targets.protein 
        ? Math.round((todayStats.protein / settings.targets.protein) * 100)
        : 0;
        
      const welcome = `嗨！我是你的 AI 體態與營養教練 **FitAI** 🎯。

我已經載入你目前的個人化健康指標：
• **當前設定目標**：${modeText} (目前體重: ${settings.weight}kg${goalText})
• **今日熱量狀態**：${todayStats.kcal} / ${settings.targets.kcal} kcal
• **核心蛋白質達成率**：${todayStats.protein}g / ${settings.targets.protein}g (${proteinPercent}%)
• **今日累計喝水量**：${todayStats.water} / ${settings.waterTarget} ml

不論你是想詢問晚餐可以吃什麼，或是希望為你安排下週的阻力訓練計畫、分析目前的體重趨勢，都隨時可以問我！請點擊下方的建議，或直接輸入你的疑問 👇`;

      setMessages([{ role: "assistant", content: welcome }]);
    }
  }, [isOpen, settings, todayStats]);

  // Autoscroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          settings,
          todayStats,
          weightTrend,
          customApiKey: settings.geminiApiKey,
        }),
      });

      const data = await response.json();
      if (response.ok && data.result) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.result }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ 出現了些許錯誤，無法與 AI 教練取得聯繫。
請確認「設定」分頁中的 Gemini API Key 是否輸入正確。
錯誤詳情：${data.error || "連線異常"}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 連線失敗！請檢查您的網路狀態。
錯誤訊息：${err.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestionChips = [
    { label: "📋 深度分析我今天的飲食比例與改善建議", text: "請分析我今天攝取的熱量與三大營養素，並根據我目前的目標給我一些飲食優化建議與微量營養素補充指南。" },
    { label: "🥗 我今天碳水/蛋白質還差一點，晚餐推薦吃什麼？", text: "對照我今天還剩餘的宏量營養素，推薦我 3 種晚餐的搭配選擇（希望包含超商與外食選項）。" },
    { label: "🏋️‍♂️ 我今天打算去重訓，安排運動前後的能量補充指南", text: "我今天要進行重量訓練，請幫我規劃運動前 1 小時、運動後 30 分鐘內的飲食安排與補水、電解質建議。" },
    { label: "💡 覺得最近體重卡住了，如何有效突破增肌/減脂瓶頸？", text: "我的目標是減脂，如果體重卡著不動，你建議我從熱量攝取、有氧運動、睡眠或是重訓強度進行哪些具體的微調？" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end md:p-4">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="w-full max-w-[500px] h-full bg-zinc-950 border-l border-zinc-850 flex flex-col shadow-2xl relative overflow-hidden md:rounded-2xl md:border"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="relative flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top)+14px)] md:pt-3.5 pb-3.5 border-b border-zinc-850 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
                AI 智慧教練
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  ONLINE
                </span>
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold">隨身專屬營養與訓練顧問</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                onClick={clearChat}
                className="text-zinc-500 hover:text-zinc-300 bg-black/40 p-1.5 rounded-lg border border-zinc-850 transition-colors cursor-pointer"
                title="清除對話歷史"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 bg-black/50 p-1.5 rounded-lg border border-zinc-850 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 max-w-[88%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                    m.role === "user"
                      ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                      : "bg-zinc-850 border-zinc-800 text-zinc-300"
                  }`}
                >
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-500 selection:text-white ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white font-semibold rounded-tr-none"
                      : "bg-white/[0.04] border border-white/[0.05] text-zinc-200 rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[80%] mr-auto"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-850 border border-zinc-800 text-zinc-400 shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips and Input Bar */}
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] md:pb-4 border-t border-zinc-850 bg-zinc-950">
          {/* Quick chip options */}
          {messages.length <= 1 && !isLoading && (
            <div className="mb-3 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                熱門教練提問
              </span>
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chip.text)}
                  className="w-full text-left bg-white/[0.03] hover:bg-indigo-600/10 border border-white/[0.04] hover:border-indigo-500/20 rounded-xl px-3 py-2 text-[11px] text-zinc-300 hover:text-indigo-400 font-bold transition-all cursor-pointer flex items-center justify-between gap-1 group"
                >
                  <span className="truncate">{chip.label}</span>
                  <Zap className="w-3 h-3 text-indigo-500 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {/* Chat input box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLoading ? "教練正在思考解答中..." : "問問 AI 教練（例如：重訓完怎麼吃？）"}
              disabled={isLoading}
              className="flex-1 bg-black/50 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-500 text-ellipsis font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-850 text-white disabled:text-zinc-500 p-2.5 rounded-xl transition-all border border-indigo-500/20 disabled:border-transparent cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
