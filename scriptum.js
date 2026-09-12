// Scriptum — cœur chiffré v2 (clé maîtresse aléatoire + code de récupération)
// AES-256-GCM, clé générée aléatoirement — plus de passphrase à retenir

// Génère une nouvelle clé maîtresse aléatoire (32 octets = 256 bits)
function generateMasterKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Formate les octets bruts en code de récupération lisible (hex groupé par blocs de 4)
function keyToRecoveryCode(keyBytes) {
  const hex = Array.from(keyBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{1,4}/g).join('-').toUpperCase();
}

// Reconvertit un code de récupération en octets bruts (clé)
function recoveryCodeToKey(code) {
  const hex = code.replace(/-/g, '').toLowerCase();
  if (hex.length !== 64) {
    throw new Error('Code de récupération invalide (longueur incorrecte).');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Importe des octets bruts comme clé utilisable par Web Crypto
async function importMasterKey(keyBytes) {
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// Chiffre un texte avec une CryptoKey déjà importée (plus de PBKDF2, la clé est déjà forte)
async function encryptWithKey(plainText, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc.encode(plainText));
  return {
    format: 'gtext-v2',
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

async function decryptWithKey(gtextObject, cryptoKey) {
  const iv = fromBase64(gtextObject.iv);
  const ciphertext = fromBase64(gtextObject.ciphertext);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}

async function hashGtext(gtextObject) {
  const enc = new TextEncoder();
  const data = enc.encode(gtextObject.ciphertext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toBase64(hashBuffer);
}

// --- Protection de la clé maîtresse par mot de passe (remplace la biométrie Capacitor) ---

// Dérive une clé de "coffrage" à partir d'un mot de passe + sel, via PBKDF2
async function deriveKeyFromPassword(password, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 210000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Chiffre la clé maîtresse avec un mot de passe, pour la stocker localement
async function wrapMasterKeyWithPassword(masterKeyBytes, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapKey = await deriveKeyFromPassword(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, masterKeyBytes);
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

// Déchiffre la clé maîtresse à partir du mot de passe (lève une erreur si le mot de passe est faux)
async function unwrapMasterKeyWithPassword(wrapped, password) {
  const salt = fromBase64(wrapped.salt);
  const iv = fromBase64(wrapped.iv);
  const wrapKey = await deriveKeyFromPassword(password, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, fromBase64(wrapped.ciphertext));
  return new Uint8Array(plainBuffer);
}

window.Scriptum = {
  generateMasterKey,
  keyToRecoveryCode,
  recoveryCodeToKey,
  importMasterKey,
  encryptWithKey,
  decryptWithKey,
  hashGtext,
  wrapMasterKeyWithPassword,
  unwrapMasterKeyWithPassword,
};
