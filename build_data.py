"""Build compact JSON data for the website from the cloned CSV repo.
If temp_repo/ is missing it will be cloned automatically."""
import csv, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "temp_repo"
if not SRC.exists():
    print("Cloning liquidslr/leetcode-company-wise-problems ...")
    subprocess.run(["git", "clone", "--depth", "1",
                    "https://github.com/liquidslr/leetcode-company-wise-problems.git",
                    str(SRC)], check=True)
OUT_DIR = ROOT / "website" / "data" / "v1" / "companies"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_JSON = ROOT / "website" / "data" / "v1" / "companies.json"

TIMEFRAME_FILES = {
    "thirty": "1. Thirty Days.csv",
    "three": "2. Three Months.csv",
    "six": "3. Six Months.csv",
    "more": "4. More Than Six Months.csv",
    "all": "5. All.csv",
}
TIMEFRAME_LABELS = {
    "thirty": "Last 30 Days",
    "three": "Last 3 Months",
    "six": "Last 6 Months",
    "more": "More Than 6 Months",
    "all": "All Time",
}

def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "company"

def parse_csv(path: Path):
    problems = []
    if not path.exists():
        return problems
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                title = (row.get("Title") or "").strip()
                link = (row.get("Link") or "").strip()
                if not title or not link:
                    continue
                diff = (row.get("Difficulty") or "").strip().upper()
                if diff not in ("EASY", "MEDIUM", "HARD"):
                    diff = diff.capitalize() or "MEDIUM"
                else:
                    diff = diff.capitalize()  # Easy/Medium/Hard
                try:
                    freq = float(row.get("Frequency") or 0)
                except ValueError:
                    freq = 0.0
                try:
                    acc = float(row.get("Acceptance Rate") or 0)
                except ValueError:
                    acc = 0.0
                topics = (row.get("Topics") or "").strip()
                # compact keys: d,t,f,a,l,topics
                problems.append({
                    "d": diff,
                    "t": title,
                    "f": round(freq, 1),
                    "a": round(acc * 100, 1),  # store as percent
                    "l": link,
                    "c": topics,
                })
            except Exception:
                continue
    # sort by frequency desc by default
    problems.sort(key=lambda x: x["f"], reverse=True)
    return problems

companies = []
used_slugs = set()
total_problems = 0

for entry in sorted(SRC.iterdir(), key=lambda p: p.name.lower()):
    if not entry.is_dir() or entry.name.startswith(".") or entry.name == ".git":
        continue
    name = entry.name
    base_slug = slugify(name)
    slug = base_slug
    i = 2
    while slug in used_slugs:
        slug = f"{base_slug}-{i}"
        i += 1
    used_slugs.add(slug)

    data = {"name": name, "slug": slug, "updated": "June 2025"}
    counts = {}
    for key, fname in TIMEFRAME_FILES.items():
        probs = parse_csv(entry / fname)
        data[key] = probs
        counts[key] = len(probs)
    total_problems += counts.get("all", 0)

    out_path = OUT_DIR / f"{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    companies.append({
        "name": name,
        "slug": slug,
        "counts": counts,
        "total": counts.get("all", 0),
    })

# sort companies by total desc
companies.sort(key=lambda x: x["total"], reverse=True)

with open(DATA_JSON, "w", encoding="utf-8") as f:
    json.dump({"companies": companies, "totalCompanies": len(companies),
               "totalProblems": total_problems, "updated": "June 2025"},
              f, ensure_ascii=False, separators=(",", ":"))

print(f"Done: {len(companies)} companies, {total_problems} all-time problem rows")
print(f"Top 5: {[c['name'] for c in companies[:5]]}")
