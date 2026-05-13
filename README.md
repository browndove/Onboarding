# Helix Health — Facility Pre-Onboarding Portal

A polished replacement for the Google Form we currently send to health facilities interested in Helix Health. It walks a primary contact through the **Facility Pre-Onboarding Checklist** — facility details, contacts, staffing, services, and staff systems — in one guided flow, with autosave, inline guidance, and a one-click JSON export.

Inspired by the calm, black-on-white design language of Sana and the tactile feel of products like Filevine, the portal gives hospitals a confident, guided experience.

## What's included

```
helix-portal/
├── index.html           → Landing page + portal shell
├── assets/
│   ├── styles.css       → Design system (typography, forms, animations)
│   ├── app.js           → App logic (sections, autosave, validation, export)
│   ├── data.js          → Checklist schema + country / dial-code data
│   └── logo.svg         → Helix mark
└── README.md
```

No build step. No backend. Everything ships as static files and runs in the browser.

## Running it

Open `index.html` in any modern browser, or serve the folder with any static server:

```bash
# From the helix-portal folder (Python 3)
python -m http.server 5173
# → http://localhost:5173/
```

On Windows you can also just double-click `index.html`.

## Features

### Landing page
- Hero with Helix mark, Fraunces serif display headline, Inter body
- Animated floating status cards
- Marquee of facility types
- Feature grid (Facility · Contacts · Staffing · Staff systems)
- 3-step "How it works"
- Embedded walkthrough video section (drop a YouTube/Vimeo embed URL into `VIDEO_URL` in `assets/app.js`)
- Dark CTA band + footer
- Subtle scroll-reveal animations throughout

### Portal

**Six sections** cover the whole Pre-Onboarding Checklist:

