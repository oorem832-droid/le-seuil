
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const $ = s => document.querySelector(s);
export function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2600); }

export const IC = {
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
 home:'<path d="M4 11l8-7 8 7v9H4z"/>', path:'<path d="M6 20c0-6 12-4 12-10M18 10V4M6 20h0"/><circle cx="18" cy="4" r="1.5"/><circle cx="6" cy="20" r="1.5"/>',
 book:'<path d="M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4z"/><path d="M5 16a4 4 0 014-4h10"/>', pen:'<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
 folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>', chat:'<path d="M4 5h16v11H9l-5 4z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', play:'<path d="M9 7l8 5-8 5z" fill="currentColor"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', bookmark:'<path d="M7 4h10v16l-5-4-5 4z"/>', chart:'<path d="M5 20V10M12 20V4M19 20v-7"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', file:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>', out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
 flag:'<path d="M5 21V4h11l-2 4 2 4H5"/>', cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>', leaf:'<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>', list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash:'<path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/>', download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', up:'<path d="M12 19V5M6 11l6-6 6 6"/>', down:'<path d="M12 5v14M6 13l6 6 6-6"/>', plus:'<path d="M12 5v14M5 12h14"/>', send:'<path d="M4 12l16-8-6 16-3-7z"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 bell:'<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/>', video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6"/>'
};
export const icon = (n, cls="icon") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||""}</svg>`;

const HUES = {
 sage:{bg:"var(--sage-soft)", h1:"var(--sage)", h2:"var(--forest-2)", sun:"var(--gold)"},
 forest:{bg:"var(--beige)", h1:"var(--forest-2)", h2:"var(--forest)", sun:"var(--gold)"},
 gold:{bg:"var(--gold-soft)", h1:"var(--sage)", h2:"var(--earth)", sun:"var(--gold)"}
};
export function cover(h="sage", seed=0){
  const c = HUES[h]||HUES.sage, x = 70 + (seed*53)%170, ax = 200 - (seed*37)%150;
  return `<svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
   <rect width="320" height="160" style="fill:${c.bg}"/>
   <circle cx="${x}" cy="64" r="24" style="fill:${c.sun}" opacity=".55"/>
   <path d="M${ax} 160V78a42 42 0 0184 0v82" style="fill:none;stroke:${c.sun}" stroke-width="3" opacity=".8"/>
   <path d="M0 118Q80 92 160 114T320 104V160H0Z" style="fill:${c.h1}" opacity=".75"/>
   <path d="M0 140Q110 112 210 138T320 130V160H0Z" style="fill:${c.h2}" opacity=".85"/>
   <path d="M${x-10} 160C${x+20} 140 ${x-30} 128 ${x+6} 116" style="fill:none;stroke:var(--ivory)" stroke-width="5" opacity=".7" stroke-linecap="round"/>
  </svg>`;
}
export const HERO_ART = `<svg class="arch-art" viewBox="0 0 400 460" role="img" aria-label="Une arche ouverte sur un chemin baigné de lumière">
 <defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EEDC"/><stop offset=".65" stop-color="#F3D9A6"/><stop offset="1" stop-color="#E9C88C"/></linearGradient>
  <clipPath id="archclip"><path d="M90 440V200a110 110 0 01220 0v240z"/></clipPath>
 </defs>
 <path d="M60 440V196a140 140 0 01280 0v244" style="fill:var(--beige)"/>
 <g clip-path="url(#archclip)">
  <rect x="80" y="80" width="240" height="380" fill="url(#sky)"/>
  <circle class="glow" cx="200" cy="250" r="44" fill="#F7C978" opacity=".9"/>
  <path d="M80 300Q150 262 220 292T330 280V460H80Z" fill="#9DB098"/>
  <path d="M80 340Q170 302 250 336T330 326V460H80Z" fill="#5E7D62"/>
  <path d="M200 460C180 420 240 392 205 350S214 312 200 300" fill="none" stroke="#FBF3E2" stroke-width="16" stroke-linecap="round" opacity=".9"/>
  <rect class="door" x="262" y="150" width="40" height="300" rx="3" fill="#2D4733"/>
 </g>
 <path d="M90 440V200a110 110 0 01220 0v240" fill="none" style="stroke:var(--gold)" stroke-width="5"/>
 <g style="fill:var(--forest-2)" opacity=".92">
  <path d="M74 420C60 360 70 300 98 250" fill="none" style="stroke:var(--forest-2)" stroke-width="3"/>
  <path d="M98 250c-26-6-40-26-38-50 22 6 38 24 38 50z"/><path d="M86 300c-28 0-46-16-50-38 24 0 44 14 50 38z"/>
  <path d="M90 300c14-24 34-34 56-30-8 22-30 32-56 30z"/><path d="M76 360c-26 6-48-6-56-26 24-6 46 4 56 26z"/>

 </g>
