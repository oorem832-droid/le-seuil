// LE SEUIL — Fonction serveur « inscriptions » (Supabase Edge Function)
// Demande → e-mail de confirmation + notification administratrice → décision (e-mail adapté)
// → lien de paiement sécurisé → paiement chez le prestataire → vérification serveur → activation + reçu.
//
// Secrets à configurer (Supabase → Edge Functions → Secrets) :
//   SITE_URL            https://orejeen.com/leseuil/
//   RESEND_API_KEY      clé du service d'envoi d'e-mails Resend (domaine orejeen.com vérifié)
//   MAIL_FROM           LE SEUIL <leseuil@orejeen.com>        (facultatif, valeur par défaut)
//   ADMIN_EMAIL         leseuil@orejeen.com                    (facultatif, valeur par défaut)
//   PAYMENT_MODE        off | test | cinetpay                  (off par défaut ; test = simulation réservée à l’administratrice)
//   CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY   (uniquement en mode cinetpay)
//
// Règles : aucun contenu de santé dans les e-mails ; aucun accès payant avant paiement confirmé par le
// prestataire (vérification serveur) ; activation unique même si la notification arrive plusieurs fois.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const env = (k: string, d = "") => Deno.env.get(k) || d;
const SUPABASE_URL = env("SUPABASE_URL"), SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY"), ANON_KEY = env("SUPABASE_ANON_KEY");
const SITE_URL = env("SITE_URL", "https://orejeen.com/leseuil/").replace(/\/?$/, "/");
const MAIL_FROM = env("MAIL_FROM", "LE SEUIL <leseuil@orejeen.com>");
const ADMIN_EMAIL = env("ADMIN_EMAIL", "leseuil@orejeen.com");
const PAYMENT_MODE = env("PAYMENT_MODE", "off");
const LINK_DAYS = 14;

const cors = {
  "Access-Control-Allow-Origin": env("ALLOWED_ORIGIN", "*"),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const fcfa = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ") + " FCFA";
const escH = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const PLAN_LABEL: Record<string, string> = { autonome: "Formule 1 — Autonome", ecrit: "Formule 2 — Accompagnement écrit", appels: "Formule 3 — Accompagnement par appels" };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function randomToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function hmac256(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const event = (request_id: string, ev: string, details: Record<string, unknown> = {}, actor = "systeme") =>
  db.from("request_events").insert({ request_id, actor, event: ev, details });

/* ---------------- E-mails (Resend) ---------------- */
function layout(body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F1E4;font-family:Georgia,'Times New Roman',serif;color:#1F2B22">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px"><p style="letter-spacing:.18em;font-size:13px;color:#2D4733;margin:0 0 18px">LE SEUIL</p>
  <div style="background:#fff;border:1px solid #E2D8C6;border-radius:14px;padding:26px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">${body}</div>
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5D6A5F;margin:16px 4px">LE SEUIL n’est pas un service d’urgence. En cas de danger immédiat en Côte d’Ivoire, appelez le SAMU au 185.<br>leseuil@orejeen.com · orejeen.com/leseuil</p></div></body></html>`;
}
const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
const btn = (href: string, label: string) => `<p style="margin:22px 0"><a href="${escH(href)}" style="background:#2D4733;color:#F7F1E4;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:bold">${escH(label)}</a></p>`;
const sign = p("L’équipe LE SEUIL<br><em>S’ouvrir pour mieux vivre.</em>");

async function sendMail(kind: string, to: string, subject: string, html: string, request_id: string | null) {
  const domain = to.split("@")[1] || "";
  const key = env("RESEND_API_KEY");
  if (!key) { await db.from("email_log").insert({ request_id, kind, recipient_domain: domain, status: "non_configure", error: "RESEND_API_KEY absent" }); return { ok: false, configured: false }; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], reply_to: ADMIN_EMAIL, subject, html }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { await db.from("email_log").insert({ request_id, kind, recipient_domain: domain, status: "echec", error: String(j?.message || r.status).slice(0, 500) }); return { ok: false, configured: true, error: j?.message }; }
    await db.from("email_log").insert({ request_id, kind, recipient_domain: domain, status: "envoye", provider_id: j?.id || null });
    return { ok: true, configured: true };
  } catch (e) {
    await db.from("email_log").insert({ request_id, kind, recipient_domain: domain, status: "echec", error: String(e).slice(0, 500) });
    return { ok: false, configured: true };
  }
}

