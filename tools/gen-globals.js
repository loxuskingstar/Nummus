// Génère la liste des globales (function, const, let, class de premier niveau) des scripts classiques du frontend,
// pour que la règle no-undef signale les noms mal orthographiés ou oubliés. Sortie : eslint.globals.json
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'frontend', 'js'), names = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    let m = l.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/) || l.match(/^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) names.add(m[1]);
    if (/^(?:const|let|var)\s/.test(l)) {          // déclarations multiples : const a=1,b=2
      let depth = 0, prev = '';
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--;
        else if (c === ',' && depth === 0) { const m2 = l.slice(i + 1).match(/^\s*([A-Za-z_$][\w$]*)\s*=/); if (m2) names.add(m2[1]); }
      }
    }
    const d = l.match(/^(?:const|let)\s+\{([^}]+)\}=/);
    if (d) d[1].split(',').forEach((x) => names.add(x.split(':').pop().trim()));
    const a = l.match(/^(?:const|let)\s+\[([^\]]+)\]=/);
    if (a) a[1].split(',').forEach((x) => x.trim() && names.add(x.trim()));
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'eslint.globals.json'), JSON.stringify([...names].sort(), null, 1));
console.log(names.size + ' globales');