</svg>`;

export const BASE = import.meta.env.BASE_URL;
export const LOGO = import.meta.env.VITE_LOGO_URL || BASE + "logo.jpg";
export const MARK = import.meta.env.VITE_MARK_URL || BASE + "mark.jpg";
export const $$ = s => [...document.querySelectorAll(s)];

const FR_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
export function fmtDate(d, withTime=false){
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return String(d);
  const s = `${x.getDate()} ${FR_MONTHS[x.getMonth()]} ${x.getFullYear()}`;
  return withTime ? `${s} à ${String(x.getHours()).padStart(2,"0")} h ${String(x.getMinutes()).padStart(2,"0")}` : s;
}
export const fmtShort = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("fr-FR",{day:"numeric",month:"short"}); };
export const fmtTime = d => { const x = new Date(d); return isNaN(x) ? "" : `${String(x.getHours()).padStart(2,"0")} h ${String(x.getMinutes()).padStart(2,"0")}`; };
export const fcfa = n => `${Number(n).toLocaleString("fr-FR").replace(/ | /g," ")} FCFA`;

/* Blocs de leçon : {t:'p'|'ul'|'ol'|'h', text|items} */
export function blocksHTML(blocks){
  return (blocks||[]).map(b => {
    if (typeof b === "string") return `<p>${esc(b)}</p>`;
    if (b.t === "h") return `<h3>${esc(b.text)}</h3>`;
    if (b.t === "ul") return `<ul>${b.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`;
    if (b.t === "ol") return `<ol>${b.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ol>`;
    return `<p>${esc(b.text)}</p>`;
  }).join("");
}
/* Conversion texte ↔ blocs pour l'éditeur (une ligne vide sépare les blocs ; "- " liste ; "1. " liste numérotée ; "## " intertitre) */
export function blocksToText(blocks){
  return (blocks||[]).map(b => typeof b === "string" ? b : b.t==="h" ? "## "+b.text : b.t==="ul" ? b.items.map(i=>"- "+i).join("\n") : b.t==="ol" ? b.items.map((i,k)=>`${k+1}. ${i}`).join("\n") : b.text).join("\n\n");
}
export function textToBlocks(txt){
  return String(txt||"").split(/\n\s*\n/).map(c=>c.trim()).filter(Boolean).map(c => {
    const lines = c.split("\n").map(l=>l.trim());
    if (c.startsWith("## ")) return {t:"h", text:c.slice(3)};
    if (lines.every(l=>l.startsWith("- "))) return {t:"ul", items:lines.map(l=>l.slice(2))};
    if (lines.every(l=>/^\d+\.\s/.test(l))) return {t:"ol", items:lines.map(l=>l.replace(/^\d+\.\s/,""))};
    return {t:"p", text:lines.join(" ")};
  });
}
export const pageHead = (eyebrow, title, lede, crumb="") => `<section class="page-head"><div class="wrap">${crumb?`<div class="crumb">${crumb}</div>`:""}<span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${lede?`<p class="lede">${lede}</p>`:""}</div></section>`;

export function download(filename, text, type="text/plain;charset=utf-8"){
  const blob = new Blob([text], {type}); const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
/* Impression d'une section (export PDF par la boîte de dialogue du navigateur). */
export function printSection(html, title){
  const host = document.getElementById("print-root");
  host.innerHTML = `<h1>${esc(title)}</h1>${html}<p class="print-foot">LE SEUIL · S’ouvrir pour mieux vivre · Document personnel et confidentiel</p>`;
  document.body.classList.add("printing");
  setTimeout(()=>{ window.print(); document.body.classList.remove("printing"); }, 50);
}
