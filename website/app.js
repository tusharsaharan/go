/* LeetCode Company Wise — vanilla JS front-end.
   Two datasets, one site: v1 = June 2025 (liquidslr), v2 = July 2026 (snehasishroy).
   Clicking any question opens its LeetCode URL directly in a new tab. */
const SOURCES = {
  v1: {
    dir: "v1",
    repo: "liquidslr/leetcode-company-wise-problems",
    repoUrl: "https://github.com/liquidslr/leetcode-company-wise-problems",
  },
  v2: {
    dir: "v2",
    repo: "snehasishroy/leetcode-companywise-interview-questions",
    repoUrl: "https://github.com/snehasishroy/leetcode-companywise-interview-questions",
  },
};

const state = {
  src: "v1",
  cache: {},          // src -> {companies, meta}
  companies: [],
  meta: {},
  filter: "",
  sortMode: "questions",
  current: null,      // {name, slug}
  currentData: null,  // full company json
  timeframe: "all",
  qFilter: "",
  diff: "ALL",
  qSort: "freq",
};
try {
  const saved = localStorage.getItem("lcw-src");
  if (saved === "v1" || saved === "v2") state.src = saved;
} catch {}

const $ = (id) => document.getElementById(id);
const els = {
  companySearch: $("companySearch"),
  companyGrid: $("companyGrid"),
  companyEmpty: $("companyEmpty"),
  companySort: $("companySort"),
  statPill: $("statPill"),
  srcLink: $("srcLink"),
  srcFooter: $("srcFooter"),
  srcTabs: $("srcTabs"),
  homeView: $("homeView"),
  companyView: $("companyView"),
  backBtn: $("backBtn"),
  homeBtn: $("homeBtn"),
  companyName: $("companyName"),
  companySub: $("companySub"),
  companyAvatar: $("companyAvatar"),
  timeTabs: $("timeTabs"),
  problemSearch: $("problemSearch"),
  diffPills: $("diffPills"),
  problemSort: $("problemSort"),
  problemList: $("problemList"),
  problemEmpty: $("problemEmpty"),
  resultCount: $("resultCount"),
  loadError: $("loadError"),
  recentWrap: $("recentWrap"),
  recentList: $("recentList"),
};

const TF_KEYS = ["thirty", "three", "six", "more", "all"];
const TF_LABEL = { thirty: "30 Days", three: "3 Months", six: "6 Months", more: "6M+", all: "All" };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function recentKey() { return "lcw-recent-" + state.src; }

async function loadSource(src) {
  state.src = src;
  try { localStorage.setItem("lcw-src", src); } catch {}
  els.srcTabs.querySelectorAll("button").forEach((b) =>
    b.classList.toggle("active", b.dataset.src === src));

  if (!state.cache[src]) {
    const res = await fetch(`data/${SOURCES[src].dir}/companies.json`);
    if (!res.ok) throw new Error(`Could not load data/${SOURCES[src].dir}/companies.json (${res.status})`);
    const data = await res.json();
    state.cache[src] = { companies: data.companies || [], meta: data };
  }
  state.companies = state.cache[src].companies;
  state.meta = state.cache[src].meta;
  const s = SOURCES[src];
  els.statPill.textContent = `${state.meta.totalCompanies} companies · ${Number(state.meta.totalProblems).toLocaleString()} questions · ${state.meta.updated}`;
  els.srcLink.href = s.repoUrl;
  els.srcLink.textContent = "★ " + s.repo.split("/")[0];
  els.srcLink.title = s.repo;
  els.srcFooter.innerHTML = `Data: <a href="${s.repoUrl}" target="_blank" rel="noopener">${esc(s.repo)}</a> · Updated ${esc(state.meta.updated)} · Clicking a question opens <a href="https://leetcode.com" target="_blank" rel="noopener">leetcode.com</a> directly.`;
  renderCompanies();
  renderRecent();
}

async function switchSource(src) {
  if (src === state.src && state.companies.length) return;
  goHome(true);
  els.companyGrid.innerHTML = `<p class="muted">Loading dataset…</p>`;
  try {
    await loadSource(src);
  } catch (e) {
    showLoadError(e);
  }
}

function showLoadError(e) {
  els.statPill.textContent = "data failed to load";
  els.companyGrid.innerHTML = `<p class="error">Could not load dataset files. If you double-clicked index.html, your browser blocks local files. Fix: double-click <code>start.bat</code> (Windows) or run <code>python -m http.server 8000</code> inside the <code>website</code> folder, then open <code>http://localhost:8000</code>. (${esc(e.message)})</p>`;
}

