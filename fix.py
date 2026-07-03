import re
import sys

with open("src/App.tsx", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

start_marker = "                      {/* Grid layout of saved library foods */}"
end_marker = "                                      <SwipeToDelete "

start_idx = text.find(start_marker)
if start_idx == -1:
    print("Start not found")
    sys.exit(1)

end_idx = text.find(end_marker, start_idx)
if end_idx == -1:
    print("End not found")
    sys.exit(1)

replacement = """                      {/* Grid layout of saved library foods */}
                      {(() => {
                        if (filteredFoods.length === 0) {
                          return (
                            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.04] border border-zinc-800/85 rounded-2xl p-10 text-center text-zinc-400 text-xs">
                              找不到符合篩選條件的食物。
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredFoods.map(({ item: f, originalIndex: realIdx }) => {
                              const isSelected = selectedLibItems.includes(realIdx);
                              const isGrp = isMealGroup(f);
                              const itemCat = f.category || "其他";
                              const catColors: Record<string, string> = {
                                "澱粉": "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                "蛋白質": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                                "蔬菜": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                "點心": "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                "飲料": "bg-sky-500/10 text-sky-400 border-sky-500/20",
                                "水果": "bg-rose-500/10 text-rose-400 border-rose-500/20",
                                "其他": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                              };

                              return (
"""
new_text = text[:start_idx] + replacement + text[end_idx:]

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(new_text)

print("done")
