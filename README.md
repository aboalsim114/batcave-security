# 🦇 Batcave Security

Secure authentication server for the "Batcave": users register, log in, and only authenticated agents can reach the Bat-Computer and its API.

Built with **Node.js, Express, SQLite (better-sqlite3) and bcrypt**.

## What it demonstrates

- **Password storage done right**: passwords are hashed with bcrypt (cost factor 10), never stored in plain text.
- **Session security**: the session ID is regenerated after login to prevent session fixation; the session cookie is `httpOnly` and `sameSite`, with an expiry.
- **Two auth strategies**: session-based auth for the web UI, and an HTTP Basic auth middleware for API clients.
- **SQL injection protection**: every query goes through prepared statements.
- **Secrets out of the code**: configuration is read from environment variables (`.env` is git-ignored).
- **Tests** with the built-in Node test runner.

## Routes

| Method | Route | Access |
|---|---|---|
| GET / POST | `/auth/login` | Public |
| POST | `/register` | Public |
| GET | `/auth/logout` | Logged in |
| GET | `/bat-computer` | Logged in |
| GET | `/api/me` | Logged in |
| GET | `/api/secrets` | Logged in |
| POST | `/api/reports` | Logged in |

## Run it locally

```bash
npm install
# create a .env file at the root (see below)
npm run dev
```

`.env` variables:

```env
PORT=3000
SESSION_SECRET=change-me-to-a-long-random-string
```

Run the tests:

```bash
npm test
```

## Project structure

```
config/        SQLite connection and schema (users, reports)
middlewares/   session check and HTTP Basic auth
routes/        auth routes and Bat-Computer API
views/         login and Bat-Computer pages
public/        client-side scripts and registration page
test/          server tests (node:test)
```

## Next improvements

- Rate limiting on `/auth/login` to slow down brute-force attempts
- CSRF protection on form submissions
- Security headers with Helmet
- Broader test coverage (failed logins, protected routes)

---

Built as part of a web security course (TP1: security system, TP2: badge system).
