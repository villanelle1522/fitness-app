import React, { useRef, useState } from "react";
import { X, Download, Share2, Loader2, Target } from "lucide-react";
import { toPng } from "html-to-image";
import { DayRecord, Settings, isMealGroup, MealRecord } from "../types";
import { formatFriendlyDate } from "../utils/nutrition";

interface ShareCardModalProps {
  dayRecord: DayRecord;
  settings: Settings;
  dateStr: string;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ dayRecord, settings, dateStr, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 計算熱量
  const meals = Object.values(dayRecord.meals).flat() as MealRecord[];
  const totalKcal = meals.reduce((acc, g) => {
    if (isMealGroup(g)) {
      return acc + g.items.reduce((sum, item) => sum + (item.kcal || 0), 0);
    } else {
      return acc + (g.kcal || 0);
    }
  }, 0);
  const netKcal = totalKcal - (dayRecord.exercise || 0);
  
  // 找出有照片的餐點
  const allPhotos: { url: string; caption?: string }[] = (dayRecord.photos || []).map(p => ({
    url: p.url,
    caption: "體態照片"
  }));
  
  meals.forEach(g => {
    if (g && (g as any).image) {
      allPhotos.push({ url: (g as any).image, caption: g.name });
    }
  });
  
  const coverPhoto = allPhotos.length > 0 ? allPhotos[allPhotos.length - 1] : null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setError(null);
    try {
      // 確保字型跟圖片載入完成，可以加點延遲
      await new Promise(r => setTimeout(r, 500));
      
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 高畫質
        quality: 1,
        style: { transform: "scale(1)", transformOrigin: "top left" }
      });
      
      const link = document.createElement('a');
      link.download = `fitness-diary-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setError("產生圖片時發生錯誤");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="flex flex-col max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-zinc-200">社群打卡分享</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-zinc-900 flex justify-center items-center">
          {/* Card to capture */}
          <div 
            ref={cardRef}
            className="w-[320px] aspect-[9/16] relative bg-zinc-950 overflow-hidden flex flex-col rounded-3xl"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Background Image / Blur */}
            {coverPhoto ? (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${coverPhoto.url})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{formatFriendlyDate(dateStr)}</h2>
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1">Daily Summary</p>
                </div>
                <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/30">
                  <Target className="w-5 h-5" />
                </div>
              </div>

              {coverPhoto && (
                <div className="mb-6 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl relative aspect-square">
                  <img src={coverPhoto.url} className="w-full h-full object-cover" alt="Meal" />
                  {coverPhoto.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                      <p className="text-white text-sm font-bold truncate">{coverPhoto.caption}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Total Kcal</p>
                  <p className="text-2xl font-black text-white">{Math.round(totalKcal)}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Exercise</p>
                  <p className="text-2xl font-black text-emerald-400">{Math.round(dayRecord.exercise || 0)}</p>
                </div>
              </div>

              <div className="bg-indigo-500 rounded-2xl p-4 shadow-xl border border-indigo-400 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-1">Net Kcal</p>
                  <p className="text-3xl font-black text-white">{Math.round(netKcal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-1">Target</p>
                  <p className="text-lg font-bold text-white/80">{Math.round(settings.targets?.kcal || 2000)}</p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">Powered by AI Fitness App</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col gap-3">
          {error && <p className="text-rose-400 text-xs font-bold text-center">{error}</p>}
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                下載圖片 (IG 限動尺寸)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
