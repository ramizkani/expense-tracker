# Daily Ledger — Offline-First Multi-Currency Expense, Debt, Task & Zero-Knowledge Vault PWA

## 1. Current App Status (`v44` · `ledger-v44`)
- **Active Build Version:** `v44` (`sw.js` cache `ledger-v44`, `styles.css?v=44`, `app.js?v=44`, `manifest.webmanifest` `./?v=44`)
- **Architecture:** Segregated vanilla HTML5 + CSS3 + ES6+ PWA (zero runtime dependencies, offline-first IndexedDB + LocalStorage + Google Apps Script two-way delta sync)
- **Display & Performance Target:** 120Hz GPU-accelerated transitions (`translate3d` without opacity flash), full-screen mobile/desktop workspace modals (`100vw × 100dvh`), pure `#000000` black Android bottom system bar and safe-area bezel blending.

---

## 2. Segregated File Structure
| File | Role & Responsibility |
| :--- | :--- |
| `index.html` | Clean semantic HTML structure, PWA metadata, SVG icon defs, top header, main `<main id="app">` mount, and `<dialog>` modals (`#dlg`, `#cm`, `#obd`, `#dbd`, `#pyd`, `#syd`, `#bkd`, `#drd`, `#tkd`). |
| `styles.css` | Segregated stylesheet (`v44`): CSS custom properties (light/dark tokens), 120Hz View Transitions ripple, full-screen `#drd` & `#tkd` rules (`100vw × 100dvh`), `.cls-x` red `✕` corner close button, `@keyframes slideFromRight` / `slideFromLeft`, and responsive breakpoints. |
| `app.js` | Application state, IndexedDB/LocalStorage persistence, AED/INR/Debts ledger engine, PBKDF2 + AES-256-GCM zero-knowledge encryption for Daily Diary & Info Vault, Home Tasks manager, custom date picker, 120Hz touch/pointer gesture engine, and Google Sheets sync client. |
| `sw.js` | Offline service worker (`ledger-v44`) caching `./`, `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, and app icons. |
| `manifest.webmanifest` | Web App Manifest (`id: "./?v=44"`, `theme_color: "#000000"`, `background_color: "#000000"`). |
| `Code.gs` | Google Apps Script backend (`API = 4`) for 2-way incremental sync with Google Sheets (`Ledger`, `Categories`, `Debts`, `Payments`, `Tasks`, `Diary`, `Settings`). |

---

## 3. Version Changelog & Solved-Error Regression Tracker
| Version | Summary of Changes & Permanently Solved Issues |
| :--- | :--- |
| **`v44` (Current)** | **1.** Segregated CSS out of `index.html` into `styles.css`.<br>**2.** Added 120Hz horizontal swipe gesture control on `#app` to switch between `AED`, `INR`, and `Debts` with directional GPU slide.<br>**3.** Added horizontal swipe options to the popup calendar (`.cal` swipes prev/next month) and date picker inputs (`[data-dp]` and `.dr-dbar` swipe `±1` day).<br>**4.** Made `Diary & Vault` (`#drd`) and `Tasks` (`#tkd`) full-screen (`100vw × 100dvh`), added gesture control (swipe left/right between `Daily Diary` ↔ `Info Vault` or task categories `All` ↔ `1. Personal` ↔ `2. Work`, plus header pull-down to close), and placed red `✕` close buttons (`.cls-x`) in the top-right corner. |
| **`v43`** | **Solved Android Bottom Green Bar:** Changed `manifest.webmanifest` `theme_color` & `background_color` from `#0b7a75`/`#0b1324` to `#000000`, set `#theme-meta` to `#000000`, `html { background: #000000 }`, and mobile `body::after` safe-area bar to `#000000` with subtle `#161618` dot-gray hairline. |
| **`v42`** | **Solved Diary & Vault Header Line Flash:** Removed dynamic border/accent mutations on `.dr-hd` and `.dr-mbar`, removed `backdrop-filter` and `transition` on header buttons, and ensured mode switching updates synchronously in 1 frame. |
| **`v40–v41`** | **Solved Vault 6-Row Wrapped Draft Pill & Header Layout:** Unified `#dr-meta` and `#vl-meta` into a compact `30×30px` `📝` draft icon badge; moved `Tasks` button next to `Diary & Vault` in header row 2; added 120Hz circular theme ripple on `#thb`. |
| **`v38–v39`** | **Merged Diary & Info Vault + Touch-to-Reveal Actions:** Combined Daily Diary and encrypted Info Vault into one unified modal with collapsible daily tasks dropdown and tap-to-reveal Edit/Delete actions. |

---

## 4. Non-Negotiable Regression Guards (Must Never Return)
1. **Zero Header / Border Flash (`v42` + `v44`):** `.dr-hd` and `.dr-mbar` must never change border color, background, or opacity during mode switches; 120Hz slide animations (`slideFromRight` / `slideFromLeft`) must use `transform: translate3d(...)` only with **no opacity drop**.
2. **Pure Black Android Bottom Bar (`v43`):** `manifest.webmanifest` and `<meta name="theme-color">` must stay `#000000` so Android navigation/gesture bars blend into the hardware bezel.
3. **Compact Draft Icon (`v40`):** `#dr-meta.draft` and `#vl-meta.draft` must remain `30×30px` single-line `📝` icon badges (`font-size: 0` on text).
4. **Full-Screen Modals & Corner Red `✕` (`v44`):** `dialog.dr-dlg` and `dialog.tk-dlg` must stay `100vw × 100dvh` with `.cls-x` red `✕` buttons in the top-right corner.
