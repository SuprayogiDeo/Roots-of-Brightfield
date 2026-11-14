import en from './en.json';
import id from './id.json';
import enFestival from './festival.en.json'; // Step 5.2 (festivals, mini-games, music setting)
import idFestival from './festival.id.json';

const DICT = { en: { ...en, ...enFestival }, id: { ...id, ...idFestival } };
const LS_KEY = 'rob_lang';

function detect() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch (e) { /* storage blocked */ }
  const n = (navigator.language || 'en').toLowerCase();
  return n.startsWith('id') || n.startsWith('in') ? 'id' : 'en';
}

let lang = detect();
document.documentElement.lang = lang;

export function getLang() {
  return lang;
}

export function setLang(l) {
  if (l !== 'en' && l !== 'id') return;
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(LS_KEY, l); } catch (e) { /* ignore */ }
}

// t('stub.welcome', { name: 'Sari' }) -> replaces {name}
export function t(key, params) {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) s = s.split(`{${k}}`).join(params[k]);
  }
  return s;
}
