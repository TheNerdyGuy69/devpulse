# DevPulse

A full-stack developer productivity dashboard for managing tasks, tracking focus time with a Pomodoro timer, and capturing quick notes—all in one place.

## Features

- **Authentication** — Register, login, and JWT-protected sessions (persisted in the browser)
- **Task management** — Create, list, update status, and delete tasks scoped per user
- **Dashboard** — Live task stats (completed, open, high priority, completion rate)
- **Pomodoro timer** — Configurable focus/break durations, notifications, and sound alerts
- **Quick notes** — Local scratchpad saved per user in the browser
- **Settings** — Dark mode, notifications, sound effects, and timer preferences (persisted locally)

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose |
| **Auth** | JSON Web Tokens (JWT), bcrypt |
| **Validation** | Zod (request bodies), Joi (environment variables) |

## Project structure

```
devpulse/
├── backend/                 # Express REST API (port 5000)
│   ├── server.js            # Entry point
│   └── src/
│       ├── app.js           # Express app factory
│       ├── config/          # DB + env validation
│       ├── models/          # Mongoose schemas
│       ├── services/        # Database logic
│       ├── controllers/     # HTTP handlers
│       ├── routes/          # API routers
│       ├── middleware/      # Auth, validation, errors
│       └── utils/           # JWT, hashing, pagination
│
├── frontend/                # Next.js app (port 3000)
│   └── app/
│       ├── page.tsx         # Main dashboard UI
│       ├── layout.tsx
│       └── globals.css
│
├── ARCHITECTURE.md          # API contracts, schemas, conventions
└── PROJECT_STRUCTURE.md     # Directory map
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas connection string
- npm (comes with Node.js)

## Getting started

### 1. Clone and install dependencies

```bash
cd devpulse

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure the backend

Copy the example environment file and edit values as needed:

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

**`backend/.env` variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/devpulse` |
| `JWT_SECRET` | Secret for signing tokens (16+ characters) | `your_long_random_secret` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:3000` |

### 3. Start MongoDB

Ensure MongoDB is running on the host/port in `MONGODB_URI`, or use Atlas and paste your connection string into `.env`.

### 4. Run the development servers

**Terminal 1 — API:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

Open the frontend, create an account, and sign in. Tasks sync with the API automatically.

## API overview

**Base URL:** `http://localhost:5000/api/v1`  
**Auth header:** `Authorization: Bearer <accessToken>`

### Auth (public unless noted)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account + receive token |
| `POST` | `/auth/login` | Sign in + receive token |
| `POST` | `/auth/logout` | Logout (requires token) |

### Tasks (protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | List tasks (filters: `status`, `priority`, `tags`, `search`, `page`, `limit`) |
| `POST` | `/tasks` | Create task |
| `GET` | `/tasks/:id` | Get one task |
| `PATCH` | `/tasks/:id` | Update task fields |
| `DELETE` | `/tasks/:id` | Delete task |

**Example — create a task:**

```json
POST /api/v1/tasks
{
  "title": "Build auth middleware",
  "priority": "high",
  "status": "todo"
}
```

**Task `status` values:** `todo` · `in_progress` · `done` · `archived`  
**Task `priority` values:** `low` · `medium` · `high` · `critical`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full request/response shapes and database schemas.

## Scripts

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon (hot reload) |
| `npm start` | Start API in production mode |

### Frontend (`frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |

## Architecture notes

- **Backend** follows strict MVC: `routes → middleware → controllers → services → models`
- **Ownership** — All task queries are scoped to the authenticated user (`req.user._id`)
- **Frontend** — Single-page dashboard in `app/page.tsx` calling the API at `http://localhost:5000/api/v1`
- **Session** — JWT stored in `localStorage` (`devpulse-auth`) for reload persistence
- **Notes** — Stored in `localStorage` per user (no notes API yet)

## Testing with Postman

1. `POST http://localhost:5000/api/v1/auth/login` with `{ "email", "password" }`
2. Copy `data.accessToken` from the response
3. On protected routes, set **Authorization** → **Bearer Token** and paste the token

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Models, routes, env vars, naming conventions
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — Folder layout reference

## Roadmap (planned)

- Notes API (`/api/v1/notes`)
- User profile routes (`/api/v1/users/me`)
- React Query + shared API client on the frontend
- Refresh tokens (httpOnly cookies)

## Before pushing to GitHub

1. **Remove nested git repo** — If `frontend/.git` exists, delete it so the monorepo uses one root repository:
   ```bash
   Remove-Item -Recurse -Force frontend\.git   # Windows PowerShell
   ```
2. **Never commit secrets** — Keep `backend/.env` and `frontend/.env.local` out of git (already in `.gitignore`).
3. **Rotate JWT secret** — If `.env.example` was ever committed with a real `JWT_SECRET`, generate a new secret for production.
4. **Initialize git at repo root** (if not done yet):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: DevPulse full-stack dashboard"
   ```

## License

ISC (backend default). See individual `package.json` files for package licenses.
