# Deploying Project FORGE

This guide deploys the application to a public HTTPS URL using Railway. The whole
process takes about 45 minutes the first time.

You will end up with three services running:

```
   Browser
      |  HTTPS
      v
   web        nginx serving the Angular bundle
      |       and proxying /api/ to the API
      v
   api        Express + Prisma
      |
      v
   postgres   managed database
```

The web service proxies `/api/` to the API, so the browser only ever talks to one
origin. That removes CORS entirely and lets the refresh cookie stay `SameSite=Lax`.

---

## Before you start

- The code must be pushed to GitHub (private repository is fine)
- A Railway account, signed in with GitHub: https://railway.app

---

## Step 1 — Create the project and the database

1. Railway dashboard → **New Project** → **Deploy from GitHub repo**
2. Select your `project-forge` repository
3. Railway will try to auto-detect and build something. Let it fail or cancel it;
   the services are configured manually below.
4. In the project canvas: **New** → **Database** → **Add PostgreSQL**

Railway creates the database and exposes a variable called `DATABASE_URL` on it.

---

## Step 2 — Create the API service

1. **New** → **GitHub Repo** → select the same repository
2. Open the new service → **Settings**
3. Set these:

| Setting | Value |
|---|---|
| Service name | `api` |
| Root directory | `/` (leave as the repository root) |
| Builder | **Dockerfile** |
| Dockerfile path | `docker/api.Dockerfile` |

4. Go to the **Variables** tab and add:

```
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=<paste a fresh 64-character secret>
JWT_REFRESH_SECRET=<paste a different fresh secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SAMESITE=lax
TRUST_PROXY=true
CLIENT_URL=https://REPLACE-AFTER-STEP-3
```

`${{Postgres.DATABASE_URL}}` is Railway's own syntax — type it exactly, it wires the
database in automatically.

**Generate each secret separately.** In PowerShell:

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

Do not reuse the secrets from your local `.env`. Those have been on your machine and
in a shell history; production should have its own.

5. **Deploy**. Watch the build log. The container runs `prisma migrate deploy` on start,
   so the database schema is created automatically on the first boot.

---

## Step 3 — Create the web service

1. **New** → **GitHub Repo** → same repository again
2. **Settings**:

| Setting | Value |
|---|---|
| Service name | `web` |
| Builder | **Dockerfile** |
| Dockerfile path | `docker/web.Dockerfile` |

3. **Variables**:

```
API_UPSTREAM=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4000
```

This points nginx at the API over Railway's internal network. The API is never exposed
publicly; only the web service is.

4. **Settings → Networking → Generate Domain**

Railway gives you a URL such as `https://web-production-a1b2.up.railway.app`.
**Copy it.**

---

## Step 4 — Close the loop

Go back to the **api** service → **Variables** → set:

```
CLIENT_URL=https://<the URL you just copied>
```

Redeploy the API.

---

## Step 5 — Seed the demonstration data

The database is empty at this point. Open the **api** service → the shell or
**Deploy Logs** → run a one-off command:

```
npm run db:seed
```

If Railway's UI has no shell for your plan, connect from your own machine instead:

```bash
cd backend
set DATABASE_URL=<the public DATABASE_URL from the Postgres service>
npm run db:seed
```

Use the *public* connection string for this, not the internal one.

---

## Step 6 — Verify

Check these in order. Stop at the first failure.

| # | Check | Expected |
|---|---|---|
| 1 | `https://<your-url>/api/v1/health` | `{"status":"ok","database":"up"}` |
| 2 | `https://<your-url>` loads | Login screen appears |
| 3 | Log in as `admin@forge.dev` / `Password123!` | Dashboard with real figures |
| 4 | Open a project, add a milestone | Saves and appears immediately |
| 5 | Raise a clarification, answer it, close it | Buttons change at each step |
| 6 | Log in as `liam@forge.dev` | No "New project" button |
| 7 | Refresh the page after 20 minutes | Still logged in |

Check 1 failing means the API cannot reach the database — look at `DATABASE_URL`.
Check 7 failing means the refresh cookie is not surviving; check `COOKIE_SAMESITE`
and that `TRUST_PROXY` is `true`.

---

## Step 7 — Change the demonstration passwords

The seeded accounts use a password published in this repository. Before showing the
deployment to anyone, log in as admin and reset both demonstration accounts from the
Team screen, then record the new credentials in your handover notes rather than in git.

The login screen shows the seeded credentials as a convenience hint, but only when the
application is served from localhost. On a public hostname the hint is suppressed, so
the deployed site does not display an administrator password to every visitor. Confirm
this by loading the public URL: the demo line should be absent.

---

## Cost

Railway bills by usage. Three small services plus a database is roughly USD 5 per month
at demonstration scale. The trial credit covers the first period.

Confirm with the sponsor who carries this cost. The assignment states a reward, not a
budget, and deployment is an acceptance criterion — so it is worth having the answer
in writing.

---

## If something fails

| Symptom | Likely cause |
|---|---|
| Build fails on `prisma generate` | Dockerfile path wrong in service settings |
| API starts then exits | `DATABASE_URL` missing or malformed |
| Web loads but every API call 502 | `API_UPSTREAM` wrong; check the private domain name |
| Login works, then 401 on refresh | `TRUST_PROXY` not set, or `COOKIE_SAMESITE` wrong |
| CORS error in the browser console | The frontend is not using the nginx proxy; confirm `API_BASE` resolved to `/api/v1` |

---

## Alternative: Render

If Railway does not work out, Render follows the same shape: one PostgreSQL instance,
two web services built from the same two Dockerfiles, the same environment variables.
The free tier sleeps after inactivity and takes roughly 50 seconds to wake, which is
poor during a live demonstration — use a paid instance or keep a tab open beforehand.