function filteredCompanies() {
  const q = state.filter.trim().toLowerCase();
  let list = state.companies;
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
  if (state.sortMode === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else list = [...list].sort((a, b) => b.total - a.total);
  return list;
}

function renderCompanies() {
  const all = filteredCompanies();
  const list = all.slice(0, 400);
  els.companyEmpty.hidden = all.length !== 0;
  els.companyGrid.innerHTML = list.map((c) => `
    <button class="company-card" data-slug="${esc(c.slug)}">
      <span class="avatar">${esc(c.name.trim()[0].toUpperCase())}</span>
      <span>
        <h3>${esc(c.name)}</h3>
        <p>${c.total.toLocaleString()} questions · 30d: ${c.counts.thirty ?? 0}</p>
      </span>
    </button>`).join("") +
    (all.length > 400 ? `<p class="muted small" style="grid-column:1/-1">Showing 400 of ${all.length.toLocaleString()} — refine your search to see more.</p>` : "");
  els.companyGrid.querySelectorAll(".company-card").forEach((btn) => {
    btn.addEventListener("click", () => openCompany(btn.dataset.slug));
  });
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem(recentKey()) || "[]"); }
  catch { return []; }
}
function pushRecent(slug) {
  try {
    let r = getRecent().filter((x) => x !== slug);
    r.unshift(slug);
    localStorage.setItem(recentKey(), JSON.stringify(r.slice(0, 8)));
    renderRecent();
  } catch {}
}
function renderRecent() {
  const r = getRecent();
  if (!r.length) { els.recentWrap.hidden = true; return; }
  const bySlug = Object.fromEntries(state.companies.map((c) => [c.slug, c]));
  els.recentWrap.hidden = false;
  els.recentList.innerHTML = r.filter((s) => bySlug[s]).map((s) =>
    `<button data-slug="${esc(s)}">${esc(bySlug[s].name)}</button>`).join("");
  els.recentList.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => openCompany(b.dataset.slug)));
}

async function openCompany(slug) {
  const meta = state.companies.find((c) => c.slug === slug);
  if (!meta) return;
  state.current = meta;
  state.qFilter = "";
  els.problemSearch.value = "";
  state.diff = "ALL";
  els.diffPills.querySelectorAll("button").forEach((b) =>
    b.classList.toggle("active", b.dataset.diff === "ALL"));
  // default to "all" timeframe
  state.timeframe = "all";
  els.timeTabs.querySelectorAll("button").forEach((b) =>
    b.classList.toggle("active", b.dataset.tf === "all"));

  els.homeView.hidden = true;
  els.companyView.hidden = false;
  els.companyName.textContent = meta.name;
  els.companyAvatar.textContent = meta.name.trim()[0].toUpperCase();
  els.problemList.innerHTML = `<p class="muted">Loading ${esc(meta.name)} questions…</p>`;
  els.loadError.hidden = true;
  window.scrollTo({ top: 0 });

  try {
    const res = await fetch(`data/${SOURCES[state.src].dir}/companies/${encodeURIComponent(slug)}.json`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    state.currentData = await res.json();
  } catch (e) {
    els.problemList.innerHTML = "";
    els.loadError.hidden = false;
    els.loadError.textContent = "Could not load questions for " + meta.name +
      ". If you opened index.html directly, browsers block local file loading — run start.bat (or: python -m http.server in the website folder) and open http://localhost:8000 instead. Details: " + e.message;
    return;
  }
  // update tab counts
  els.timeTabs.querySelectorAll("button").forEach((b) => {
    const k = b.dataset.tf;
    const n = (state.currentData[k] || []).length;
    b.innerHTML = `${TF_LABEL[k]} <small>${n}</small>`;
    b.classList.toggle("active", k === state.timeframe);
  });
  els.companySub.textContent = `${(state.currentData.all || []).length.toLocaleString()} all-time questions · updated ${state.currentData.updated || state.meta.updated || ""} · click any row to open on LeetCode`;
  pushRecent(slug);
  // deep link incl. dataset
  location.hash = `#/${state.src}/company/` + slug;
  renderProblems();
}

function currentProblems() {
  if (!state.currentData) return [];
  let list = state.currentData[state.timeframe] || [];
  const q = state.qFilter.trim().toLowerCase();
  if (q) {
    list = list.filter((p) =>
      p.t.toLowerCase().includes(q) || (p.c || "").toLowerCase().includes(q));
  }
  if (state.diff !== "ALL") list = list.filter((p) => p.d === state.diff);
  const by = state.qSort;
  list = [...list];
  if (by === "freq") list.sort((a, b) => b.f - a.f);
  else if (by === "accept") list.sort((a, b) => b.a - a.a);
  else if (by === "title") list.sort((a, b) => a.t.localeCompare(b.t));
  else if (by === "diff") {
    const w = { Easy: 0, Medium: 1, Hard: 2 };
    list.sort((a, b) => (w[a.d] ?? 1) - (w[b.d] ?? 1) || b.f - a.f);
  }
  return list;
}

function problemSub(p) {
  const parts = [];
  if (p.id) parts.push("#" + p.id);
  parts.push("✓ " + p.a + "%");
  if (p.c) parts.push(p.c);
  return parts.map(esc).join(" &nbsp;·&nbsp; ");
}

function renderProblems() {
  const all = currentProblems();
  const list = all.slice(0, 2000);
  els.problemEmpty.hidden = all.length !== 0;
  els.resultCount.textContent = all.length
    ? `Showing ${list.length} of ${all.length.toLocaleString()} questions — click any question to open it on LeetCode ↗`
    : "";
  els.problemList.innerHTML = list.map((p) => {
    const width = Math.max(4, Math.min(100, p.f));
    return `
    <div class="problem-row" data-link="${esc(p.l)}" title="Open on LeetCode: ${esc(p.t)}">
      <span class="badge ${esc(p.d)}">${esc(p.d)}</span>
      <span class="problem-main">
        <a class="problem-title" href="${esc(p.l)}" target="_blank" rel="noopener">${esc(p.t)} ↗</a>
        <div class="problem-meta">${problemSub(p)}</div>
      </span>
      <span class="freq-wrap" title="Frequency: ${esc(p.f)}">
        <span class="freq-bar"><span class="freq-fill" style="width:${width}%"></span></span>
        <span class="freq-num">${esc(p.f)}</span>
        <span class="open-icon">↗</span>
      </span>
    </div>`;
  }).join("");
  // Row click (anywhere except the inner link which already opens) → open LeetCode directly
  els.problemList.querySelectorAll(".problem-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const link = row.dataset.link;
      if (!link) return;
      if (e.target.closest("a")) return; // let the anchor handle it
      window.open(link, "_blank", "noopener");
    });
  });
}

