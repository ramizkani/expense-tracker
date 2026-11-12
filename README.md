# Daily Ledger — Offline-First Multi-Currency Expense, Debt, Task & Zero-Knowledge Vault PWA

## 1. Current App Status (`v48` · `ledger-v48`)
- **Active Build Version:** `v48` (`sw.js` cache `ledger-v48`, `styles.css?v=48`, `app.js?v=48`, `manifest.webmanifest` `./?v=48`)
- **Architecture:** Segregated vanilla HTML5 + CSS3 + ES6+ PWA (zero runtime dependencies, offline-first IndexedDB + LocalStorage + Google Apps Script two-way delta sync)
- **Display & Performance Target:** 120Hz WhatsApp-style continuous interactive pager transitions (`translate3d` without opacity flash), full-screen mobile/desktop workspace modals (`100vw × 100dvh`) with clean bottom scroll padding, pure `#000000` black Android bottom system bar and safe-area bezel blending.

---

## 2. Segregated File Structure
| File | Role & Responsibility |
| :--- | :--- |
| `index.html` | Clean semantic HTML structure, PWA metadata, symmetrical SVG icon defs (including fixed 8-tooth `#cmb` Settings gear icon and `#cm` modal icons), top header (row 1: Status pill, `Settings` `#cmb`, `Toggle theme` `#thb`; row 2: `Backup`, `Sync`, `Diary & Vault`, `Tasks`, `View layout`), main `<main id="app">` mount, and `<dialog>` modals (`#dlg`, `#cm`, `#obd`, `#dbd` with quick person chips, `#pyd`, `#syd`, `#bkd`, `#drd` with `.dr-vp`/`.dr-track` continuous pager, `#tkd`). |
| `styles.css` | Segregated stylesheet (`v48`): CSS custom properties (light/dark tokens), 120Hz View Transitions ripple, full-screen `#drd` & `#tkd` rules (`100vw × 100dvh`), `.dr-vp` / `.dr-track` 200% continuous side-by-side pager, `.dr-mbar::after` sliding tab indicator, clean bottom padding on `.dr-main` / `.dr-work`, `.dbt-drawer` / `.dbt-ent-row` consolidated debt breakdown styles, and `.cls-x` red `✕` corner close button. |
| `app.js` | Application state, IndexedDB/LocalStorage persistence, AED/INR/Debts ledger engine with **same-person debt consolidation (`getDebtGroups`) + FIFO auto-split part-payments + touch-to-expand entry & payment breakdown**, PBKDF2 + AES-256-GCM zero-knowledge encryption for Daily Diary & Info Vault, Home Tasks manager, custom date picker, 120Hz WhatsApp-style continuous touch/pointer gesture engine, and Google Sheets sync client. |
| `sw.js` | Offline service worker (`ledger-v48`) caching `./`, `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, and app icons. |
| `manifest.webmanifest` | Web App Manifest (`id: "./?v=48"`, `theme_color: "#000000"`, `background_color: "#000000"`). |
| `Code.gs` | Google Apps Script backend (`API = 4`) for 2-way incremental sync with Google Sheets (`Ledger`, `Categories`, `Debts`, `Payments`, `Tasks`, `Diary`, `Settings`). |

---

## 3. Version Changelog & Solved-Error Regression Tracker
| Version | Summary of Changes & Permanently Solved Issues |
| :--- | :--- |
| **`v48` (Current)** | **1. Fixed Imperfect Settings Gear Icon (`#cmb`) & Settings Modal Icons (`#cm`):** Fixed malformed left-tooth arc in `#cmb` gear SVG (`H3a2 2 0 0 1 0 4h.09` → `H3a2 2 0 0 1 0-4h.09`) so all 8 gear teeth render symmetrically without self-intersecting lines; added crisp gear & 2×2 grid icons inside `#cm` (`Settings & History`).<br>**2. Consolidated Same-Name Debts + Auto-Split Part-Payments + Touch-to-Expand Breakdown:** Grouped debt entries with the same person name (case-insensitive per currency & direction) into a **single consolidated entry** displaying the combined total, total paid, and total remaining (`N entries` badge). Recording a part-payment (e.g., `1,500 INR` against `2,000 INR` across 2 entries) automatically splits and settles oldest entries first (FIFO: `1,000` on `10/10/2026` + `500` on `11/11/2026`) while preserving individual `DB` and `DebtPayments` records for Google Sheets sync and History restore. Touching the entry expands the full chronological breakdown of every received/given amount (date, note, amount, paid/left status, individual Edit/Delete, `+ Add entry`) and payment history. |
| **`v47`** | **1. Clean Bottom-Only Padding & Space in `Diary & Vault`:** Kept all internal card/input/sidebar paddings and `.dr-form` layout identical to `v45` and adjusted **only** the mobile bottom padding and scroll layout (`.dr-work { display: block; padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)) }`, `.dr-main { min-height: auto; padding: 16px 14px calc(32px + env(safe-area-inset-bottom, 0px)) }`, and `.dr-main::after { height: 12px }`).<br>**2. Theme Change Button (`#thb`) in Row 1 Next to `Settings` (`#cmb`):** Placed `#thb` in the first header row `.stat-r` right next to `Settings` (`#cmb`). |
| **`v45`** | **1. WhatsApp-Style Continuous 120Hz Pager Transitions:** Upgraded `Daily Diary` ↔ `Info Vault` (`.dr-vp` / `.dr-track` 200% side-by-side track + `.dr-mbar::after` sliding indicator) and `AED` ↔ `INR` ↔ `Debts` (`.swipe-adj-card` side-by-side live drag & full-width `100%` slide) so adjacent screens move continuously together with your finger.<br>**2. Protected Previous-Day Navigation in Diary:** Excluded `.dr-side`, `#dr-list`, `.dr-dbar`, `.dr-dnav`, `.dr-sum`, and form controls from Diary ↔ Vault mode swipes and added strict vertical-first angle locking so checking previous days never accidentally swipes to Info Vault. |
| **`v44`** | **1.** Segregated CSS out of `index.html` into `styles.css`.<br>**2.** Added 120Hz horizontal swipe gesture control on `#app` (`AED` ↔ `INR` ↔ `Debts`) and date pickers (`.cal` month swipe & `[data-dp]` `±1` day swipe).<br>**3.** Made `Diary & Vault` (`#drd`) and `Tasks` (`#tkd`) full-screen (`100vw × 100dvh`) with top-right red `✕` close buttons (`.cls-x`). |
| **`v43`** | **Solved Android Bottom Green Bar:** Changed `manifest.webmanifest` `theme_color` & `background_color` to `#000000`, set `#theme-meta` to `#000000`, `html { background: #000000 }`, and mobile `body::after` safe-area bar to `#000000`. |
| **`v42`** | **Solved Diary & Vault Header Line Flash:** Removed dynamic border/accent mutations on `.dr-hd` and `.dr-mbar`, removed `backdrop-filter` and `transition` on header buttons, and ensured mode switching updates synchronously in 1 frame. |
| **`v40–v41`** | **Solved Vault 6-Row Wrapped Draft Pill & Header Layout:** Unified `#dr-meta` and `#vl-meta` into a compact `30×30px` `📝` draft icon badge; moved `Tasks` button next to `Diary & Vault` in header row 2; added 120Hz circular theme ripple on `#thb`. |
| **`v38–v39`** | **Merged Diary & Info Vault + Touch-to-Reveal Actions:** Combined Daily Diary and encrypted Info Vault into one unified modal with collapsible daily tasks dropdown and tap-to-reveal Edit/Delete actions. |

