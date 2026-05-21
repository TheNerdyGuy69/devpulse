# DevPulse — System Architecture Reference

> **Stack:** Next.js (App Router · Tailwind CSS · Lucide Icons) · Node.js · Express.js · MongoDB (Mongoose)
> **Audience:** Beginner-to-intermediate engineers
> **Pattern:** Strict MVC on the backend · Feature-grouped components on the frontend

---

## Table of Contents

1. [Directory Structure — Backend](#1-directory-structure--backend)
2. [Directory Structure — Frontend](#2-directory-structure--frontend)
3. [Database Schema Models](#3-database-schema-models)
4. [REST API Routes](#4-rest-api-routes)
5. [Architecture Conventions](#5-architecture-conventions)

---

## 1. Directory Structure — Backend

```
backend/
├── server.js                        # Entry point — imports app.js and calls listen()
├── .env                             # Environment variables (never commit)
├── .env.example                     # Safe template to commit
├── package.json
│
└── src/
    ├── app.js                       # Express app factory (no listen) — keeps it testable
    │
    ├── config/
    │   ├── db.js                    # Mongoose connect() with retry + graceful shutdown
    │   └── env.js                   # Validates + exports all env vars (use dotenv + joi)
    │
    ├── models/                      # Mongoose schemas — data shape only, no logic
    │   ├── User.model.js
    │   ├── Task.model.js
    │   └── Note.model.js
    │
    ├── services/                    # ALL database queries live here — no req/res objects
    │   ├── user.service.js
    │   ├── task.service.js
    │   └── note.service.js
    │
    ├── controllers/                 # Handles req/res — calls services, returns JSON
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── task.controller.js
    │   └── note.controller.js
    │
    ├── routes/                      # Express routers — declare paths and apply middleware
    │   ├── index.js                 # Mounts all routers under /api/v1
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── task.routes.js
    │   └── note.routes.js
    │
    ├── middleware/
    │   ├── auth.middleware.js       # Verifies JWT, attaches req.user
    │   ├── rbac.middleware.js       # Role guard factory: rbac('admin')
    │   ├── validate.middleware.js   # Zod request body/query validation
    │   └── errorHandler.js         # Global error handler + 404 catcher
    │
    └── utils/
        ├── ApiError.js             # Custom error class: new ApiError(404, 'Not found')
        ├── jwt.js                  # signToken() and verifyToken() helpers
        ├── hash.js                 # bcrypt hashPassword() and comparePassword()
        └── paginate.js             # Reusable offset paginator for list endpoints
```

**Layering rule — strictly enforced:**

```
routes  →  middleware  →  controllers  →  services  →  models
```

- Controllers must never import models directly.
- Services must never import `req` or `res`.
- Routes must never contain business logic.

---

## 2. Directory Structure — Frontend

```
frontend/
├── package.json
├── tailwind.config.js
├── next.config.js
│
├── app/                             # Next.js App Router root
│   ├── layout.jsx                   # Root layout — fonts, global providers
│   ├── (auth)/                      # Route group — excluded from dashboard layout
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── register/
│   │       └── page.jsx
│   └── dashboard/
│       ├── layout.jsx               # Dashboard shell: Sidebar + Topbar
│       ├── page.jsx                 # Overview — StatsBar + ActivityFeed
│       ├── tasks/
│       │   ├── page.jsx             # Task list with filters
│       │   └── [id]/
│       │       └── page.jsx         # Task detail / inline edit
│       └── notes/
│           ├── page.jsx             # Notes grid
│           └── [id]/
│               └── page.jsx         # Note editor
│
├── components/
│   ├── ui/                          # Primitives — no business logic, no API calls
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx                # Status and priority chips
│   │   ├── Modal.jsx
│   │   ├── Dropdown.jsx
│   │   ├── Spinner.jsx
│   │   └── Avatar.jsx
│   │
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── PageShell.jsx            # Consistent max-width + padding wrapper
│   │
│   ├── tasks/
│   │   ├── TaskList.jsx             # Fetches and renders the task collection
│   │   ├── TaskCard.jsx             # Single kanban card or list row
│   │   ├── TaskForm.jsx             # Controlled form for create and edit
│   │   ├── TaskFilters.jsx          # Status, priority, tag, and date filters
│   │   └── TaskStatusBadge.jsx      # Colour-coded status pill
│   │
│   ├── notes/
│   │   ├── NoteGrid.jsx
│   │   ├── NoteCard.jsx
│   │   ├── NoteEditor.jsx           # Rich-text editor (Tiptap recommended)
│   │   └── NotePinButton.jsx
│   │
│   └── dashboard/
│       ├── StatsBar.jsx             # Task counts grouped by status
│       ├── ActivityFeed.jsx         # Recent creates and updates
│       └── PriorityChart.jsx        # Recharts bar chart — tasks by priority
│
├── hooks/
│   ├── useAuth.js                   # Login, logout, token decode
│   ├── useTasks.js                  # React Query wrapper for task endpoints
│   ├── useNotes.js                  # React Query wrapper for note endpoints
│   └── useDebounce.js               # Generic debounce for search inputs
│
├── lib/
│   ├── api.js                       # Axios instance — base URL + refresh interceptor
│   ├── queryClient.js               # React Query client config
│   └── validators.js                # Zod schemas — mirrors backend validation
│
├── store/                           # Zustand — UI state only, never server state
│   ├── uiStore.js                   # Sidebar open/closed, active modal
│   └── authStore.js                 # Logged-in user profile + access token
│
└── styles/
    └── globals.css                  # Tailwind base imports + CSS custom properties
```

**State management split:**

| Concern | Tool |
|---|---|
| Server data (tasks, notes, user) | React Query (`useTasks`, `useNotes`) |
| Auth token + user profile | Zustand `authStore` |
| UI state (modals, sidebar) | Zustand `uiStore` |
| Form state | React Hook Form (local) |

---

## 3. Database Schema Models

### 3.1 User

```js
// backend/src/models/User.model.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,           // Never returned in queries by default
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'developer', 'viewer'],
      default: 'developer',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,           // Adds createdAt and updatedAt automatically
  }
);

// Never expose passwordHash in JSON responses
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export default mongoose.model('User', UserSchema);
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `name` | String | Max 80 chars |
| `email` | String | Unique, lowercased |
| `passwordHash` | String | bcrypt hash — `select: false` |
| `avatarUrl` | String \| null | URL to profile image |
| `role` | String (enum) | `admin` · `developer` · `viewer` |
| `timezone` | String | IANA timezone string |
| `isActive` | Boolean | Soft-disable accounts |
| `createdAt` | Date | Auto via timestamps |
| `updatedAt` | Date | Auto via timestamps |

---

### 3.2 Task

```js
// backend/src/models/Task.model.js
import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,             // Most queries filter by userId
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'archived'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    tags: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-scoped list queries
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.model('Task', TaskSchema);
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId (ref: User) | Owner — indexed |
| `title` | String | Required, max 200 chars |
| `description` | String | Optional, max 2000 chars |
| `status` | String (enum) | `todo` · `in_progress` · `done` · `archived` |
| `priority` | String (enum) | `low` · `medium` · `high` · `critical` |
| `tags` | [String] | Free-form labels array |
| `dueDate` | Date \| null | Optional deadline |
| `createdAt` | Date | Auto via timestamps |
| `updatedAt` | Date | Auto via timestamps |

---

### 3.3 Note

```js
// backend/src/models/Note.model.js
import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,           // null = standalone note, ObjectId = linked to a task
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: '',             // Stores plain text or serialised rich-text (e.g. Tiptap JSON)
    },
    tags: {
      type: [String],
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

NoteSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });
NoteSchema.index({ userId: 1, taskId: 1 });

export default mongoose.model('Note', NoteSchema);
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `userId` | ObjectId (ref: User) | Owner — indexed |
| `taskId` | ObjectId (ref: Task) \| null | Optional link to a task |
| `title` | String | Required, max 200 chars |
| `content` | String | Plain text or rich-text JSON |
| `tags` | [String] | Free-form labels array |
| `isPinned` | Boolean | Pinned notes sort to top |
| `createdAt` | Date | Auto via timestamps |
| `updatedAt` | Date | Auto via timestamps |

---

### 3.4 Relationship summary

```
Users  ──< Tasks   (one user owns many tasks)
Users  ──< Notes   (one user owns many notes)
Tasks  ──< Notes   (one task can have many notes — optional link)
```

---

## 4. REST API Routes

> **Base URL:** `/api/v1`
> **Auth header:** `Authorization: Bearer <accessToken>`
> All responses follow the envelope: `{ success, data, message }` on success and `{ success, message, errors? }` on error.

---

### 4.1 Auth routes

#### `POST /api/v1/auth/register`

Register a new user.

**Request body:**
```json
{
  "name": "Ada Lovelace",
  "email": "ada@devpulse.io",
  "password": "StrongPass123!"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665a1f...",
      "name": "Ada Lovelace",
      "email": "ada@devpulse.io",
      "role": "developer",
      "createdAt": "2024-06-01T10:00:00.000Z"
    },
    "accessToken": "<jwt>"
  }
}
```

---

#### `POST /api/v1/auth/login`

Authenticate and receive a token.

**Request body:**
```json
{
  "email": "ada@devpulse.io",
  "password": "StrongPass123!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "665a1f...", "name": "Ada Lovelace", "email": "ada@devpulse.io", "role": "developer" },
    "accessToken": "<jwt>"
  }
}
```

---

#### `POST /api/v1/auth/logout`

Invalidate the session (client drops the token; extend with a denylist if needed).

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### 4.2 User routes

All routes require `Authorization` header.

#### `GET /api/v1/users/me`

Return the authenticated user's profile.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "665a1f...",
    "name": "Ada Lovelace",
    "email": "ada@devpulse.io",
    "avatarUrl": null,
    "role": "developer",
    "timezone": "UTC",
    "createdAt": "2024-06-01T10:00:00.000Z"
  }
}
```

---

#### `PATCH /api/v1/users/me`

Update the authenticated user's profile.

**Request body (all fields optional):**
```json
{
  "name": "Ada King",
  "avatarUrl": "https://cdn.devpulse.io/avatars/ada.png",
  "timezone": "Europe/London"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "665a1f...", "name": "Ada King", "timezone": "Europe/London" }
}
```

---

#### `PATCH /api/v1/users/me/password`

Change the authenticated user's password.

**Request body:**
```json
{
  "currentPassword": "StrongPass123!",
  "newPassword": "EvenStronger456!"
}
```

**Response `200`:**
```json
{ "success": true, "message": "Password updated" }
```

---

#### `DELETE /api/v1/users/me`

Soft-delete (sets `isActive: false`) the authenticated account.

**Response `200`:**
```json
{ "success": true, "message": "Account deactivated" }
```

---

### 4.3 Task routes

All routes require `Authorization` header. All tasks are scoped to `req.user._id`.

#### `GET /api/v1/tasks`

List all tasks for the authenticated user with optional filtering and pagination.

**Query params:**

| Param | Type | Example |
|---|---|---|
| `status` | string | `?status=in_progress` |
| `priority` | string | `?priority=high` |
| `tags` | string | `?tags=backend,api` |
| `dueDate` | ISO date | `?dueDate=2024-07-01` |
| `search` | string | `?search=auth` |
| `page` | number | `?page=1` |
| `limit` | number | `?limit=20` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "665b2a...",
        "userId": "665a1f...",
        "title": "Build auth middleware",
        "description": "JWT verify + attach req.user",
        "status": "in_progress",
        "priority": "high",
        "tags": ["backend", "auth"],
        "dueDate": "2024-07-01T00:00:00.000Z",
        "createdAt": "2024-06-01T12:00:00.000Z",
        "updatedAt": "2024-06-02T08:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

#### `POST /api/v1/tasks`

Create a new task.

**Request body:**
```json
{
  "title": "Build auth middleware",
  "description": "JWT verify + attach req.user",
  "status": "todo",
  "priority": "high",
  "tags": ["backend", "auth"],
  "dueDate": "2024-07-01"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "665b2a...",
    "userId": "665a1f...",
    "title": "Build auth middleware",
    "status": "todo",
    "priority": "high",
    "tags": ["backend", "auth"],
    "dueDate": "2024-07-01T00:00:00.000Z",
    "createdAt": "2024-06-03T09:00:00.000Z",
    "updatedAt": "2024-06-03T09:00:00.000Z"
  }
}
```

---

#### `GET /api/v1/tasks/:id`

Get a single task by ID.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "665b2a...", "title": "Build auth middleware", "status": "in_progress" }
}
```

**Response `404`:**
```json
{ "success": false, "message": "Task not found" }
```

---

#### `PATCH /api/v1/tasks/:id`

Update one or more fields of a task.

**Request body (all fields optional):**
```json
{
  "status": "done",
  "priority": "medium"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "665b2a...", "status": "done", "priority": "medium", "updatedAt": "2024-06-04T10:00:00.000Z" }
}
```

---

#### `DELETE /api/v1/tasks/:id`

Permanently delete a task.

**Response `200`:**
```json
{ "success": true, "message": "Task deleted" }
```

---

### 4.4 Note routes

All routes require `Authorization` header. All notes are scoped to `req.user._id`.

#### `GET /api/v1/notes`

List all notes for the authenticated user.

**Query params:**

| Param | Type | Example |
|---|---|---|
| `taskId` | ObjectId | `?taskId=665b2a...` |
| `isPinned` | boolean | `?isPinned=true` |
| `tags` | string | `?tags=meeting` |
| `search` | string | `?search=retro` |
| `page` | number | `?page=1` |
| `limit` | number | `?limit=20` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "_id": "665c3b...",
        "userId": "665a1f...",
        "taskId": null,
        "title": "Sprint retro notes",
        "content": "What went well: fast delivery...",
        "tags": ["meeting", "sprint"],
        "isPinned": true,
        "createdAt": "2024-06-05T14:00:00.000Z",
        "updatedAt": "2024-06-05T15:30:00.000Z"
      }
    ],
    "pagination": { "total": 15, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

#### `POST /api/v1/notes`

Create a new note.

**Request body:**
```json
{
  "title": "Sprint retro notes",
  "content": "What went well: fast delivery...",
  "taskId": null,
  "tags": ["meeting", "sprint"],
  "isPinned": true
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "665c3b...",
    "userId": "665a1f...",
    "taskId": null,
    "title": "Sprint retro notes",
    "tags": ["meeting", "sprint"],
    "isPinned": true,
    "createdAt": "2024-06-05T14:00:00.000Z",
    "updatedAt": "2024-06-05T14:00:00.000Z"
  }
}
```

---

#### `GET /api/v1/notes/:id`

Get a single note by ID.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "665c3b...", "title": "Sprint retro notes", "content": "..." }
}
```

