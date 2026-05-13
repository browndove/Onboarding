/**
 * Helix Health Pre-Onboarding Portal — Application logic
 *
 * Responsibilities:
 *  - Switch between landing and portal views
 *  - Render every section of the Facility Pre-Onboarding Checklist from
 *    the schema in assets/data.js
 *  - Custom phone input with flag + dial code picker, per-country digit
 *    cap, and IP-based default country
 *  - Conditional fields (e.g. "Total IT Staff" only appears if the
 *    facility has an IT team)
 *  - Guided info tooltips based on the Guide sheet
 *  - Debounced auto-save to localStorage (with visible "saved" indicator)
 *  - Gentle validation + friendly error messages
 *  - Review & submit step with JSON download
 *  - Scroll reveal + polished micro-interactions
 */

(function () {
  "use strict";

  const {
    SECTIONS,
    ALL_FIELDS,
    GLOBAL_RULES,
    COUNTRIES,
    COUNTRIES_POPULAR_ISO,
    PHONE_FORMATS,
    NANP_ISO_CODES,
    TEMPLATES,
    TEMPLATES_INTRO,
    DATA_UPLOAD_STEPS,
    PHASE_CHECKLIST,
    UPLOAD_SIDEBAR_RULES,
  } = window.HELIX_SCHEMA;

  const STORAGE_KEY      = "helix.preonboarding.v1";
  const LEGACY_KEY       = "helix.onboarding.v1"; // Clean up old drafts
  const VIDEO_URL        = ""; // Drop a YouTube/Vimeo embed URL here when ready.
  const DEFAULT_ISO      = "GH";
  const EMAIL_REGEX      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const GEO_CACHE_KEY    = "helix.default_iso";
  const GEO_CACHE_TS_KEY = "helix.default_iso_ts";
  const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — so a wrong cache self-heals daily.

  /* Lookups built once from COUNTRIES for fast access. */
  const COUNTRY_BY_ISO = COUNTRIES.reduce((m, c) => { m[c.iso] = c; return m; }, {});
  const POPULAR = COUNTRIES_POPULAR_ISO
    .map(iso => COUNTRY_BY_ISO[iso])
    .filter(Boolean);
  const ALL_SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

  /* Detected-once default country from IP geolocation. Falls back to GH. */
  let defaultIso = DEFAULT_ISO;

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  /**
   * State shape:
   *  answers: { [fieldKey]: any, [phoneKey + "_iso"]: string }
   *  uploads: { departments?, units?, staff?, roles?, patients? — attachment metadata }
   *  meta:    { version, portal_phase, created_at, updated_at, submitted, … }
   */
  function defaultUploads() {
    return { departments: null, units: null, staff: null, roles: null, patients: null };
  }

  function isValidPortalPhase(p) {
    return p === PHASE_CHECKLIST || DATA_UPLOAD_STEPS.some(s => s.uploadKey === p);
  }

  function getPortalPhase() {
    const p = state.meta.portal_phase;
    return isValidPortalPhase(p) ? p : PHASE_CHECKLIST;
  }

  const defaultState = () => ({
    answers: {},
    uploads: defaultUploads(),
    meta: {
      version:     3,
      portal_phase: PHASE_CHECKLIST,
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString(),
      submitted:   false,
      submitted_at: null,
    },
  });

  let state = loadState();
  /** Volatile map of dropped File objects for optional header re-check (not persisted). */
  const sessionFiles = {};
  let currentTemplateId = (TEMPLATES && TEMPLATES[0] && TEMPLATES[0].id) || "departments";
  let currentSection = state.meta?.last_section || SECTIONS[0].id;
  let onReview = false;

  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------
  function loadState() {
    try {
      localStorage.removeItem(LEGACY_KEY); // Drop any pre-migration drafts.
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed, {
        answers: Object.assign({}, parsed.answers || {}),
        uploads: Object.assign(defaultUploads(), parsed.uploads || {}),
        meta: Object.assign(defaultState().meta, parsed.meta || {}, {
          portal_phase: isValidPortalPhase(parsed.meta?.portal_phase)
            ? parsed.meta.portal_phase
            : PHASE_CHECKLIST,
        }),
      });
    } catch {
      return defaultState();
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    setSaveStatus("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        state.meta.updated_at   = new Date().toISOString();
        state.meta.last_section = currentSection;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 350);
  }

  function setSaveStatus(status) {
    const el = document.querySelector("[data-save-indicator]");
    if (!el) return;
    el.dataset.status = status;
    const map = {
      saving: "Saving…",
      saved:  `Saved · ${formatTime(state.meta.updated_at)}`,
      error:  "Couldn't save locally",
      idle:   "Draft ready",
    };
    el.querySelector(".status-label").textContent = map[status] || "";
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
  }

  // ------------------------------------------------------------------
  // Utility
  // ------------------------------------------------------------------
  const el  = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  const escapeAttr = escapeHtml;

  function flagUrl(iso, size = 40) {
    return `https://flagcdn.com/w${size}/${iso.toLowerCase()}.png`;
  }

  /* ------------------------------------------------------------------
   * Phone number formatting
   *
   * The pattern strings use `N` for a digit placeholder and any other
   * character as a literal separator (space, dash, parens).
   *
   *   Ghana  (maxLen 9)  → "NN NNN NNNN"         → "20 918 2633"
   *   USA/CA (maxLen 10) → "(NNN) NNN-NNNN"      → "(416) 555-0123"
   *   UK     (maxLen 10) → "NNNN NNNNNN"         → "7911 123456"
   *
   * We use the pattern for two things:
   *   1. The input's placeholder — showing the expected shape instead
   *      of the older "Up to N digits" text
   *   2. Live formatting of the user's typing, so they see separators
   *      as they enter digits. Raw digits only are stored in state.
   * ---------------------------------------------------------------- */
  function getPhonePattern(iso, maxLen) {
    if (PHONE_FORMATS && PHONE_FORMATS[iso]) return PHONE_FORMATS[iso];
    if (NANP_ISO_CODES && NANP_ISO_CODES.includes(iso)) return "(NNN) NNN-NNNN";
    return defaultPatternForLength(maxLen || 9);
  }

  function defaultPatternForLength(n) {
    const FIXED = {
      4:  "NNNN",
      5:  "NNN NN",
      6:  "NNN NNN",
      7:  "NNN NNNN",
      8:  "NNNN NNNN",
      9:  "NNN NNN NNN",
      10: "NNN NNN NNNN",
      11: "NNN NNN NNNNN",
      12: "NNN NNNN NNNNN",
      13: "NNN NNNN NNNNNN",
    };
    if (FIXED[n]) return FIXED[n];
    const out = [];
    for (let i = 0; i < n; i += 3) out.push("N".repeat(Math.min(3, n - i)));
    return out.join(" ");
  }

  /** Apply a pattern to raw digits. Extra digits past the pattern are
   *  dropped (the caller should have already slice()'d to maxLen). */
  function formatPhoneDigits(digits, iso, maxLen) {
    const pattern = getPhonePattern(iso, maxLen);
    const d = String(digits || "").replace(/\D/g, "").slice(0, maxLen);
    if (!d) return "";
    let out = "";
    let di = 0;
    for (let i = 0; i < pattern.length && di < d.length; i++) {
      if (pattern[i] === "N") out += d[di++];
      else out += pattern[i];
    }
    return out;
  }

  /** Turn "(NNN) NNN-NNNN" into "(000) 000-0000" so the input hints
   *  at the expected shape with zeros. */
  function patternPlaceholder(pattern) {
    return pattern.replace(/N/g, "0");
  }

  /** Is a field visible given the current answers (respects `conditional`). */
  function isFieldVisible(field) {
    if (!field.conditional) return true;
    const { field: dep, equals } = field.conditional;
    return state.answers[dep] === equals;
  }

  /** Is a field considered "answered" (non-empty)? */
  function isAnswered(field) {
    const v = state.answers[field.key];
    return v !== undefined && v !== null && String(v).trim() !== "";
  }

  /** Every required, visible field that is currently unanswered. */
  function missingRequired() {
    return ALL_FIELDS.filter(f => f.required && isFieldVisible(f) && !isAnswered(f));
  }

  /** Required vs answered across the whole form. */
  function overallProgress() {
    const req = ALL_FIELDS.filter(f => f.required && isFieldVisible(f));
    if (req.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = req.filter(isAnswered).length;
    return { done, total: req.length, pct: Math.round((done / req.length) * 100) };
  }

  function sectionProgress(section) {
    const req = section.fields.filter(f => f.required && isFieldVisible(f));
    const done = req.filter(isAnswered).length;
    const touched = section.fields.some(f => isFieldVisible(f) && isAnswered(f));
    const complete = req.length > 0 && done === req.length;
    return { done, total: req.length, touched, complete };
  }

  // ------------------------------------------------------------------
  // CSV header validation + portal phase rail (checklist vs file uploads)
  // ------------------------------------------------------------------
  function splitCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === "\"") { inQuote = !inQuote; continue; }
      if (!inQuote && c === ",") { out.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out.map(cell => cell.replace(/^"|"$/g, ""));
  }

  function csvFirstRow(text) {
    const lines = String(text || "").split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    return splitCsvLine(lines[0]);
  }

  function normalizeHeader(h) {
    return String(h || "").trim().replace(/^\uFEFF/, "");
  }

  function validateCsvHeadersAgainstTemplate(got, template) {
    const exp = template.columns.map(c => normalizeHeader(c.name));
    const g = got.map(normalizeHeader);
    while (g.length && g[g.length - 1] === "") g.pop();
    if (g.length !== exp.length) {
      return {
        ok: false,
        message: `Expected ${exp.length} columns; found ${g.length}. Headers must be: ${exp.join(", ")}.`,
      };
    }
    for (let i = 0; i < exp.length; i++) {
      if (g[i] !== exp[i]) {
        return {
          ok: false,
          message: `Column ${i + 1}: expected "${exp[i]}" but found "${g[i] || "(blank)"}".`,
        };
      }
    }
    return { ok: true, message: "First row matches the Helix template headers." };
  }

  function validateUploadHeaders(file, template) {
    return new Promise((resolve) => {
      const name = (file.name || "").toLowerCase();
      const isCsv = name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain";
      const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls")
        || (file.type || "").includes("spreadsheet")
        || file.type === "application/vnd.ms-excel";
      if (isExcel) {
        resolve({
          ok: null,
          message: "Excel file noted — CSV exports get instant header checks here; Helix validates spreadsheets on intake.",
        });
        return;
      }
      if (!isCsv) {
        resolve({
          ok: null,
          message: "Save as CSV to validate headers automatically in this browser.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const got = csvFirstRow(reader.result);
        if (!got.length) {
          resolve({ ok: false, message: "The file looks empty — no header row found." });
          return;
        }
        resolve(validateCsvHeadersAgainstTemplate(got, template));
      };
      reader.onerror = () => resolve({ ok: false, message: "Couldn't read the file." });
      reader.readAsText(file.slice(0, Math.min(file.size, 65536)));
    });
  }

  function shortenName(name, max = 34) {
    const s = String(name || "");
    return s.length <= max ? s : s.slice(0, max - 1) + "…";
  }

  function uploadedFileCount() {
    return DATA_UPLOAD_STEPS.filter(s => state.uploads[s.uploadKey]).length;
  }

  function renderPortalSteps() {
    const nav = el("#portal-steps");
    if (!nav) return;
    const phase = getPortalPhase();
    const clPct = overallProgress().pct;
    nav.innerHTML = `
      <button type="button" role="tab" aria-selected="${phase === PHASE_CHECKLIST}" aria-controls="workspace"
              class="portal-step ${phase === PHASE_CHECKLIST ? "active" : ""}" data-phase="${PHASE_CHECKLIST}">
        <span class="ps-num">Step 1</span>
        <span class="ps-label">Facility checklist</span>
        <span class="ps-meta">${clPct}% · required before submit</span>
      </button>
      ${DATA_UPLOAD_STEPS.map((s, i) => {
        const up = state.uploads[s.uploadKey];
        const active = phase === s.uploadKey;
        return `
          <button type="button" role="tab" aria-selected="${active}" aria-controls="workspace"
                  class="portal-step ${active ? "active" : ""} ${up ? "has-file" : ""}"
                  data-phase="${escapeAttr(s.uploadKey)}">
            <span class="ps-num">Step ${i + 2}</span>
            <span class="ps-label"><span class="ps-dot" aria-hidden="true"></span>${escapeHtml(s.shortLabel)}</span>
            <span class="ps-meta">${up ? escapeHtml(shortenName(up.fileName)) : "No file attached"}</span>
          </button>`;
      }).join("")}
    `;
    nav.querySelectorAll("[data-phase]").forEach(btn => {
      btn.addEventListener("click", () => switchPortalPhase(btn.dataset.phase));
    });
  }

  function switchPortalPhase(phase) {
    if (!isValidPortalPhase(phase)) return;
    state.meta.portal_phase = phase;
    onReview = false;
    scheduleSave();
    renderPortalSteps();
    renderSidebar();
    renderWorkspace();
    el("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------------------------------------------------
  // View toggle (landing <> portal)
  // ------------------------------------------------------------------
  function updateSkipLink() {
    const skip = el("#skip-content");
    if (!skip) return;
    const view = document.body.dataset.view || "landing";
    if (view === "portal") skip.setAttribute("href", "#workspace");
    else if (view === "templates") skip.setAttribute("href", "#templates-view");
    else skip.setAttribute("href", "#landing-root");
  }

  function setView(name) {
    document.body.dataset.view = name;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    document.querySelectorAll(".nav-link").forEach(n => n.classList.toggle("active", n.dataset.go === name));
    if (name === "portal") {
      renderPortalSteps();
      renderSidebar();
      renderWorkspace();
    } else if (name === "templates") {
      renderTemplatesView();
    }
    updateResumeButton();
    updateSkipLink();
  }

  function updateResumeButton() {
    const hasUpload = DATA_UPLOAD_STEPS.some(s => state.uploads[s.uploadKey]);
    const hasDraft = Object.keys(state.answers || {}).length > 0 || hasUpload;
    const btn = el("#nav-resume");
    if (btn) btn.hidden = !hasDraft || document.body.dataset.view === "portal";
  }

  // ------------------------------------------------------------------
  // Icons
  // ------------------------------------------------------------------
  const ICONS = {
    facility:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21V9M15 21V9M3 9h18"/></svg>`,
    primary_contact:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    secondary_contact:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    staffing:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    services:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    staff_systems:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2 0 4 .8 5.5 2"/></svg>`,
    review:           `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2 0 4 .8 5.5 2"/></svg>`,
    check:            `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`,
    chev:             `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
    search:           `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>`,
    copy:             `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    info:             `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  };

  // ------------------------------------------------------------------
  // Sidebar rendering
  // ------------------------------------------------------------------
  function renderSidebar() {
    const list = el("#tab-list");
    const rules = el("#rules-list");
    const heading = el(".sidebar-dynamic-heading");
    const ringSub = el("#ring-sub");
    const rulesHeading = el("#rules-heading");
    const phase = getPortalPhase();

    const { pct } = overallProgress();
    const circ = 2 * Math.PI * 52;
    const ringFg = el("#ring-fg");
    if (ringFg) {
      ringFg.setAttribute("stroke-dasharray", circ.toFixed(1));
      ringFg.setAttribute("stroke-dashoffset", (circ * (1 - pct / 100)).toFixed(1));
    }
    const ringText = el("#ring-text");
    if (ringText) ringText.textContent = `${pct}%`;
    if (ringSub) {
      const n = uploadedFileCount();
      ringSub.textContent = `Data files · ${n} / ${DATA_UPLOAD_STEPS.length} attached`;
    }

    if (phase !== PHASE_CHECKLIST) {
      if (!list) return;
      const step = DATA_UPLOAD_STEPS.find(s => s.uploadKey === phase);
      const tpl = TEMPLATES.find(t => t.id === step.templateId);
      if (heading) heading.textContent = step.shortLabel;
      if (rulesHeading) rulesHeading.textContent = "This step";
      list.innerHTML = `
        <div class="upload-sidebar-card">
          <p class="upload-sidebar-lead">${escapeHtml(step.intro)}</p>
          <button type="button" class="btn sm secondary" style="width:100%;margin-top:14px;" data-jump-templates="${escapeAttr(step.templateId)}">
            Open Templates · ${escapeHtml(tpl.name)}
          </button>
        </div>`;
      list.querySelector("[data-jump-templates]")?.addEventListener("click", (ev) => {
        currentTemplateId = ev.currentTarget.dataset.jumpTemplates || step.templateId;
        setView("templates");
      });
      const extraRules = [...(tpl.rules || []), ...(UPLOAD_SIDEBAR_RULES || [])];
      if (rules) rules.innerHTML = extraRules.map(r => `<li>${escapeHtml(r)}</li>`).join("");
      return;
    }

    if (!list) return;
    if (heading) heading.textContent = "Sections";
    if (rulesHeading) rulesHeading.textContent = "How this works";
    if (rules) rules.innerHTML = GLOBAL_RULES.map(r => `<li>${escapeHtml(r)}</li>`).join("");

    const items = [
      ...SECTIONS.map(s => ({ ...s, kind: "section" })),
      { id: "review", title: "Review & Submit", kind: "review" },
    ];
    list.innerHTML = items.map(item => {
      const isActive = !onReview && item.kind === "section" && item.id === currentSection;
      const isReview = onReview && item.kind === "review";
      if (item.kind === "review") {
        const { pct: p } = overallProgress();
        const complete = p === 100;
        const statusClass = complete ? "complete" : "";
        return `
          <button class="tab-btn ${isReview ? "active" : ""} ${statusClass}" data-review>
            <span class="t-ico">${ICONS.review}</span>
            <span class="t-label">${escapeHtml(item.title)}</span>
            <span class="t-count">${p}%</span>
            <span class="t-check">${ICONS.check}</span>
          </button>`;
      }
      const { done, total, touched, complete } = sectionProgress(item);
      const statusClass = complete ? "complete" : (touched ? "partial" : "");
      const count = total > 0 ? `${done}/${total}` : "—";
      return `
        <button class="tab-btn ${isActive ? "active" : ""} ${statusClass}" data-section="${item.id}">
          <span class="t-ico">${ICONS[item.id] || ICONS.facility}</span>
          <span class="t-label">${escapeHtml(item.title)}</span>
          <span class="t-count">${count}</span>
          <span class="t-check">${ICONS.check}</span>
        </button>`;
    }).join("");

    list.querySelectorAll("[data-section]").forEach(b => {
      b.addEventListener("click", () => switchSection(b.dataset.section));
    });
    list.querySelectorAll("[data-review]").forEach(b => {
      b.addEventListener("click", () => openReview());
    });
  }

  function switchSection(id) {
    onReview = false;
    currentSection = id;
    scheduleSave();
    renderSidebar();
    renderWorkspace();
    el(".workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openReview() {
    onReview = true;
    renderSidebar();
    renderWorkspace();
    el(".workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ------------------------------------------------------------------
  // Workspace rendering
  // ------------------------------------------------------------------
  function formatBytes(n) {
    if (n == null || !Number.isFinite(n)) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function ingestUploadFile(uploadKey, template, file) {
    sessionFiles[uploadKey] = file;
    const validation = await validateUploadHeaders(file, template);
    state.uploads[uploadKey] = {
      fileName: file.name,
      size: file.size,
      lastModified: file.lastModified,
      savedAt: new Date().toISOString(),
      validation: { ok: validation.ok, message: validation.message },
    };
    scheduleSave();
    renderPortalSteps();
    renderSidebar();
    renderWorkspace();
    const toastKind = validation.ok === false ? "warn" : "success";
    let toastMsg = "File recorded locally.";
    if (validation.ok === true) toastMsg = "Headers match the Helix template.";
    else if (validation.ok === false) toastMsg = "Headers don't match the template yet — fix the CSV and upload again.";
    toast(toastMsg, toastKind);
  }

  function renderUploadWorkspace(uploadKey) {
    const step = DATA_UPLOAD_STEPS.find(s => s.uploadKey === uploadKey);
    const tpl = TEMPLATES.find(t => t.id === step.templateId);
    const meta = state.uploads[uploadKey];
    const idx = DATA_UPLOAD_STEPS.indexOf(step);
    const v = meta?.validation;
    const valClass = !v ? "" : v.ok === true ? "ok" : v.ok === false ? "bad" : "warn";
    const hasSessionFile = !!sessionFiles[uploadKey];
    return `
      <header class="workspace-header">
        <div>
          <span class="eyebrow">Step ${idx + 2} of ${DATA_UPLOAD_STEPS.length + 1}</span>
          <h1>${escapeHtml(step.stepLabel)}</h1>
          <p class="upload-intro">${escapeHtml(step.intro)}</p>
        </div>
        <div class="save-indicator" data-save-indicator data-status="saved" title="File names & validation are saved in this browser only — not uploaded to a server yet.">
          <span class="status-dot"></span><span class="status-label">Saved · ${formatTime(state.meta.updated_at)}</span>
        </div>
      </header>

      <p class="small text-muted upload-col-guide-lead">Expected column headers (exact spelling). <span class="upload-col-guide-hint">Hover or focus a name for meaning and guidance.</span></p>
      <div class="upload-col-strip">
        ${tpl.columns.map(c => `
          <span class="upload-col-chip ${c.required ? "req" : "opt"}" tabindex="0" role="button"
                aria-label="Guide for column ${escapeAttr(c.name)}"
                data-col-tip="${escapeAttr(c.name)}"
                data-col-meaning="${escapeAttr(c.meaning || "")}"
                data-col-guidance="${escapeAttr(c.guidance || "")}"
                data-col-required="${c.required ? "1" : "0"}">${escapeHtml(c.name)}</span>`).join("")}
      </div>

      <div class="upload-dropzone" data-dropzone tabindex="0" role="button" aria-label="Choose file">
        <strong>Drop a file here or click to browse</strong>
        <span>CSV recommended for instant checks · Excel (.xlsx, .xls) accepted</span>
      </div>
      <input type="file" hidden data-upload-input accept=".csv,.txt,.tsv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />

      <div class="upload-panel ${meta ? "" : "empty"}" data-upload-panel>
        ${meta ? `
          <div class="upload-panel-head">
            <div>
              <strong>${escapeHtml(meta.fileName)}</strong>
              <p class="upload-panel-meta">${escapeHtml(formatBytes(meta.size))} · recorded ${escapeHtml(formatTime(meta.savedAt))}</p>
            </div>
            <button type="button" class="btn ghost sm" data-clear-upload>Remove</button>
          </div>
          ${v && v.message ? `
            <div class="upload-validation ${valClass}">
              ${escapeHtml(v.message)}
            </div>` : ""}
          <div class="upload-actions">
            ${hasSessionFile ? `<button type="button" class="btn sm secondary" data-recheck-csv>Re-check headers</button>` : ""}
            <button type="button" class="btn sm secondary" data-dl-template-csv>Download CSV template</button>
          </div>
        ` : ""}
      </div>

      <div class="action-bar" style="margin-top:28px;">
        <span class="summary">Does not block Step 1 submit.</span>
        <span class="spacer"></span>
        <button type="button" class="btn ghost sm" data-upload-prev>${idx <= 0 ? "← Facility checklist" : `← ${escapeHtml(DATA_UPLOAD_STEPS[idx - 1].shortLabel)}`}</button>
        <button type="button" class="btn sm" data-upload-next>${idx >= DATA_UPLOAD_STEPS.length - 1 ? "Finish · back to checklist" : `Next · ${escapeHtml(DATA_UPLOAD_STEPS[idx + 1].shortLabel)}`}</button>
      </div>
    `;
  }

  function wireUploadWorkspace(uploadKey) {
    const step = DATA_UPLOAD_STEPS.find(s => s.uploadKey === uploadKey);
    const tpl = TEMPLATES.find(t => t.id === step.templateId);
    const dz = el("[data-dropzone]");
    const input = el("[data-upload-input]");

    dz?.addEventListener("click", () => input?.click());
    dz?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input?.click(); }
    });
    ["dragenter", "dragover"].forEach(ev => {
      dz?.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(ev => {
      dz?.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("drag"); });
    });
    dz?.addEventListener("drop", (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) ingestUploadFile(uploadKey, tpl, f);
    });
    input?.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) ingestUploadFile(uploadKey, tpl, f);
      input.value = "";
    });

    el("[data-clear-upload]")?.addEventListener("click", () => {
      state.uploads[uploadKey] = null;
      delete sessionFiles[uploadKey];
      scheduleSave();
      renderPortalSteps();
      renderSidebar();
      renderWorkspace();
      toast("Attachment removed.", "warn");
    });

    el("[data-recheck-csv]")?.addEventListener("click", async () => {
      const f = sessionFiles[uploadKey];
      if (!f) {
        toast("Upload the file again to re-check.", "warn");
        return;
      }
      const validation = await validateUploadHeaders(f, tpl);
      if (state.uploads[uploadKey]) {
        state.uploads[uploadKey].validation = { ok: validation.ok, message: validation.message };
        scheduleSave();
        renderWorkspace();
      }
    });

    el("[data-dl-template-csv]")?.addEventListener("click", () => downloadTemplateCsv(tpl));

    el("[data-upload-prev]")?.addEventListener("click", () => {
      const idx = DATA_UPLOAD_STEPS.findIndex(s => s.uploadKey === uploadKey);
      if (idx <= 0) switchPortalPhase(PHASE_CHECKLIST);
      else switchPortalPhase(DATA_UPLOAD_STEPS[idx - 1].uploadKey);
    });
    el("[data-upload-next]")?.addEventListener("click", () => {
      const idx = DATA_UPLOAD_STEPS.findIndex(s => s.uploadKey === uploadKey);
      if (idx >= DATA_UPLOAD_STEPS.length - 1) switchPortalPhase(PHASE_CHECKLIST);
      else switchPortalPhase(DATA_UPLOAD_STEPS[idx + 1].uploadKey);
    });

    const ws = el("#workspace");
    if (ws) bindColTipHandlers(ws);
  }

  function renderWorkspace() {
    const ws = el("#workspace");
    if (!ws) return;

    const phase = getPortalPhase();
    if (phase !== PHASE_CHECKLIST) {
      ws.innerHTML = renderUploadWorkspace(phase);
      wireUploadWorkspace(phase);
      setSaveStatus("saved");
      return;
    }

    if (onReview) {
      ws.innerHTML = renderReview();
      wireReview();
      return;
    }
    const section = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];
    const idx = SECTIONS.findIndex(s => s.id === section.id);
    const isLast = idx === SECTIONS.length - 1;

    ws.innerHTML = `
      <header class="workspace-header">
        <div>
          <span class="eyebrow">Step ${idx + 1} of ${SECTIONS.length}</span>
          <h1>${escapeHtml(section.title)}</h1>
          <p>${escapeHtml(section.subtitle || "")}</p>
        </div>
        <div class="save-indicator" data-save-indicator data-status="saved" title="Everything is saved locally as you work.">
          <span class="status-dot"></span><span class="status-label">Saved · ${formatTime(state.meta.updated_at)}</span>
        </div>
      </header>

      <div class="field-grid" data-form-root>
        ${section.fields.map(renderField).join("")}
      </div>

      ${renderActionBar(section, idx, isLast)}
    `;
    wireWorkspace();
  }

  // ---- Action bar ----
  function renderActionBar(section, idx, isLast) {
    const { done, total } = sectionProgress(section);
    const summary = total > 0
      ? `${done} / ${total} required answered in this section`
      : `Optional section`;
    const nextLabel = isLast ? "Review & submit" : `Next: ${SECTIONS[idx + 1].title}`;
    return `
      <div class="action-bar">
        <span class="summary">${escapeHtml(summary)}</span>
        <span class="spacer"></span>
        <button class="btn ghost sm" data-go-prev ${idx === 0 ? "disabled" : ""}>Back</button>
        <button class="btn sm" data-go-next>${escapeHtml(nextLabel)}</button>
      </div>
    `;
  }

  // ---- Field renderer ----
  function renderField(field) {
    if (!isFieldVisible(field)) return "";

    const id = `f_${field.key}`;
    const val = state.answers[field.key];
    const safeVal = val == null ? "" : String(val);
    const reqBadge = field.required
      ? `<span class="req" aria-label="Required">*</span>`
      : `<span class="opt">Optional</span>`;

    const tipId = id + "_tip";
    const tip = `
      <span class="tooltip" tabindex="0" aria-describedby="${tipId}">i
        <span class="tip-body" id="${tipId}" role="tooltip">
          <span class="tip-label">What this means</span>${escapeHtml(field.meaning || "")}
          <span class="tip-sep"></span>
          <span class="tip-label">Guidance</span>${escapeHtml(field.guidance || "")}
        </span>
      </span>`;

    let control = "";
    const placeholder = field.placeholder || "";
    const baseAttrs = `id="${id}" data-field="${field.key}" ${field.required ? "required" : ""}`;

    if (field.type === "textarea") {
      control = `<textarea ${baseAttrs} rows="2" placeholder="${escapeAttr(placeholder)}">${escapeHtml(safeVal)}</textarea>`;
    } else if (field.type === "select") {
      control = `<select ${baseAttrs}>
          <option value="" ${safeVal === "" ? "selected" : ""}>Select ${escapeHtml(field.label.toLowerCase())}…</option>
          ${field.options.map(o => `<option value="${escapeAttr(o)}" ${safeVal === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}
        </select>`;
    } else if (field.type === "yesno") {
      control = `
        <div class="yesno" role="radiogroup" aria-label="${escapeAttr(field.label)}">
          <button type="button" class="yesno-opt ${safeVal === "Yes" ? "active" : ""}" data-yesno="${field.key}" data-value="Yes" role="radio" aria-checked="${safeVal === "Yes"}">Yes</button>
          <button type="button" class="yesno-opt ${safeVal === "No"  ? "active" : ""}" data-yesno="${field.key}" data-value="No"  role="radio" aria-checked="${safeVal === "No"}">No</button>
          <input type="hidden" ${baseAttrs} value="${escapeAttr(safeVal)}" />
        </div>`;
    } else if (field.type === "phone-intl") {
      const isoKey     = field.key + "_iso";
      const currentIso = state.answers[isoKey] || defaultIso;
      const country    = COUNTRY_BY_ISO[currentIso] || COUNTRY_BY_ISO[DEFAULT_ISO];
      const maxLen     = country.maxLen;
      const digits     = safeVal.replace(/\D/g, "").slice(0, maxLen);
      const pattern    = getPhonePattern(country.iso, maxLen);
      const formatted  = formatPhoneDigits(digits, country.iso, maxLen);
      control = `
        <div class="phone-intl" data-phone="${field.key}" data-iso="${escapeAttr(currentIso)}">
          <button type="button" class="phone-flag-btn" data-phone-trigger aria-haspopup="listbox" aria-expanded="false" title="Select country">
            <img class="phone-flag" src="${flagUrl(country.iso, 40)}" alt="${escapeAttr(country.name)} flag" width="22" height="16" loading="lazy" />
            <span class="phone-dial">${escapeHtml(country.code)}</span>
            <svg class="phone-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <input type="tel" ${baseAttrs} value="${escapeAttr(formatted)}" inputmode="numeric" autocomplete="tel-national"
                 placeholder="${escapeAttr(patternPlaceholder(pattern))}" maxlength="${pattern.length}" data-phone-input />
        </div>`;
    } else {
      const inputType = field.type === "email"  ? "email"
                     : field.type === "number" ? "number"
                     : field.type === "date"   ? "date"
                     : "text";
      const extra = field.type === "number" ? ' min="0" step="1" inputmode="numeric"' : "";
      control = `<input type="${inputType}" value="${escapeAttr(safeVal)}" ${baseAttrs}${extra} placeholder="${escapeAttr(placeholder)}" />`;
    }

    const fullSpan = ["textarea"].includes(field.type) ? " full" : "";
    return `
      <div class="field${fullSpan}" data-field-wrap="${field.key}">
        <label class="label-row" for="${id}">
          <span>${escapeHtml(field.label)}</span>
          ${reqBadge}
          ${tip}
        </label>
        ${control}
        ${field.guidance ? `<span class="hint">${escapeHtml(shortenGuidance(field.guidance))}</span>` : ""}
      </div>`;
  }

  function shortenGuidance(g) {
    if (!g) return "";
    return g.length > 130 ? g.slice(0, 128) + "…" : g;
  }

  // ---- Review ----
  function renderReview() {
    const { pct, done, total } = overallProgress();
    const problems = missingRequired();

    return `
      <header class="workspace-header">
        <div>
          <span class="eyebrow">Step ${SECTIONS.length + 1} · Review</span>
          <h1>Ready to submit?</h1>
          <p>Take a last look at each section. Everything is saved locally as a draft. You can still edit any answer.</p>
        </div>
        <div class="save-indicator" data-save-indicator data-status="saved">
          <span class="status-dot"></span><span class="status-label">Saved · ${formatTime(state.meta.updated_at)}</span>
        </div>
      </header>

      <div class="review-summary">
        <div class="stat-card">
          <div class="n">${pct}%</div>
          <div class="lbl">Overall readiness</div>
          ${pct === 100
            ? `<div class="ok">All required answers complete</div>`
            : `<div class="warn">${total - done} required answer${(total - done) === 1 ? "" : "s"} to fill</div>`}
        </div>
        ${SECTIONS.map(s => {
          const c = sectionProgress(s);
          return `
            <div class="stat-card">
              <div class="n">${c.total > 0 ? `${c.done}/${c.total}` : "—"}</div>
              <div class="lbl">${escapeHtml(s.title)}</div>
              ${c.total === 0
                ? `<div class="ok">Optional</div>`
                : (c.complete
                    ? `<div class="ok">Complete</div>`
                    : `<div class="warn">${c.total - c.done} required left</div>`)}
            </div>`;
        }).join("")}
      </div>

      <h3 class="review-heading">Data files</h3>
      <p class="review-upload-lead">Attach Departments, Units, Staff, Roles and Patients when ready — uploads never block submitting Step&nbsp;1.</p>
      <div class="review-upload-summary">
        ${DATA_UPLOAD_STEPS.map(s => {
          const up = state.uploads[s.uploadKey];
          const badVal = up?.validation && up.validation.ok === false;
          return `
            <div class="review-upload-card ${up ? "has-file" : ""}${badVal ? " warn" : ""}">
              <strong>${escapeHtml(s.shortLabel)}</strong>
              <span class="review-upload-meta">${up ? escapeHtml(shortenName(up.fileName)) : "Not attached"}</span>
              ${badVal && up.validation.message ? `<span class="review-upload-val">${escapeHtml(up.validation.message)}</span>` : ""}
              <button type="button" class="btn ghost sm" data-jump-upload="${escapeAttr(s.uploadKey)}">${up ? "Replace file" : "Attach file"}</button>
            </div>`;
        }).join("")}
      </div>

      ${problems.length > 0 ? `
        <div style="margin-bottom:28px;">
          <h3 class="review-heading">Things to finish</h3>
          <div class="review-list">
            ${problems.slice(0, 30).map(p => {
              const sec = SECTIONS.find(s => s.fields.some(f => f.key === p.key));
              return `
                <div class="review-row">
                  <div class="ico">${ICONS[sec?.id] || ICONS.info}</div>
                  <div>
                    <strong>Missing ${escapeHtml(p.label)}</strong>
                    <small>${escapeHtml(sec?.title || "")}</small>
                  </div>
                  <button class="btn ghost sm" data-jump="${escapeAttr(sec?.id || "")}">Open section</button>
                </div>`;
            }).join("")}
          </div>
        </div>` : ""}

      <h3 class="review-heading">Your answers</h3>
      <div class="review-answers">
        ${SECTIONS.map(renderSectionAnswers).join("")}
      </div>

      <h3 class="review-heading" style="margin-top:32px;">Finalize</h3>
      <div class="review-list">
        <div class="review-row">
          <div class="ico">${ICONS.copy}</div>
          <div>
            <strong>Save as draft</strong>
            <small>Already auto-saved. You can close this tab and resume any time.</small>
          </div>
          <button class="btn secondary sm" id="save-draft-btn">Save draft</button>
        </div>
        <div class="review-row">
          <div class="ico">${ICONS.check}</div>
          <div>
            <strong>Submit to Helix</strong>
            <small>Downloads JSON for your records. Backend wiring delivers this payload to the onboarding team.</small>
          </div>
          <button class="btn sm" id="submit-btn" ${pct < 100 ? "disabled" : ""}>${state.meta.submitted ? "Resubmit" : "Submit"}</button>
        </div>
      </div>
    `;
  }

  function renderSectionAnswers(section) {
    const visible = section.fields.filter(isFieldVisible);
    if (visible.length === 0) return "";
    return `
      <div class="answer-group">
        <div class="answer-group-head">
          <strong>${escapeHtml(section.title)}</strong>
          <button class="btn ghost sm" data-jump="${escapeAttr(section.id)}">Edit</button>
        </div>
        <dl class="answer-list">
          ${visible.map(f => {
            const v = state.answers[f.key];
            let display;
            if (f.type === "phone-intl") {
              const iso = state.answers[f.key + "_iso"] || defaultIso;
              const c   = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_ISO];
              const digits = String(v || "").replace(/\D/g, "");
              display = digits ? `${c.code} ${digits}` : "";
            } else {
              display = v == null ? "" : String(v);
            }
            const empty = display === "";
            return `
              <dt>${escapeHtml(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</dt>
              <dd class="${empty ? "empty" : ""}">${empty ? "Not answered" : escapeHtml(display)}</dd>
            `;
          }).join("")}
        </dl>
      </div>`;
  }

  function wireReview() {
    els("[data-jump]").forEach(b => b.addEventListener("click", () => switchSection(b.dataset.jump)));
    els("[data-jump-upload]").forEach(b => {
      b.addEventListener("click", () => switchPortalPhase(b.dataset.jumpUpload));
    });
    el("#save-draft-btn")?.addEventListener("click", () => {
      scheduleSave();
      setTimeout(() => toast("Draft saved. You can close this tab any time — it'll be waiting.", "success"), 80);
    });
    el("#submit-btn")?.addEventListener("click", onSubmit);
  }

  // ------------------------------------------------------------------
  // Wiring
  // ------------------------------------------------------------------
  function wireWorkspace() {
    els("[data-form-root] [data-field]").forEach(input => {
      if (input.type === "hidden") return; // yes/no has its own wiring below
      input.addEventListener("input", onFieldChange);
      input.addEventListener("change", onFieldChange);
      input.addEventListener("blur", () => validateField(input));
    });

    // Yes/No segmented toggle
    els("[data-yesno]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key   = btn.dataset.yesno;
        const value = btn.dataset.value;
        state.answers[key] = value;
        scheduleSave();
        renderWorkspace();
        renderSidebar();
      });
    });

    // Phone pickers — open country popover
    els("[data-phone-trigger]").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openCountryPicker(btn.closest(".phone-intl"));
      });
    });

    // Phone inputs — enforce digits-only + per-country cap
    els("[data-phone-input]").forEach(input => {
      input.addEventListener("input", onPhoneInput);
      input.addEventListener("blur", () => validatePhone(input));
    });

    // Number inputs — enforce numeric entry & non-negative ints
    els('[data-form-root] input[type="number"]').forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (["e","E","+","-",".",","].includes(e.key)) e.preventDefault();
      });
    });

    const prev = el("[data-go-prev]");
    if (prev) prev.addEventListener("click", () => {
      const idx = SECTIONS.findIndex(s => s.id === currentSection);
      if (idx > 0) switchSection(SECTIONS[idx - 1].id);
    });
    const next = el("[data-go-next]");
    if (next) next.addEventListener("click", () => {
      const idx = SECTIONS.findIndex(s => s.id === currentSection);
      if (idx < SECTIONS.length - 1) switchSection(SECTIONS[idx + 1].id);
      else openReview();
    });
  }

  function onFieldChange(ev) {
    const input = ev.target;
    const key = input.dataset.field;
    if (!key) return;
    let value = input.value;
    if (input.type === "number") {
      if (value === "") value = "";
      else {
        const n = Math.max(0, Math.floor(Number(value)));
        value = Number.isFinite(n) ? n : "";
        if (String(value) !== input.value && input === document.activeElement) {
          // Allow partial typing — don't clobber user while focused
        }
      }
    }
    state.answers[key] = value;
    scheduleSave();
    updateHeaderSummary();
    updateSidebarLight();
    // Re-validate inline error if it was showing
    if (input.classList.contains("invalid")) validateField(input);

    // Conditional fields: if a yesno changes we'd already re-render,
    // but if a dependency is a regular field we don't — no current
    // schema uses that path, so no re-render needed here.
  }

  function onPhoneInput(ev) {
    const input  = ev.target;
    const wrap   = input.closest(".phone-intl");
    const key    = input.dataset.field;
    const iso    = wrap.dataset.iso;
    const country = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_ISO];
    const maxLen = country.maxLen;

    // Remember where the cursor was in terms of *raw digits typed before
    // the caret*. That way we can restore the caret to the same logical
    // position after we re-insert the format separators.
    const selStart = input.selectionStart == null ? input.value.length : input.selectionStart;
    const rawBefore = (input.value.slice(0, selStart).match(/\d/g) || []).length;

    const digits    = (input.value || "").replace(/\D/g, "").slice(0, maxLen);
    const formatted = formatPhoneDigits(digits, iso, maxLen);
    if (input.value !== formatted) input.value = formatted;

    // Place cursor after the same raw-digit count in the reformatted string.
    let pos = 0, seen = 0;
    while (pos < formatted.length && seen < rawBefore) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    try { input.setSelectionRange(pos, pos); } catch { /* old browsers */ }

    state.answers[key] = digits;
    state.answers[key + "_iso"] = iso;
    scheduleSave();
    updateHeaderSummary();
    updateSidebarLight();
    if (input.classList.contains("invalid")) validatePhone(input);
  }

  function validateField(input) {
    const field = ALL_FIELDS.find(f => f.key === input.dataset.field);
    if (!field) return;
    if (field.type === "phone-intl") return validatePhone(input);

    const value = (input.value || "").trim();
    const empty = value === "";
    let invalid = field.required && empty;
    let message = "";

    if (!empty && field.type === "email") {
      if (!EMAIL_REGEX.test(value)) {
        invalid = true;
        message = "Please enter a valid email address (name@example.com).";
      }
    }

    input.classList.toggle("invalid", invalid);
    setFieldError(input, invalid ? message : "");
  }

  function validatePhone(input) {
    const wrap = input.closest(".phone-intl");
    const field = ALL_FIELDS.find(f => f.key === input.dataset.field);
    const iso = wrap.dataset.iso;
    const country = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_ISO];
    const digits = (input.value || "").replace(/\D/g, "");
    let invalid = false;
    let message = "";

    if (field?.required && digits.length === 0) {
      invalid = true;
    } else if (digits.length > 0 && digits.length !== country.maxLen) {
      invalid = true;
      message = `${country.name} numbers need ${country.maxLen} digit${country.maxLen === 1 ? "" : "s"} after ${country.code}.`;
    }

    input.classList.toggle("invalid", invalid);
    setFieldError(input, invalid ? message : "");
  }

  function setFieldError(input, message) {
    const wrap = input.closest(".field");
    if (!wrap) return;
    let err = wrap.querySelector(":scope > .error");
    if (message) {
      if (!err) {
        err = document.createElement("span");
        err.className = "error";
        wrap.appendChild(err);
      }
      err.textContent = message;
    } else if (err) {
      err.remove();
    }
  }

  function updateHeaderSummary() {
    const section = SECTIONS.find(s => s.id === currentSection);
    if (!section) return;
    const c = sectionProgress(section);
    const summary = c.total > 0
      ? `${c.done} / ${c.total} required answered in this section`
      : `Optional section`;
    const s = el(".action-bar .summary");
    if (s) s.textContent = summary;
  }

  function updateSidebarLight() { renderSidebar(); }

  // ------------------------------------------------------------------
  // Country picker popover (keyboard-accessible, search-filtered)
  // ------------------------------------------------------------------
  let activePicker = null;

  function openCountryPicker(wrap) {
    if (activePicker) { closeCountryPicker(); return; }
    const key       = wrap.dataset.phone;
    const currentIso = wrap.dataset.iso;
    const trigger    = wrap.querySelector("[data-phone-trigger]");
    trigger.setAttribute("aria-expanded", "true");

    const popover = document.createElement("div");
    popover.className = "country-popover";
    popover.innerHTML = `
      <div class="country-search">
        <span class="ico">${ICONS.search}</span>
        <input type="text" placeholder="Search country or code…" aria-label="Search country" />
      </div>
      <div class="country-list" role="listbox" aria-label="Countries">
        ${POPULAR.length > 0 ? `
          <div class="country-group-label">Commonly used</div>
          ${POPULAR.map(c => renderCountryOption(c, currentIso)).join("")}
          <div class="country-group-sep"></div>
          <div class="country-group-label">All countries</div>
        ` : ""}
        ${ALL_SORTED.map(c => renderCountryOption(c, currentIso)).join("")}
      </div>
    `;
    document.body.appendChild(popover);
    activePicker = { wrap, popover };
    positionPopover(wrap, popover);

    const search  = popover.querySelector(".country-search input");
    const listEl  = popover.querySelector(".country-list");
    requestAnimationFrame(() => search.focus());

    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      listEl.querySelectorAll(".country-opt").forEach(btn => {
        const name = btn.dataset.name.toLowerCase();
        const dial = btn.dataset.dial.toLowerCase();
        const show = !q || name.includes(q) || dial.includes(q);
        btn.style.display = show ? "" : "none";
      });
      listEl.querySelectorAll(".country-group-label, .country-group-sep").forEach(n => {
        n.style.display = q ? "none" : "";
      });
    });

    popover.addEventListener("click", (e) => {
      const opt = e.target.closest(".country-opt");
      if (!opt) return;
      const iso = opt.dataset.iso;
      selectCountry(wrap, iso);
      closeCountryPicker();
    });

    search.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeCountryPicker(); return; }
      if (e.key === "Enter") {
        const first = listEl.querySelector(".country-opt:not([style*='display: none'])");
        if (first) first.click();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const first = listEl.querySelector(".country-opt:not([style*='display: none'])");
        first?.focus();
      }
    });

    // Click-outside to close (defer so current click doesn't immediately close)
    setTimeout(() => {
      document.addEventListener("click", outsideListener, true);
      document.addEventListener("keydown", escListener, true);
      window.addEventListener("resize", resizeListener);
      window.addEventListener("scroll", resizeListener, true);
    }, 0);
  }

  function renderCountryOption(c, currentIso) {
    const selected = c.iso === currentIso;
    return `
      <button type="button" class="country-opt ${selected ? "selected" : ""}"
              role="option" aria-selected="${selected}"
              data-iso="${escapeAttr(c.iso)}" data-name="${escapeAttr(c.name)}" data-dial="${escapeAttr(c.code)}" tabindex="-1">
        <img class="country-flag" src="${flagUrl(c.iso, 40)}" alt="" width="22" height="16" loading="lazy" />
        <span class="country-name">${escapeHtml(c.name)}</span>
        <span class="country-dial">${escapeHtml(c.code)}</span>
        ${selected ? `<span class="country-check">${ICONS.check}</span>` : ""}
      </button>`;
  }

  function selectCountry(wrap, iso) {
    const key = wrap.dataset.phone;
    const country = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_ISO];
    wrap.dataset.iso = iso;

    // Update trigger visual bits
    const trigger = wrap.querySelector("[data-phone-trigger]");
    const img     = trigger.querySelector(".phone-flag");
    const dial    = trigger.querySelector(".phone-dial");
    img.src = flagUrl(country.iso, 40);
    img.alt = `${country.name} flag`;
    dial.textContent = country.code;

    // Re-cap + reformat the input to match the new country pattern
    const input = wrap.querySelector("[data-phone-input]");
    const digits = (input.value || "").replace(/\D/g, "").slice(0, country.maxLen);
    const pattern = getPhonePattern(country.iso, country.maxLen);
    input.value = formatPhoneDigits(digits, country.iso, country.maxLen);
    input.maxLength = pattern.length;
    input.placeholder = patternPlaceholder(pattern);

    state.answers[key] = digits;
    state.answers[key + "_iso"] = iso;
    scheduleSave();
    validatePhone(input);
    updateHeaderSummary();
    updateSidebarLight();
  }

  function closeCountryPicker() {
    if (!activePicker) return;
    const { wrap, popover } = activePicker;
    popover.remove();
    const trigger = wrap.querySelector("[data-phone-trigger]");
    trigger?.setAttribute("aria-expanded", "false");
    activePicker = null;
    document.removeEventListener("click", outsideListener, true);
    document.removeEventListener("keydown", escListener, true);
    window.removeEventListener("resize", resizeListener);
    window.removeEventListener("scroll", resizeListener, true);
  }

  function outsideListener(e) {
    if (!activePicker) return;
    if (activePicker.popover.contains(e.target)) return;
    if (activePicker.wrap.contains(e.target)) return;
    closeCountryPicker();
  }
  function escListener(e) { if (e.key === "Escape") closeCountryPicker(); }
  function resizeListener() { if (activePicker) positionPopover(activePicker.wrap, activePicker.popover); }

  function positionPopover(wrap, popover) {
    const r = wrap.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W  = Math.min(360, vw - 16);
    popover.style.width = `${W}px`;
    // Prefer below; flip up if not enough room
    const pop = popover.getBoundingClientRect();
    const POP_H = pop.height || 360;
    const spaceBelow = vh - r.bottom;
    let top;
    if (spaceBelow >= POP_H + 12 || spaceBelow > vh * 0.4) {
      top = r.bottom + 6;
    } else {
      top = Math.max(8, r.top - POP_H - 6);
    }
    let left = r.left;
    if (left + W > vw - 8) left = vw - W - 8;
    if (left < 8) left = 8;
    popover.style.top  = `${Math.round(top)}px`;
    popover.style.left = `${Math.round(left)}px`;
  }

  // ------------------------------------------------------------------
  // IP-based default country detection
  //
  // A single provider (ipapi.co) was previously used. That API is flaky
  // on the free tier — rate limits and slow responses meant users in
  // Canada occasionally got stuck on the Ghana fallback even though
  // they weren't actually in Ghana.
  //
  // We now:
  //   1. Apply any fresh cache immediately so the UI doesn't flicker.
  //   2. Hit several lightweight providers in parallel and take whichever
  //      resolves first with a valid ISO code.
  //   3. Cache the result for 24h so a bad cache self-heals each day.
  //   4. Refresh phone inputs in whichever view they're in as soon as
  //      detection resolves — not just in the portal view.
  // ------------------------------------------------------------------
  function getCachedIso() {
    try {
      const iso = localStorage.getItem(GEO_CACHE_KEY);
      const ts  = Number(localStorage.getItem(GEO_CACHE_TS_KEY) || 0);
      if (iso && COUNTRY_BY_ISO[iso] && Date.now() - ts < GEO_CACHE_TTL_MS) return iso;
    } catch {}
    return null;
  }

  function setCachedIso(iso) {
    try {
      localStorage.setItem(GEO_CACHE_KEY, iso);
      localStorage.setItem(GEO_CACHE_TS_KEY, String(Date.now()));
    } catch {}
  }

  function fetchIsoFromProvider(url, extract, timeoutMs = 3500) {
    return new Promise((resolve) => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      fetch(url, { signal: ctrl.signal, cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(j => {
          clearTimeout(to);
          const iso = j ? String(extract(j) || "").toUpperCase() : "";
          resolve(iso && COUNTRY_BY_ISO[iso] ? iso : null);
        })
        .catch(() => { clearTimeout(to); resolve(null); });
    });
  }

  async function fetchCountryIso() {
    const providers = [
      // Tiny, fast, well-behaved CORS — returns `{ip, country: "CA"}`.
      fetchIsoFromProvider("https://api.country.is/", (j) => j.country),
      // Generous free tier, CORS-enabled — returns country_code.
      fetchIsoFromProvider("https://ipwho.is/", (j) => (j.success !== false) && j.country_code),
      // Last resort — the one we used before.
      fetchIsoFromProvider("https://ipapi.co/json/", (j) => j.country_code || j.country),
    ];
    // First provider to return a non-null ISO wins.
    return new Promise((resolve) => {
      let settled = false;
      let remaining = providers.length;
      providers.forEach(p => {
        p.then(iso => {
          remaining--;
          if (iso && !settled) { settled = true; resolve(iso); }
          else if (remaining === 0 && !settled) { settled = true; resolve(null); }
        });
      });
    });
  }

  async function detectDefaultCountry() {
    const cached = getCachedIso();
    if (cached) {
      defaultIso = cached;
      refreshDefaultPhoneInputs();
    }
    try {
      const iso = await fetchCountryIso();
      if (iso) {
        defaultIso = iso;
        setCachedIso(iso);
        refreshDefaultPhoneInputs();
      }
    } catch {
      /* Silently stay on whatever we had (cache or GH fallback). */
    }
  }

  function refreshDefaultPhoneInputs() {
    // Refresh in whichever view: new phone controls may have been
    // rendered (portal view) or may render later (still on landing).
    els(".phone-intl").forEach(wrap => {
      const key = wrap.dataset.phone;
      if (!state.answers[key + "_iso"]) {
        selectCountry(wrap, defaultIso);
      }
    });
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  function onSubmit() {
    const problems = missingRequired();
    if (problems.length > 0) {
      toast(`${problems.length} required answer(s) still need attention.`, "warn");
      return;
    }
    confirmModal({
      title: "Submit this facility to Helix?",
      message:
        "We'll download a JSON copy for your records. In production, your integration layer should receive this payload and notify the Helix onboarding team.",
      confirmText: "Submit now",
      onConfirm: () => {
        state.meta.submitted    = true;
        state.meta.submitted_at = new Date().toISOString();
        scheduleSave();
        downloadSubmission();
        toast("Recorded locally — JSON downloaded. Hook your backend to notify Helix.", "success");
        renderWorkspace();
        renderSidebar();
      },
    });
  }

  function downloadSubmission() {
    const payload = buildSubmissionPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const name = (state.answers.facility_name || "helix-facility")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "helix-facility";
    a.href = url; a.download = `${name}-preonboarding.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  /** Flat, human-readable payload — phone numbers merge into "+233 209182633". */
  function buildSubmissionPayload() {
    const answers = {};
    ALL_FIELDS.forEach(f => {
      if (!isFieldVisible(f)) return;
      const raw = state.answers[f.key];
      if (f.type === "phone-intl") {
        const iso = state.answers[f.key + "_iso"] || defaultIso;
        const c   = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_ISO];
        const digits = String(raw || "").replace(/\D/g, "");
        answers[f.key] = digits ? `${c.code} ${digits}` : "";
        answers[f.key + "_country"] = iso;
      } else {
        answers[f.key] = raw ?? "";
      }
    });
    const uploadsPayload = {};
    DATA_UPLOAD_STEPS.forEach(s => {
      uploadsPayload[s.uploadKey] = state.uploads[s.uploadKey] ?? null;
    });
    return {
      kind: "helix.facility_preonboarding",
      schema_version: state.meta.version,
      created_at:   state.meta.created_at,
      updated_at:   state.meta.updated_at,
      submitted:    state.meta.submitted,
      submitted_at: state.meta.submitted_at,
      portal_phase: state.meta.portal_phase,
      uploads: uploadsPayload,
      answers,
    };
  }

  // ------------------------------------------------------------------
  // Templates view — live-rendered from the Excel templates schema.
  //
  // Facilities use four datasets once onboarded: Departments, Roles,
  // Staff and Patients. Column names must match the Helix ingestion
  // contract verbatim. This view mirrors the Excel workbook we used
  // to send out — same column order, same required/optional flags —
  // but turns every header into an interactive tooltip so hovering
  // or focusing reveals the Guide entry (meaning + guidance).
  // ------------------------------------------------------------------
  function renderTemplatesView() {
    const host = el("#templates-view");
    if (!host) return;
    const intro = TEMPLATES_INTRO || { headline: "Data templates", description: "", rules: [], legend: [] };

    host.innerHTML = `
      <div class="tpl-shell">
        <header class="tpl-hero reveal in">
          <div class="tpl-hero-copy">
            <span class="eyebrow">${escapeHtml(intro.headline || "Data templates")}</span>
            <h1 class="display display-lg">The exact shape your data should land in.</h1>
            <p class="lead">${escapeHtml(intro.description || "")}</p>
            <div class="tpl-legend">
              ${(intro.legend || []).map(l => `
                <span class="legend-chip tone-${l.tone}">
                  <span class="chip-dot"></span>
                  <strong>${escapeHtml(l.label)}</strong>
                  <span class="chip-note">${escapeHtml(l.note || "")}</span>
                </span>`).join("")}
            </div>
          </div>
          <aside class="tpl-hero-rules">
            <strong>Submission rules</strong>
            <ul>${(intro.rules || []).map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
          </aside>
        </header>

        <nav class="tpl-tabs" role="tablist" aria-label="Template datasets">
          ${TEMPLATES.map(t => `
            <button type="button" role="tab" class="tpl-tab ${t.id === currentTemplateId ? "active" : ""}"
                    data-tpl="${escapeAttr(t.id)}" aria-selected="${t.id === currentTemplateId}">
              <span class="tpl-tab-name">${escapeHtml(t.name)}</span>
              <span class="tpl-tab-meta">${t.columns.length} cols · ${t.columns.filter(c => c.required).length} required</span>
            </button>`).join("")}
        </nav>

        <section class="tpl-body">
          ${TEMPLATES.map(renderTemplatePanel).join("")}
        </section>
      </div>
    `;
    wireTemplatesView();
  }

  function renderTemplatePanel(tpl) {
    const active = tpl.id === currentTemplateId;
    const required = tpl.columns.filter(c => c.required).length;
    const optional = tpl.columns.length - required;
    return `
      <article class="tpl-panel ${active ? "active" : ""}" data-panel="${escapeAttr(tpl.id)}" ${active ? "" : "hidden"}>
        <header class="tpl-panel-head">
          <div>
            <h2>${escapeHtml(tpl.name)} <span class="tpl-sheet">sheet: ${escapeHtml(tpl.sheet)}</span></h2>
            <p class="tpl-tagline">${escapeHtml(tpl.tagline || "")}</p>
            <p class="tpl-desc">${escapeHtml(tpl.description || "")}</p>
          </div>
          <div class="tpl-panel-actions">
            <div class="tpl-stats">
              <div><strong>${tpl.columns.length}</strong><span>columns</span></div>
              <div><strong>${required}</strong><span>required</span></div>
              <div><strong>${optional}</strong><span>optional</span></div>
              <div><strong>${tpl.examples.length}</strong><span>examples</span></div>
            </div>
            <div class="tpl-btn-row">
              <button class="btn sm secondary" data-copy-cols="${escapeAttr(tpl.id)}" title="Copy header row as tab-separated values">Copy headers</button>
              <button class="btn sm" data-download-csv="${escapeAttr(tpl.id)}" title="Download the ${escapeHtml(tpl.name)} template as a CSV">Download CSV</button>
            </div>
          </div>
        </header>

        ${tpl.rules && tpl.rules.length ? `
          <ul class="tpl-rules">
            ${tpl.rules.map(r => `<li>${escapeHtml(r)}</li>`).join("")}
          </ul>` : ""}

        <div class="tpl-table-scroll">
          <table class="tpl-table">
            <thead>
              <tr>
                <th class="tpl-rownum" aria-label="Row number">#</th>
                ${tpl.columns.map((c, i) => `
                  <th class="tpl-col ${c.required ? "required" : "optional"}" style="animation-delay:${i * 26}ms;">
                    <span class="tpl-col-inner" tabindex="0"
                          data-col-tip="${escapeAttr(c.name)}"
                          data-col-meaning="${escapeAttr(c.meaning || "")}"
                          data-col-guidance="${escapeAttr(c.guidance || "")}"
                          data-col-required="${c.required ? "1" : "0"}">
                      <span class="col-name">${escapeHtml(c.name)}</span>
                      <span class="col-flag">${c.required ? "Required" : "Optional"}</span>
                    </span>
                  </th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${tpl.examples.map((row, ri) => `
                <tr style="animation-delay:${80 + ri * 40}ms;">
                  <td class="tpl-rownum">${ri + 1}</td>
                  ${tpl.columns.map((c, ci) => {
                    const v = row[ci];
                    const empty = v == null || v === "";
                    return `<td class="${empty ? "is-empty" : ""}" title="${escapeAttr(empty ? "(blank)" : String(v))}">${empty ? `<span class="dash">—</span>` : escapeHtml(String(v))}</td>`;
                  }).join("")}
                </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <footer class="tpl-panel-foot">
          <span class="tpl-foot-note">Example rows — for illustration only.</span>
          <span class="tpl-foot-hint">Hover any column name to see what goes in it.</span>
        </footer>
      </article>
    `;
  }

  function wireTemplatesView() {
    els(".tpl-tab").forEach(btn => {
      btn.addEventListener("click", () => switchTemplate(btn.dataset.tpl));
    });
    els("[data-copy-cols]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tpl = TEMPLATES.find(t => t.id === btn.dataset.copyCols);
        if (!tpl) return;
        const headers = tpl.columns.map(c => c.name).join("\t");
        navigator.clipboard?.writeText(headers).then(
          () => toast(`Copied ${tpl.columns.length} ${tpl.name} column names.`, "success"),
          () => toast("Couldn't copy to clipboard — try selecting the headers.", "warn"),
        );
      });
    });
    els("[data-download-csv]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tpl = TEMPLATES.find(t => t.id === btn.dataset.downloadCsv);
        if (!tpl) return;
        downloadTemplateCsv(tpl);
      });
    });

    const tv = el("#templates-view");
    if (tv) bindColTipHandlers(tv);
  }

  function switchTemplate(id) {
    if (!TEMPLATES.some(t => t.id === id) || id === currentTemplateId) return;
    currentTemplateId = id;
    els(".tpl-tab").forEach(t => {
      const on = t.dataset.tpl === id;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    els(".tpl-panel").forEach(p => {
      const on = p.dataset.panel === id;
      p.hidden = !on;
      p.classList.toggle("active", on);
    });
  }

  function openColTip(cell) {
    closeAllColTips();
    const name     = cell.dataset.colTip;
    const meaning  = cell.dataset.colMeaning;
    const guidance = cell.dataset.colGuidance;
    const req      = cell.dataset.colRequired === "1";
    const pop = document.createElement("div");
    pop.className = "col-tip";
    pop.innerHTML = `
      <div class="col-tip-head">
        <code>${escapeHtml(name)}</code>
        <span class="tip-flag ${req ? "tone-required" : "tone-optional"}">${req ? "Required" : "Optional"}</span>
      </div>
      ${meaning  ? `<div class="col-tip-sec"><span class="lbl">What it means</span><p>${escapeHtml(meaning)}</p></div>` : ""}
      ${guidance ? `<div class="col-tip-sec"><span class="lbl">Guidance</span><p>${escapeHtml(guidance)}</p></div>` : ""}`;
    document.body.appendChild(pop);
    cell._tip = pop;
    positionColTip(cell, pop);
    requestAnimationFrame(() => pop.classList.add("visible"));
  }

  function closeColTip(cell) {
    if (cell._tip) {
      cell._tip.remove();
      cell._tip = null;
    }
  }

  function closeAllColTips() {
    els(".col-tip").forEach(t => t.remove());
  }

  function bindColTipHandlers(root = document) {
    els("[data-col-tip]", root).forEach(cell => {
      cell.addEventListener("mouseenter", () => openColTip(cell));
      cell.addEventListener("focus", () => openColTip(cell));
      cell.addEventListener("mouseleave", () => closeColTip(cell));
      cell.addEventListener("blur", () => closeColTip(cell));
    });
  }

  function positionColTip(cell, pop) {
    const r  = cell.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const M  = 12;
    const pr = pop.getBoundingClientRect();
    const W  = Math.min(360, vw - M * 2);
    pop.style.width = `${W}px`;

    let top = r.bottom + 10;
    if (top + pr.height + M > vh) top = Math.max(M, r.top - pr.height - 10);
    let left = r.left + r.width / 2 - W / 2;
    left = Math.max(M, Math.min(vw - W - M, left));
    pop.style.top  = `${Math.round(top)}px`;
    pop.style.left = `${Math.round(left)}px`;
  }

  function downloadTemplateCsv(tpl) {
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [tpl.columns.map(c => esc(c.name)).join(",")];
    tpl.examples.forEach(row => lines.push(tpl.columns.map((_, i) => esc(row[i])).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `helix-${tpl.id}-template.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast(`Downloaded ${tpl.name} template CSV.`, "success");
  }

  // ------------------------------------------------------------------
  // Modal + toast
  // ------------------------------------------------------------------
  function confirmModal({ title, message, confirmText = "Confirm", danger = false, onConfirm }) {
    const host = el("#modal-host");
    el("#modal-content").innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn secondary" data-modal-cancel>Cancel</button>
        <button class="btn ${danger ? "" : ""}" data-modal-confirm>${escapeHtml(confirmText)}</button>
      </div>
    `;
    host.classList.add("open");
    const close = () => host.classList.remove("open");
    host.querySelector("[data-modal-cancel]").onclick = close;
    host.querySelector("[data-modal-confirm]").onclick = () => { close(); onConfirm && onConfirm(); };
    host.onclick = (e) => { if (e.target === host) close(); };
  }

  function toast(msg, kind = "success") {
    const host = el("#toast-host");
    const t = document.createElement("div");
    t.className = `toast ${kind}`;
    t.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    host.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity 280ms, transform 280ms";
      t.style.opacity = "0";
      t.style.transform = "translateY(8px)";
      setTimeout(() => t.remove(), 320);
    }, 3400);
  }

  // ------------------------------------------------------------------
  // Smart info tooltip — single floating element positioned against the
  // trigger, flipping above/below and clamping horizontally so the
  // content never clips on viewport edges.
  // ------------------------------------------------------------------
  const tipManager = (() => {
    let host, currentTrigger = null;

    function ensure() {
      if (!host) host = document.getElementById("global-tooltip");
      return host;
    }

    function show(trigger) {
      const h = ensure();
      const body = trigger.querySelector(".tip-body");
      if (!body || !h) return;
      h.innerHTML = body.innerHTML;
      h.setAttribute("aria-hidden", "false");
      h.classList.add("visible");
      currentTrigger = trigger;
      trigger.classList.add("open");
      position(trigger);
    }

    function hide() {
      const h = ensure();
      if (!h) return;
      h.classList.remove("visible");
      h.setAttribute("aria-hidden", "true");
      if (currentTrigger) currentTrigger.classList.remove("open");
      currentTrigger = null;
    }

    function position(trigger) {
      const h = ensure();
      if (!h) return;
      h.style.top  = "-9999px";
      h.style.left = "0px";
      const r   = trigger.getBoundingClientRect();
      const rh  = h.getBoundingClientRect();
      const GAP = 10, M = 12;
      const vw  = window.innerWidth;
      const vh  = window.innerHeight;

      let placement = "above";
      let top = r.top - rh.height - GAP;
      if (top < M) {
        placement = "below";
        top = r.bottom + GAP;
        if (top + rh.height + M > vh) top = Math.max(M, vh - rh.height - M);
      }
      const triggerCenter = r.left + r.width / 2;
      let left = triggerCenter - rh.width / 2;
      left = Math.max(M, Math.min(left, vw - rh.width - M));
      const arrowX = Math.max(14, Math.min(rh.width - 14, triggerCenter - left));

      h.style.top  = `${Math.round(top)}px`;
      h.style.left = `${Math.round(left)}px`;
      h.style.setProperty("--arrow-x", `${Math.round(arrowX)}px`);
      h.dataset.placement = placement;
    }

    function init() {
      document.addEventListener("mouseover", (e) => {
        const t = e.target.closest(".tooltip");
        if (t) show(t);
      });
      document.addEventListener("mouseout", (e) => {
        const t = e.target.closest(".tooltip");
        if (t && !t.contains(e.relatedTarget)) hide();
      });
      document.addEventListener("focusin", (e) => {
        const t = e.target.closest(".tooltip");
        if (t) show(t);
      });
      document.addEventListener("focusout", (e) => {
        const t = e.target.closest(".tooltip");
        if (t) hide();
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
      window.addEventListener("scroll", () => { if (currentTrigger) position(currentTrigger); }, true);
      window.addEventListener("resize", () => { if (currentTrigger) position(currentTrigger); });
    }

    return { init, hide };
  })();

  // ------------------------------------------------------------------
  // Landing wiring, scroll, video
  // ------------------------------------------------------------------
  function initLanding() {
    document.querySelectorAll("[data-go]").forEach(a => {
      a.addEventListener("click", (ev) => {
        const dest  = a.dataset.go;
        const sect  = a.dataset.section;
        if (sect) {
          ev.preventDefault();
          setView("landing");
          setTimeout(() => {
            const target = document.getElementById(sect);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 40);
          return;
        }
        if (dest === "portal" || dest === "landing" || dest === "templates") {
          ev.preventDefault();
          setView(dest);
          // Close mobile menu if open
          const drawer = document.getElementById("nav-drawer");
          const scrim = document.getElementById("nav-scrim");
          if (drawer && scrim) {
            drawer.classList.remove("open");
            scrim.classList.remove("open");
            document.body.classList.remove("nav-drawer-open");
            const toggle = document.getElementById("nav-toggle");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
          }
        }
      });
    });

    el("#nav-resume")?.addEventListener("click", () => setView("portal"));

    const placeholder = el("#video-placeholder");
    placeholder?.addEventListener("click", () => playVideo());
    placeholder?.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") playVideo(); });
    el("#hero-watch")?.addEventListener("click", () => {
      document.getElementById("video")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(playVideo, 550);
    });
    el("#cta-watch")?.addEventListener("click", () => {
      document.getElementById("video")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(playVideo, 550);
    });

    const nav = el("#top-nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));

    el("#y").textContent = new Date().getFullYear();
  }

  function playVideo() {
    const wrap = el("#video-wrap");
    if (!wrap) return;
    if (!VIDEO_URL) {
      toast("The walkthrough video will be available here soon.", "warn");
      return;
    }
    wrap.innerHTML = `<iframe src="${VIDEO_URL}" title="Helix walkthrough" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  // ------------------------------------------------------------------
  // Portal actions (export / reset)
  // ------------------------------------------------------------------
  function initPortalActions() {
    el("#export-btn")?.addEventListener("click", () => {
      downloadSubmission();
      toast("Exported current answers as JSON.", "success");
    });
    el("#reset-btn")?.addEventListener("click", () => {
      confirmModal({
        title: "Discard this draft?",
        message: "This clears every checklist answer, upload references and locally cached files in this browser. You can't undo it.",
        confirmText: "Discard",
        danger: true,
        onConfirm: () => {
          Object.keys(sessionFiles).forEach(k => { delete sessionFiles[k]; });
          localStorage.removeItem(STORAGE_KEY);
          state = defaultState();
          currentSection = SECTIONS[0].id;
          currentTemplateId = (TEMPLATES && TEMPLATES[0] && TEMPLATES[0].id) || "departments";
          onReview = false;
          renderPortalSteps();
          renderSidebar();
          renderWorkspace();
          updateResumeButton();
          toast("Draft cleared.", "warn");
        },
      });
    });
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    initPortalActions();
    tipManager.init();
    updateResumeButton();

    // Kick off IP geo — non-blocking; the portal will render with GH by
    // default and reshuffle the phone defaults once detection resolves.
    detectDefaultCountry();

    if (location.hash === "#portal") setView("portal");
    else if (location.hash === "#templates") setView("templates");
    else setView("landing");

    // Fade action bar while idle / scrolling
    let scrollTimer;
    let isHoveringAction = false;
    window.addEventListener("scroll", () => {
      const actionBar = document.querySelector(".action-bar");
      if (actionBar) {
        if (!actionBar.dataset.hoverWired) {
          actionBar.dataset.hoverWired = "1";
          actionBar.addEventListener("mouseenter", () => { isHoveringAction = true; actionBar.classList.remove("fade-out"); });
          actionBar.addEventListener("mouseleave", () => {
            isHoveringAction = false;
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => { if(!isHoveringAction) actionBar.classList.add("fade-out"); }, 1500);
          });
        }
        actionBar.classList.remove("fade-out");
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          if (!isHoveringAction) actionBar.classList.add("fade-out");
        }, 1500);
      }
    }, { passive: true });
  });
})();
