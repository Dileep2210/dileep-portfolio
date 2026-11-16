# Contact API (FastAPI)

Receives the portfolio contact form and emails it to the owner through Brevo SMTP.

## Layout

```
backend/
  app/
    main.py            # app factory: CORS, rate-limit middleware, body-size cap, error handlers
    config.py          # env-based settings (pydantic-settings); refuses FRONTEND_ORIGIN="*"
    schemas.py         # request validation (ContactRequest)
    email_service.py   # builds the message, sends via SMTP with a timeout
    rate_limit.py      # slowapi limiter + client-IP key
    routes/health.py   # GET /health
    routes/contact.py  # POST /api/contact
  tests/               # pytest (SMTP is always mocked)
  .env.example  requirements.txt  requirements-dev.txt  railway.json
```

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env        # fill in real values (never commit .env)
# for local dev also set APP_ENV=development and FRONTEND_ORIGIN=http://localhost:5173
uvicorn app.main:app --reload --port 8000
pytest
```

The frontend defaults to `http://localhost:8000` in dev when `VITE_API_URL` is unset.

## API

### `GET /health`
`200 {"status": "ok"}`

### `POST /api/contact`
`Content-Type: application/json`

| Field | Rules |
|---|---|
| `name` | 2-100 chars, single line |
| `email` | valid address, max 254 |
| `subject` | 3-150 chars, single line |
| `message` | 10-5000 chars |
| `website` | honeypot; must be empty or omitted |

Unknown fields are rejected. Bodies over 16 KB get `413`.

| Status | Meaning |
|---|---|
| `200 {"ok": true, "message": "Message sent"}` | Sent (also returned for honeypot hits, without sending) |
| `422 {"ok": false, "error": ..., "detail": [{"field", "message"}]}` | Validation failed (submitted values are never echoed) |
| `429 {"ok": false, "error": ...}` | Rate limit exceeded |
| `502 {"ok": false, "error": ...}` | SMTP delivery failed or timed out |
| `503 {"ok": false, "error": ...}` | SMTP env vars not configured |

The email goes to `CONTACT_RECEIVER_EMAIL` from `MAIL_FROM`, with `Reply-To` set to the visitor.

## Security notes

- CORS allows only `FRONTEND_ORIGIN` (no wildcard, no credentials); methods `GET/POST/OPTIONS`.
- Server-side validation with length caps; control characters/newlines rejected in name and subject
  (email header injection); the message is built with `email.message.EmailMessage`.
- Rate limit per client IP (`RATE_LIMIT_CONTACT`). Behind a proxy (`TRUST_PROXY=true`) the last
  `X-Forwarded-For` hop is used, because earlier hops are client-controlled. In-memory by default; use
  `RATE_LIMIT_STORAGE_URI` (Redis) for more than one instance.
- Honeypot returns a fake success so bots get no signal.
- SMTP: STARTTLS with certificate verification, 10 s timeout, errors collapsed to a generic 502.
- Logs contain only event names and a random `ref`; never names, emails, message text or credentials.
- `/docs` and `/openapi.json` are disabled unless `APP_ENV=development`.
- A honeypot and rate limit do not stop a determined human spammer. If abuse appears, add a CAPTCHA
  (e.g. Cloudflare Turnstile) in front of `/api/contact`.
