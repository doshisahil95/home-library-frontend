# home-library-frontend

React frontend for the Home Library app. Allows authenticated users to manage a shared physical book collection with search, filtering, sorting, pagination, per-user reading status, public sharing, and a dashboard with collection stats.

---

## Features

- Login with JWT via HttpOnly cookie, automatic session expiry warning and extension
- Multiple password reset flows: OTP (superadmin), admin-approved, first-time login
- Book table with expandable rows — click any row to reveal genres, location, description, public sharing status
- Book management — add, edit, delete with per-user reading status (read, reading, want to read)
- One-way status transitions enforced (can't go backwards once reading or read)
- Date locking — manually set started/finished dates lock after first save
- Rating locking — star rating cannot be changed after saving
- Public sharing toggle per book — appears on a public unauthenticated page
- Inline public link copy in expanded row and in the Add/Edit modal when sharing is on
- Sort by title, author, house (disabled during text search)
- Full-text search via Atlas Search with cursor-based prev/next pagination
- Filter by house (single), genre (multi-select AND), language (single), status — collapsible panel with active badge count and dismissible filter tags
- "No Status" filter shows books the current user hasn't touched (browse only, incompatible with search)
- Numbered page pagination with ellipsis for browse mode; prev/next on mobile
- Dashboard — total books, books by house, books by genre, recently added
- Discover page — personal reading stats, genre breakdown, recommendations, recently finished by others, reading timeline
- Admin panel — reference data management, bulk CSV import (with makePublic support), user management (superadmin only)
- Settings modal — light/dark theme toggle, display name edit, public library link copy, "Make all private" button
- Collapsible desktop sidebar, slide-in mobile sidebar with backdrop
- Responsive layout — book cards on mobile, full sortable table on desktop
- Skeleton loading states throughout, typed toast notifications with close button

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| HTTP | Fetch API (centralised in `api.js`) |

---

## Folder Structure

```
home-library-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── BookModal.jsx         # Add/edit book form with inline public link
│   │   ├── DeleteModal.jsx       # Delete confirmation modal
│   │   ├── Layout.jsx            # Sidebar, navbar, settings modal, session banner
│   │   ├── ProtectedRoute.jsx    # Session check — redirects if expired
│   │   └── SessionContext.js     # Session warning/extend/logout context
│   ├── data/
│   │   └── bookConstants.js      # STATUS_STYLES, STATUS_LABELS, STATUSES, FILTER_STATUSES
│   ├── pages/
│   │   ├── Admin.jsx             # Reference data, bulk import, user management
│   │   ├── Books.jsx             # Book table, search, filters, sort, pagination
│   │   ├── Dashboard.jsx         # Stats cards and bar charts
│   │   ├── Discover.jsx          # Personal stats, recommendations, timeline
│   │   ├── Login.jsx             # Login + all password reset flows
│   │   └── PublicBooks.jsx       # Public unauthenticated book page
│   ├── App.jsx                   # Router setup, Toaster configuration
│   ├── api.js                    # All API calls — single source of truth
│   ├── index.css                 # Tailwind directives
│   └── main.jsx                  # React root render
├── vercel.json                   # Security headers (CSP, X-Frame-Options, etc.)
├── .env.local                    # Local environment variables (never commit)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- The backend (`home-library-backend`) running locally on port 3000

### Steps

1. Clone and install:
   ```bash
   git clone https://github.com/your-username/home-library-frontend.git
   cd home-library-frontend
   npm install
   ```

2. Create a `.env.local` file in the project root:
   ```env
   VITE_API_BASE=http://localhost:3000
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Local development

| Variable | Value |
|---|---|
| `VITE_API_BASE` | `http://localhost:3000` |

### Production (Vercel)

Set in the Vercel dashboard before the build runs — Vite embeds them at build time.

| Variable | Value |
|---|---|
| `VITE_API_BASE` | Your Railway backend URL — must include `https://` prefix |

---

## Key Implementation Notes

**API layer (`api.js`)** — All HTTP calls go through a single `request()` function that attaches credentials (the JWT HttpOnly cookie), detects 401 responses, clears localStorage, and redirects to login. Public endpoints (login, OTP, reset, public books) use a separate `publicRequest()` that skips auth entirely.

**Session management (`ProtectedRoute` + `SessionContext`)** — On mount and every 5 minutes, `ProtectedRoute` calls `GET /me` to check token validity and milliseconds remaining. If < 10 minutes remain, an amber warning banner appears. Extending the session calls `POST /refresh-token` followed by another `GET /me` to read the actual new expiry. A ref prevents duplicate "session expired" toasts.

**Password reset flows** — `sendResetOTP` returns a `method` field: `otp` (superadmin, OTP sent via email), `first_login` (new user, no password yet), `approved` (admin pre-approved), `already_registered` (existing user, needs admin approval), or `contact_admin` (unknown email). The login page renders a different screen for each.

**Search vs browse** — `isAtlasSearch` is true when a text query is present (Atlas Search + cursor pagination). Filters without text use MongoDB aggregation + offset pagination. Column sorting is only available in browse mode. The "No Status" filter is hidden during search since Atlas Search can't index absence of a subdocument.

**Genre filtering** — Multi-select with AND semantics. Active genres sent as repeated query params. Backend uses `$all` in browse mode and multiple `equals` clauses in Atlas Search.

**Status transitions** — One-way enforcement mirrors the backend: null → want to read → reading → read. Backwards transitions are disabled in the UI. Once "read", the status pill is locked.

**Date and rating locking** — `startedAtLocked` and `finishedAtLocked` flags are stored on the status entry. If a date was manually changed (not auto-set), it locks after the first save. Ratings lock immediately on first save. Lock icons appear next to locked fields.

**Public sharing** — `isPublic` per book is stored as `publicByUsers: [ObjectId]` on the book document, independent of reading status. The Settings modal shows the public link, count of shared books, and a "Make all private" button that fires a single `POST /users/make-all-private`.

**Toasts** — `react-hot-toast` with custom `ToastBar` render: dark green for success, dark red for error, dark gray for default. Each toast has an × close button.

**Theme** — Stored in MongoDB per user, read from localStorage on mount to avoid flash. Tailwind dark mode is `class`-based — `document.documentElement.classList.toggle("dark", ...)` is called on theme change.

**Sidebar** — `SidebarContent` is defined outside `Layout` to prevent re-creation on every Layout state change. Collapse animates width; text uses opacity + width transition to fade without layout shift.

---

## Security Headers (`vercel.json`)

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Restricts scripts, styles, and API connections to known origins |
| `X-Frame-Options: DENY` | Prevents clickjacking via iframe |
| `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | Limits referrer info sent to external sites |
| `Permissions-Policy` | Disables camera, microphone, geolocation |

**Important** — update the `connect-src` value in `vercel.json` with your actual Railway URL before deploying.

---

## Deployment (Vercel)

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com) → Add New Project → select your repo.
3. Vite is auto-detected. Leave build settings as default.
4. Add environment variable: `VITE_API_BASE` = `https://your-railway-url.up.railway.app`
5. Update `vercel.json` — replace the placeholder in `connect-src` with your actual Railway URL.
6. Deploy. Copy the Vercel URL and set it as `CORS_ORIGIN` in Railway.
7. Subsequent deploys happen automatically on `git push`.