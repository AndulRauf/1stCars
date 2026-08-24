# Admin Panel Report — 1stCars CMS

> Generated from the codebase audit. Covers menu structure, module inventory, data sources, the spacing cleanup, the sidebar reorganization, and the dashboard redesign.

---

## 1. What the admin panel is

- **Entry point:** `RoleDashboards.tsx` → `AdminCMS.tsx` (rendered for the `Admin` role).
- **Layout:** fixed collapsible left sidebar (`admin/Sidebar.tsx` + `admin/SidebarSection.tsx`) + right content panel. All modules render inside `AdminCMS.tsx`.
- **Data:** hybrid Supabase + localStorage. 25 Supabase tables are fetched in parallel by `loadCMSData()`; several modules fall back to `localStorage` seeds when Supabase has no rows.

---

## 2. Menu structure (after reorganization)

The sidebar was reduced from 8 sections to **7 sections** with denser, business-flow ordering. All sections except *Overview* now start **collapsed**, and the section owning the active module **auto-expands** when you navigate (e.g. clicking a dashboard card opens its section).

| # | Section | Items |
|---|---------|-------|
| 1 | **Overview** | Dashboard, Reports & Analytics, Automation Center *(moved up from bottom)* |
| 2 | **Leads & Sales** | **Leads & Enquiries** *(tabbed: Test Drive Requests / Booking Requests / Test Drives Log)*, Seller Enquiries, Purchases & Orders, CRM Activity Log, Live Auctions |
| 3 | **Inventory & Catalog** | Cars Catalog, Brands & Models, Cities |
| 4 | **Quality & Trust** | 120-Pt Inspections, 1st Mark Certification, Reviews, FAQs, Sell Form & Brands |
| 5 | **People & Access** | **Users & Staff** *(Staff merged into Users)*, Dealers & Approvals, Inspectors, Sales Associates |
| 6 | **Finance & Operations** | Finance, Ledger, Alerts Core *(UPI Payments moved into Theme Design)* |
| 7 | **Website & Content** | Edit Pages, Footer Links, **Theme Design (Theme & Branding / UPI Payments tabs)**, Text Editor |

**What changed vs. before:**
- `Reports` moved from *Finance & Operations* into *Overview* (it is an analytics view, not finance).
- `Automation Center` moved from its own lone section at the bottom into *Overview*.
- *Inventory* → **Inventory & Catalog**; *Site & Content* → **Website & Content**.
- **Step 2 (round 2):** the three near-identical lead tables were consolidated into **one "Leads & Enquiries" module with tabs** (Test Drive Requests / Booking Requests / Test Drives Log) plus live per-tab counts. Same CRUD engine, one menu row.
- **Step 5 (round 2):** `Staff` menu removed — staff is the same `profiles` table; it is now filtered inside **Users & Staff** (new "Role: Staff" filter option).
- **Step 5 (round 2):** `UPI Payments` menu removed — it is now the second tab of **Theme Design** (`Theme & Branding` / `UPI Payments`).
- Sections collapsed by default; active section auto-expands; search still force-expands matches.
- **Step 4 (round 2):** sidebar collapse + section-expansion prefs are **per-role** (`1stcars_admin_sidebar_collapsed_<role>`, `1stcars_admin_section_expansions_<role>`), with legacy global keys as fallback.

---

## 3. Module inventory (26 menu items)

| Module | Purpose | Data source |
|--------|---------|-------------|
| Dashboard | Merged KPI overview + CRM center (funnel, pipeline, activity) | All tables |
| Reports | **Live aggregations**: fleet value, lead pipeline, inspection funnel, auction engine, expense categories, user roles | All tables |
| Automation Center | Triggers, rules & scheduled jobs engine | `automation` service |
| Leads & Enquiries | **Tabbed**: Test Drive Requests / Booking Requests / Test Drives Log | `sales_notifications` + `test_drives` |
| Seller Enquiries | Sell-your-car valuation leads | `sales_notifications` / `sell_requests` |
| Purchases & Orders | Confirmed purchases | `purchases` |
| CRM Activity Log | Customer touchpoint audit | `crm_activities` |
| Live Auctions | Dealer auction engine (RPC or local mirror) | `auctions` + RPC |
| Cars Catalog | CRUD, approve & publish, 120-pt report editor, wizard | `cars` |
| Brands & Models | Brand/model catalog CRUD | `brands` + `models` |
| Cities | Branch/city registry | `cities` |
| 120-Pt Inspections | Inspection records, report editor, publish/auction actions | `inspections` |
| 1st Mark Certification | Certification pillars + certified listing summary | `inspections` |
| Reviews | Customer testimonials (tombstone delete) | `testimonials` |
| FAQs | Q&A registry | `faq` |
| Sell Form & Brands | Sell-page brands/models/variants + inspection checklist editor | localStorage + Supabase |
| Users & Staff | Profile registry incl. Staff/Admin/Inspector/Sales roles | `profiles` |
| Dealers & Approvals | Dealer verification, visiting card/aadhar photos | `dealers` + `profiles` |
| Inspectors | Inspector registry | `profiles` (role Inspector) |
| Sales Associates | Sales rep performance list | `profiles` (role Sales Associate) |
| Finance | Finance partner registry | `finance_partners` |
| Ledger | Expense ledger | `expenses` |
| Alerts Core | Notification ledger | `notifications` |
| Edit Pages | Website page content editor | `pages` |
| Footer Links | Footer link management | `pages` (is_footer) |
| Theme Design | **Tabs**: Theme & Branding (colors, fonts, SEO, analytics) + UPI Payments (UPI ID, QR, payee) | `settings` + localStorage |
| Text Editor | Raw copy/text editing | localStorage |

