// Garde-fou : le champ « identifiant » invisible du formulaire de déverrouillage ne doit jamais recevoir de toucher
// ni occuper de place (sinon il recouvre le champ du mot de passe sur téléphone).
// Lancer avec : node --test tests/champ-mot-de-passe.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('le champ identifiant invisible est neutralisé par une règle CSS', () => {
  const rule = /\.panel input\.autofill-user\s*\{([^}]*)\}/.exec(html);
  assert.ok(rule, 'règle .autofill-user introuvable');
  for (const needle of ['pointer-events:none', 'position:absolute', 'min-width:0', 'padding:0']) {
    assert.ok(rule[1].includes(needle), 'manque : ' + needle);
  }
});

test('le champ identifiant utilise cette classe, sans style en ligne qui la contredirait', () => {
  const field = /<input[^>]*id="s-unlock-user"[^>]*>/.exec(html);
  assert.ok(field, 'champ introuvable');
  assert.ok(field[0].includes('class="autofill-user"'));
  assert.ok(!/style=/.test(field[0]));
});
