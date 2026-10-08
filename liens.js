// Liens dans le texte de Scriptum : logique pure (sans écran), testée dans tests/liens.test.js
// Un lien est un simple <a href="..."> dans le texte, donc chiffré avec lui et gardé par les exports PDF/ODT.
//  - adresse web  : https://... ou http://...  (YouTube compris)
//  - autre gtext  : adresse de l'appli avec ?dossier=...&fichier=... (le mécanisme d'ouverture directe existant)
//  - fichier de Punk Records (PDF, son, vidéo) : adresse de l'appli avec ?type=...&media=...
(function (root) {
  const APP_URL = 'https://denkikataru.github.io/cerflak/';
  const MEDIA_TYPES = ['PDF', 'SONS', 'VIDÉOS']; // les trois dossiers de Punk Records

  // Adresse web saisie à la main -> adresse propre, ou null si elle n'est pas acceptable.
  // Seuls http et https sont acceptés (jamais javascript:, data:, etc.).
  function normalizeWebUrl(input) {
    if (typeof input !== 'string') return null;
    let s = input.trim();
    if (!s || /\s/.test(s)) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s; // « youtube.com/... » -> https
    let u;
    try { u = new URL(s); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.href;
  }

  // Les fichiers de Scriptum sont enregistrés avec l'extension .gtext
  function normalizeGtextName(name) {
    const n = (name || '').trim();
    if (!n) return '';
    return /\.gtext$/i.test(n) ? n : n + '.gtext';
  }

  // Sous-dossier + nom -> adresse de lien, ou null si le nom est vide
  function buildGtextLink(subfolder, filename) {
    const f = normalizeGtextName(filename);
    if (!f) return null;
    const d = (subfolder || '').trim() || 'Divers';
    return `${APP_URL}?dossier=${encodeURIComponent(d)}&fichier=${encodeURIComponent(f)}`;
  }

  // Type + nom d'un fichier de Punk Records -> adresse de lien, ou null si le type ou le nom n'est pas valable
  function buildMediaLink(type, filename) {
    const f = (filename || '').trim();
    if (!MEDIA_TYPES.includes(type) || !f) return null;
    return `${APP_URL}?type=${encodeURIComponent(type)}&media=${encodeURIComponent(f)}`;
  }

  // Paramètres d'adresse ?type=...&media=... -> { type, filename } ou null (type inconnu ou nom vide)
  function parseMediaParams(params) {
    const type = params.get('type');
    const filename = (params.get('media') || '').trim();
    return MEDIA_TYPES.includes(type) && filename ? { type, filename } : null;
  }

  // Adresse d'un lien -> { kind:'gtext', subfolder, filename } | { kind:'media', type, filename } | { kind:'url', href } | null
  function parseLinkTarget(href) {
    if (typeof href !== 'string') return null;
    if (href.startsWith(APP_URL + '?')) {
      try {
        const q = new URL(href).searchParams;
        const f = q.get('fichier');
        if (f) return { kind: 'gtext', subfolder: q.get('dossier') || '', filename: f };
        const m = parseMediaParams(q);
        if (m) return { kind: 'media', type: m.type, filename: m.filename };
      } catch (e) { /* on retombe sur le cas adresse web */ }
    }
    const web = normalizeWebUrl(href);
    return web ? { kind: 'url', href: web } : null;
  }

  const api = { APP_URL, MEDIA_TYPES, normalizeWebUrl, normalizeGtextName, buildGtextLink, buildMediaLink, parseMediaParams, parseLinkTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CerflakLinks = api;
})(typeof window !== 'undefined' ? window : globalThis);
