const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add import
if (!content.includes('STORE_FOODS_DATABASE')) {
  content = content.replace('import { StoreMealPlanner } from "./components/StoreMealPlanner";', 'import { StoreMealPlanner } from "./components/StoreMealPlanner";\nimport { STORE_FOODS_DATABASE } from "./data/storeFoods";');
}

// 2. Modify filteredFoods useMemo
content = content.replace(/const filteredFoods = useMemo\(\(\) => \{\n    return db\.foods/, `const filteredFoods = useMemo(() => {
    const storeFoodsMapped = STORE_FOODS_DATABASE.map((f, i) => ({
      id: -1000 - i, // negative ID for store foods
      name: \`[\${f.store}] \${f.name}\`,
      kcal: f.kcal,
      protein: f.protein,
      carb: f.carb,
      fat: f.fat,
      sodium: f.sodium,
      price: f.price,
      fiber: f.category === "蔬菜" ? 2.5 : 0,
      sugar: f.category === "飲料" ? 2.0 : 0,
      category: f.category
    }));
    const combinedFoods = [...db.foods, ...storeFoodsMapped];

    return combinedFoods`);

// 3. Fix the 'return db.foods.indexOf(b) - db.foods.indexOf(a);' in filteredFoods
content = content.replace(/return db\.foods\.indexOf\(b\) - db\.foods\.indexOf\(a\); \/\/ recent/g, 'return combinedFoods.indexOf(b) - combinedFoods.indexOf(a); // recent');


// 4. Update the quickSearch array in AddModal
const quickSearchTarget = `                    {db.foods.length === 0 ? (
                      <div className="text-center text-zinc-400 text-xs py-10">
                        食物庫無品項，請手動新增或使用 AI 辨識自動帶入。
                      </div>
                    ) : (
                      db.foods
                        .filter((f) => f.name.toLowerCase().includes(quickSearchQuery.toLowerCase()))`;

const quickSearchReplace = `                    {
                      (() => {
                        const storeFoodsMapped = STORE_FOODS_DATABASE.map((f, i) => ({
                          id: -1000 - i,
                          name: \`[\${f.store}] \${f.name}\`,
                          kcal: f.kcal,
                          protein: f.protein,
                          carb: f.carb,
                          fat: f.fat,
                          sodium: f.sodium,
                          price: f.price,
                          fiber: f.category === "蔬菜" ? 2.5 : 0,
                          sugar: f.category === "飲料" ? 2.0 : 0,
                          category: f.category
                        }));
                        const combinedFoods = [...db.foods, ...storeFoodsMapped];
                        const filtered = combinedFoods.filter((f) => f.name.toLowerCase().includes(quickSearchQuery.toLowerCase()));
                        
                        if (filtered.length === 0) {
                          return (
                            <div className="text-center text-zinc-400 text-xs py-10">
                              無相符品項。您可輸入「7-11」或「全家」搜尋超商食物，或使用 AI 辨識。
                            </div>
                          );
                        }
                        
                        return filtered.map((f, idx) => {`;

content = content.replace(quickSearchTarget, quickSearchReplace);

// We need to make sure the end of the map handles closing braces correctly
const mapEndTarget = `                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
              {/* TAB 2: MANUAL DATA FILL FORM */}`;

const mapEndReplace = `                            </div>
                          );
                        });
                      })()
                    }
                  </div>
                </div>
              )}
              {/* TAB 2: MANUAL DATA FILL FORM */}`;

content = content.replace(mapEndTarget, mapEndReplace);

fs.writeFileSync('src/App.tsx', content);
