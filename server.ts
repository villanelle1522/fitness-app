import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous limit for handling image uploads (base64)
app.use(express.json({ limit: "15mb" }));

// Initialize the GoogleGenAI Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("⚠️ Warning: GEMINI_API_KEY is not defined in your environment.");
}

// AI Meal Analyzer Endpoint
app.post("/api/analyze-meal", async (req, res): Promise<any> => {
  try {
    const { prompt, image, mimeType, customApiKey } = req.body;

    let activeAi = ai;
    if (customApiKey && customApiKey.trim()) {
      activeAi = new GoogleGenAI({
        apiKey: customApiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }

    if (!activeAi) {
      return res.status(500).json({
        error: "Gemini API client is not initialized. Please configure your API key in the App Settings panel (設定) or configure GEMINI_API_KEY in Settings > Secrets of AI Studio.",
      });
    }

    if (!prompt && !image) {
      return res.status(400).json({ error: "Missing prompt or image content" });
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

Ensure all values are realistic based on standard food databases.
Provide the response strictly as a JSON array matching the requested schema.`;

    const contents: any[] = [];
    if (image) {
      contents.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image, // base64 encoded string without header prefix
        },
      });
    }
    
    // Add text instructions
    contents.push({
      text: prompt || "Analyze this meal and provide a detailed nutritional breakdown.",
    });

    const response = await activeAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of analyzed food items in this meal",
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Name of the food item in Traditional Chinese (Traditional Chinese characters only)",
              },
              amount: {
                type: Type.NUMBER,
                description: "Estimated weight in grams (g)",
              },
              kcal: {
                type: Type.NUMBER,
                description: "Calories (kcal)",
              },
              protein: {
                type: Type.NUMBER,
                description: "Protein (g)",
              },
              carb: {
                type: Type.NUMBER,
                description: "Carbohydrates (g)",
              },
              fat: {
                type: Type.NUMBER,
                description: "Fat (g)",
              },
              fiber: {
                type: Type.NUMBER,
                description: "Dietary Fiber (g)",
              },
              sugar: {
                type: Type.NUMBER,
                description: "Sugar (g)",
              },
              sodium: {
                type: Type.NUMBER,
                description: "Sodium (mg)",
              },
            },
            required: ["name", "kcal", "protein", "carb", "fat", "fiber", "sugar", "sodium"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini API");
    }

    const data = JSON.parse(text);
    return res.json({ result: data });
  } catch (error: any) {
    console.error("Gemini meal analysis error:", error);
    return res.status(500).json({
      error: "Failed to analyze meal using Gemini API.",
      details: error.message || error,
    });
  }
});

// App Info and Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiConfigured: !!ai });
});

// Integrate Vite Middleware or Production static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Fitness App Server running on http://localhost:${PORT}`);
  });
}

startServer();
