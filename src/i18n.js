// LE SEUIL — FR / EN.
// The interface is written in French. In English mode, every visible text and accessibility label
// is translated after rendering using src/i18n-en.json (exact phrases + patterns with {n} placeholders).
// Articles and programme lessons are not translated: they stay in French and carry a short note.
// The team area (accompagnante / admin) stays in French.
// The English dictionary is loaded only for English visitors (smaller first download in French).
let EN = { exact: {}, patterns: [] };

const KEY = "orejeen-lang"; // shared with the other orejeen.com sites
export function lang(){ try { return localStorage.getItem(KEY) === "en" ? "en" : "fr"; } catch(e) { return "fr"; } }
export function setLang(l){ try { localStorage.setItem(KEY, l); } catch(e) {} applyDocLang(); }
export const isEn = () => lang() === "en";

const norm = s => s.replace(/\s+/g, " ").trim();
let PATTERNS = [];
let enReady = null;
function loadEn(){
  if (!enReady) enReady = import("./i18n-en.json").then(m => { EN = m.default; PATTERNS = EN.patterns.map(([src, en]) => [new RegExp(src), en]); if (isEn()) translateTree(document.body); });
  return enReady;
}

export function tr(text){
  if (!isEn() || !text) return text;
  const key = norm(String(text));
  if (!key) return text;
  let out = EN.exact[key];
  if (out === undefined) {
    for (const [rx, en] of PATTERNS) {
      const m = key.match(rx);
      if (m) { out = en.replace(/\{(\d+)\}/g, (_, n) => { const v = m.groups?.["g" + n]; return v === undefined ? "" : tr(v); }); break; }
    }
  }
  if (out === undefined) {
    // Composite labels: "A · B", "/ Title", "Question *"
    if (/ · /.test(key)) { const parts = key.split(" · "), t = parts.map(x => x ? tr(x) : x); if (t.some((x, i) => x !== parts[i])) out = t.join(" · "); }
    else if (/^\/ /.test(key)) { const t = tr(key.slice(2)); if (t !== key.slice(2)) out = "/ " + t; }
    else if (/ \*$/.test(key)) { const t = tr(key.slice(0, -2)); if (t !== key.slice(0, -2)) out = t + " *"; }
  }
  if (out === undefined) return text;
  const lead = String(text).match(/^\s*/)[0], trail = String(text).match(/\s*$/)[0];
  return lead + out + trail;
}

const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);
const skipEl = el => !el || SKIP.has(el.tagName) || el.isContentEditable || el.closest?.("[data-noi18n]");
const skipAttr = el => !el || el.closest?.("[data-noi18n]");

function translateTree(root){
  if (!isEn() || !root) return;
  if (root.nodeType === 3) { const p = root.parentElement; if (!skipEl(p)) { const t = tr(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; } return; }
  if (root.nodeType !== 1 || skipAttr(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: n => n.nodeType === 1 ? (skipEl(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT
  });
  const els = [root, ...root.querySelectorAll("[placeholder],[aria-label],[title],[alt]")];
  for (const el of els) if (!skipAttr(el)) for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  if (skipEl(root)) return;
  let n; const nodes = [];
  while ((n = walker.nextNode())) nodes.push(n);
  for (const t of nodes) { const v = tr(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; }
}

let observer = null;
export function startI18n(){
  applyDocLang();
  if (isEn()) loadEn();
  if (observer) return;
  observer = new MutationObserver(muts => {
    if (!isEn()) return;
    for (const m of muts) {
      if (m.type === "characterData") translateTree(m.target);
      else if (m.type === "attributes") translateTree(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  translateTree(document.body);
}
export function translateNow(root = document.body){ translateTree(root); }

const TITLE = { fr: "LE SEUIL | Bien-être psychologique à Abidjan", en: "LE SEUIL | Psychological wellbeing in Abidjan" };
const DESC = {
  fr: "Programmes d’auto-assistance inspirés des TCC pour gérer l’anxiété, faire face aux peurs et retrouver le moral, et bibliothèque gratuite. Bien-être psychologique à Abidjan.",
  en: "CBT-inspired self-help programmes to manage anxiety, face fears and lift low mood, plus a free library. Psychological wellbeing in Abidjan."
};
function applyDocLang(){
  const l = lang();
  document.documentElement.lang = l;
  document.title = TITLE[l];
  const d = document.querySelector('meta[name="description"]'); if (d) d.content = DESC[l];
}

/* Small note shown in English mode on content that only exists in French. */
export const frOnly = (what = "content") => isEn()
  ? `<p class="lang-note" data-noi18n role="note">${what === "article" ? "This article is currently available in French only." : what === "library" ? "Library articles are currently available in French only." : "The programme lessons and exercises are currently available in French only."}</p>`
  : "";
