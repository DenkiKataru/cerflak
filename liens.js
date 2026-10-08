// Liens dans le texte de Scriptum : logique pure (sans écran), testée dans tests/liens.test.js
// Un lien est un simple <a href="..."> dans le texte, donc chiffré avec lui et gardé par les exports PDF/ODT.
//  - adresse web  : https://... ou http://...  (YouTube compris)
//  - autre gtext  : adresse de l'appli avec ?dossier=...&fichier=... (le mécanisme d'ouverture directe existant)
(function (root) {
  const APP_URL = 'https://denkikataru.github.io/cerflak/';

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

  // Adresse d'un lien -> { kind:'gtext', subfolder, filename } | { kind:'url', href } | null
  function parseLinkTarget(href) {
    if (typeof href !== 'string') return null;
    if (href.startsWith(APP_URL + '?')) {
      try {
        const q = new URL(href).searchParams;
        const f = q.get('fichier');
        if (f) return { kind: 'gtext', subfolder: q.get('dossier') || '', filename: f };
      } catch (e) { /* on retombe sur le cas adresse web */ }
    }
    const web = normalizeWebUrl(href);
    return web ? { kind: 'url', href: web } : null;
  }

  const api = { APP_URL, normalizeWebUrl, normalizeGtextName, buildGtextLink, parseLinkTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CerflakLinks = api;
})(typeof window !== 'undefined' ? window : globalThis);
