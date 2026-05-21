# DevPulse — Project Directory Structure

> Canonical folder layout for the monorepo.  
> Detailed API contracts, schemas, and conventions live in [ARCHITECTURE.md](./ARCHITECTURE.md).

**Stack:** Next.js (App Router) · Express · MongoDB (Mongoose)  
**Pattern:** MVC backend · feature-grouped frontend components

---

## Repository root

```
devpulse/
├── ARCHITECTURE.md          # Full system reference (models, routes, conventions)
├── PROJECT_STRUCTURE.md     # This file — directory map only
│
├── backend/                 # Node.js + Express API (port 5000)
└── frontend/                # Next.js web app (port 3000)
```

**Not tracked in git (generated or local):**

| Path | Purpose |
|------|---------|
| `backend/node_modules/` | npm dependencies |
| `backend/.env` | Secrets and local config (use `.env.example` as template) |
| `frontend/node_modules/` | npm dependencies |
| `frontend/.next/` | Next.js build output |

---

## Backend

**Request flow:** `routes` → `middleware` → `controllers` → `services` → `models`

```
backend/
├── server.js                        # Entry — imports app, connects DB, calls listen()
├── .env                             # Local secrets (never commit)
├── .env.example                     # Committed template
├── package.json
├── package-lock.json
│
└── src/
    ├── app.js                       # Express app factory (no listen — testable)
    │
    ├── config/
    │   ├── db.js                    # Mongoose connect, retry, graceful shutdown
    │   └── env.js                   # Load + validate env (dotenv + joi)
    │
    ├── models/                      # Mongoose schemas only — no business logic
    │   ├── User.model.js
    │   ├── Task.model.js
    │   └── Note.model.js
    │
    ├── services/                    # All DB queries — no req/res
    │   ├── user.service.js
    │   ├── task.service.js
    │   └── note.service.js
    │
    ├── controllers/                 # req/res handlers — call services, return JSON
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── task.controller.js
    │   └── note.controller.js
    │
    ├── routes/                      # Paths + middleware — no business logic
    │   ├── index.js                 # Mounts routers under /api/v1
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── task.routes.js
    │   └── note.routes.js
    │
    ├── middleware/
    │   ├── auth.middleware.js       # JWT verify → req.user
    │   ├── rbac.middleware.js       # Role guard: rbac('admin')
    │   ├── validate.middleware.js   # Zod body/query validation
    │   └── errorHandler.js          # Global errors + 404
    │
    └── utils/
        ├── ApiError.js              # Custom HTTP error class
        ├── jwt.js                   # signToken / verifyToken
        ├── hash.js                  # bcrypt hash / compare
        └── paginate.js              # Offset pagination helper
```

### Backend rules

- Controllers must **not** import models directly.
- Services must **not** use `req` or `res`.
- Routes must **not** contain business logic.

---

## Frontend

**App Router** at `frontend/app/`. UI primitives in `components/ui/`; feature UI in `components/{tasks,notes,dashboard,...}`.

```
frontend/
├── package.json
├── package-lock.json
├── next.config.mjs                  # Next config (scaffold may use .mjs)
├── postcss.config.mjs
├── eslint.config.mjs
├── jsconfig.json                    # Path alias @/*
├── public/                          # Static assets
│
├── app/                             # Next.js App Router
│   ├── layout.jsx                   # Root layout — fonts, providers
│   ├── globals.css                  # Tailwind + CSS variables (or styles/ per migration)
│   │
│   ├── (auth)/                      # Route group — no dashboard shell
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── register/
│   │       └── page.jsx
│   │
│   └── dashboard/
│       ├── layout.jsx               # Sidebar + Topbar shell
│       ├── page.jsx                 # Overview — stats + activity
│       ├── tasks/
│       │   ├── page.jsx             # Task list + filters
│       │   └── [id]/
│       │       └── page.jsx         # Task detail / edit
│       └── notes/
│           ├── page.jsx             # Notes grid
│           └── [id]/
│               └── page.jsx         # Note editor
│
├── components/
│   ├── ui/                          # Primitives — no API calls
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── Dropdown.jsx
│   │   ├── Spinner.jsx
│   │   └── Avatar.jsx
│   │
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── PageShell.jsx
│   │
│   ├── tasks/
│   │   ├── TaskList.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskForm.jsx
│   │   ├── TaskFilters.jsx
│   │   └── TaskStatusBadge.jsx
│   │
│   ├── notes/
│   │   ├── NoteGrid.jsx
│   │   ├── NoteCard.jsx
│   │   ├── NoteEditor.jsx
│   │   └── NotePinButton.jsx
│   │
│   └── dashboard/
│       ├── StatsBar.jsx
│       ├── ActivityFeed.jsx
│       └── PriorityChart.jsx
│
├── hooks/
│   ├── useAuth.js
│   ├── useTasks.js                  # React Query — tasks API
│   ├── useNotes.js                  # React Query — notes API
│   └── useDebounce.js
│
├── lib/
│   ├── api.js                       # Axios instance + interceptors
│   ├── queryClient.js               # React Query client
│   └── validators.js                # Zod schemas (mirror backend)
│
├── store/                           # Zustand — UI + auth token in memory only
│   ├── uiStore.js
│   └── authStore.js
│
└── styles/                          # Optional: move globals here from app/
    └── globals.css
```

### Frontend state split

| Concern | Tool |
|---------|------|
| Server data (tasks, notes, user) | React Query (`useTasks`, `useNotes`) |
| Auth token + user profile | Zustand `authStore` (memory, not `localStorage`) |
| UI (modals, sidebar) | Zustand `uiStore` |
| Forms | React Hook Form (local) |

---

## API surface (backend mount point)

All REST routes mount under:

```
/api/v1/
├── auth/       # register, login, logout, me
├── users/
├── tasks/
└── notes/
```

See [ARCHITECTURE.md § REST API Routes](./ARCHITECTURE.md#4-rest-api-routes) for methods, payloads, and status codes.

---

## Naming quick reference

| Layer | Convention | Example |
|-------|------------|---------|
| Model files | `PascalCase.model.js` | `Task.model.js` |
| Service files | `camelCase.service.js` | `task.service.js` |
| Controller files | `camelCase.controller.js` | `task.controller.js` |
| Route files | `camelCase.routes.js` | `task.routes.js` |
| React components | `PascalCase.jsx` | `TaskCard.jsx` |
| Hooks | `use` + `camelCase.js` | `useTasks.js` |
| API paths | kebab-case, plural | `/api/v1/tasks` |

---

*Update this file when folders or filenames change. Keep [ARCHITECTURE.md](./ARCHITECTURE.md) in sync for behavioral and API details.*
