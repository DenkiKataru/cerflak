// Lancer avec : node --test tests/liens.test.js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../liens.js');

test('adresses web acceptées', () => {
  assert.strictEqual(L.normalizeWebUrl('https://www.youtube.com/watch?v=abc123'), 'https://www.youtube.com/watch?v=abc123');
  assert.strictEqual(L.normalizeWebUrl('http://exemple.fr/page'), 'http://exemple.fr/page');
  assert.strictEqual(L.normalizeWebUrl('  youtu.be/abc123  '), 'https://youtu.be/abc123'); // https ajouté, espaces retirés
});

test('adresses dangereuses ou invalides refusées', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'file:///etc/passwd',
    'ftp://exemple.fr', '', '   ', 'pas une adresse', 'localhost', 'https://', null, undefined, 42]) {
    assert.strictEqual(L.normalizeWebUrl(bad), null, String(bad));
  }
});

test('lien vers un gtext : construction et lecture (aller-retour)', () => {
  const href = L.buildGtextLink('Plumaisons', 'poème 1.gtext');
  assert.strictEqual(href, 'https://denkikataru.github.io/cerflak/?dossier=Plumaisons&fichier=po%C3%A8me%201.gtext');
  assert.deepStrictEqual(L.parseLinkTarget(href), { kind: 'gtext', subfolder: 'Plumaisons', filename: 'poème 1.gtext' });
});

test('le nom reçoit .gtext si besoin, le sous-dossier vide devient Divers', () => {
  assert.strictEqual(L.normalizeGtextName('poeme1'), 'poeme1.gtext');
  assert.strictEqual(L.normalizeGtextName('poeme1.GTEXT'), 'poeme1.GTEXT');
  assert.strictEqual(L.normalizeGtextName('  '), '');
  assert.strictEqual(L.buildGtextLink('', 'a'), 'https://denkikataru.github.io/cerflak/?dossier=Divers&fichier=a.gtext');
  assert.strictEqual(L.buildGtextLink('X', '   '), null);
});

test('caractères spéciaux (Fûinjutsu, &, #) bien conservés', () => {
  const href = L.buildGtextLink('Fûinjutsu/Textes & notes', 'a#b');
  assert.deepStrictEqual(L.parseLinkTarget(href), { kind: 'gtext', subfolder: 'Fûinjutsu/Textes & notes', filename: 'a#b.gtext' });
});

test('une adresse web ordinaire est reconnue comme telle, le reste est refusé', () => {
  assert.deepStrictEqual(L.parseLinkTarget('https://youtu.be/abc'), { kind: 'url', href: 'https://youtu.be/abc' });
  assert.strictEqual(L.parseLinkTarget('javascript:alert(1)'), null);
  assert.strictEqual(L.parseLinkTarget(null), null);
  // la page d'accueil de l'appli sans fichier = simple adresse web
  assert.strictEqual(L.parseLinkTarget(L.APP_URL + '?dossier=X').kind, 'url');
});
