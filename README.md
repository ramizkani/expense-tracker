# Daily Ledger — Offline-First Multi-Currency Expense, Debt, Task & Zero-Knowledge Vault PWA

## 1. Current App Status (`v46` · `ledger-v46`)
- **Active Build Version:** `v46` (`sw.js` cache `ledger-v46`, `styles.css?v=46`, `app.js?v=46`, `manifest.webmanifest` `./?v=46`)
- **Architecture:** Segregated vanilla HTML5 + CSS3 + ES6+ PWA (zero runtime dependencies, offline-first IndexedDB + LocalStorage + Google Apps Script two-way delta sync)
- **Display & Performance Target:** 120Hz WhatsApp-style continuous interactive pager transitions (`translate3d` without opacity flash), full-screen mobile/desktop workspace modals (`100vw × 100dvh`) with permanent bottom safe cushion and bordered data-entry cards, pure `#000000` black Android bottom system bar and safe-area bezel blending.

---

## 2. Segregated File Structure
| File | Role & Responsibility |
| :--- | :--- |
| `index.html` | Clean semantic HTML structure, PWA metadata, SVG icon defs, top header (row 1: Status pill, `Settings` `#cmb`, `Toggle theme` `#thb`; row 2: `Backup`, `Sync`, `Diary & Vault`, `Tasks`, `View layout`), main `<main id="app">` mount, and `<dialog>` modals (`#dlg`, `#cm`, `#obd`, `#dbd`, `#pyd`, `#syd`, `#bkd`, `#drd` with `.dr-vp`/`.dr-track` continuous pager, `#tkd`). |
| `styles.css` | Segregated stylesheet (`v46`): CSS custom properties (light/dark tokens), 120Hz View Transitions ripple, full-screen `#drd` & `#tkd` rules (`100vw × 100dvh`), `.dr-vp` / `.dr-track` 200% continuous side-by-side pager, `.dr-mbar::after` sliding tab indicator, bordered `.dr-form` data-entry window + generous mobile bottom cushion above the black bar, and `.cls-x` red `✕` corner close button. |
| `app.js` | Application state, IndexedDB/LocalStorage persistence, AED/INR/Debts ledger engine, PBKDF2 + AES-256-GCM zero-knowledge encryption for Daily Diary & Info Vault, Home Tasks manager, custom date picker, 120Hz WhatsApp-style continuous touch/pointer gesture engine, and Google Sheets sync client. |
| `sw.js` | Offline service worker (`ledger-v46`) caching `./`, `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, and app icons. |
| `manifest.webmanifest` | Web App Manifest (`id: "./?v=46"`, `theme_color: "#000000"`, `background_color: "#000000"`). |
| `Code.gs` | Google Apps Script backend (`API = 4`) for 2-way incremental sync with Google Sheets (`Ledger`, `Categories`, `Debts`, `Payments`, `Tasks`, `Diary`, `Settings`). |

---

## 3. Version Changelog & Solved-Error Regression Tracker
| Version | Summary of Changes & Permanently Solved Issues |
| :--- | :--- |
| **`v46` (Current)** | **1. Mobile Bottom Padding Between Black Bar & Diary/Vault Data-Entering Window:** Added a permanent viewport bottom cushion (`padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px))` on `dialog.dr-dlg[open]` and `dialog.tk-dlg[open]`), switched mobile `.dr-work` to `display: flex; flex-direction: column` with `calc(64px + env(safe-area-inset-bottom, 0px))` scroll padding, styled `.dr-form` (`#dr-form` and `#vl-form`) as a distinct bordered card (`border-radius: 20px; padding: 14px 14px 18px; margin-bottom: 32px`), and increased `.dr-main` bottom padding (`calc(84px + env(safe-area-inset-bottom, 0px))` + `48px` `.dr-main::after` spacer) so the diary/vault data-entering window and reading card never touch or merge with the bottom black bar.<br>**2. Theme Change Button (`#thb`) Moved to Row 1 Next to `Settings` (`#cmb`):** Relocated `#thb` from `.stat-r2` into the first header row `.stat-r` right next to `Settings` (`#cmb`). |
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
3. **Generous Bottom Spacing in Diary & Vault (`v45` + `v46`):** `dialog.dr-dlg[open]` must maintain a permanent bottom cushion (`padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px))`), and `.dr-form` (data-entering window) and `.dr-view` (`Tap card to edit or delete`) must be enclosed in rounded bordered cards with generous bottom margin and scroll padding above the mobile black bar.
4. **Theme Toggle Button in First Row (`v46`):** `#thb` must stay in `.stat-r` right next to `#cmb` (`Settings`).
5. **Pure Black Android Bottom Bar (`v43`):** `manifest.webmanifest` and `<meta name="theme-color">` must stay `#000000`.
6. **Compact Draft Icon (`v40`):** `#dr-meta.draft` and `#vl-meta.draft` must remain `30×30px` single-line `📝` icon badges.
7. **Full-Screen Modals & Corner Red `✕` (`v44`):** `dialog.dr-dlg` and `dialog.tk-dlg` must stay `100vw × 100dvh` with `.cls-x` red `✕` buttons pinned in the top-right corner.
