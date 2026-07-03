with open("src/utils/nutrition.ts", "r", encoding="utf-8") as f:
    text = f.read()

import re

text = text.replace('if ("type" in record && record.type === "group") {', 'if ("type" in record && (record as any).type === "group") {')
text = text.replace('kcal: record.kcal || 0,', 'kcal: (record as any).kcal || 0,')
text = text.replace('protein: record.protein || 0,', 'protein: (record as any).protein || 0,')
text = text.replace('carb: record.carb || 0,', 'carb: (record as any).carb || 0,')
text = text.replace('fat: record.fat || 0', 'fat: (record as any).fat || 0')

with open("src/utils/nutrition.ts", "w", encoding="utf-8") as f:
    f.write(text)