async function loadRequest(id: string) {
  const { data: r } = await db.from("enrolment_requests").select("*").eq("id", id).maybeSingle();
  if (!r) return null;
  const { data: prog } = await db.from("programmes").select("id, title").eq("slug", r.programme_slug).maybeSingle();
  return { r, prog };
}

/* ---------------- Lien de paiement ---------------- */
async function newPaymentLink(request_id: string) {
  const token = randomToken();
  await db.from("payment_links").delete().eq("request_id", request_id);
  await db.from("payment_links").insert({ token_hash: await sha256(token), request_id, expires_at: new Date(Date.now() + LINK_DAYS * 864e5).toISOString() });
  return SITE_URL + "#finaliser-" + token;
}
async function fromToken(token: string) {
  if (!token || token.length < 30) return null;
  const { data: l } = await db.from("payment_links").select("request_id, expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (!l) return null;
  const x = await loadRequest(l.request_id);
  return x ? { ...x, expires_at: l.expires_at, expired: new Date(l.expires_at) < new Date() } : null;
}

/* ---------------- Activation après paiement (unique) ---------------- */
async function activate(request_id: string, payment: Record<string, any>) {
  const x = await loadRequest(request_id); if (!x) return;
  const { r, prog } = x;
  if (r.status === "active") return; // déjà fait : notification répétée
  if (r.status !== "acceptee" || !prog) { await event(request_id, "activation_refusee", { raison: "statut " + r.status }); return; }
  // Compte : invitation (lien à usage unique pour choisir son mot de passe) ou compte existant.
  let userId: string | null = null;
  const { data: existing } = await db.rpc("user_id_by_email", { p_email: r.email });
  if (existing) userId = existing as string;
  else {
    const { data, error } = await db.auth.admin.inviteUserByEmail(r.email, { data: { first_name: r.first_name, programme: prog.title }, redirectTo: SITE_URL + "#premier-acces" });
    if (error) { await event(request_id, "activation_erreur", { etape: "compte", message: error.message }); return; }
    userId = data.user.id;
    await db.from("profiles").update({ first_name: r.first_name, last_name: r.last_name, must_set_password: true, role: "member" }).eq("id", userId);
  }
  // Inscription au seul programme acheté, avec la formule achetée.
  const { data: enr, error: e2 } = await db.from("enrolments").upsert({
    user_id: userId, programme_id: prog.id, plan: r.plan, status: "active", payment_status: "paye", admission_status: "admis",
    data_consent_recorded_at: r.created_at,
  }, { onConflict: "user_id,programme_id" }).select("id").single();
  if (e2) { await event(request_id, "activation_erreur", { etape: "inscription", message: e2.message }); return; }
  const { data: done } = await db.from("enrolment_requests").update({ status: "active", payment_status: "paye", activated_at: new Date().toISOString(), enrolment_id: enr.id, user_id: userId })
    .eq("id", request_id).eq("status", "acceptee").select("id");
  if (!done?.length) return; // une autre notification a déjà activé
  await event(request_id, "activation", { enrolment_id: enr.id, plan: r.plan, programme: prog.id });
  await db.from("admin_notifications").insert({ kind: "inscription_active", request_id, title: `Paiement confirmé — inscription active ${r.reference}${r.plan !== "autonome" ? " (attribuer une accompagnante)" : ""}` });
  await db.from("access_log").insert({ actor_role: null, action: "inscription_activee_apres_paiement", enrolment_id: enr.id, details: { request: request_id, plan: r.plan } });
  const paid = payment.paid_at ? new Date(payment.paid_at) : new Date();
  await sendMail("bienvenue", r.email, "LE SEUIL — Paiement confirmé, bienvenue !", layout(
    p(`Bonjour ${escH(r.first_name)},`) +
    p(`Votre paiement a bien été reçu et votre inscription au programme <b>${escH(prog.title)}</b> est maintenant active.`) +
    p(existing ? "Connectez-vous à votre espace LE SEUIL avec votre adresse e-mail habituelle pour commencer." : "Vous allez recevoir un second e-mail pour choisir votre mot de passe et accéder à votre espace. Ce lien est personnel et à usage unique.") +
    `<table style="width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:14px">
      <tr><td colspan="2" style="padding:6px 0;font-weight:bold;border-bottom:1px solid #E2D8C6">Reçu n° ${escH(payment.receipt_number)}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Programme</td><td style="padding:6px 0;text-align:right">${escH(prog.title)}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Formule</td><td style="padding:6px 0;text-align:right">${escH(PLAN_LABEL[r.plan])}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Montant</td><td style="padding:6px 0;text-align:right">${fcfa(payment.amount_fcfa)}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Date</td><td style="padding:6px 0;text-align:right">${paid.toLocaleDateString("fr-FR", { timeZone: "Africa/Abidjan" })}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Référence de transaction</td><td style="padding:6px 0;text-align:right">${escH(payment.transaction_id)}</td></tr>
      <tr><td style="padding:6px 0;color:#5D6A5F">Demande</td><td style="padding:6px 0;text-align:right">${escH(r.reference)}</td></tr></table>` +
    btn(SITE_URL + "#connexion", "Accéder à mon espace") + sign), request_id);
}

/* ---------------- Résultat d'un paiement (webhook ou mode test) ---------------- */
async function settle(transaction_id: string, outcome: "reussi" | "echoue" | "en_attente", info: Record<string, unknown> = {}) {
  const { data: pay } = await db.from("request_payments").select("*").eq("transaction_id", transaction_id).maybeSingle();
  if (!pay) return { ok: false, error: "transaction inconnue" };
  if (pay.status === "reussi") { await activate(pay.request_id, pay); return { ok: true, already: true }; }
  if (outcome === "reussi") {
    const { data: rq } = await db.from("enrolment_requests").select("price_fcfa").eq("id", pay.request_id).single();
    if (info.amount !== undefined && Number(info.amount) !== Number(pay.amount_fcfa)) { await event(pay.request_id, "paiement_montant_incoherent", { attendu: pay.amount_fcfa, recu: info.amount }); return { ok: false, error: "montant incohérent" }; }
    if (rq?.price_fcfa && rq.price_fcfa !== pay.amount_fcfa) return { ok: false, error: "montant incohérent" };
    const receipt = "R-" + transaction_id.slice(-10).toUpperCase();
    const { data: upd } = await db.from("request_payments").update({ status: "reussi", provider_status: String(info.provider_status || "ACCEPTED"), payment_method: info.payment_method || null, operator_ref: info.operator_ref || null, paid_at: new Date().toISOString(), receipt_number: receipt, updated_at: new Date().toISOString() })
      .eq("id", pay.id).neq("status", "reussi").select("*");
    if (!upd?.length) return { ok: true, already: true };
    await db.from("enrolment_requests").update({ payment_status: "paye" }).eq("id", pay.request_id);
    await event(pay.request_id, "paiement_reussi", { transaction_id, montant: pay.amount_fcfa, methode: info.payment_method || null }, "prestataire");
    await activate(pay.request_id, upd[0]);
    return { ok: true };
  }
  const st = outcome === "echoue" ? "echoue" : "en_attente";
  await db.from("request_payments").update({ status: st, provider_status: String(info.provider_status || st), updated_at: new Date().toISOString() }).eq("id", pay.id).neq("status", "reussi");
  await db.from("enrolment_requests").update({ payment_status: st === "echoue" ? "echoue" : "en_cours" }).eq("id", pay.request_id).eq("status", "acceptee");
  await event(pay.request_id, st === "echoue" ? "paiement_echoue" : "paiement_en_attente", { transaction_id }, "prestataire");
  return { ok: true };
}

async function cinetpayCheck(transaction_id: string) {
  const r = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: env("CINETPAY_API_KEY"), site_id: env("CINETPAY_SITE_ID"), transaction_id }) });
  const j = await r.json().catch(() => ({}));
  const s = j?.data?.status;
  const outcome = s === "ACCEPTED" ? "reussi" : (s === "REFUSED" || s === "CANCELED" || s === "CANCELLED") ? "echoue" : "en_attente";
  return { outcome, info: { provider_status: s || j?.message, amount: j?.data?.amount !== undefined ? Number(j.data.amount) : undefined, payment_method: j?.data?.payment_method, operator_ref: j?.data?.operator_id } } as const;
}

