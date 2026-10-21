"""Importe les 62 articles de la Bibliothèque depuis le document Word (via pandoc).
Usage : python3 scripts/library/import_library.py chemin/vers/LE_SEUIL_Bibliotheque_Articles_FR.docx
Écrit src/library.js. Tous les articles sont importés au statut « a_relire »."""
import json, re, subprocess, sys, os, unicodedata

src = sys.argv[1]
md = subprocess.run(["pandoc", src, "-t", "markdown", "--wrap=none"], capture_output=True, text=True, check=True).stdout
fix = lambda s: re.sub(r"\\([~.\-\[\]*'\"|])", r"\1", s).replace("---", "—").replace("'", "’").replace("**", "").strip()
lines = md.split("\n")

# Catégories depuis le sommaire
cats, cur = {}, None
in_toc = False
for l in lines:
    if l.startswith("# Sommaire"): in_toc = True; continue
    if in_toc and l.startswith("# "): break
    if in_toc and l.startswith("## "): cur = fix(l[3:])
    m = re.match(r"-\s+(\d\d)\\?\.\s+(.*)", l)
    if in_toc and m: cats[int(m.group(1))] = cur

refs = []
arts, a = [], None
section = None
mode = None
for l in lines:
    if l.startswith("# Références"):
        mode = "refs"; a = None; continue
    if mode == "refs":
        if l.startswith("-   "): refs.append(fix(l[4:]))
        elif l.strip().startswith("Note éditoriale"): note = fix(l)
        continue
    m = re.match(r"^# (\d\d) · (.*)", l.replace("\\", ""))
    if m:
        a = {"n": int(m.group(1)), "title": fix(m.group(2)), "chapeau": [], "sections": [], "retenir": ""}
        arts.append(a); section = None; continue
    if not a: continue
    if l.startswith("## "):
        section = {"h": fix(l[3:]), "p": []}; a["sections"].append(section); continue
    t = l.strip()
    if not t: continue
    if t.startswith("LE SEUIL —") or t.startswith("LE SEUIL ---") or "Information générale, sans diagnostic" in t: continue
    if t.isupper() and len(t) < 60: continue          # en-tête courant de page (catégorie)
    if t.startswith("À retenir"): a["retenir"] = fix(t); continue
    if t.startswith("-   "): t = "• " + t[4:]
    (section["p"] if section else a["chapeau"]).append(fix(t))

def slug(s):
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:70]

CATS = ["Comprendre la santé mentale","Dépression et humeur","Anxiété et peurs","TOC et pensées intrusives","Stress et épuisement","Deuil et événements difficiles",
        "Santé mentale périnatale","Neurodiversité et neurodéveloppement","Tics et Tourette","Enfants, adolescents et familles","Bien-être au quotidien","Culture, foi et société"]
FEATURED = {56: 1, 5: 2, 10: 3}
out = []
for a in arts:
    cat = cats[a["n"]]
    words = len(" ".join(a["chapeau"] + [p for s in a["sections"] for p in s["p"]] + [a["retenir"]]).split())
    txt = (a["title"] + " " + " ".join(a["chapeau"]) + " " + " ".join(p for s in a["sections"] for p in s["p"])).lower()
    review = (cat in ("Santé mentale périnatale", "Enfants, adolescents et familles") or "post-partum" in txt or "suicid" in txt
              or "traumat" in txt or re.search(r"\b(enfant|adolescent|élève|mineur)", a["title"].lower()) is not None)
    sensitive = review or cat in ("Dépression et humeur", "Deuil et événements difficiles", "Anxiété et peurs", "TOC et pensées intrusives")
    out.append({"id": f"a{a['n']:02d}", "n": a["n"], "slug": slug(a["title"]), "title": a["title"], "category": cat,
                "chapeau": " ".join(a["chapeau"]), "sections": a["sections"], "retenir": a["retenir"],
                "words": words, "featured": a["n"] in FEATURED, "featured_order": FEATURED.get(a["n"]),
                "sensitive": sensitive, "professional_review": review, "status": "a_relire", "order": a["n"]})

assert len(out) == 62, len(out)
assert len({o["slug"] for o in out}) == 62
js = ("// Généré par scripts/library/import_library.py depuis LE_SEUIL_Bibliotheque_Articles_FR.docx — ne pas modifier à la main.\n"
      "// Textes éditoriaux à relire avant publication. Tous importés au statut « a_relire ».\n"
      f"export const LIBRARY_CATEGORIES = {json.dumps(CATS, ensure_ascii=False)};\n"
      f"export const LIBRARY_REFERENCES = {json.dumps(refs, ensure_ascii=False, indent=1)};\n"
      f"export const LIBRARY_NOTE = {json.dumps(note, ensure_ascii=False)};\n"
      f"export const LIBRARY = {json.dumps(out, ensure_ascii=False, indent=1)};\n")
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "library.js")
open(dst, "w").write(js)
from collections import Counter
print(len(out), "articles ;", Counter(o["category"] for o in out).most_common())
print("revue pro :", [o["n"] for o in out if o["professional_review"]])
print("sections par article :", Counter(len(o["sections"]) for o in out), "sans retenir:", [o["n"] for o in out if not o["retenir"]])