function goHome(keepHash) {
  els.companyView.hidden = true;
  els.homeView.hidden = false;
  state.current = null;
  state.currentData = null;
  if (!keepHash && location.hash) location.hash = "";
  window.scrollTo({ top: 0 });
}

// events
els.companySearch.addEventListener("input", (e) => {
  state.filter = e.target.value;
  if (!els.homeView.hidden) renderCompanies();
});
els.companySort.addEventListener("change", (e) => {
  state.sortMode = e.target.value;
  renderCompanies();
});
els.backBtn.addEventListener("click", () => goHome());
els.homeBtn.addEventListener("click", () => goHome());
els.srcTabs.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => switchSource(b.dataset.src));
});
els.timeTabs.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    state.timeframe = b.dataset.tf;
    els.timeTabs.querySelectorAll("button").forEach((x) =>
      x.classList.toggle("active", x === b));
    renderProblems();
  });
});
els.problemSearch.addEventListener("input", (e) => {
  state.qFilter = e.target.value;
  renderProblems();
});
els.diffPills.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    state.diff = b.dataset.diff;
    els.diffPills.querySelectorAll("button").forEach((x) =>
      x.classList.toggle("active", x === b));
    renderProblems();
  });
});
els.problemSort.addEventListener("change", (e) => {
  state.qSort = e.target.value;
  renderProblems();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    (els.companyView.hidden ? els.companySearch : els.problemSearch).focus();
  }
  if (e.key === "Escape" && !els.companyView.hidden) goHome();
});

// deep links: #/v1/company/<slug>, #/v2/company/<slug> (legacy #/company/<slug> → v1)
async function routeFromHash() {
  let m = location.hash.match(/^#\/(v1|v2)\/company\/(.+)$/);
  if (m) {
    const src = m[1], slug = decodeURIComponent(m[2]);
    if (src !== state.src) await loadSource(src);
    if (state.companies.some((c) => c.slug === slug)) openCompany(slug);
    return;
  }
  m = location.hash.match(/^#\/company\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    if (state.src !== "v1") await loadSource("v1");
    if (state.companies.some((c) => c.slug === slug)) openCompany(slug);
  }
}
window.addEventListener("hashchange", () => {
  if (!location.hash) goHome(true);
});

(async function boot() {
  const m = location.hash.match(/^#\/(v1|v2)\//);
  const startSrc = m ? m[1] : state.src;
  try {
    await loadSource(startSrc);
  } catch (e) {
    showLoadError(e);
    return;
  }
  routeFromHash();
})();
