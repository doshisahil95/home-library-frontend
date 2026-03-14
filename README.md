# home-library-frontend

React frontend for the Home Library app. Allows authenticated users to manage a shared book collection with search, filtering, sorting, pagination, and a dashboard with collection stats.

---

## Features

- Login with JWT authentication and automatic redirect on token expiry
- Password reset flow — request OTP via email, validate, reset with password strength enforcement
- Book table with expandable rows — click any row to reveal full genre list and description
- Book management — add, edit, delete with per-user reading status (read, reading, want to read)
- Sortable columns — title, author, house (disabled during Atlas Search)
- Full-text search via Atlas Search with cursor-based prev/next pagination
- Filter by house, genre, and reading status — collapsible filter row with active filter badge count
- Numbered page pagination with ellipsis for regular browsing
- Dashboard — total books, books by house, books by genre, per-user reading status bars, recently added
- Light/dark theme toggle persisted to the database per user
- Collapsible desktop sidebar, slide-in mobile sidebar with backdrop
- Skeleton loading states throughout, toast notifications for all actions
- CSP and security headers via `vercel.json`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| HTTP | Fetch API (centralised in `api.js`) |

---

## Folder Structure

```
home-library-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.jsx              # Sidebar, navbar, theme toggle, settings modal
│   │   └── ProtectedRoute.jsx      # JWT expiry check — redirects if token invalid
│   ├── data/
│   │   ├── houses.json             # House options for book form and filters
│   │   └── genres.json             # Genre options for book form and filters
│   ├── pages/
│   │   ├── Books.jsx               # Book table, search, filters, sort, pagination, modals
│   │   ├── Dashboard.jsx           # Stats cards and bar charts
│   │   └── Login.jsx               # Login + forgot password + OTP reset flow
│   ├── api.js                      # All API calls — single source of truth for base URL
│   └── app.jsx                     # Router setup and route definitions
├── vercel.json                     # Security headers (CSP, X-Frame-Options, etc.)
├── .env.local                      # Local environment variables (never commit)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- The backend (`home-library-backend`) running locally on port 3000

### Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/home-library-frontend.git
   cd home-library-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root:
   ```env
   VITE_API_BASE=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Local development

Create a `.env.local` file in the project root. Vite reads this automatically and it is excluded from Git by default.

| Variable | Description | Value |
|---|---|---|
| `VITE_API_BASE` | URL of the backend API | `http://localhost:3000` |

### Production

Do **not** create a `.env` file for production. Set environment variables in the Vercel dashboard instead — Vite embeds them at build time so they must be present before the build runs.

| Variable | Value |
|---|---|
| `VITE_API_BASE` | Your Railway backend URL — must include `https://` prefix, e.g. `https://home-library-backend.up.railway.app` |

---

## Key Implementation Notes

**API layer (`api.js`)** — All HTTP calls go through a single `request()` function. It automatically attaches the JWT from `localStorage`, detects 401 responses (expired or invalid token), clears stored credentials, and redirects to the login page by throwing a named `AbortError` so callers don't show a toast on redirect. Public endpoints (login, OTP, reset) use a separate `publicRequest()` that skips auth headers entirely.

**ProtectedRoute** — Decodes the JWT payload client-side and checks the `exp` field with a 30-second buffer before rendering any protected page. An expired or malformed token is caught here and redirected to `/` before any API calls are made. This is a UX optimisation — the real security gate is `jwt.verify()` in the backend middleware.

**Search vs browse pagination** — Regular browsing and filter-only queries use offset pagination (numbered pages) via Mongoose. Text search uses cursor-based pagination (prev/next only) via Atlas Search because relevance-ranked results cannot be mapped to stable page numbers.

**Expandable rows** — Each book row has a chevron on the left that rotates 180° when expanded. Clicking anywhere on the row toggles the expanded panel, which shows the full genre list and description. Edit/Delete buttons use `e.stopPropagation()` to prevent accidental row expansion.

**Filter mode detection** — `isAtlasSearch` is true when a text query is present (routes to Atlas Search + cursor pagination). `hasFilters` is true when only dropdown filters are set (routes to Mongoose + offset pagination). Column sorting is disabled during Atlas Search since relevance ordering takes precedence.

**Theme** — The active theme is stored in MongoDB per user and loaded from `localStorage` on mount to avoid a flash of the wrong theme on page load. Changes are persisted to the backend via `PATCH /users/theme`.

**SidebarContent** — Defined outside the `Layout` component so it isn't re-created on every render, which previously caused unnecessary re-mounts of nav items on any state change in Layout.

---

## Security Headers (`vercel.json`)

The `vercel.json` at the project root sets the following headers on all responses:

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restricts script, style, and connect sources to self + Railway backend |
| `X-Frame-Options` | `DENY` — prevents clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` — prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, geolocation |

**Important** — after deploying the backend, update the `connect-src` value in `vercel.json` to match your actual Railway URL, then redeploy.

---

## Deployment (Vercel)

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → Add New Project → select `home-library-frontend`.
3. Vercel will auto-detect Vite. Leave all build settings as default.
4. Go to **Settings → Environment Variables** and add:
   - `VITE_API_BASE` = `https://your-railway-url.up.railway.app` (include `https://`)
5. Update `vercel.json` — replace `your-railway-domain.up.railway.app` in the `connect-src` directive with your actual Railway URL.
6. Click **Deploy**. Vercel will give you a public URL.
7. Copy that URL and set it as `CORS_ORIGIN` in your Railway backend environment variables.
8. Vercel redeploys automatically on every `git push`.

### Costs

Vercel Hobby plan is free. There are no charges for personal projects within the generous free tier limits.