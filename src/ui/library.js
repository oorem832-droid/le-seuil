// La Bibliothèque : articles publics, en accès libre, sans inscription ni connexion.
// Aucune date n'est affichée. Seuls les articles au statut « publié » sont visibles du public.
import { esc, icon, cover, pageHead, toast } from "./util.js";
import { ui, actions, inputs, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S } from "../store.js";

export const CATEGORIES = ["Comprendre la santé mentale","Dépression et humeur","Anxiété et peurs","TOC et pensées intrusives","Stress et épuisement","Deuil et événements difficiles",
  "Santé mentale périnatale","Neurodiversité et neurodéveloppement","Tics et Tourette","Enfants, adolescents et familles","Bien-être au quotidien","Culture, foi et société"];
export const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, " ");
export const catSlug = (c) => norm(c).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PAGE = 12;

// Mots-clés synonymes (recherche insensible aux accents et à la casse)
const SYN = [
  ["toc", "obsession", "obsessions", "obsessionnel", "compulsion", "compulsions", "rituel", "rituels", "pensees intrusives"],
  ["tdah", "adhd", "hyperactivite", "deficit de l attention", "inattention"],
  ["autisme", "autiste", "tsa", "spectre de l autisme"],
  ["panique", "attaque de panique", "crise d angoisse", "trouble panique"],
  ["post-partum", "postpartum", "post partum", "postnatal", "postnatale", "perinatal", "perinatale", "baby blues", "grossesse", "naissance"],
  ["depression", "deprime", "coup de blues", "humeur", "tristesse"],
  ["burnout", "burn-out", "burn out", "epuisement"],
  ["anxiete", "anxieux", "inquietude", "inquietudes", "angoisse", "peur", "peurs"],
  ["deuil", "perte", "deces", "mort"],
  ["tourette", "tics", "tic"],
  ["dyslexie", "troubles des apprentissages", "apprentissage"],
  ["sommeil", "insomnie", "dormir", "nuit"],
  ["tcc", "therapie cognitive", "therapies cognitives et comportementales"],
];
const alternatives = (tok) => { const g = SYN.find(grp => grp.some(w => w.startsWith(tok) || tok.startsWith(w))); return g ? [tok, ...g] : [tok]; };
const haystack = (a) => norm([a.title, a.cat, a.excerpt, ...(a.sections || []).flatMap(s => [s.h, ...(s.p || [])]), a.retenir].join(" "));

export const publishedArticles = () => C.articles.filter(a => a.etat === "publie").sort((a, b) => (a.order || 0) - (b.order || 0));
export const readTime = (a) => `${a.read || 1} min de lecture`;
export function articleCard(a, i = 0){
  return `<article class="card art-card lib-card">
    <div class="cover">${a.image_url ? `<img src="${esc(a.image_url)}" alt="${esc(a.image_alt || "")}">` : cover(a.hue || "sage", (a.order || i) + 1)}</div>
    <div class="body"><span class="tag">${esc(a.cat)}</span><h3><a href="#article-${esc(a.slug)}" data-go="article-${esc(a.slug)}">${esc(a.title)}</a></h3>
     <p class="muted small clamp3">${esc(a.excerpt)}</p>
     <div class="row lib-card-foot"><span class="small muted">${readTime(a)}</span><button class="btn btn-soft btn-sm" data-go="article-${esc(a.slug)}" aria-label="Lire l’article : ${esc(a.title)}">Lire l’article ${icon("arrow")}</button></div></div></article>`;
}
export const featuredArticles = () => publishedArticles().filter(a => a.featured).sort((a, b) => (a.featured_order || 99) - (b.featured_order || 99)).slice(0, 3);

export function search(list, q){
  const toks = norm(q).split(/[^a-z0-9-]+/).filter(t => t.length > 1);
  if (!toks.length) return list;
  return list.filter(a => { const h = haystack(a); return toks.every(t => alternatives(t).some(alt => h.includes(alt))); });
}