---

#### `PATCH /api/v1/notes/:id`

Update one or more fields of a note.

**Request body (all fields optional):**
```json
{
  "title": "Sprint 12 retro",
  "isPinned": false
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "665c3b...", "title": "Sprint 12 retro", "isPinned": false, "updatedAt": "2024-06-06T09:00:00.000Z" }
}
```

---

#### `DELETE /api/v1/notes/:id`

Permanently delete a note.

**Response `200`:**
```json
{ "success": true, "message": "Note deleted" }
```

---

### 4.5 Error response shape

All errors follow a consistent envelope:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

| HTTP status | When to use |
|---|---|
| `400` | Validation failure, bad request body |
| `401` | Missing or expired token |
| `403` | Valid token but insufficient role/ownership |
| `404` | Resource does not exist or does not belong to user |
| `409` | Conflict (e.g. email already registered) |
| `500` | Unhandled server error |

---

## 5. Architecture Conventions

### Environment variables (`.env`)

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/devpulse
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

### JWT strategy

- Sign on login and register with `userId` + `role` in the payload.
- Verify in `auth.middleware.js` on every protected route.
- Store the token in memory (Zustand) on the frontend — not in `localStorage` — to reduce XSS exposure.
- Extend to refresh tokens (httpOnly cookie) once the basic flow works.

### Ownership guard pattern

Every service function receives `userId` from `req.user._id` and filters queries by it. Never trust a `userId` from the request body.

```js
// task.service.js — correct pattern
export const getTaskById = async (taskId, userId) => {
  return Task.findOne({ _id: taskId, userId }); // scope enforced at query level
};
```

### Pagination helper

```js
// utils/paginate.js
export const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || 20);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};
```

### Naming conventions

| Layer | Convention | Example |
|---|---|---|
| Model files | PascalCase + `.model.js` | `Task.model.js` |
| Service files | camelCase + `.service.js` | `task.service.js` |
| Controller files | camelCase + `.controller.js` | `task.controller.js` |
| Route files | camelCase + `.routes.js` | `task.routes.js` |
| React components | PascalCase + `.jsx` | `TaskCard.jsx` |
| Hooks | camelCase + `use` prefix | `useTasks.js` |
| API endpoints | kebab-case, plural nouns | `/api/v1/tasks` |

---

*Generated for DevPulse — update this document whenever models, routes, or folder structure change.*