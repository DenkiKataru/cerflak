// Vérifie que le numéro de version affiché (index.html) est le même que celui du cache (sw.js).
// Lancer avec : node --test tests/version.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('la version de index.html et celle de sw.js sont identiques', () => {
  const page = /const APP_VERSION = '([^']+)'/.exec(read('index.html'));
  const sw = /CACHE_NAME\s*=\s*'cerflak-shell-([^']+)'/.exec(read('sw.js'));
  assert.ok(page && sw, 'numéros de version introuvables');
  assert.strictEqual(page[1], sw[1]);
});

test('tous les fichiers du cache existent', () => {
  const list = /SHELL_FILES = \[([^\]]*)\]/.exec(read('sw.js'))[1].match(/'([^']+)'/g).map((x) => x.slice(3, -1));
  assert.ok(list.length >= 5);
  for (const f of list) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f + ' manquant');
});
