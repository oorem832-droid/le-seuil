// Génère les fichiers d'initialisation de la base :
//  - supabase/seed.sql            : public (forfaits, présentations des programmes, 62 articles « à relire »)
//  - supabase/private/programme-01.sql : PRIVÉ, contenu des leçons (seulement si private/programme01.js existe)
// Usage : npm run seed
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { PLANS, PROGRAMME_CATALOGUE } from '../src/content.js';
import { LIBRARY, LIBRARY_REFERENCES } from '../src/library.js';

const q = (v) => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) => `array[${(a || []).map(q).join(',')}]::text[]`;
const json = (o) => `${q(JSON.stringify(o))}::jsonb`;
const txt = (bl) => Array.isArray(bl) ? bl.map(b => typeof b === 'string' ? b : b.text || (b.items || []).join('\n')).join('\n\n') : (bl || '');
const FLAG = { ecrit: 'written_support', appels: 'support_calls' };
const readMin = (w) => Math.max(1, Math.ceil(w / 200));

let sql = `-- Généré par scripts/generate-seed.mjs. Aucun contenu de leçon privé dans ce fichier.\n\n`;
sql += `insert into public.plans (tier, name, short_name, price_fcfa, features, requires_flag, sort_order) values\n` +
  PLANS.map((p, i) => `  (${q(p.id)}, ${q(p.name)}, ${q(p.short)}, ${parseInt(p.price.replace(/\D/g, ''))}, ${arr(p.lines)}, ${q(FLAG[p.id] || null)}, ${i})`).join(',\n') +
  `\non conflict (tier) do update set name = excluded.name, short_name = excluded.short_name, price_fcfa = excluded.price_fcfa, features = excluded.features;\n\n`;

// Présentations publiques des programmes (catalogue)
for (const p of PROGRAMME_CATALOGUE) {
  sql += `insert into public.programmes (slug, code, title, summary, category, public_intro, public_goal, benefits, library_categories, status, cover_hue, sort_order, measures, open_for_requests)
values (${q(p.slug)}, ${q(p.code)}, ${q(p.title)}, ${q(p.summary)}, ${q(p.category)}, ${q(p.intro)}, ${q(p.goal)}, ${arr(p.benefits)}, ${arr(p.library)}, ${q(p.status)}, ${q(p.hue)}, ${p.order}, ${json(p.measures || [])}, ${p.open ? 'true' : 'false'})
on conflict (slug) do update set code = excluded.code, title = excluded.title, summary = excluded.summary, category = excluded.category, public_intro = excluded.public_intro,
  public_goal = excluded.public_goal, benefits = excluded.benefits, library_categories = excluded.library_categories, sort_order = excluded.sort_order, open_for_requests = excluded.open_for_requests;\n`;
}
sql += '\n';

// Bibliothèque : 62 articles, tous « à relire » (invisibles au public tant qu'ils ne sont pas approuvés)
const related = (a) => {
  const same = LIBRARY.filter(x => x.category === a.category && x.id !== a.id).map(x => x.slug);
  return same.slice(0, 3);
};
sql += `insert into public.articles (slug, title, category, excerpt, body, sections, retenir, references_list, related, read_minutes, cover_hue, etat, featured, featured_order, sort_order, sensitive, professional_review_required) values\n` +
  LIBRARY.map(a => `  (${q(a.slug)}, ${q(a.title)}, ${q(a.category)}, ${q(a.chapeau)}, ${arr([a.chapeau])}, ${json(a.sections)}, ${q(a.retenir)}, ${arr(LIBRARY_REFERENCES)}, ${arr(related(a))}, ${readMin(a.words)}, ${q(['sage','forest','gold'][a.n % 3])}, 'a_relire', ${a.featured}, ${a.featured_order ?? 'null'}, ${a.order}, ${a.sensitive}, ${a.professional_review})`).join(',\n') +
  `\non conflict (slug) do nothing;\n`;
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('supabase/seed.sql written');

// Contenu privé des programmes (private/programmeXX.js → supabase/private/programme-XX.sql). Jamais dans le dépôt.
const privDir = new URL('../private/', import.meta.url);
const stepSQL = (P, w, st, pos, mode = 'nothing') => {
  const { id, kind, title, required, position_offset, ...content } = st;
  return `insert into public.programme_steps (week_id, step_key, position, kind, title, required, content)\n  select w.id, ${q(id)}, ${pos}, ${q(kind)}, ${q(title)}, ${(required ?? kind !== 'video') ? 'true' : 'false'}, ${json(content)}\n  from public.programme_weeks w join public.programmes p on p.id = w.programme_id where p.slug = ${q(P.slug)} and w.week_number = ${w.n}\non conflict (week_id, step_key) do ${mode === 'update' ? 'update set content = excluded.content' : 'nothing'};\n`;
};
// Les étapes « point de départ » ont des positions négatives : elles s'insèrent avant les étapes existantes.
const positions = (w) => { const off = w.steps.filter(s => s.position_offset).length; let a = -off, b = 0; return w.steps.map(s => s.position_offset ? a++ : b++); };
if (existsSync(privDir)) {
  const { readdirSync } = await import('node:fs');
  mkdirSync(new URL('../supabase/private/', import.meta.url), { recursive: true });
  for (const f of readdirSync(privDir).filter(f => /^programme\d\d\.js$/.test(f)).sort()) {
    const code = f.match(/\d\d/)[0];
    const P = (await import(new URL(f, privDir).href))[`PROGRAMME_${code}`];
    let s = `-- PRIVÉ — contenu des leçons du Programme ${code} (${P.title}). Ne pas publier. À exécuter dans le SQL Editor de Supabase,\n-- après supabase/seed.sql (qui crée la présentation publique du programme).\n\n`;
    s += `update public.programmes set intro = ${q(txt(P.intro))}, objectives = ${arr(P.objectives)}, measures = ${json(P.measures)} where slug = ${q(P.slug)};\n\n`;
    for (const w of P.weeks) {
      s += `insert into public.programme_weeks (programme_id, week_number, title, intro)\n  select id, ${w.n}, ${q(w.title)}, ${q(txt(w.intro))} from public.programmes where slug = ${q(P.slug)}\non conflict (programme_id, week_number) do nothing;\n`;
      const pos = positions(w);
      w.steps.forEach((st, i) => { s += stepSQL(P, w, st, pos[i]); });
    }
    writeFileSync(new URL(`../supabase/private/programme-${code}.sql`, import.meta.url), s);
    console.log(`supabase/private/programme-${code}.sql written (PRIVÉ)`);
    // Programme 01, déjà en ligne : mise à jour ciblée (point de départ + bilans des semaines 3 et 6), sans toucher au reste.
    if (code === '01') {
      let u = `-- PRIVÉ — mise à jour du Programme 01 déjà installé : ajoute « Mon point de départ » et le relie aux bilans des semaines 3 et 6.\n\n`;
      const w1 = P.weeks[0], p1 = positions(w1);
      w1.steps.forEach((st, i) => { if (st.position_offset) u += stepSQL(P, w1, st, p1[i]); });
      for (const n of [3, 6]) { const w = P.weeks[n - 1], p = positions(w); w.steps.forEach((st, i) => { if (st.fields?.some(x => x.type === 'baseline_recall')) u += stepSQL(P, w, st, p[i], 'update'); }); }
      writeFileSync(new URL('../supabase/private/programme-01-mise-a-jour.sql', import.meta.url), u);
      console.log('supabase/private/programme-01-mise-a-jour.sql written (PRIVÉ)');
    }
  }
}