---

## 4. Non-Negotiable Regression Guards (Must Never Return)
1. **Zero Header / Border Flash (`v42` + `v45`):** `.dr-hd` and `.dr-mbar` must never change border color, background, or opacity during mode switches; 120Hz slide animations must use `transform: translate3d(...)` only with **no opacity drop**.
2. **No Accidental Mode Swipes While Checking Previous Days (`v45`):** Swiping on `.dr-side`, `#dr-list`, `.dr-dbar`, `.dr-dnav`, or `.dr-sum` must never trigger a `Daily Diary` ↔ `Info Vault` mode switch.
3. **Clean Bottom-Only Spacing in Diary & Vault (`v47`):** Do not add extra borders/backgrounds to `.dr-form` or alter internal paddings of `.dr-side`/`.dr-sum`/`.dr-ttl`/`.dr-bdy`; maintain clean bottom padding on `.dr-main` and `.dr-work`.
4. **Theme Toggle Button in First Row (`v46–v47`):** `#thb` must stay in `.stat-r` right next to `#cmb` (`Settings`).
5. **Symmetrical Settings Gear Icon & Consolidated Debts (`v48`):** `#cmb` gear SVG must use `H3a2 2 0 0 1 0-4h.09` (never `0 4`), and same-person debt entries in the same currency & direction must consolidate into one card/row with FIFO auto-split part-payments and touch-to-expand breakdown.
6. **Pure Black Android Bottom Bar (`v43`):** `manifest.webmanifest` and `<meta name="theme-color">` must stay `#000000`.
7. **Compact Draft Icon (`v40`):** `#dr-meta.draft` and `#vl-meta.draft` must remain `30×30px` single-line `📝` icon badges.
8. **Full-Screen Modals & Corner Red `✕` (`v44`):** `dialog.dr-dlg` and `dialog.tk-dlg` must stay `100vw × 100dvh` with `.cls-x` red `✕` buttons pinned in the top-right corner.