1. **Facility Information** — name, type, region (one of Ghana's 16 regions), city, address, email, phone
2. **Primary Contact** — name, phone, email
3. **Secondary Contact** *(optional)* — name, phone, email
4. **Staffing** — total, clinical, non-clinical, IT team + IT headcount
5. **Services & Infrastructure** — emergency dept, inpatient wards & beds, ambulance coordination, medical director
6. **Staff Systems & Directory** — staff IDs, work emails, personal emails, employee directory, staff lists

**Interaction details**

- **Country-aware phone inputs** — a flag + dial code picker on the left, a live-formatted digits input on the right. The placeholder hints at the expected shape (e.g. `(000) 000-0000` for Canada, `00 000 0000` for Ghana), and as you type the input groups digits with the right separators. The max number of digits is capped per country (e.g. `+1` caps at 10, `+233` caps at 9). The initial country is detected from the visitor's IP address via a small pool of providers (country.is → ipwho.is → ipapi.co — whichever answers first with a valid code wins), cached for 24h in `localStorage` so a stale detection self-heals, and falls back to Ghana (`+233`) if all providers fail.
- **Segmented Yes / No toggle** for all boolean questions.
- **Conditional fields** — the *Total Number of IT Staff* question only appears when the facility has an IT team; *Total Number of Inpatient Beds* only appears when the facility has inpatient wards.
- **Info icon (i)** on every field — hover/focus for the exact meaning and guidance.
- **Required vs Optional** indicators (red `*` for required, blue pill for optional).
- **Progress ring** in the sidebar showing overall completion, plus per-section status (complete / partial / untouched).
- **Autosave** — every keystroke persists to `localStorage` within 350ms, with a visible "Saved · 10:45 am" indicator.
- **Review step** shows every answer grouped by section, highlights anything still missing, and offers one-click jumps back into each section.
- **Submit** generates a JSON download (see below) and marks the draft submitted.
- **Export as JSON** at any time; **Discard draft** with a confirm modal.
- Smooth section transitions, hover/focus micro-interactions, card reveal animations.
- Fully responsive (mobile sidebar collapses, field grids stack).

### Templates view (`#templates`)

Once a facility is onboarded, Helix ingests four structured datasets — **Departments**, **Roles**, **Staff** and **Patients**. Historically we mailed around an Excel workbook (`Helix App Required Templates.xlsx`) to show what each sheet's columns should look like. The **Templates** tab replaces that:

- A pill-style sub-nav switches between the four datasets with a soft enter/exit animation.
- Each panel shows a sticky-header table with the **exact** column names Helix expects (nothing renamed, nothing reordered), a required/optional flag colour-coded on the left edge of each header, and a short tagline + description pulled from the workbook's Guide sheet.
- **Hover or focus any column** and a dark floating popover reveals *What it means* and *Guidance* for that field, verbatim from the Guide sheet.
- A few example rows (also mirrored from the workbook) illustrate the expected shape — department/staff/role/patient entries end-to-end.
- Per-template actions: **Copy headers** (tab-separated, so they paste straight into Excel or Sheets) and **Download CSV** (the full template with example rows).

Everything is rendered from `TEMPLATES` / `TEMPLATES_INTRO` in `assets/data.js` — editing column names, Guide text, or example rows there updates the view immediately.

## Editing the schema

All field labels, required/optional status, meanings, and guidance text live in `assets/data.js` under `SECTIONS`. Add, remove or reorder fields there and the portal updates automatically.

Each field supports:

| Property      | Type      | Purpose                                                          |
|---------------|-----------|------------------------------------------------------------------|
| `key`         | string    | Unique storage key                                               |
| `label`       | string    | Visible label                                                    |
| `type`        | string    | `text` · `email` · `number` · `textarea` · `select` · `yesno` · `phone-intl` |
| `required`    | boolean   | Show the red asterisk; count toward section completion           |
| `options`     | string[]  | For `select` types                                                |
| `placeholder` | string    | Optional input placeholder                                       |
| `meaning`     | string    | Tooltip — "What this means"                                      |
| `guidance`    | string    | Tooltip — "Guidance"; also shortened under the input              |
| `conditional` | object    | `{ field: "other_key", equals: "Yes" }` — show only when another field matches |

Country data (ISO, dial code, digit cap) lives in the same file under `COUNTRIES`.

## Wiring up the walkthrough video

Open `assets/app.js` and set the `VIDEO_URL` constant near the top to your YouTube/Vimeo embed URL:

```js
const VIDEO_URL = "https://www.youtube.com/embed/XXXXXXXXXXX";
```

Until a URL is set, clicking "play" shows a friendly toast.

## Submission format

Submitting (or exporting) produces a JSON file named after the facility, e.g. `korle-bu-teaching-hospital-preonboarding.json`:

```jsonc
{
  "kind": "helix.facility_preonboarding",
  "schema_version": 2,
  "created_at":   "ISO timestamp",
  "updated_at":   "ISO timestamp",
  "submitted":    true,
  "submitted_at": "ISO timestamp",
  "answers": {
    "facility_name":            "Korle Bu Teaching Hospital",
    "facility_type":            "Teaching Hospital",
    "facility_region":          "Greater Accra",
    "facility_city":             "Accra",
    "facility_address":         "Guggisberg Avenue, Korle Bu",
    "facility_email":           "admin@kbth.gov.gh",
    "facility_phone":           "+233 302739500",
    "facility_phone_country":   "GH",
    "primary_name":             "Ama Mensah",
    "primary_phone":            "+233 209182633",
    "primary_phone_country":    "GH",
    "primary_email":            "ama.mensah@kbth.gov.gh",
    "total_employees":          2800,
    "has_it_team":              "Yes",
    "total_it_staff":           12,
    "has_emergency":            "Yes",
    "has_inpatient_wards":      "Yes",
    "total_inpatient_beds":     1600
    // ...one entry per visible field
  }
}
```

Hook this up to your backend or Helix ingestion pipeline when ready.

## Country data & flags

- Dial codes and per-country digit caps live in `COUNTRIES` inside `assets/data.js`.
- Flags are served from [flagcdn.com](https://flagcdn.com/) using the ISO-3166 alpha-2 code — nothing is bundled locally, and the images render consistently across Windows, macOS and Linux (where emoji flags can be inconsistent).
- Default country is resolved from the visitor's IP via `https://ipapi.co/json/`, cached in `localStorage` under `helix.default_iso`, and falls back to Ghana.
# Onboarding
# Onboarding
