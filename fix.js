const fs = require('fs');
let content = fs.readFileSync('src/components/StoreMealPlanner.tsx', 'utf-8');

// Replace specific parts that should be emerald/orange/sky
content = content.replace(/bg-indigo-500\/10 rounded-full blur-3xl/g, function(match, offset, string) {
  // We know the first one is emerald, second is sky
  if (string.substring(0, offset).indexOf('blur-3xl') === -1) {
    return 'bg-emerald-500/10 rounded-full blur-3xl';
  } else {
    return 'bg-sky-500/10 rounded-full blur-3xl';
  }
});

content = content.replace('bg-indigo-600/20 text-indigo-400 p-2.5', 'bg-emerald-600/20 text-emerald-400 p-2.5');
content = content.replace('group-hover:text-indigo-300', 'group-hover:text-emerald-300');
content = content.replace('bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30');

content = content.replace('<DollarSign className="w-3.5 h-3.5 text-indigo-400" />', '<DollarSign className="w-3.5 h-3.5 text-emerald-400" />');
content = content.replace('text-indigo-400 text-sm font-mono', 'text-emerald-400 text-sm font-mono');
content = content.replace('accent-indigo-500 h-1.5', 'accent-emerald-500 h-1.5');
content = content.replace('bg-indigo-500/20 text-indigo-400 border-indigo-500/40', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40');

content = content.replace('{ name: "7-11", colors: "peer-checked:bg-indigo-600/20 peer-checked:text-indigo-400 peer-checked:border-indigo-500/40 border-zinc-800" }', '{ name: "7-11", colors: "peer-checked:bg-orange-600/20 peer-checked:text-orange-400 peer-checked:border-orange-500/40 border-zinc-800" }');
content = content.replace('{ name: "全家", colors: "peer-checked:bg-indigo-600/20 peer-checked:text-indigo-400 peer-checked:border-indigo-500/40 border-zinc-800" }', '{ name: "全家", colors: "peer-checked:bg-sky-600/20 peer-checked:text-sky-400 peer-checked:border-sky-500/40 border-zinc-800" }');

content = content.replace('text-indigo-500 focus:ring-0 w-4 h-4 accent-indigo-500', 'text-emerald-500 focus:ring-0 w-4 h-4 accent-emerald-500');
content = content.replace('bg-indigo-600/20 text-indigo-400 border-indigo-500/40', 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'); // maybe some of them were indigo for MealCategory? Wait!

fs.writeFileSync('src/components/StoreMealPlanner.tsx', content);
