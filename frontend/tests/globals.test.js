/* Les scripts partagent la portée globale : une même déclaration (const/let/function) dans deux fichiers fait
   échouer silencieusement le second script entier. Ce test l'interdit. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
test('aucune déclaration globale en double entre les fichiers js/', () => {
  const dir = path.join(__dirname, '..', 'js'), seen = new Map(), dup = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/^(?:const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (seen.has(m[1]) && seen.get(m[1]) !== f) dup.push(`${m[1]} : ${seen.get(m[1])} et ${f}`);
      else seen.set(m[1], f);
    }
  }
  assert.deepStrictEqual(dup, []);
});
