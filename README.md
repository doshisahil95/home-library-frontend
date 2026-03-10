# home-library-frontend

React frontend for the Home Library app. Allows authenticated users to manage a personal book collection with search, sorting, pagination, and a dashboard with collection stats.

---

## Features

- Login with JWT authentication and automatic redirect on token expiry
- Password reset flow — request OTP via email, validate, and reset with strength enforcement
- Book management — add, edit, delete, with sortable columns (title, author, house)
- Full-text search via Atlas Search with cursor-based pagination
- Numbered page pagination with ellipsis for regular browsing
- Dashboard with total books, books by house (bar chart), books by genre (bar chart), and recently added
- Light/dark theme toggle persisted to the database per user
- Skeleton loading states throughout, toast notifications for all actions
- Fully responsive layout with sidebar navigation

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
│   │   ├── houses.json             # List of house options for book form
│   │   └── genres.json             # List of genre options for book form
│   ├── pages/
│   │   ├── Books.jsx               # Book table, search, sort, pagination, modals
│   │   ├── Dashboard.jsx           # Stats cards and charts
│   │   └── Login.jsx               # Login + forgot password + OTP reset flow
│   ├── api.js                      # All API calls — single source of truth for base URL
│   └── app.jsx                     # Router setup and route definitions
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

3. Create a `.env.local` file in the project root (see Environment Variables below).

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

```env
VITE_API_BASE=http://localhost:3000
```

### Production

Do **not** create a `.env` file for production. Instead, set environment variables directly in the Vercel dashboard at deploy time:

| Variable | Value |
|---|---|
| `VITE_API_BASE` | Your Railway backend URL, e.g. `https://home-library-backend.railway.app` |

Vite embeds these values at build time, so they need to be set before the build runs.

---

## Key Implementation Notes

**API layer (`api.js`)** — All HTTP calls go through a single `request()` function. It automatically attaches the JWT from localStorage, detects 401 responses (expired token), clears stored credentials, and redirects to the login page. Public endpoints (login, OTP, reset) use a separate `publicRequest()` function that skips auth headers entirely.

**ProtectedRoute** — Decodes the JWT payload client-side and checks the `exp` field before rendering any protected page. An expired or malformed token is caught here and redirected to `/` before any API calls are made.

**Search vs browse pagination** — Regular book browsing uses offset pagination (page numbers). Atlas Search results use cursor-based pagination (prev/next only) because relevance-ranked results cannot be mapped to page numbers meaningfully.

**Theme** — The active theme is stored in MongoDB per user and loaded from `localStorage` on mount to avoid a flash of the wrong theme. Changes are persisted to the backend via `PATCH /users/theme`.

---

## Deployment (Vercel)

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → Add New Project → select `home-library-frontend`.
3. Vercel will auto-detect Vite. Leave all build settings as default.
4. Before deploying, go to **Environment Variables** and add:
   - `VITE_API_BASE` = your Railway backend URL
5. Click **Deploy**. Vercel will give you a public URL.
6. Copy that URL and set it as `CORS_ORIGIN` in your Railway backend environment variables.
7. Vercel redeploys automatically on every `git push`.

See `DEPLOYMENT.md` in the backend repo for the full end-to-end deployment guide.