async function isAdmin(req: Request) {
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return null;
  const { data: me } = await db.from("profiles").select("role, account_status").eq("id", user.id).single();
  return me?.role === "admin" && me.account_status === "active" ? user : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // Notification du prestataire (CinetPay envoie un formulaire POST ; un GET sert de test de disponibilité).
  if (url.searchParams.get("webhook") === "cinetpay") {
    if (req.method !== "POST") return new Response("ok");
    const form = await req.formData().catch(() => null);
    const tx = String(form?.get("cpm_trans_id") || "");
    if (!tx) return new Response("missing", { status: 400 });
    const secret = env("CINETPAY_SECRET_KEY"), token = req.headers.get("x-token");
    if (secret && token && form) {
      const f = (k: string) => String(form.get(k) ?? "");
      const data = ["cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency", "signature", "payment_method", "cel_phone_num", "cpm_phone_prefixe", "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action", "cpm_custom", "cpm_designation", "cpm_error_message"].map(f).join("");
      if (await hmac256(secret, data) !== token) return new Response("bad token", { status: 401 });
    }
    // Source de vérité : on interroge le prestataire nous-mêmes, jamais le contenu de la notification seule.
    const chk = await cinetpayCheck(tx);
    await settle(tx, chk.outcome, chk.info);
    return new Response("ok");
  }

  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let b: Record<string, any>; try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }

  try {
    /* 1. Après l'enregistrement d'une demande : confirmation au candidat + information à l'administratrice. */
    if (b.action === "confirm") {
      const x = await loadRequest(String(b.id || ""));
      if (!x || x.r.reference !== b.reference) return json({ error: "Demande introuvable" }, 404);
      const { r, prog } = x;
      if (r.confirmation_email_at) return json({ ok: true, already: true });
      if (Date.now() - new Date(r.created_at).getTime() > 60 * 60e3) return json({ error: "Délai dépassé" }, 400);
      await db.from("enrolment_requests").update({ confirmation_email_at: new Date().toISOString() }).eq("id", r.id).is("confirmation_email_at", null);
      const m = await sendMail("confirmation", r.email, "LE SEUIL — Nous avons bien reçu votre demande", layout(
        p("Bonjour,") + p(`Nous avons bien reçu votre demande d’inscription au programme <b>${escH(prog?.title || r.programme_slug)}</b>.`) +
        p("Votre demande est actuellement en cours d’examen.") + p("Vous recevrez un nouvel e-mail dès qu’une décision aura été prise.") +
        p("<b>Aucun paiement n’est nécessaire à cette étape.</b>") + p(`Référence de votre demande : <b>${escH(r.reference)}</b>`) +
        p("Merci pour votre confiance.") + sign), r.id);
      const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "admin_email_notifications").maybeSingle();
      if (flag?.enabled !== false) await sendMail("admin_nouvelle", ADMIN_EMAIL, "LE SEUIL — Nouvelle demande d’inscription", layout(
        p("Une nouvelle demande d’inscription a été reçue sur LE SEUIL.") + p(`Référence : <b>${escH(r.reference)}</b>`) +
        p("Connectez-vous à votre espace administrateur pour la consulter.") + btn(SITE_URL + "#admin-demandes", "Ouvrir les demandes d’inscription")), r.id);
      if (!m.ok && !m.configured) await db.from("enrolment_requests").update({ confirmation_email_at: null }).eq("id", r.id);
      return json({ ok: true, email: m.ok, configured: m.configured });
    }

    /* 2. Page « Finaliser mon inscription » (lien sécurisé reçu par e-mail). */
    if (b.action === "checkout_info" || b.action === "checkout_start" || b.action === "test_complete" || b.action === "checkout_refresh") {
      const x = await fromToken(String(b.token || ""));
      if (!x) return json({ error: "Lien invalide." }, 404);
      const { r, prog } = x;
      const { data: pays } = await db.from("request_payments").select("transaction_id, status, amount_fcfa, paid_at, receipt_number, payment_method, provider").eq("request_id", r.id).order("created_at", { ascending: false });
      const last = pays?.[0] || null, paid = pays?.find(y => y.status === "reussi") || null;
      const view = () => ({ ok: true, first_name: r.first_name, reference: r.reference, programme: prog?.title || r.programme_slug, plan: r.plan, plan_label: PLAN_LABEL[r.plan],
        price_fcfa: r.price_fcfa, status: r.status, payment_status: r.payment_status, expires_at: x.expires_at, expired: x.expired, mode: PAYMENT_MODE,
        payment: paid || last ? { transaction_id: (paid || last)!.transaction_id, status: (paid || last)!.status, paid_at: paid?.paid_at || null, receipt_number: paid?.receipt_number || null, amount_fcfa: (paid || last)!.amount_fcfa } : null });
      if (b.action === "checkout_info") return json(view());

      if (b.action === "checkout_refresh") {
        if (last && last.status !== "reussi" && last.provider === "cinetpay") { const chk = await cinetpayCheck(last.transaction_id); await settle(last.transaction_id, chk.outcome, chk.info); }
        const y = await fromToken(String(b.token));
        const { data: p2 } = await db.from("request_payments").select("transaction_id, status, amount_fcfa, paid_at, receipt_number").eq("request_id", r.id).order("created_at", { ascending: false });
        const l2 = p2?.[0] || null, pd2 = p2?.find(z => z.status === "reussi") || null, use = pd2 || l2;
        return json({ ...view(), status: y!.r.status, payment_status: y!.r.payment_status,
          payment: use ? { transaction_id: use.transaction_id, status: use.status, paid_at: pd2?.paid_at || null, receipt_number: pd2?.receipt_number || null, amount_fcfa: use.amount_fcfa } : null });
      }

      if (b.action === "test_complete") {
        // Environnement de test : simulation réservée à l'administratrice connectée, jamais en mode réel.
        if (PAYMENT_MODE !== "test") return json({ error: "Mode test désactivé." }, 403);
        if (!(await isAdmin(req))) return json({ error: "Simulation réservée à l’administration." }, 403);
        const tx = String(b.transaction_id || "");
        if (!pays?.some(y => y.transaction_id === tx)) return json({ error: "Transaction inconnue." }, 404);
        const outcome = ["reussi", "echoue", "en_attente"].includes(b.outcome) ? b.outcome : "en_attente";
        const res = await settle(tx, outcome, { provider_status: "TEST_" + outcome.toUpperCase(), payment_method: "TEST", amount: last?.amount_fcfa });
        return json(res);
      }

      // checkout_start
      if (x.expired) return json({ error: "Ce lien a expiré. Écrivez-nous à leseuil@orejeen.com pour en recevoir un nouveau." }, 410);
      if (r.status === "active") return json({ error: "Votre inscription est déjà active." }, 409);
      if (r.status !== "acceptee") return json({ error: "Le paiement n’est possible qu’après l’approbation de votre demande." }, 403);
      if (!r.price_fcfa) return json({ error: "Montant introuvable." }, 500);
      if (PAYMENT_MODE === "off") return json({ error: "Le paiement en ligne n’est pas encore ouvert. L’équipe LE SEUIL vous contactera pour les modalités de paiement." }, 503);
      const transaction_id = "LS" + Date.now().toString(36).toUpperCase() + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
      await db.from("request_payments").insert({ request_id: r.id, transaction_id, provider: PAYMENT_MODE === "cinetpay" ? "cinetpay" : "test", amount_fcfa: r.price_fcfa, status: "initie" });
      await db.from("enrolment_requests").update({ payment_status: "en_cours" }).eq("id", r.id);
      await event(r.id, "paiement_initie", { transaction_id, montant: r.price_fcfa, prestataire: PAYMENT_MODE }, "candidat");
      if (PAYMENT_MODE !== "cinetpay") return json({ ok: true, mode: "test", transaction_id });
      const fnUrl = SUPABASE_URL + "/functions/v1/inscriptions?webhook=cinetpay";
      const cp = await fetch("https://api-checkout.cinetpay.com/v2/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        apikey: env("CINETPAY_API_KEY"), site_id: env("CINETPAY_SITE_ID"), transaction_id, amount: r.price_fcfa, currency: "XOF",
        description: `LE SEUIL ${r.reference}`.replace(/[#\/$_&]/g, " "), notify_url: fnUrl, return_url: SITE_URL + "#finaliser-" + b.token,
        channels: "ALL", lang: "fr", metadata: r.reference,
        customer_name: r.last_name, customer_surname: r.first_name, customer_email: r.email, customer_phone_number: r.phone || "", customer_address: "Abidjan", customer_city: "Abidjan", customer_country: "CI", customer_state: "CI", customer_zip_code: "00225",
      }) });
      const j = await cp.json().catch(() => ({}));
      if (j?.code !== "201" || !j?.data?.payment_url) { await event(r.id, "paiement_erreur_prestataire", { message: j?.description || j?.message || cp.status }); return json({ error: "Le service de paiement est indisponible. Réessayez dans quelques minutes." }, 502); }
      return json({ ok: true, mode: "cinetpay", payment_url: j.data.payment_url });
    }

    /* 3. Actions de l'administratrice (après la décision enregistrée par decide_enrolment_request). */
    const adminUser = await isAdmin(req);
    if (!adminUser) return json({ error: "Accès réservé à l’administration" }, 403);

    if (b.action === "decision_email" || b.action === "resend_payment_link") {
      const x = await loadRequest(String(b.id || "")); if (!x) return json({ error: "Demande introuvable" }, 404);
      const { r, prog } = x, title = escH(prog?.title || r.programme_slug);
      let m;
      if (r.status === "acceptee") {
        const link = await newPaymentLink(r.id);
        m = await sendMail("approuvee", r.email, "LE SEUIL — Votre demande a été approuvée", layout(
          p("Bonjour,") + p(`Bonne nouvelle ! Votre demande d’inscription au programme <b>${title}</b> a été approuvée.`) +
          p(`Vous avez choisi la formule <b>${escH(PLAN_LABEL[r.plan])}</b>, au tarif de <b>${fcfa(r.price_fcfa)}</b>.`) +
          p("Pour finaliser votre inscription, ouvrez votre espace sécurisé ci-dessous et procédez au paiement.") + btn(link, "Finaliser mon inscription") +
          p(`<span style="font-size:13px;color:#5D6A5F">Ce lien vous est personnel et reste valable ${LINK_DAYS} jours. Ne le transférez pas.</span>`) +
          p("Une fois votre paiement confirmé, vous pourrez accéder à votre programme.") + p("Nous serons heureux de vous accompagner dans cette démarche.") +
          p("À très bientôt sur LE SEUIL !") + p("L’équipe LE SEUIL")), r.id);
      } else if (r.status === "infos_demandees") {
        m = await sendMail("infos", r.email, "LE SEUIL — Informations complémentaires sur votre demande", layout(
          p("Bonjour,") + p(`Merci pour votre demande d’inscription au programme <b>${title}</b>. Avant de prendre une décision, nous avons besoin de quelques précisions :`) +
          `<blockquote style="margin:0 0 14px;padding:10px 14px;background:#F7F1E4;border-radius:10px">${escH(r.info_request || "").replace(/\n/g, "<br>")}</blockquote>` +
          p(`Répondez simplement à cet e-mail en rappelant votre référence <b>${escH(r.reference)}</b>.`) + sign), r.id);
      } else if (r.status === "refusee" || r.status === "orientation") {
        m = await sendMail("refusee", r.email, "LE SEUIL — Votre demande d’inscription", layout(
          p("Bonjour,") + p(`Merci pour votre demande d’inscription au programme <b>${title}</b> et pour la confiance que vous nous accordez.`) +
          p("Après examen, ce programme ne nous paraît pas être l’accompagnement le plus adapté à votre situation pour le moment. Cette décision ne porte aucun jugement sur vous.") +
          (r.decision_note ? `<blockquote style="margin:0 0 14px;padding:10px 14px;background:#F7F1E4;border-radius:10px">${escH(r.decision_note).replace(/\n/g, "<br>")}</blockquote>` : "") +
          p("Nous vous encourageons à en parler à un professionnel de santé, qui pourra vous orienter. Aucun paiement ne vous sera demandé.") +
          p(`<a href="${SITE_URL}#besoin-aide">Besoin d’aide maintenant ?</a>`) + sign), r.id);
      } else if (r.status === "annulee") {
        m = await sendMail("annulee", r.email, "LE SEUIL — Annulation de votre demande", layout(
          p("Bonjour,") + p(`Votre demande d’inscription au programme <b>${title}</b> (référence ${escH(r.reference)}) a été annulée. Aucun paiement ne vous sera demandé.`) +
          p("Vous pouvez faire une nouvelle demande à tout moment depuis le site.") + sign), r.id);
      } else return json({ ok: true, email: false, reason: "Aucun e-mail pour ce statut." });
      await event(r.id, "email_decision", { statut: r.status, envoye: m.ok }, "admin");
      return json({ ok: true, email: m.ok, configured: m.configured });
    }

    if (b.action === "email_status") {
      return json({ ok: true, resend: !!env("RESEND_API_KEY"), from: MAIL_FROM, admin: ADMIN_EMAIL, payment_mode: PAYMENT_MODE, cinetpay: !!(env("CINETPAY_API_KEY") && env("CINETPAY_SITE_ID")), site_url: SITE_URL });
    }
    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
