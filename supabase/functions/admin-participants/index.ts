// LE SEUIL — Fonction serveur (Supabase Edge Function) « admin-participants »
// Création des comptes participants par l'administration, envoi des accès, suspension.
// La clé service_role reste ici, côté serveur ; elle n'apparaît jamais dans le site public.
//
// Actions (POST JSON, en-tête Authorization: Bearer <jeton de l'administratrice>) :
//   { action: "create", first_name, last_name, email, programme_id, plan, payment_status, admission_status,
//     access_starts_at?, access_expires_at?, coach_id?, locale?, admin_note?, consent_recorded: true, send_now: boolean }
//   { action: "send_access", user_id }
//   { action: "set_account_status", user_id, status: "active" | "suspended" }
//
// Le participant reçoit un e-mail (modèle « Invite user » ou « Reset password » de Supabase, en français)
// avec un lien à usage unique et à durée limitée pour choisir son mot de passe. Aucun mot de passe
// n'est envoyé par e-mail ni stocké en clair.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = (Deno.env.get("SITE_URL") || "").replace(/\/?$/, "/");

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PLANS = ["autonome", "ecrit", "appels"];
const PAY = ["non_paye", "en_attente", "paye", "offert"];
const ADM = ["en_attente", "admis", "refuse"];
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  if (!SITE_URL || SITE_URL === "/") return json({ error: "Le secret SITE_URL n’est pas configuré." }, 500);

  // 1. Qui appelle ? Vérification côté serveur du rôle administrateur.
  const authHeader = req.headers.get("Authorization") || "";
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller } } = await asCaller.auth.getUser();
  if (!caller) return json({ error: "Non connecté" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: me } = await admin.from("profiles").select("role, account_status").eq("id", caller.id).single();
  if (!me || me.role !== "admin" || me.account_status !== "active") return json({ error: "Accès réservé à l’administration" }, 403);

  const log = (action: string, enrolment_id: string | null, details: Record<string, unknown>) =>
    admin.from("access_log").insert({ actor_id: caller.id, actor_role: "admin", action, enrolment_id, details });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const redirectTo = SITE_URL + "#premier-acces";

  try {
    if (body.action === "create") {
      const first_name = clean(body.first_name, 100), last_name = clean(body.last_name, 100), email = clean(body.email, 320).toLowerCase();
      const plan = clean(body.plan), payment = clean(body.payment_status), admission = clean(body.admission_status);
      if (!first_name || !last_name || !emailOk(email)) return json({ error: "Prénom, nom et e-mail valides sont requis." }, 400);
      if (!PLANS.includes(plan) || !PAY.includes(payment) || !ADM.includes(admission)) return json({ error: "Forfait, paiement ou admission invalide." }, 400);
      if (body.consent_recorded !== true) return json({ error: "Le consentement du participant doit être recueilli." }, 400);
      const { data: prog } = await admin.from("programmes").select("id, title").eq("id", clean(body.programme_id, 60)).single();
      if (!prog) return json({ error: "Programme introuvable." }, 400);
      const coach = plan === "autonome" ? null : (clean(body.coach_id, 60) || null);
      if (coach) { const { data: c } = await admin.from("profiles").select("role").eq("id", coach).single(); if (!c || !["coach", "admin"].includes(c.role)) return json({ error: "Accompagnante invalide." }, 400); }

      const meta = { first_name, programme: prog.title };
      let userId: string;
      if (body.send_now) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo });
        if (error) return json({ error: error.message.includes("already") ? "Un compte existe déjà avec cet e-mail. Ajoutez-lui le programme depuis sa fiche." : error.message }, 400);
        userId = data.user.id;
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: meta });
        if (error) return json({ error: error.message.includes("already") ? "Un compte existe déjà avec cet e-mail." : error.message }, 400);
        userId = data.user.id;
      }
      // Le profil est créé par le déclencheur on_auth_user_created ; on le complète.
      await admin.from("profiles").update({ first_name, last_name, must_set_password: true, role: "member", locale: clean(body.locale) === "en" ? "en" : "fr" }).eq("id", userId);
      const { data: enr, error: e2 } = await admin.from("enrolments").insert({
        user_id: userId, programme_id: prog.id, plan, status: "active", payment_status: payment, admission_status: admission,
        access_starts_at: body.access_starts_at || null, access_expires_at: body.access_expires_at || null, coach_id: coach,
        created_by: caller.id, data_consent_recorded_at: new Date().toISOString(),
      }).select("id").single();
      if (e2) return json({ error: e2.message }, 400);
      const note = clean(body.admin_note, 5000);
      if (note) await admin.from("participant_admin_notes").insert({ user_id: userId, body: note, author_id: caller.id });
      await log(body.send_now ? "admin_create_participant_and_invite" : "admin_create_participant", enr.id, { user: userId, programme: prog.id, plan });
      return json({ ok: true, user_id: userId, enrolment_id: enr.id, invited: !!body.send_now });
    }

    if (body.action === "send_access") {
      const uid = clean(body.user_id, 60);
      const { data: { user }, error } = await admin.auth.admin.getUserById(uid);
      if (error || !user) return json({ error: "Participant introuvable." }, 404);
      const { data: prof } = await admin.from("profiles").select("first_name, account_status").eq("id", uid).single();
      if (prof?.account_status !== "active") return json({ error: "Ce compte est suspendu." }, 400);
      const { data: enr } = await admin.from("enrolments").select("programmes(title)").eq("user_id", uid).order("created_at").limit(1).maybeSingle();
      let how = "invite";
      if (!user.last_sign_in_at) {
        const r = await admin.auth.admin.inviteUserByEmail(user.email!, { data: { first_name: prof?.first_name, programme: (enr as any)?.programmes?.title || "" }, redirectTo });
        if (r.error) how = "recovery";
      } else how = "recovery";
      if (how === "recovery") {
        const pub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
        const r = await pub.auth.resetPasswordForEmail(user.email!, { redirectTo });
        if (r.error) return json({ error: r.error.message }, 400);
      }
      await admin.from("profiles").update({ must_set_password: true }).eq("id", uid);
      await log("admin_send_access", null, { user: uid, method: how });
      return json({ ok: true, method: how });
    }

    if (body.action === "set_account_status") {
      const uid = clean(body.user_id, 60), status = clean(body.status);
      if (!["active", "suspended"].includes(status)) return json({ error: "Statut invalide." }, 400);
      if (uid === caller.id) return json({ error: "Vous ne pouvez pas suspendre votre propre compte." }, 400);
      await admin.from("profiles").update({ account_status: status }).eq("id", uid);
      await admin.auth.admin.updateUserById(uid, { ban_duration: status === "suspended" ? "876000h" : "none" });
      await log("admin_account_" + status, null, { user: uid });
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
