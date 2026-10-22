// LE SEUIL — routeur, délégation d'événements et démarrage.
import { $, toast } from "./ui/util.js";
import { ui, actions, forms, inputs, changes, hooks } from "./ui/state.js";
import * as P from "./ui/public.js";
import * as M from "./ui/member.js";
import * as ST from "./ui/staff.js";
import * as AD from "./ui/admin.js";
import * as L from "./ui/library.js";
import * as PG from "./ui/programmes.js";
import * as store from "./store.js";
import { S, C } from "./store.js";
import { stopBreath } from "./ui/exercises.js";

// Retour d'un lien d'accès (invitation / réinitialisation) : Supabase lit les jetons dans l'URL.
const AUTH_HASH = /access_token=|error_description=|type=(invite|recovery)/.test(location.hash);
const AUTH_ERROR = /error_description=/.test(location.hash);
let current = AUTH_HASH ? "premier-acces" : (location.hash.slice(1) || "accueil");

function go(r){
  current = r;
  try { history.pushState(null, "", "#" + r); } catch(e) {}
  $("#mainnav")?.classList.remove("open");
  render(true);
}
window.addEventListener("popstate", () => { current = location.hash.slice(1) || "accueil"; render(true); });
window.addEventListener("hashchange", () => { if (/access_token=|error_description=/.test(location.hash)) return; const h = location.hash.slice(1) || (current === "premier-acces" ? "premier-acces" : "accueil"); if (h !== current) { current = h; render(true); } });

const MEMBER = { espace: M.mDash, demarrer: M.mOnboarding, lecons: M.mLessons, exercices: M.mExercises, journal: M.mJournal, objectifs: M.mGoals,
  evolution: M.mProgress, plan: M.mPlan, outils: M.mTools, coach: M.mCoach, compte: M.mAccount };
const STAFF = { accompagnante: ST.sDash, "accompagnante-participants": ST.sParticipants, "accompagnante-messages": ST.sMessages,
  "accompagnante-agenda": ST.sAgenda, "accompagnante-taches": ST.sTasks, "accompagnante-parametres": ST.sSettings };

function page(r){
  let m;
  ui.params = [];
  if (r === "accueil") return P.pHome();
  if (r === "apropos" || r === "decouvrir") return P.pAbout();
  if (r === "programmes") return PG.pProgrammes();
  if ((m = r.match(/^programme-(.+)$/))) return PG.pProgramme(m[1]);
  if (r === "bibliotheque") return L.pLibrary();
  if ((m = r.match(/^bibliotheque-(.+)$/))) return L.pLibrary(m[1]);
  if ((m = r.match(/^article-(.+)$/))) return L.pArticle(m[1]);
  if (r === "faq") return P.pFAQ();
  if (r === "contact") return P.pContact();
  if (r === "aide" || r === "urgence") return P.pHelp();
  if (P.isLegal(r)) return P.pLegal(r);
  if (r === "premier-acces" || r === "nouveau-mot-de-passe") return P.pFirstAccess();
  if (r === "connexion") return S.user ? redirect(P.homeRoute()) : P.pLogin();

  // Double authentification à valider avant tout espace privé de l'équipe
  if (r === "verification") return S.user && store.needsMfa() ? ST.sVerify() : redirect(S.user ? P.homeRoute() : "connexion");
  const privateStaff = r.startsWith("accompagnante") || r.startsWith("admin") || r.startsWith("apercu");
  if (privateStaff && S.user && store.needsMfa()) return redirect("verification");
  // Espace accompagnante (rôles vérifiés ici pour l'affichage ; les données sont protégées côté serveur)
  if (r.startsWith("accompagnante")) {
    if (!S.user) return redirect("connexion");
    const team = store.isTeam(), staff = store.isStaff();
    if (r === "accompagnante-parametres") return ST.sSettings();
    if (r === "accompagnante-programmes") { if (!staff) return redirect(P.homeRoute()); ui.adminTab = "programmes"; return AD.aMain(); }
    if (!team) return redirect(P.homeRoute());
    if (r === "accompagnante-demandes") return S.user.role === "admin" ? ST.sRequests() : redirect("accompagnante");
    if ((m = r.match(/^accompagnante-p-(.+)$/))) { ui.params = [m[1]]; return ST.sParticipant(m[1]); }
    return (STAFF[r] || ST.sDash)();
  }
  // Administration
  if (r.startsWith("admin") || r.startsWith("apercu")) {
    if (!store.isStaff()) return S.user ? redirect(P.homeRoute()) : redirect("connexion");
    if ((m = r.match(/^apercu-(\d+)-(\d+)$/))) { ui.route = "apercu"; ui.params = [+m[1], +m[2]]; return M.mPlayer(+m[1], +m[2], true); }
    if ((m = r.match(/^admin-programme-(.+)$/))) return AD.aProgramme(m[1]);
    if ((m = r.match(/^admin-semaine-(.+)-(\d+)$/))) { ui.params = [m[1], +m[2]]; return AD.aWeek(m[1], +m[2]); }
    if ((m = r.match(/^admin-etape-(.+)-(\d+)-(?:new-(\w+)|(\d+))$/))) { ui.params = [m[1], +m[2]]; return AD.aStep(m[1], +m[2], m[3] ? "new" : m[4], m[3]); }
    if (["demandes", "participants", "programmes"].includes(ui.adminTab) && r === "admin") ui.adminTab = "vue";
    return AD.aMain();
  }
  // Espace participant
  if (MEMBER[r] || r.startsWith("semaine-")) {
    if (!S.user) return redirect("connexion");
    if (store.isTeam()) return redirect("accompagnante");
    if (store.isStaff() && !S.enrolment) return redirect(P.homeRoute());
    if ((m = r.match(/^semaine-(\d+)-(\d+)$/))) { ui.route = "semaine"; ui.params = [+m[1], +m[2]]; return M.mPlayer(+m[1], +m[2]); }
    return MEMBER[r]();
  }
  return redirect("accueil");
}
function redirect(r){ current = r; try { history.replaceState(null, "", "#" + r); } catch(e) {} ui.route = r; return page(r); }

