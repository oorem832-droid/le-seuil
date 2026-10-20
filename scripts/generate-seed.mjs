// Génère supabase/seed.sql à partir de src/content.js
// Usage : npm run seed
import { writeFileSync } from 'node:fs';
import { ARTICLES, VIDEOS, PLANS, PROGRAMME_01 } from '../src/content.js';

const q = (v) => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(',')}]::text[]`;
const json = (o) => `${q(JSON.stringify(o))}::jsonb`;
const MONTHS = { janvier:1, février:2, mars:3, avril:4, mai:5, juin:6, juillet:7, août:8, septembre:9, octobre:10, novembre:11, décembre:12 };
const isoDate = (fr) => { const [d, m, y] = fr.split(' '); return `${y}-${String(MONTHS[m]).padStart(2,'0')}-${String(d).padStart(2,'0')}`; };
const txt = (bl) => Array.isArray(bl) ? bl.map(b => typeof b === 'string' ? b : b.text || (b.items || []).join('\n')).join('\n\n') : (bl || '');
const FLAG = { ecrit: 'written_support', appels: 'support_calls' };

let sql = `-- Généré par scripts/generate-seed.mjs. Contenus de démonstration.\n-- Programme 01 : importé du document Word (rédaction de travail, à valider avant mise en ligne).\n\n`;

sql += `insert into public.plans (tier, name, short_name, price_fcfa, features, requires_flag, sort_order) values\n` +
  PLANS.map((p, i) => `  (${q(p.id)}, ${q(p.name)}, ${q(p.short)}, ${parseInt(p.price.replace(/\D/g, ''))}, ${arr(p.lines)}, ${q(FLAG[p.id] || null)}, ${i})`).join(',\n') +
  `\non conflict (tier) do update set name = excluded.name, short_name = excluded.short_name, price_fcfa = excluded.price_fcfa, features = excluded.features;\n\n`;

const P = PROGRAMME_01;
sql += `insert into public.programmes (slug, code, title, summary, intro, objectives, status, cover_hue, sort_order, measures) values\n` +
  `  (${q(P.slug)}, ${q(P.code)}, ${q(P.title)}, ${q(P.summary)}, ${q(txt(P.intro))}, ${arr(P.objectives)}, 'demo', 'sage', 1, ${json(P.measures)})\non conflict (slug) do nothing;\n\n`;

for (const w of P.weeks) {
  sql += `insert into public.programme_weeks (programme_id, week_number, title, intro)\n  select id, ${w.n}, ${q(w.title)}, ${q(txt(w.intro))} from public.programmes where slug = ${q(P.slug)}\non conflict (programme_id, week_number) do nothing;\n`;
  w.steps.forEach((s, i) => {
    const { id, kind, title, required, ...content } = s;
    sql += `insert into public.programme_steps (week_id, step_key, position, kind, title, required, content)\n  select w.id, ${q(id)}, ${i}, ${q(kind)}, ${q(title)}, ${(required ?? kind !== 'video') ? 'true' : 'false'}, ${json(content)}\n  from public.programme_weeks w join public.programmes p on p.id = w.programme_id where p.slug = ${q(P.slug)} and w.week_number = ${w.n}\non conflict (week_id, step_key) do nothing;\n`;
  });
  sql += '\n';
}

sql += `insert into public.articles (slug, title, category, excerpt, body, read_minutes, cover_hue, topic_slug, status, published_at) values\n` +
  ARTICLES.map(a => `  (${q(a.id)}, ${q(a.title)}, ${q(a.cat)}, ${q(a.excerpt)}, ${arr(a.body)}, ${a.read}, ${q(a.hue)}, ${q(a.topic)}, 'published', ${q(isoDate(a.date))})`).join(',\n') +
  `\non conflict (slug) do nothing;\n\n`;

sql += `insert into public.videos (title, speaker, description, duration_label, status, sort_order)\nselect * from (values\n` +
  VIDEOS.map((v, i) => `  (${q(v.title)}, ${q(v.who)}, ${q(v.desc)}, ${q(v.len)}, 'demo'::public.content_status, ${i})`).join(',\n') +
  `\n) as v where not exists (select 1 from public.videos);\n`;

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('supabase/seed.sql written');
