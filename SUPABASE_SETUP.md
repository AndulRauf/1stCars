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
   - The file is safe to re-run (uses `IF NOT EXISTS` / `ON CONFLICT`).

## 3. Configure auth
- **Authentication → Providers → Email**: enable it.
- For a smooth launch you may turn **"Confirm email"** OFF (Authentication →
  Providers → Email) so new users can sign in immediately. Turn it back on once
  you've configured an SMTP sender.

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

## 6. (Optional) Seed inventory
The helper in `src/lib/seeder.ts` can populate brands, models, cities, and demo
cars. Trigger it from the Admin CMS, or run its logic once against the real DB.

---

### Notes
- **Mock vs real:** if either env var is empty the app falls back to the mock.
  You can also force the mock in the browser console with
  `localStorage.setItem("1stcars_use_mock_db", "true")`.
- Never expose the **service_role** key in the frontend — only the **anon** key
  belongs in `VITE_` variables.
