import React, { useState, useRef } from "react";
import { MealItem } from "../types";
import { Camera, Sparkles, Upload, FileText, X, Check, ArrowRight, Salad, Copy } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

interface AIFoodAnalyzerProps {
  onAddParsedMeals: (mealCategory: string, items: MealItem[], groupName: string, saveToLibrary: boolean) => void;
  mealCategory: string;
  customApiKey?: string;
  customFoods?: MealItem[];
}

export const AIFoodAnalyzer: React.FC<AIFoodAnalyzerProps> = ({ onAddParsedMeals, mealCategory, customApiKey, customFoods = [] }) => {
  const [activeTab, setActiveTab] = useState<"direct" | "paste">("direct");
  const [inputText, setInputText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [parsedItems, setParsedItems] = useState<MealItem[]>([]);
  const [groupName, setGroupName] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(mealCategory || "早餐");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptTemplate = `請幫我分析以下餐點/照片的營養成分，並**嚴格**只返回一個合法的 JSON 陣列（請勿包含 \`\`\`json 等 Markdown 標記，僅回傳 JSON 內容，以便我直接在網頁解析）。

JSON 陣列中的每個物件結構如下（數值若無法估算請寫為 0，克數 amount 若無法估計可設為 null）：
[
  {
    "name": "食物/食材名稱(例如：滷排骨)",
    "amount": 150, // 估計重量（克），如無法估計填 null
    "kcal": 320, // 熱量（大卡）
    "protein": 22, // 蛋白質（克）
    "carb": 15, // 碳水化合物（克）
    "fat": 18, // 脂肪（克）
    "fiber": 0, // 膳食纖維（克）
    "sugar": 2, // 糖（克）
    "sodium": 450 // 鈉（毫克）
  }
]

請幫我分析：
（在此貼上您的食物描述或上傳照片。如果是吃合菜，您可以補充說明：例如「這是5人份的合菜，請幫我依據1/5的個人食用量估算」）`;

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(promptTemplate)
      .then(() => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      })
      .catch((err) => {
        alert("無法複製到剪貼簿：" + err.message);
      });
  };

  const handlePasteParse = () => {
    if (!pasteText.trim()) {
      alert("請先貼上 AI 回覆的 JSON 內容！");
      return;
    }

    try {
      let cleanJson = pasteText.trim();
      // Remove markdown blocks if present
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(json)?/, "");
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        const itemsWithId = parsed.map((item: any, i: number) => ({
          id: Date.now() + i,
          name: item.name || "未命名食物",
          kcal: Number(item.kcal) || 0,
          protein: Number(item.protein) || 0,
          carb: Number(item.carb) || 0,
          fat: Number(item.fat) || 0,
          fiber: Number(item.fiber) || 0,
          sugar: Number(item.sugar) || 0,
          sodium: Number(item.sodium) || 0,
          amount: Number(item.amount) || null,
        }));
        setParsedItems(itemsWithId);
        setGroupName("對話貼上餐點");
        setPasteText("");
      } else if (parsed && typeof parsed === "object") {
        const itemWithId = {
          id: Date.now(),
          name: parsed.name || "未命名食物",
          kcal: Number(parsed.kcal) || 0,
          protein: Number(parsed.protein) || 0,
          carb: Number(parsed.carb) || 0,
          fat: Number(parsed.fat) || 0,
          fiber: Number(parsed.fiber) || 0,
          sugar: Number(parsed.sugar) || 0,
          sodium: Number(parsed.sodium) || 0,
          amount: Number(parsed.amount) || null,
        };
        setParsedItems([itemWithId]);
        setGroupName("對話貼上餐點");
        setPasteText("");
      } else {
        alert("貼上的格式似乎不是合法的 JSON 物件或陣列！");
      }
    } catch (err: any) {
      alert("JSON 解析失敗！請確定您複製的是完整的 JSON 陣列或物件。\n錯誤訊息: " + err.message);
    }
  };

  // Status message rotation for Gemini analysis
  const loadingMessages = [
    "Gemini正在仔細剖析食物影像中...",
    "正在估算各項食材的克數...",
    "分析蛋白質、碳水與脂肪組成中...",
    "正在交叉比對標準營養素資料庫...",
    "準備為您精細排版餐點數值...",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageMimeType(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        // Strip out the "data:image/jpeg;base64," prefix for Gemini
        const base64Data = resultStr.split(",")[1];
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalyze = async () => {
    if (!inputText.trim() && !imageBase64) {
      alert("請輸入食物描述文字，或是上傳一張食物照片！");
      return;
    }

    setIsAnalyzing(true);
    setParsedItems([]);
    
    // Rotate messages
    let msgIndex = 0;
    setAnalysisStatus(loadingMessages[0]);
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setAnalysisStatus(loadingMessages[msgIndex]);
    }, 2000);

    try {
      //  優化：若使用者輸入了個人金鑰，則「直接在瀏覽器前端呼叫 Gemini API」！
      // 這對於 GitHub Pages 等「沒有後端伺服器」的靜態網站環境至關重要，能完全離線或純前端完成 AI 解析。
      if (customApiKey && customApiKey.trim()) {
        setAnalysisStatus("正在使用您設定的專屬金鑰直接進行 AI 分析...");
        const aiInstance = new GoogleGenAI({
          apiKey: customApiKey.trim(),
        });

        let memoryContext = "";
        if (customFoods.length > 0) {
          const memoryList = customFoods.map(f => `- ${f.name}: ${f.kcal} kcal, 蛋白質 ${f.protein}g, 碳水 ${f.carb}g, 脂肪 ${f.fat}g`).join('\n');
          memoryContext = `\n\n【使用者個人專屬記憶庫】\n以下是使用者常吃的個人食物清單及其營養素。如果您在圖片或文字中辨識出類似的餐點，請**優先套用**這些專屬記憶數據，而非一般通用數據：\n${memoryList}`;
        }

        const systemInstruction = `You are a professional dietitian and food analysis expert. 
Analyze the provided text description or image of a meal/food, estimate the ingredients and their nutritional values accurately.
Always translate the output food names into Traditional Chinese (zh-TW) as used in Taiwan (e.g. 滷肉飯, 味噌湯).
Calculate:
- kcal (calories in kcal)
- protein (in grams)
- carb (carbohydrates in grams)
- fat (fat in grams)
- fiber (dietary fiber in grams)
- sugar (sugar in grams)
- sodium (sodium in milligrams)
- amount (estimated weight in grams, or null/0 if not clearly estimable)

Ensure all values are realistic based on standard food databases.${memoryContext}

Provide the response strictly as a JSON array matching the requested schema.`;

        const contents: any[] = [];
        if (imageBase64) {
          contents.push({
            inlineData: {
              mimeType: imageMimeType || "image/jpeg",
              data: imageBase64,
            },
          });
        }
        
        contents.push({
          text: inputText || "請直接辨識並分析此相片中的餐點品項",
        });

        const response = await aiInstance.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY" as any,
              description: "List of analyzed food items in this meal",
              items: {
                type: "OBJECT" as any,
                properties: {
                  name: {
                    type: "STRING" as any,
                    description: "Name of the food item in Traditional Chinese (Traditional Chinese characters only)",
                  },
                  amount: {
                    type: "NUMBER" as any,
                    description: "Estimated weight in grams (g)",
                  },
                  kcal: {
                    type: "NUMBER" as any,
                    description: "Calories (kcal)",
                  },
                  protein: {
                    type: "NUMBER" as any,
                    description: "Protein (g)",
                  },
                  carb: {
                    type: "NUMBER" as any,
                    description: "Carbohydrates (g)",
                  },
                  fat: {
                    type: "NUMBER" as any,
                    description: "Fat (g)",
                  },
                  fiber: {
                    type: "NUMBER" as any,
                    description: "Dietary Fiber (g)",
                  },
                  sugar: {
                    type: "NUMBER" as any,
                    description: "Sugar (g)",
                  },
                  sodium: {
                    type: "NUMBER" as any,
                    description: "Sodium (mg)",
                  },
                },
                required: ["name", "kcal", "protein", "carb", "fat", "fiber", "sugar", "sodium"],
              },
            },
          },
        });

        const text = response.text;
        clearInterval(msgInterval);

        if (text) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            const itemsWithId = data.map((item: any, i: number) => ({
              id: Date.now() + i,
              name: item.name || "未命名食物",
              kcal: Number(item.kcal) || 0,
              protein: Number(item.protein) || 0,
              carb: Number(item.carb) || 0,
              fat: Number(item.fat) || 0,
              fiber: Number(item.fiber) || 0,
              sugar: Number(item.sugar) || 0,
              sodium: Number(item.sodium) || 0,
              amount: Number(item.amount) || null,
            }));
            setParsedItems(itemsWithId);
            
            if (inputText.trim()) {
              setGroupName(inputText.trim().slice(0, 15));
            } else {
              setGroupName("AI 影像分析餐點");
            }
            return; // 成功在前端直接完成呼叫，直接返回
          }
        }
        throw new Error("Direct client-side analysis returned empty or invalid response.");
      }

      // ─── 預設備用方式：呼叫後端伺服器 API ───
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputText || "請直接辨識並分析此相片中的餐點品項",
          image: imageBase64,
          mimeType: imageMimeType,
          customApiKey: customApiKey,
          customFoods: customFoods,
        }),
      });

      // 檢查是否因為在靜態網頁（如 GitHub Pages）找不到後端 API 而失敗
      if (response.status === 404) {
        throw new Error("STATIC_HOST_LIMIT: 404 Not Found");
      }

      const data = await response.json();
      clearInterval(msgInterval);

      if (response.ok && data.result && Array.isArray(data.result)) {
        const itemsWithId = data.result.map((item: any, i: number) => ({
          id: Date.now() + i,
          name: item.name || "未命名食物",
          kcal: Number(item.kcal) || 0,
          protein: Number(item.protein) || 0,
          carb: Number(item.carb) || 0,
          fat: Number(item.fat) || 0,
          fiber: Number(item.fiber) || 0,
          sugar: Number(item.sugar) || 0,
          sodium: Number(item.sodium) || 0,
          amount: Number(item.amount) || null,
        }));
        setParsedItems(itemsWithId);
        
        // Suggest group name based on prompt or time
        if (inputText.trim()) {
          setGroupName(inputText.trim().slice(0, 15));
        } else {
          setGroupName("AI 影像分析餐點");
        }
      } else {
        alert(data.error || "Gemini 智慧辨識失敗，請再試一次或手動輸入。");
      }
    } catch (err: any) {
      clearInterval(msgInterval);
      if (err.message && err.message.includes("STATIC_HOST_LIMIT")) {
        alert(" 貼心提醒：\n目前此網頁架設在 GitHub Pages 靜態網站平台，因此沒有後端伺服器可用。\n\n若您希望在此直接使用 AI 智慧辨識功能，請點擊網頁右上角的「設定」齒輪按鈕，並在「Gemini AI 智慧剖析金鑰」貼上您自己的個人 Gemini API Key 即可啟用前端直接辨識喔！");
      } else {
        alert("連線到 AI 分析伺服器時發生錯誤：" + err.message + "\n\n 提示：如果您在靜態網頁上（如 GitHub Pages）使用，請前往右上角「設定」配置您的個人 Gemini API 金鑰，系統將會直接在前端為您進行辨識！");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleParsedItemChange = (index: number, field: keyof MealItem, val: string) => {
    const num = val === "" ? 0 : Number(val);
    const updated = [...parsedItems];
    updated[index] = {
      ...updated[index],
      [field]: num,
    };
    setParsedItems(updated);
  };

  const handleParsedItemNameChange = (index: number, val: string) => {
    const updated = [...parsedItems];
    updated[index] = {
      ...updated[index],
      name: val,
    };
    setParsedItems(updated);
  };

  const removeParsedItem = (index: number) => {
    const updated = parsedItems.filter((_, i) => i !== index);
    setParsedItems(updated);
  };

  const confirmAdding = () => {
    if (parsedItems.length === 0) return;
    onAddParsedMeals(selectedCategory, parsedItems, groupName, saveToLibrary);
    
    // Clear state
    setInputText("");
    setImageFile(null);
    setImageBase64(null);
    setParsedItems([]);
    setGroupName("");
  };

  const loadSample = (text: string) => {
    setInputText(text);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-zinc-100">AI 智慧食物相片 / 文字辨識</h3>
          <p className="text-[11px] text-zinc-500">免去繁瑣的輸入，Gemini 智慧為您拆解成分與卡路里</p>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex border-b border-zinc-800/80 mb-4 text-xs font-bold gap-1">
        <button
          onClick={() => setActiveTab("direct")}
          className={`pb-2 px-3 relative transition-all cursor-pointer ${
            activeTab === "direct" ? "text-indigo-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span> App 內建 AI 智慧直析</span>
          {activeTab === "direct" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`pb-2 px-3 relative transition-all cursor-pointer ${
            activeTab === "paste" ? "text-indigo-400 font-extrabold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span> 複製提示詞 / 貼上 JSON</span>
          {activeTab === "paste" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      </div>

      {!isAnalyzing && parsedItems.length === 0 && (
        <div className="space-y-4">
          {activeTab === "direct" ? (
            <>
              {/* Write Text Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400"> 描述您的食物或輸入補充說明：</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[90px] resize-none"
                  placeholder="例如：中午吃了一碗排骨飯。
若搭配下方上傳照片，您可在此進行文字修正（例如：『照片是5人份的合菜，請幫我依據1/5的個人食用量估算』）"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {/* Quick inputs */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] text-zinc-500 self-center font-bold">範例試用：</span>
                <button
                  onClick={() => loadSample("吃了一大碗牛肉麵、一盤炒空心菜與一顆茶葉蛋")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-800/80 transition-colors"
                >
                   牛肉麵餐
                </button>
                <button
                  onClick={() => loadSample("烤全麥吐司兩片、兩顆煎荷包蛋、一杯無糖熱豆漿")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-800/80 transition-colors"
                >
                   健康早餐
                </button>
                <button
                  onClick={() => loadSample("健身後補充：乳清蛋白粉一包、一根香蕉、三顆茶葉蛋")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-800/80 transition-colors"
                >
                   運動後補給
                </button>
              </div>

              {/* Upload Image Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">或是上傳餐點照片：</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-center cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition-all flex flex-col items-center justify-center gap-1.5"
                >
                  {imageFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-full">
                        <Check className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300">{imageFile.name}</span>
                      <span className="text-[10px] text-zinc-500">點擊重新選擇相片</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-400">點擊上傳或拍照</span>
                      <span className="text-[10px] text-zinc-600">支援 JPG、PNG 食物照</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <button
                onClick={triggerAnalyze}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-90 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                啟動 Gemini AI 智慧剖析餐點
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-300 block"> 步驟 1：複製 AI 提示詞模板</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    複製下方提示詞，前往 
                    <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline mx-1 font-bold inline-flex items-center gap-0.5">Gemini 網頁版 <ArrowRight className="w-2.5 h-2.5" /></a> 
                    或 ChatGPT。您可以在對話中貼上相片，並文字補充說明（例如：這是一桌吃合菜、幾人份要分攤等），最後請 AI 給您產出 JSON 格式。
                  </p>
                  <button
                    onClick={copyPromptToClipboard}
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-200 transition-all w-full justify-center mt-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    {copiedPrompt ? " 已複製提示詞模板！" : "複製 AI 專用 JSON 提示詞"}
                  </button>
                </div>

                <div className="h-px bg-zinc-800/40" />

                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-300 block"> 步驟 2：貼上 AI 回覆的 JSON 結果</span>
                  <p className="text-[11px] text-zinc-500">
                    將 AI 對話最後所產出的 JSON 程式碼區塊完整貼在下方，即可立即解析：
                  </p>
                  <textarea
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-300 placeholder-zinc-700 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[100px] resize-none"
                    placeholder={`[
  {
    "name": "香菇雞湯",
    "amount": 250,
    "kcal": 180,
    ...
  }
]`}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <button
                    onClick={handlePasteParse}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    解析並編輯餐點內容
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading analysis state */}
      {isAnalyzing && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-20"></div>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            <Salad className="w-4 h-4 text-indigo-400 absolute animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-zinc-300">{analysisStatus}</p>
            <p className="text-[10px] text-zinc-500 animate-pulse">首次呼叫若在冷啟動，可能需等待 3-5 秒...</p>
          </div>
        </div>
      )}

      {/* Parse completed: Edit Items Table before Saving */}
      {parsedItems.length > 0 && (
        <div className="space-y-4 mt-2">
          <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            <div>
              <span className="text-[11px] text-zinc-500 block">AI 辨識成功</span>
              <span className="text-xs font-bold text-green-400">已解析 {parsedItems.length} 項食材：</span>
            </div>
            <button 
              onClick={() => setParsedItems([])}
              className="text-zinc-500 hover:text-zinc-300 p-1 bg-zinc-900 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Editable Grid */}
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {parsedItems.map((item, idx) => (
              <div key={item.id} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 space-y-2 relative">
                <button
                  onClick={() => removeParsedItem(idx)}
                  className="absolute top-2 right-2 text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="bg-transparent border-b border-zinc-800 focus:border-indigo-500 text-xs font-bold text-zinc-200 w-full focus:outline-none pb-0.5"
                      value={item.name}
                      onChange={(e) => handleParsedItemNameChange(idx, e.target.value)}
                      placeholder="食物名稱"
                    />
                  </div>
                  <div className="w-[70px]">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="bg-transparent border-b border-zinc-800 focus:border-indigo-500 text-xs text-zinc-400 text-right w-full focus:outline-none pb-0.5"
                        value={item.amount || ""}
                        onChange={(e) => handleParsedItemChange(idx, "amount", e.target.value)}
                        placeholder="估計"
                      />
                      <span className="text-[10px] text-zinc-600">克</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 block">熱量 (大卡)</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-800/60 rounded text-xs text-zinc-300 w-full p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={item.kcal}
                      onChange={(e) => handleParsedItemChange(idx, "kcal", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block">蛋白質 (克)</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-800/60 rounded text-xs text-zinc-300 w-full p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={item.protein}
                      onChange={(e) => handleParsedItemChange(idx, "protein", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block">碳水 (克)</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-800/60 rounded text-xs text-zinc-300 w-full p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={item.carb}
                      onChange={(e) => handleParsedItemChange(idx, "carb", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block">脂肪 (克)</label>
                    <input
                      type="number"
                      className="bg-zinc-900 border border-zinc-800/60 rounded text-xs text-zinc-300 w-full p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={item.fat}
                      onChange={(e) => handleParsedItemChange(idx, "fat", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Group and Save Configurations */}
          <div className="bg-zinc-950 p-3.5 border border-zinc-800 rounded-xl space-y-3 text-xs">
            {/* Custom group name */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-[60px] font-bold">群組打包:</span>
              <input
                type="text"
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="例：公司午餐盒 (打包為單一組合紀錄)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Target Meal Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-[60px] font-bold">新增至：</span>
              <div className="flex gap-1.5 flex-1">
                {["早餐", "午餐", "晚餐", "點心"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-1 py-1 px-2 rounded font-bold text-center transition-all ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white border border-indigo-500"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Save to Food Library checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-[60px]"></span>
              <label className="flex items-center gap-2 text-zinc-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 accent-indigo-500"
                />
                同時儲存至您的「我的食物庫」方便下次快速加選
              </label>
            </div>
          </div>

          <button
            onClick={confirmAdding}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            確認並加入 {selectedCategory} 紀錄
          </button>
        </div>
      )}
    </div>
  );
};
