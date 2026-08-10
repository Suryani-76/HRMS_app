# Oklut HRMS — React + Supabase

Modern HR management system for **Oklut Technologies** built with React, TypeScript, Tailwind CSS, and Supabase. Replaces the legacy static HTML site.

## Tech Stack

- **React 18 + TypeScript** (Vite build tool)
- **Tailwind CSS** + shadcn/ui-style components (Radix primitives)
- **TanStack Query** for server state
- **Supabase** (Postgres, Auth, Storage) as the backend
- **Recharts** (charts), **jsPDF + autotable** (PDF), **xlsx** (Excel export)

## Features

- Role-based dashboard (Admin/HR/Manager vs Employee views) with charts, pending leave, birthdays, work anniversaries
- Employee management (CRUD, profile tabs for attendance/payroll/documents, delete confirm)
- Departments & Designations
- Attendance (manager grid view, employee self check-in/out/break)
- Leave (apply, balances, approve/reject with notifications)
- Payroll (profiles, generate monthly payroll, mark paid) and Payslips (PDF download)
- Documents (upload to Supabase Storage at `documents/{ownerId}/...`)
- Tasks (3-column kanban with priorities)
- Announcements, Holidays, Performance (goals + reviews), Recruitment (jobs/candidates/interviews/offers)
- Reports (Excel / PDF / CSV export)
- Audit logs, Notifications, Profile, Settings, Global search (Ctrl+K)
- Theme toggle (light/dark), mobile-responsive layout

## Prerequisites

- Node.js 18+
- npm
- A Supabase project (free tier is fine)

## Setup

### 1. Install dependencies

```bash
cd hrms-app
npm install
```

### 2. Configure Supabase

1. Create a project at https://supabase.com
2. Open **SQL Editor** and run **one file** — `supabase/full_setup.sql` — it combines everything:
   - `0001_schema.sql` (tables, triggers, RLS policies)
   - `0002_seed.sql` (roles, permissions, admin + demo data)
   - `0003_storage.sql` (`documents` storage bucket + policies)
   
   (If you prefer incremental setup, run the three files under `supabase/migrations/` in order instead.)
3. Copy `.env.example` to `.env` and fill in your project values (Supabase Dashboard → Project Settings → API):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
VITE_APP_URL=http://localhost:5173
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:5173 and log in.

## Login Credentials (from seed)

| Role    | Email                 | Password |
| ------- | --------------------- | -------- |
| Admin   | `ceo@oklut.com`       | `1234`   |
| HR      | `hr@oklut.com`        | `1234`   |
| Employee| `employee@oklut.com`  | `1234`   |
| Employee| `designer@oklut.com`  | `1234`   |

> When creating a new employee through the UI, admins can optionally set a password — an auth user is provisioned automatically.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # typecheck + production build (outputs to dist/)
npm run typecheck  # run tsc without emitting
npm run preview    # preview the production build
```

## Project Structure

```
src/
  components/       # UI primitives, layout, dashboard & shared components
  config/           # navigation config
  features/auth/    # AuthProvider / useAuth
  hooks/            # TanStack Query hooks (use-queries.ts)
  lib/
    api/            # Supabase data-access functions
    format.ts       # date/currency helpers
    export.ts       # Excel/PDF/CSV export
    supabase.ts     # Supabase client
    database.types.ts
  pages/            # Route pages
  router.tsx        # Route definitions
```

## Notes

- All data lives in one shared Supabase database — there is no hardcoded employee data in the app.
- RLS is enabled on every table; `is_admin()` / `is_manager()` helper functions in `0001_schema.sql` drive the policies, so the backend enforces access control in addition to the UI.
- If the app shows the setup screen, `.env` is missing or the Supabase project isn't reachable — fill in the values and restart the dev server.
