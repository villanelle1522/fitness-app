import sys
with open("src/App.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines[3290:3315], start=3291):
    print(f"{i}: {line.strip()}")
