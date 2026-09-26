# LeetCode Company Wise — Website

Browse company-wise LeetCode questions. **Clicking any question opens it directly on LeetCode** in a new tab.

One site, two dataset sections (switch with the 📦 tabs at the top):

| Section | Data source | Snapshot | Companies |
|---------|-------------|----------|-----------|
| 📦 June 2025 | [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems) | June 2025 | 470 |
| 📦 July 2026 | [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions) | July 2026 | 660 |

## Run locally (Windows)

Option A — double-click:

- Double-click `start.bat` → opens http://localhost:8000

Option B — terminal:

```powershell
cd website
python -m http.server 8000
# open http://localhost:8000
```

> Browsers block `fetch()` when you open `index.html` directly via `file://`.
> You must serve the `website/` folder over HTTP (above) — otherwise you'll see
> "server can't be reached" / data failed to load errors.

## Features

- Dataset switcher (June 2025 / July 2026), remembers your choice
- Company search + sort, recent companies (per dataset)
- Time ranges: 30 Days / 3 Months / 6 Months / 6M+ / All
- Filter by title/topic, difficulty (Easy/Medium/Hard), sort by frequency/acceptance/title
- Every row + title links straight to `https://leetcode.com/problems/...`
- Deep links: `#/v1/company/google`, `#/v2/company/google`, `/` shortcut for search

## Update data

```powershell
# rebuild June 2025 section (auto-clones upstream if temp_repo/ missing)
python build_data.py

# rebuild July 2026 section (auto-clones upstream if temp_repo2/ missing)
python build_data2.py
```

## Deploy

The `website/` folder is fully static. Deploy it as-is to GitHub Pages / Netlify / Vercel
(root = `website/`).
