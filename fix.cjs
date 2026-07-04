const fs = require('fs');
let content = fs.readFileSync('src/components/StoreMealPlanner.tsx', 'utf-8');

content = content.replace('bg-indigo-500/10 rounded-full blur-3xl', 'bg-emerald-500/10 rounded-full blur-3xl');
content = content.replace('bg-indigo-500/10 rounded-full blur-3xl', 'bg-sky-500/10 rounded-full blur-3xl');

content = content.replace(/bg-indigo-600\/20 text-indigo-400 p-2.5/g, 'bg-emerald-600/20 text-emerald-400 p-2.5');
content = content.replace(/group-hover:text-indigo-300/g, 'group-hover:text-emerald-300');
content = content.replace(/bg-indigo-500\/20 text-indigo-400 border border-indigo-500\/30/g, 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30');

content = content.replace(/text-indigo-400/g, 'text-emerald-400');
content = content.replace(/accent-indigo-500/g, 'accent-emerald-500');
content = content.replace(/bg-indigo-500\/20 text-indigo-400 border-indigo-500\/40/g, 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40');
content = content.replace(/text-indigo-500/g, 'text-emerald-500');

content = content.replace(/peer-checked:bg-indigo-600\/20 peer-checked:text-emerald-400 peer-checked:border-indigo-500\/40/g, 'peer-checked:bg-orange-600/20 peer-checked:text-orange-400 peer-checked:border-orange-500/40');

content = content.replace('bg-indigo-600/20 text-emerald-400 border-indigo-500/40', 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'); // Meal category can stay indigo

content = content.replace('? "from-indigo-500/10 to-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40"', '? "from-orange-500/10 to-emerald-500/10 border-orange-500/20 hover:border-orange-500/40"');
content = content.replace(': "from-indigo-500/10 to-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40"', ': "from-sky-500/10 to-indigo-500/10 border-sky-500/20 hover:border-sky-500/40"');

content = content.replace('? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"', '? "bg-orange-500/20 text-orange-400 border-orange-500/30"');
content = content.replace(': "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"', ': "bg-sky-500/20 text-sky-400 border-sky-500/30"');

content = content.replace('hover:bg-indigo-600 border border-white/10 hover:border-indigo-500/50', 'hover:bg-emerald-600 border border-white/10 hover:border-emerald-500/50');

fs.writeFileSync('src/components/StoreMealPlanner.tsx', content);