const PRIVATE = /^(programme|programmes|connexion|premier-acces|verification|espace|lecons|semaine|exercices|journal|objectifs|evolution|plan|outils|coach|compte|demarrer|admin|apercu|accompagnante)/;
function render(navigated = false){
  stopBreath();
  // Premier accès : le participant doit choisir son mot de passe avant toute autre page privée.
  if (S.user && S.profile?.must_set_password && !/^(premier-acces|aide|confidentialite|conditions|limites|protection|accessibilite)$/.test(current)) current = "premier-acces";
  ui.route = current;
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.content = PRIVATE.test(current) ? "noindex, nofollow" : "index, follow";
  const html = page(current);
  $("#app").innerHTML = P.header() + `<main id="main" tabindex="-1">${html}</main>` + P.footer();
  if (navigated) {
    window.scrollTo(0, 0);
    ui.missing = {}; ui.confirm = null;
    const h = document.querySelector("main h1, main h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
}
function rerender(){
  const y = window.scrollY, ae = document.activeElement, id = ae?.id, sel = ae && "selectionStart" in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  render(false);
  window.scrollTo(0, y);
  if (id) { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch(e) {} } }
}
hooks.render = render; hooks.rerender = rerender; hooks.go = go;

/* ---------- Délégation d'événements ---------- */
actions["burger"] = (b) => { const n = $("#mainnav"); n.classList.toggle("open"); b.setAttribute("aria-expanded", n.classList.contains("open")); };
const guard = (fn) => async (...a) => { try { await fn(...a); } catch(e) { console.error(e); toast("Une erreur est survenue. Vérifiez votre connexion et réessayez."); } };

document.addEventListener("click", guard(async (e) => {
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled) { e.preventDefault(); go(g.dataset.go); return; }
  const b = e.target.closest("[data-act]");
  if (b && !b.disabled && actions[b.dataset.act]) { e.preventDefault(); await actions[b.dataset.act](b, e); }
}));
document.addEventListener("submit", guard(async (e) => {
  const f = e.target; if (!forms[f.id]) return;
  e.preventDefault(); await forms[f.id](f, e);
}));
document.addEventListener("input", (e) => { for (const h of inputs) if (h(e.target)) return; });
document.addEventListener("change", (e) => { for (const h of changes) if (h(e.target)) return; });

/* ---------- Démarrage ---------- */
store.onEvent((evt) => {
  if (evt === "recovery") { go("nouveau-mot-de-passe"); return; }
  ST.dropStaff();
  render(false);
});
$("#app").innerHTML = `<div class="boot"><p class="muted">Chargement…</p></div>`;
store.boot().catch(err => { console.error(err); toast("Connexion au service impossible. Certains contenus peuvent manquer."); }).finally(() => {
  if (AUTH_HASH) { try { history.replaceState(null, "", location.pathname + "#premier-acces"); } catch (e) {} if (AUTH_ERROR && !S.user) toast("Ce lien a expiré ou a déjà été utilisé."); }
  render(true);
});
