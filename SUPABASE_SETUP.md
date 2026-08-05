# 1stCars — Real Backend (Supabase) Setup

The app runs on an in-browser **mock database** until you provide real Supabase
credentials. Follow these steps to go live with a real, shared backend.

## 1. Create a Supabase project
1. Go to https://supabase.com → **New project**.
2. Note the **Project URL** and **anon public key** from
   **Project Settings → API**.

## 2. Create the database schema
1. In the Supabase dashboard open **SQL Editor → New query**.
2. Paste the entire contents of [`public/schema.sql`](public/schema.sql) and **Run**.
   - This creates all tables (profiles, cars, inspections, auctions, `pages`, …),
     the signup trigger, Row-Level Security policies, seed CMS pages, and the
     `car-images` / `logos` storage buckets.
   - The file is safe to re-run (uses `IF NOT EXISTS` / `ON CONFLICT` /
     `CREATE OR REPLACE`).
   - **Already ran it before? Re-run the updated file** — it now includes the
     `pages` table, schema-compat patches, and a hardened signup trigger
     (re-running applies all of them).

## 3. Configure auth
- **Authentication → Providers → Email**: enable it.
- For a smooth launch you may turn **"Confirm email"** OFF (Authentication →
  Providers → Email) so new users can sign in immediately. Turn it back on once
  you've configured an SMTP sender.

### 3b. Enable Mobile OTP login (phone authentication)
The app's **"Mobile OTP"** login tab uses Supabase's native phone OTP
(`signInWithOtp` / `verifyOtp`) — the code is generated and verified entirely
server-side. To make it work:

1. **Authentication → Sign In / Up → Providers → Phone**: enable it.
   - Set a **Phone template** (the SMS body; the `{{ .Code }}` / `{{ .Token }}`
     variable is auto-injected by Supabase).
2. **Authentication → SMS Providers**: add an SMS provider — Twilio, Termii,
   Vonage, MessageBird, or textlocal — and enter your account credentials.
   - Twilio (India): you'll also need a Twilio **Messaging Service** SID and an
     approved message template for DLT/OTP compliance.
3. Re-run `public/schema.sql` once after this setup: the latest version makes
   `profiles.email` nullable and the signup trigger now handles **phone-only
   users** (no email), so OTP signups create a Buyer profile automatically.
4. Users log in from **Login → Mobile OTP → send code → verify**. New numbers
   are auto-created as Buyer accounts; no password needed.

> Phone numbers are sent to Supabase as `+91xxxxxxxxxx`. SMS costs are billed to
> your SMS provider account.

## 4. Wire the credentials

### Local development
```bash
cp .env.example .env
# then edit .env and fill in:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
npm install
npm run dev
```

### Vercel (production)
In your Vercel project → **Settings → Environment Variables**, add:

| Name                     | Value                          |
| ------------------------ | ------------------------------ |
| `VITE_SUPABASE_URL`      | your Supabase project URL      |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key  |

Then **redeploy**. When both vars are present the app automatically switches
from the mock to the real Supabase client (see `src/lib/supabaseClient.ts`).

## 5. Create the first Admin
1. Register a normal account through the app UI.
2. In Supabase **Table Editor → profiles**, find that user and set
   `role = Admin`.
3. Reload the app — you now have full CMS/admin access.

> Security note: the signup trigger only grants staff roles (Admin, Sales
> Associate, Inspector) to the pre-approved `@1stcars.com` demo emails; any
> other signup gets Buyer/Seller/Dealer at most. The one-click **staff demo
> buttons** are therefore hidden on the real backend — create staff accounts
> via the Table Editor instead.

## 6. (Optional) Seed inventory
The helper in `src/lib/seeder.ts` can populate brands, models, cities, and demo
cars. Trigger it from the Admin CMS, **or it runs automatically**: the first
time an Admin / Sales Associate signs in on an empty database, the catalog is
seeded in the background (once per browser per user).

---

### Troubleshooting
- **`new row violates row-level security policy for table "inspections"`** on the
  Sell Car form means the live database predates the "Visitors submit inspection
  requests" INSERT policy and the anon INSERT grant. Fix: re-run
  [`public/schema.sql`](public/schema.sql) in the Supabase SQL Editor (the file is
  idempotent) — it drops/recreates that policy and grants
  `INSERT, SELECT ON public.inspections TO anon`. Then hard-refresh the site.

### Notes
- **Mock vs real:** if either env var is empty the app falls back to the mock.
  You can also force the mock in the browser console with
  `localStorage.setItem("1stcars_use_mock_db", "true")`.
- Never expose the **service_role** key in the frontend — only the **anon** key
  belongs in `VITE_` variables.
