
# home-library-frontend

React frontend for the Home Library app. Authenticated users manage a shared physical book collection with search, filtering, sorting, pagination, per-user reading status, ratings, notes, reading goals, series tracking, public sharing, a personal wishlist, and a Discover page that surfaces what the rest of the household is reading.

---

## Features

### Auth & session
- Login with JWT via HttpOnly cookie, automatic session-expiry warning and one-click extension
- Multiple password reset flows: OTP (superadmin), admin-approved, first-time login

### Books
- Book table with expandable rows — click any row to reveal genres, location, description, series, public sharing, and your private note
- Add, edit, delete with per-user reading status (read, reading, want to read)
- One-way status transitions enforced (can't go backwards once reading or read)
- Date locking — manually set started / finished dates lock after first save
- Rating locking — star rating cannot be changed after saving
- Public sharing toggle per book — appears on a public unauthenticated page
- Inline public link copy in expanded row and in the Add/Edit modal when sharing is on
- Sort by title, author, house (disabled during text search). Default browse order is `_id` ascending (oldest added first)
- Full-text search via Atlas Search with cursor-based prev/next pagination
- Filter by house (single), genre (multi-select AND), language (single), status — collapsible panel with active badge count and dismissible filter tags
- "No Status" filter shows books the current user hasn't touched (browse only, incompatible with search)
- Numbered page pagination with ellipsis for browse mode; prev/next on mobile

### Series
- Books can belong to a series with an integer `seriesOrder` (#1, #2, …)
- Series picker in the Add/Edit modal (admin-only — only admins create/rename series)
- Series displayed inline in the expanded row on the Books page and on the public page
- Per-house uniqueness — each house can only hold one "Book #1" of a given series
- Renaming a series in the Admin panel cascades to every book that references it

### Notes
- Per-user private note on every book
- Lives in the expanded row on the Books page
- Optional household-visible toggle (when on, other household members see the note in their expanded row)
- Saved with a single API round-trip; rendered with safe sanitisation

### Reading goals
- Private per-user yearly target (number of books to finish this year)
- Set / edit from the Settings modal
- Auto-resets each January
- Dashboard widget shows progress bar and remaining count

### Dashboard
- Total books, books by house, books by genre, recently added
- Reading goal widget with progress bar

### Discover
- Personal reading stats, genre breakdown, recommendations, recently finished by others, reading timeline
- **Currently Reading widget** — shows other household members currently reading (name + book title + started date, excludes you)
- **Activity Feed** — 30-day window of household status changes (started / finished), newest first
- **Improved Recommendations** — weighted by genre overlap, average rating, series progression (if you finished book N, book N+1 ranks high), and recency
- **Wishlist** — private per-user list with title + author + optional note, "Convert to library book" action

### Admin panel
- Reference data management for genres, houses, languages, series — rename cascades to all books, delete is blocked while any book references the value
- Bulk CSV import for books (with `makePublic`, `series`, `seriesOrder` columns; auto-creates unknown ref values during import)
- Reference data CSV import / export per type
- User management (add, delete, role change, approve / revoke password resets) — superadmin only

### UX
- Settings modal — light / dark theme toggle, display name edit, reading goal, public library link copy, "Make all private" button
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
│   │   ├── BookModal.jsx         # Add/edit form — series picker, note editor, public link
│   │   ├── DeleteModal.jsx       # Delete confirmation modal
│   │   ├── Layout.jsx            # Sidebar, navbar, settings modal (with reading goal), session banner
│   │   ├── ProtectedRoute.jsx    # Session check — redirects if expired
│   │   └── SessionContext.js     # Session warning/extend/logout context
│   ├── data/
│   │   └── bookConstants.js      # STATUS_STYLES, STATUS_LABELS, STATUSES, FILTER_STATUSES
│   ├── pages/
│   │   ├── Admin.jsx             # Reference data + Series tab, bulk import, user management
│   │   ├── Books.jsx             # Book table with expanded rows (series, note, public)
│   │   ├── Dashboard.jsx         # Stats cards, bar charts, reading goal widget
│   │   ├── Discover.jsx          # Stats, recommendations, currently reading, activity feed, wishlist
│   │   ├── Login.jsx             # Login + all password reset flows
│   │   └── PublicBooks.jsx       # Public unauthenticated book page (shows series)
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

**Session management (`ProtectedRoute` + `SessionContext`)** — On mount and every 5 minutes, `ProtectedRoute` calls `GET /me` to check token validity and milliseconds remaining. If under 10 minutes remain, an amber warning banner appears. Extending the session calls `POST /refresh-token` followed by another `GET /me` to read the actual new expiry. A ref prevents duplicate "session expired" toasts.

**Password reset flows** — `sendResetOTP` returns a `method` field: `otp` (superadmin, OTP sent via email), `first_login` (new user, no password yet), `approved` (admin pre-approved), `already_registered` (existing user, needs admin approval), or `contact_admin` (unknown email). The login page renders a different screen for each.

**Search vs browse** — `isAtlasSearch` is true when a text query is present (Atlas Search + cursor pagination). Filters without text use MongoDB aggregation + offset pagination. Column sorting is only available in browse mode. The "No Status" filter is hidden during search since Atlas Search can't index absence of a subdocument.

**Default sort order** — Browse mode without an explicit column sort defaults to `_id` ascending (oldest book first). Click any sortable column header to switch.

**Genre filtering** — Multi-select with AND semantics. Active genres sent as repeated query params. Backend uses `$all` in browse mode and multiple `equals` clauses in Atlas Search.

**Status transitions** — One-way enforcement mirrors the backend: null → want to read → reading → read. Backwards transitions are disabled in the UI. Once "read", the status pill is locked.

**Date and rating locking** — `startedAtLocked` and `finishedAtLocked` flags are stored on the status entry. If a date was manually changed (not auto-set), it locks after the first save. Ratings lock immediately on first save. Lock icons appear next to locked fields.

**Series** — The BookModal exposes a series dropdown (admin-only — non-admins see the assigned series read-only) plus an integer "Book #" input. The expanded row on the Books page and the public page render `Series Name #N`. Renaming a series in the Admin panel cascades server-side and is reflected on the next data fetch.

**Notes** — Stored per-user on the book document (server-side). The expanded row shows a textarea bound directly to the per-user note; saving fires `PUT /books/:bookId/note`. A toggle controls household visibility.

**Reading goal** — Settings modal hosts the input. Dashboard subscribes to `/users/reading-goal` and renders a progress bar based on books finished in the current calendar year. The backend resets implicitly each January (no cron — the endpoint just queries the current year).

**Discover** — Single `/discover` round-trip returns: stats, genre breakdown, currently reading list (other members), 30-day activity feed, recommendations, recently finished, timeline, and wishlist count. Each section is a self-contained card on the page.

**Wishlist** — Lives in a Discover card. Add / edit / delete inline; "Convert to library book" prefills the BookModal with the wishlist title + author and removes the wishlist entry on successful save.

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