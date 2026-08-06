# Project FORGE

A cloud-based **Engineering Project Management** SaaS platform — centralising engineering
projects, milestones, design reviews, clarification requests and technical evidence into a
single workspace.

---

## Tech stack

| Layer      | Technology                                                            |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | Angular 20 (standalone components, signals, new control flow), SCSS    |
| Backend    | Node + Express (TypeScript), modular controller/service architecture   |
| Database   | PostgreSQL via **Prisma** ORM with versioned migrations                |
| Auth       | JWT access tokens + rotating, hashed refresh tokens (httpOnly cookie)  |
| Validation | Zod schemas on every write endpoint                                    |
| Packaging  | Docker — separate web and API images, managed PostgreSQL               |

```
project-forge/
├── backend/     Express + Prisma API   (http://localhost:4000/api/v1)
├── frontend/    Angular application     (http://localhost:4200)
└── docker/      Container definitions
```

---

## Quick start with Docker

```bash
cp .env.example .env        # then fill in the values
docker compose up --build
```

| Service | URL |
|---|---|
| Web | http://localhost:4200 |
| API | http://localhost:4000/api/v1 |
| Health | http://localhost:4000/api/v1/health |
| PostgreSQL | localhost:5432 |

## Local development without Docker

Requires Node 20 and a running PostgreSQL instance.

### 1. Backend

```bash
cd backend
cp .env.example .env        # set DATABASE_URL and both JWT secrets
npm install
npm run setup               # prisma generate + migrate + seed demo data
npm run dev                 # API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start                   # app on http://localhost:4200
```

### Demo accounts

| Role   | Email               | Password       |
| ------ | ------------------- | -------------- |
| Admin  | `admin@forge.dev`   | `Password123!` |
| Member | `liam@forge.dev`    | `Password123!` |

These are development credentials with a published password. The login screen offers
them as a one-click hint on localhost only; the hint is suppressed on any other
hostname. Change both passwords before exposing a deployment publicly.

---

## Environment variables

`.env` is git-ignored; no secret is ever committed. Generate secrets with
`openssl rand -hex 32`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `JWT_ACCESS_SECRET` | Signs the short-lived access token |
| `JWT_REFRESH_SECRET` | Signs the refresh token |
| `ACCESS_TOKEN_TTL` | Access token lifetime, default 15m |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime in days, default 7 |
| `CLIENT_URL` | Allowed browser origin for CORS |
| `PORT` | API port, default 4000 |

## Database and migrations

Prisma is the source of truth for the schema. The production database is never edited
by hand.

```bash
npm run db:migrate          # create and apply a migration locally
npm run db:deploy           # apply migrations on release
npm run db:seed             # rebuild the demonstration dataset
npm run db:reset            # drop, re-migrate and re-seed
```

---

## API surface

All routes are served under `/api/v1`.

### Authentication
| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh cookie |
| POST | `/auth/logout` | Public |
| GET | `/auth/me` | Authenticated |

### Projects
| Method | Endpoint | Access |
|---|---|---|
| GET | `/projects` | Member |
| GET | `/projects/:id` | Member |
| POST | `/projects` | Admin |
| PATCH | `/projects/:id` | Admin |
| POST | `/projects/:id/archive` | Admin |
| POST | `/projects/:id/restore` | Admin |
| DELETE | `/projects/:id` | Admin |

### Milestones
| Method | Endpoint | Access |
|---|---|---|
| GET | `/projects/:projectId/milestones` | Member |
| POST | `/projects/:projectId/milestones` | Member |
| PATCH | `/milestones/:id` | Member |
| DELETE | `/milestones/:id` | Admin |

### Design reviews
| Method | Endpoint | Access |
|---|---|---|
| GET | `/projects/:projectId/reviews` | Member |
| POST | `/projects/:projectId/reviews` | Member |
| PATCH | `/reviews/:id` | Member |
| DELETE | `/reviews/:id` | Admin |

### Clarifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/projects/:projectId/clarifications` | Member |
| POST | `/projects/:projectId/clarifications` | Member |
| PATCH | `/clarifications/:id` | Member |
| POST | `/clarifications/:id/answer` | Member |
| POST | `/clarifications/:id/close` | Member |
| DELETE | `/clarifications/:id` | Admin |

Clarifications follow a strict state machine: `OPEN → ANSWERED → CLOSED`. Any other
transition is rejected with `409` and the code `CLARIFICATION_INVALID_TRANSITION`.

### Evidence
| Method | Endpoint | Access |
|---|---|---|
| GET | `/projects/:projectId/evidence` | Member |
| POST | `/projects/:projectId/evidence` | Member |
| PATCH | `/evidence/:id` | Uploader or Admin |
| DELETE | `/evidence/:id` | Admin |

### Dashboard, users and notifications
| Method | Endpoint | Access |
|---|---|---|
| GET | `/dashboard` | Member |
| GET | `/users` | Member |
| POST | `/users` | Admin |
| PATCH | `/users/:id` | Admin |
| POST | `/users/:id/reset-password` | Admin |
| DELETE | `/users/:id` | Admin |
| GET | `/notifications` | Authenticated |
| PATCH | `/notifications/:id/read` | Owner |
| POST | `/notifications/read-all` | Authenticated |
| GET | `/health` | Public |

---

## Authorisation model

Authorisation is enforced on the server for every request. The Angular route guard is a
navigation convenience and is never treated as a security control.

- `requireAuth` establishes identity from the Bearer access token.
- Workspace isolation is applied by resolving the workspace from the authenticated user,
  never from a client-supplied parameter.
- `requireAdmin` restricts Admin-only operations.
- Non-admins can only reach projects they manage or belong to.
- Records belonging to an archived project are readable but reject writes with `409`.

## Known limitations

- Evidence is stored as an external link. Binary file upload to object storage is not
  implemented.
- Notifications are in-app only; email delivery is out of scope.
- There is no password reset or email verification flow.
- No automated test suite yet; verification is currently manual.

---

## Deployment

The application is deployed as two containers plus a managed PostgreSQL instance.

| Service | Image | Notes |
|---|---|---|
| `web` | nginx serving the Angular bundle | Also proxies `/api` to the API |
| `api` | Node running the compiled Express server | Runs migrations on start |
| database | Managed PostgreSQL | Provided by the hosting platform |

### Same-origin by design

nginx proxies `/api` to the API container, so the browser only ever talks to one
origin. This removes CORS entirely and lets the refresh cookie stay `SameSite=Lax`,
which is both simpler and safer than a split-domain setup.

The frontend therefore calls the relative path `/api/v1` in production and
`http://localhost:4000/api/v1` when running on the Angular dev server. Nothing is
hardcoded to a deployed hostname.

### Environment variables in production

| Variable | Service | Value |
|---|---|---|
| `DATABASE_URL` | api | Connection string from the database provider |
| `JWT_ACCESS_SECRET` | api | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | api | A different `openssl rand -hex 32` |
| `NODE_ENV` | api | `production` — enables the Secure cookie flag |
| `CLIENT_URL` | api | The public application URL |
| `COOKIE_SAMESITE` | api | `lax` behind the proxy; `none` only for split domains |
| `PORT` | web | Injected by most platforms; defaults to 80 |
| `API_UPSTREAM` | web | Internal address of the API, e.g. `http://api:4000` |

### Notes

- The API binds to `0.0.0.0`, not localhost, so the container accepts external connections.
- `trust proxy` is enabled so the Secure cookie flag is set correctly behind a load balancer.
- Migrations run automatically on container start via `prisma migrate deploy`.
- Google Fonts inlining is disabled at build time so the image can build without
  outbound network access; the browser still loads the font from the `<link>` tag.
