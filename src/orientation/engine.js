// LE SEUIL — moteurs du questionnaire d'orientation.
// 1. Sécurité (distinct) : repère les situations A–E à partir des réponses. Aucun niveau de risque n'est calculé.
// 2. Recommandation : additionne les points des règles pour suggérer 1 ou 2 programmes.
// Les réponses restent en mémoire dans le navigateur ; rien n'est enregistré.

/** Une question de sécurité est-elle visible compte tenu des réponses déjà données ? */
export function visible(q, answers){
  if (!q.showIf) return true;
  return q.showIf.split("|").some(cond => { const [qid, oid] = cond.split(":"); return answers[qid] === oid; });
}

/** Situations de sécurité déclenchées. A prime sur tout ; D peut accompagner B, C ou E. */
export function safety(config, answers){
  const flags = new Set();
  for (const q of config.safetyQuestions || []) {
    if (!visible(q, answers)) continue;
    const opt = q.options.find(o => o.id === answers[q.id]);
    if (opt?.flag) flags.add(opt.flag);
  }
  const main = flags.has("A") ? "A" : flags.has("B") ? "B" : flags.has("C") ? "C" : "E";
  return { main, existingSupport: flags.has("D"), flags: [...flags] };
}

/** Situation déclenchée immédiatement par une seule réponse (A : afficher l'aide urgente tout de suite). */
export function immediate(config, qid, oid){
  const q = (config.safetyQuestions || []).find(x => x.id === qid);
  const o = q?.options.find(x => x.id === oid);
  return o?.flag === "A" ? "A" : o?.flag === "B" ? "B" : null;
}

/** Programmes suggérés : [{slug, points}] triés, au plus maxSuggestions, uniquement s'ils ont des points. */
export function recommend(config, answers, programmes){
  const known = new Set(programmes.map(p => p.slug));
  const score = {};
  for (const r of config.rules || []) {
    const [qid, oid] = r.option.split(":");
    if (answers[qid] === oid && known.has(r.programme)) score[r.programme] = (score[r.programme] || 0) + (+r.points || 0);
  }
  const order = Object.fromEntries(programmes.map((p, i) => [p.slug, i]));
  return Object.entries(score).filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || order[a[0]] - order[b[0]])
    .slice(0, Math.max(1, config.maxSuggestions || 2))
    .map(([slug, points]) => ({ slug, points }));
}

/** Résultat complet affiché au visiteur. */
export function result(config, answers, programmes){
  const s = safety(config, answers);
  const sugg = recommend(config, answers, programmes);
  const showProgrammes = s.main === "E" || (s.main === "C" && config.safety?.C?.offerProgramme !== false) || (s.main === "B" && config.safety?.B?.offerProgramme === true);
  return { ...s, suggestions: s.main === "A" ? [] : (showProgrammes ? sugg : []) };
}