export function pLibrary(catFromRoute){
  if (catFromRoute) { const c = CATEGORIES.find(x => catSlug(x) === catFromRoute); if (c) { ui.libCats = new Set([c]); } }
  ui.libCats = ui.libCats || new Set(); ui.libLimit = ui.libLimit || PAGE;
  const all = publishedArticles();
  const filtered = all.filter(a => !ui.libCats.size || ui.libCats.has(a.cat));
  const results = search(filtered, ui.libQuery);
  const browsing = !ui.libQuery.trim() && !ui.libCats.size;
  const feat = browsing ? featuredArticles() : [];
  const grid = browsing ? results.filter(a => !feat.includes(a)) : results;
  const shown = grid.slice(0, ui.libLimit);
  const counts = Object.fromEntries(CATEGORIES.map(c => [c, all.filter(a => a.cat === c).length]));
  const suggestion = () => {
    const toks = norm(ui.libQuery).split(/\s+/).filter(Boolean);
    const c = CATEGORIES.find(x => toks.some(t => norm(x).includes(t))) || CATEGORIES.find(x => counts[x]);
    return c ? `<p>Essayez la catégorie <button class="linkbtn" data-act="lib-onlycat" data-v="${esc(c)}">${esc(c)}</button>, ou parcourez toute la Bibliothèque.</p>` : "";
  };
  return pageHead("La Bibliothèque", "Des mots pour comprendre, des repères pour avancer.", "Des articles gratuits, en accès libre, pour mieux comprendre la santé mentale. Ils ne remplacent pas l’avis d’un professionnel de santé.") + `
  <section class="section" style="padding-top:28px"><div class="wrap stack-lg">
   <div class="stack" style="gap:14px">
    <label class="search lib-search">${icon("search")}<span class="sr">Rechercher un article</span><input id="libsearch" type="search" placeholder="Rechercher un article : anxiété, TOC, sommeil, post-partum…" value="${esc(ui.libQuery)}" autocomplete="off"></label>
    <div class="chips" role="group" aria-label="Filtrer par catégorie (plusieurs choix possibles)">
     ${CATEGORIES.filter(c => counts[c]).map(c => `<button class="chip" data-act="lib-cat" data-v="${esc(c)}" aria-pressed="${ui.libCats.has(c)}">${esc(c)} <span class="chip-n">${counts[c]}</span></button>`).join("")}
     ${ui.libCats.size || ui.libQuery ? `<button class="linkbtn small" data-act="lib-reset">Tout afficher</button>` : ""}
    </div>
   </div>
   ${!all.length ? `<div class="card-flat"><p>Les articles de la Bibliothèque sont en cours de relecture et seront publiés prochainement.</p></div>` : ""}
   ${feat.length ? `<section class="stack" aria-labelledby="lib-feat"><h2 id="lib-feat" class="h-sub">À la une</h2><div class="grid g3">${feat.map(articleCard).join("")}</div></section>` : ""}
   ${all.length ? `<section class="stack" aria-labelledby="lib-all"><h2 id="lib-all" class="h-sub">${browsing ? "Tous les articles" : `${results.length} article${results.length > 1 ? "s" : ""}`}</h2>
    ${shown.length ? `<div class="grid g3">${shown.map(articleCard).join("")}</div>` : `<div class="card-flat stack"><p><b>Aucun article ne correspond à votre recherche.</b></p>${suggestion()}</div>`}
    ${grid.length > shown.length ? `<button class="btn btn-ghost" data-act="lib-more" style="align-self:center">Voir plus d’articles</button>` : ""}</section>` : ""}
   <div class="notice calm">${icon("info")}<span>Ces informations sont générales. Elles ne posent pas de diagnostic et ne remplacent pas les soins. En cas de danger immédiat, contactez les services d’urgence (SAMU 185).</span></div>
  </div></section>`;
}
actions["lib-cat"] = (b) => { const c = b.dataset.v; ui.libCats.has(c) ? ui.libCats.delete(c) : ui.libCats.add(c); ui.libLimit = PAGE; rerender(); };
actions["lib-onlycat"] = (b) => { ui.libCats = new Set([b.dataset.v]); ui.libQuery = ""; ui.libLimit = PAGE; rerender(); };
actions["lib-reset"] = () => { ui.libCats = new Set(); ui.libQuery = ""; ui.libLimit = PAGE; if (ui.route !== "bibliotheque") go("bibliotheque"); else rerender(); };
actions["lib-more"] = () => { ui.libLimit += PAGE; rerender(); };
inputs.push(t => { if (t.id !== "libsearch") return false; ui.libQuery = t.value; ui.libLimit = PAGE; rerender(); return true; });

