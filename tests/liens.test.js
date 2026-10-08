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

test('lien vers un fichier de Punk Records : construction et lecture (aller-retour)', () => {
  const href = L.buildMediaLink('VIDÉOS', 'clip été.mp4');
  assert.strictEqual(href, 'https://denkikataru.github.io/cerflak/?type=VID%C3%89OS&media=clip%20%C3%A9t%C3%A9.mp4');
  assert.deepStrictEqual(L.parseLinkTarget(href), { kind: 'media', type: 'VIDÉOS', filename: 'clip été.mp4' });
  assert.deepStrictEqual(L.parseLinkTarget(L.buildMediaLink('PDF', 'a&b#c.pdf')), { kind: 'media', type: 'PDF', filename: 'a&b#c.pdf' });
});

test('lien Punk Records : type inconnu ou nom vide refusés', () => {
  assert.strictEqual(L.buildMediaLink('IMAGES', 'x.png'), null);
  assert.strictEqual(L.buildMediaLink('PDF', '   '), null);
  assert.strictEqual(L.buildMediaLink(undefined, 'x'), null);
  assert.strictEqual(L.parseMediaParams(new URLSearchParams('type=IMAGES&media=x')), null);
  assert.strictEqual(L.parseMediaParams(new URLSearchParams('type=PDF')), null);
  assert.deepStrictEqual(L.parseMediaParams(new URLSearchParams('type=SONS&media=a.mp3')), { type: 'SONS', filename: 'a.mp3' });
});

test('un lien gtext reste reconnu comme gtext (le fichier prime sur le média)', () => {
  const href = L.APP_URL + '?dossier=D&fichier=f.gtext&type=PDF&media=x';
  assert.strictEqual(L.parseLinkTarget(href).kind, 'gtext');
});
