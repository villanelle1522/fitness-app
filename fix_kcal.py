import re
with open("src/App.tsx", "r", encoding="utf-8") as f:
    text = f.read()

target = """const itemKcal = "type"in f && f.type === "group"
? f.items.reduce((s, sub) => s + (sub.kcal || 0), 0)
: (f.kcal || 0);"""

text = re.sub(r'const itemKcal = "type"in f && f\.type === "group"\s*\?\s*f\.items\.reduce\(\(s, sub\) => s \+ \(sub\.kcal \|\| 0\), 0\)\s*:\s*\(f\.kcal \|\| 0\);', 'const itemKcal = getRecordMacros(f).kcal;', text)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(text)
