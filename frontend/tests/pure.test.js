// Tests de la logique pure (sans navigateur) : utils.js et search.js sont chargés dans un contexte vm
// qui fournit le strict minimum de DOM.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'js');
const stub = () => new Proxy(function () {}, { get: () => stub(), apply: () => stub() });
const ctx = vm.createContext({ console, document: stub(), window: {}, localStorage: { getItem: () => null, setItem() {} }, navigator: {}, Intl, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout });
ctx.window = ctx;
for (const f of ['utils.js', 'search.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('chargement', f, e.message); }
}
// dépendances d'état fournies par d'autres scripts (mode vitrine, pays, quantité…)
vm.runInContext("var vit=()=>false;var privateKeys=()=>new Set();var searchText=i=>norm(Object.values(i).join(' '));",ctx);
const run = (code) => vm.runInContext(code, ctx);

test('norm : minuscules sans accents', () => {
  assert.equal(run("norm('Évêché ÉTÉ')"), 'eveche ete');
});
test('yearSpan : année simple, plage, année avant J.-C.', () => {
  assert.equal(run("yearSpan({year:1920})"), '1920');
  assert.match(run("yearSpan({year:-44,yearEnd:-31})"), /44.*–.*31/);
  assert.equal(run("yearSpan({year:1900,yearEnd:1900})"), '1900');
  assert.equal(run("yearSpan({})"), '');
});
test('recherche : ET implicite, OR, négation, champ numérique', () => {
  const it = (o) => JSON.stringify(o);
  const m = (q, o) => run(`matchItem(${it(Object.assign({ id: 'x', type: 'coin', status: 'owned' }, o))},{q:${JSON.stringify(q)}})`);
  assert.equal(m('franc argent', { denomination: '1 franc', metal: 'Argent' }), true);
  assert.equal(m('franc or', { denomination: '1 franc', metal: 'Argent' }), false);
  assert.equal(m('franc OR dollar', { denomination: '1 dollar' }), true);
  assert.equal(m('-franc', { denomination: '1 franc' }), false);
  assert.equal(m('annee:1900..1950', { denomination: 'x', year: 1920 }), true);
  assert.equal(m('poids:>10', { denomination: 'x', weight: 5 }), false);
});
test('recherche : champs ajoutés (graveur, dynastie, symbole)', () => {
  const m = (q, o) => run(`matchItem(${JSON.stringify(Object.assign({ id: 'x', type: 'coin', status: 'owned', denomination: 'd' }, o))},{q:${JSON.stringify(q)}})`);
  assert.equal(m('graveur:dupre', { engraver: 'Dupré' }), true);
  assert.equal(m('dynastie:capetiens', { dynasty: 'Capétiens' }), true);
  assert.equal(m('symbole:aigle', { symbols: 'Aigle, croix' }), true);
});