const SENSITIVE_BANNER = "Ces informations sont générales et ne remplacent pas une évaluation par un professionnel de santé qualifié. En cas de danger immédiat, contactez les services d’urgence locaux.";
export function pArticle(slug){
  const all = publishedArticles();
  const staffPreview = store.isStaff() ? C.articles.find(x => x.slug === slug) : null;
  const a = all.find(x => x.slug === slug) || staffPreview;
  if (!a) return pageHead("La Bibliothèque", "Article introuvable", "Cet article n’existe pas ou n’est pas encore publié.") + `<section class="section"><div class="wrap"><button class="btn btn-primary" data-go="bibliotheque">${icon("back")}Retour à la Bibliothèque</button></div></section>`;
  const rel = (a.related || []).map(s => all.find(x => x.slug === s)).filter(Boolean);
  const more = all.filter(x => x.cat === a.cat && x.slug !== a.slug && !rel.includes(x));
  const related = [...rel, ...more].slice(0, 3);
  const url = location.origin + location.pathname + "#article-" + a.slug;
  const saved = S.saved?.article?.has(a.slug);
  return `<section class="page-head"><div class="wrap narrow" style="margin:0 auto">
    <nav class="crumb" aria-label="Fil d’Ariane"><ol class="crumbs"><li><a href="#accueil" data-go="accueil">Accueil</a></li><li><a href="#bibliotheque" data-go="bibliotheque">Bibliothèque</a></li>
     <li><a href="#bibliotheque-${catSlug(a.cat)}" data-go="bibliotheque-${catSlug(a.cat)}">${esc(a.cat)}</a></li><li aria-current="page">${esc(a.title)}</li></ol></nav>
    <span class="eyebrow">${esc(a.cat)}</span><h1 class="art-title">${esc(a.title)}</h1><p class="muted small">${readTime(a)}</p>
    ${a.etat !== "publie" ? `<div class="notice">${icon("eye")}<span>Aperçu réservé à l’équipe : cet article n’est pas publié (statut « ${esc(a.etat === "a_relire" ? "à relire" : a.etat)} »).</span></div>` : ""}
   </div></section>
  <section class="section" style="padding-top:28px"><div class="wrap narrow stack-lg" style="margin:0 auto">
   ${a.sensitive ? `<div class="notice" role="note">${icon("info")}<span>${SENSITIVE_BANNER}</span></div>` : ""}
   ${a.image_url ? `<img class="art-img" src="${esc(a.image_url)}" alt="${esc(a.image_alt || "")}">` : ""}
   <article class="prose article-body">
    <p class="lede">${esc(a.excerpt)}</p>
    ${(a.sections || []).map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).map(p => `<p>${esc(p)}</p>`).join("")}`).join("")}
    ${!a.sections?.length ? (a.body || []).map(p => `<p>${esc(p)}</p>`).join("") : ""}
    ${a.retenir ? `<p class="retenir">${esc(a.retenir)}</p>` : ""}
   </article>
   <p class="small muted mention">LE SEUIL — Information générale, sans diagnostic ni remplacement des soins.</p>
   ${a.refs?.length ? `<details class="refs"><summary>Références et cadre éditorial</summary><ul>${a.refs.map(r => `<li>${esc(r)}</li>`).join("")}</ul><p class="small muted">Références de fond, et non citations directes.</p></details>` : ""}
   <div class="row share" role="group" aria-label="Partager cet article">
    <span class="small muted">Partager :</span>
    <a class="btn btn-soft btn-sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(a.title + " — " + url)}">WhatsApp</a>
    <a class="btn btn-soft btn-sm" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
    <a class="btn btn-soft btn-sm" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a>
    <button class="btn btn-soft btn-sm" data-act="copylink" data-id="${esc(a.slug)}">${icon("list")}Copier le lien</button>
    ${S.user && S.enrolment ? `<button class="btn ${saved ? "btn-primary" : "btn-ghost"} btn-sm" data-act="savearticle" data-id="${esc(a.slug)}">${icon("bookmark")}${saved ? "Enregistré" : "Enregistrer"}</button>` : ""}
   </div>
   ${related.length ? `<section class="stack" aria-labelledby="rel"><h2 id="rel" class="h-sub">À lire aussi</h2><div class="grid g3">${related.map(articleCard).join("")}</div></section>` : ""}
   <button class="btn btn-ghost" data-act="lib-back" style="align-self:flex-start">${icon("back")}Retour à la Bibliothèque</button>
  </div></section>`;
}
actions["lib-back"] = () => go("bibliotheque");
actions["copylink"] = (b) => {
  const url = location.origin + location.pathname + "#article-" + b.dataset.id;
  try { navigator.clipboard.writeText(url).then(() => toast("Lien copié"), () => toast("Copie impossible ici")); } catch (e) { toast("Copie impossible ici"); }
};
actions["savearticle"] = async (b) => { const on = await store.toggleSaved("article", b.dataset.id); toast(on ? "Article enregistré" : "Article retiré"); rerender(); };