---

## 4. Spacing cleanup (free-space fixes)

The panel was losing ~30% of vertical space to oversized padding/gaps. Fixed:

| Area | Before | After |
|------|--------|-------|
| Main content wrapper | `p-4 sm:p-6 lg:p-8 space-y-6` | `p-4 sm:p-5 lg:p-6 space-y-4` |
| Top header bar | `p-4` | `px-4 py-3` |
| Breadcrumb | `py-3 px-6 rounded-2xl mb-6` | `py-2.5 px-5 rounded-xl mb-3` |
| All module cards (`AdminCMS`) | `rounded-3xl p-6 space-y-6` | `rounded-2xl p-5 space-y-4` |
| `AutomationControlCenter` | `rounded-3xl p-6 space-y-6` | `rounded-2xl p-5 space-y-4` |
| `PageEditor` | `rounded-3xl p-6/8 space-y-8` | `rounded-2xl p-5/6 space-y-6` |
| `CRM` detail/activity cards | `rounded-3xl p-6 space-y-6` | `rounded-2xl p-5 space-y-4` |
| `AdminAuctions` header | `rounded-3xl p-6` | `rounded-2xl p-5` |
| Dashboard KPI cards | `p-5` + `justify-between` (tall, empty middle) | `p-4` icon-led rows, no dead space |

---

## 5. Dashboard redesign (data rethink)

`admin/AdminDashboard.tsx` was rebuilt:

1. **Quick Actions strip** — one-tap navigation: *Add New Car, Approve Pending, Live Auctions, Reports & Analytics*.
2. **8 icon-led KPI cards** — every card now has a colored icon chip, label, big value, and a meaningful sub-line:
   - Active Auctions · Pending Evaluations · **Inventory Value (₹L)** · Customer Leads · **Cars Ready to Sell** (pending/sold split) · Registered Users (dealer/sales breakdown) · Unread Alerts · Live Pages (now also shows expense total instead of a redundant static line).
   - Replaced the old cards that showed raw counts with business-impact metrics (inventory value, ready-to-sell stock, per-role user split).
3. **Sparklines + 7-day trends (round 2)** — six cards render a trailing-7-day SVG sparkline (inspections, cars, leads, users, notifications) plus a `+X% 7d` / `-X% 7d` chip computed against the previous 7 days from real `created_at` timestamps.
4. **No duplicate data** — the old dashboard rendered the same 8 numbers again inside the CRM center. The embedded CRM center now hides its KPI row (`hideKpis` prop) and starts directly at the pipeline funnel, cutting page length roughly in half.
5. **Empty-state hint** — fresh installations get a banner guiding to "Add New Record" instead of a sparse blank grid.

## 6. Recommended next steps (implemented, no menus removed)

1. **✅ Merge `Staff` into `Users`** — `Staff` menu removed; the `profiles`-backed Users module now carries a "Role: Staff" filter (plus Admin / Inspector / Sales Associate), so one table serves all staff roles.
2. **✅ Sparkline/trend data on dashboard cards** — 7-day series + week-over-week change chips fed from real record timestamps (`cars`, `users`, `inspections`, `salesLeads`, `notifications`).
3. **✅ Consolidate lead modules into one "Leads & Enquiries" tabbed module** — Test Drive Requests / Booking Requests / Test Drives Log share one sidebar entry, one CRUD engine, and per-tab counts. Deep links (search, filters, add/edit/delete, import/export, modals) all follow the active tab.
4. **✅ Per-role sidebar state** — collapse + section expansions are namespaced per role (`..._collapsed_<role>`, `..._sections_<role>`), legacy global keys used as fallback.
5. **✅ UPI Payments into Theme Design tabs** — the payment settings panel is now the second tab of the Theme Design module (Theme & Branding / UPI Payments); one fewer menu row.
6. **✅ Real Reports data layer** — the Reports module now computes live aggregations from loaded state: fleet & revenue (value, avg price, status distribution), lead pipeline counts, inspection funnel + certification rate, auction engine stats, expense-by-category bars, and user-by-role bars, with a generated-at timestamp and print support.

### Still open (future work)
- **GA4 analytics (`analytics.ts`) is event tracking only** — it does not yet feed the Reports module. If you add GA4 raw-data export later, the Reports block is structured to consume it.
- **Lead-source attribution** (UTM → report column) once GA4 data is piped in.
- **Recurring expense budgets** per category with month-over-month deltas.