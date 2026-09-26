"""Build compact JSON data (v2 section of website/) from snehasishroy's repo (temp_repo2/).
CSV format: ID,URL,Title,Difficulty,Acceptance %,Frequency %
Files: thirty-days.csv, three-months.csv, six-months.csv, more-than-six-months.csv, all.csv
If temp_repo2/ is missing it will be cloned automatically."""
import csv, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "temp_repo2"
if not SRC.exists():
    print("Cloning snehasishroy/leetcode-companywise-interview-questions ...")
    subprocess.run(["git", "clone", "--depth", "1",
                    "https://github.com/snehasishroy/leetcode-companywise-interview-questions.git",
                    str(SRC)], check=True)
OUT_DIR = ROOT / "website" / "data" / "v2" / "companies"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_JSON = ROOT / "website" / "data" / "v2" / "companies.json"

TIMEFRAME_FILES = {
    "thirty": "thirty-days.csv",
    "three": "three-months.csv",
    "six": "six-months.csv",
    "more": "more-than-six-months.csv",
    "all": "all.csv",
}

def display_name(slug: str) -> str:
    # "american-express" -> "American Express", "1kosmos" -> "1kosmos"
    parts = re.split(r"[-_\s]+", slug.strip())
    out = []
    for p in parts:
        if not p:
            continue
        if p.isdigit() or (len(p) > 1 and p[0].isdigit()):
            out.append(p.upper() if len(p) <= 4 else p.capitalize())
        elif len(p) <= 3 and p.isalpha() and slug.count("-") == 0 and len(parts) == 1:
            out.append(p.upper() if len(p) <= 2 else p.capitalize())
        else:
            out.append(p.capitalize())
    name = " ".join(out)
    # common acronym fixes
    fixes = {"Bny": "BNY", "Bcg": "BCG", "Bnp": "BNP", "Bt": "BT", "Att": "AT&T",
             "C3": "C3", "Ai": "AI", "Api": "API"}
    for k, v in fixes.items():
        name = re.sub(rf"\b{k}\b", v, name)
    return name or slug

def pct(s: str) -> float:
    s = (s or "").strip().replace("%", "")
    try:
        return float(s)
    except ValueError:
        return 0.0

def parse_csv(path: Path):
    problems = []
    if not path.exists():
        return problems
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                title = (row.get("Title") or "").strip()
                link = (row.get("URL") or row.get("Link") or "").strip()
                if not title or not link:
                    continue
                diff = (row.get("Difficulty") or "").strip().capitalize()
                if diff not in ("Easy", "Medium", "Hard"):
                    diff = "Medium"
                try:
                    pid = int((row.get("ID") or 0))
                except ValueError:
                    pid = 0
                freq = pct(row.get("Frequency %") or row.get("Frequency"))
                acc = pct(row.get("Acceptance %") or row.get("Acceptance Rate"))
                problems.append({"d": diff, "t": title, "f": round(freq, 1),
                                 "a": round(acc, 1), "l": link, "c": "",
                                 "id": pid})
            except Exception:
                continue
    problems.sort(key=lambda x: (-x["f"], x["id"] or 10**9))
    return problems

companies = []
total_all = 0
for entry in sorted(SRC.iterdir(), key=lambda p: p.name.lower()):
    if not entry.is_dir() or entry.name.startswith("."):
        continue
    slug = entry.name
    name = display_name(slug)
    data = {"name": name, "slug": slug, "updated": "July 2026"}
    counts = {}
    for key, fname in TIMEFRAME_FILES.items():
        probs = parse_csv(entry / fname)
        data[key] = probs
        counts[key] = len(probs)
    total_all += counts.get("all", 0)
    with open(OUT_DIR / f"{slug}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    companies.append({"name": name, "slug": slug, "counts": counts,
                      "total": counts.get("all", 0)})

companies.sort(key=lambda x: x["total"], reverse=True)
with open(DATA_JSON, "w", encoding="utf-8") as f:
    json.dump({"companies": companies, "totalCompanies": len(companies),
               "totalProblems": total_all, "updated": "July 2026"},
              f, ensure_ascii=False, separators=(",", ":"))

print(f"Done: {len(companies)} companies, {total_all} all-time problem rows")
print(f"Top 5: {[c['name'] for c in companies[:5]]}")
