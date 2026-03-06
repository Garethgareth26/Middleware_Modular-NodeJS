# middleware-modular-nodejs

A minimal, composable middleware stack for Express.js REST APIs.  
Handles authentication, role-based access, rate limiting, input validation, error handling, and request logging — each in its own isolated module.

---

## Why

Most Express.js tutorials dump auth logic inside controllers. This works until it doesn't — when you need to reuse the same check across 12 routes, or when a bug in one endpoint quietly breaks another.

This project structures security concerns as independent middleware layers. Each piece does one thing. You can swap, skip, or extend any of them without touching the rest.

---

## Stack

| Layer | Module | Responsibility |
|---|---|---|
| 1 | `requestLogger` | Record every request and its outcome |
| 2 | `globalLimiter` | Reject IPs exceeding request threshold |
| 3 | `authenticateToken` | Verify JWT Bearer token |
| 4 | `checkRole` | Enforce role-based access per route |
| 5 | `validateRequest` | Reject malformed input before it hits the controller |
| 6 | `errorHandler` | Catch everything, respond consistently |

---

## Request lifecycle

```
incoming request
       |
       v
  requestLogger        — logs all traffic, including rejected requests
       |
       v
  globalLimiter        — 429 if IP exceeds threshold
       |
       v
  authenticateToken    — 401 if no token / 403 if invalid or expired
       |
       v
  checkRole            — 403 if role not permitted
       |
       v
  validateRequest      — 400 if input fails schema
       |
       v
   controller          — your business logic, finally
       |
       v
  errorHandler         — catches any thrown error, formats the response
       |
       v
     response
```

---

## Requirements

- Node.js >= 14
- Express.js >= 4

---

## Installation

```bash
git clone https://github.com/your-username/middleware-modular-nodejs.git
cd middleware-modular-nodejs
npm install
cp .env.example .env
```

Edit `.env` and set at minimum:

```
JWT_SECRET=replace_this_with_a_long_random_string
```

Run the example server:

```bash
npm run dev
```

---

## Usage

### Basic setup — server.js

```js
require('dotenv').config()
const express = require('express')
const app = express()

const { requestLogger }     = require('./middleware/requestLogger')
const { globalLimiter,
        loginLimiter }      = require('./middleware/rateLimiter')
const { authenticateToken } = require('./middleware/authenticateToken')
const { checkRole }         = require('./middleware/checkRole')
const { errorHandler }      = require('./middleware/errorHandler')
const { validateLogin,
        validateRegister,
        validate }          = require('./middleware/validateRequest')

app.use(express.json())
app.use(requestLogger)   // must be first
app.use(globalLimiter)   // must be second

// public routes
app.post('/auth/register', validateRegister, validate, registerController)
app.post('/auth/login',    loginLimiter, validateLogin, validate, loginController)

// protected routes
app.get('/profile',        authenticateToken, profileController)
app.get('/dashboard',      authenticateToken, checkRole('user', 'admin'), dashboardController)
app.get('/admin/users',    authenticateToken, checkRole('admin'), adminController)

app.use(errorHandler) // must be last

app.listen(process.env.PORT || 3000)
```

---

## Middleware reference

### authenticateToken

Reads the `Authorization` header, extracts the Bearer token, and verifies it against `JWT_SECRET`.  
On success, attaches the decoded payload to `req.user`.

```js
// JWT payload shape expected:
// { userId, username, role }

router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user)
})
```

| Case | Status |
|---|---|
| No token | 401 |
| Invalid or tampered | 403 |
| Expired | 403 |
| Valid | passes to next() |

---

### checkRole(...roles)

Higher-order function. Pass one or more allowed roles as arguments.  
Must be placed after `authenticateToken` — it reads from `req.user.role`.

```js
checkRole('admin')                   // single role
checkRole('admin', 'moderator')      // multiple roles
checkRole('user', 'admin')           // all authenticated users
```

| Case | Status |
|---|---|
| req.user missing | 401 |
| Role not in allowed list | 403 |
| Role matches | passes to next() |

---

### rateLimiter

Three pre-configured limiters using `express-rate-limit`.

```js
const { loginLimiter, authLimiter, globalLimiter } = require('./middleware/rateLimiter')
```

| Export | Max | Window | Use on |
|---|---|---|---|
| `loginLimiter` | 5 | 15 min | POST /login |
| `authLimiter` | 10 | 15 min | POST /register, /verify-otp |
| `globalLimiter` | 100 | 15 min | all routes (global) |

All blocked requests are logged with `[RATE LIMIT]` prefix including IP and timestamp.

---

### validateRequest

Schemas are built with `express-validator`.  
Always pair a schema with the `validate` handler — it collects and formats errors.

```js
const { validateLogin, validate } = require('./middleware/validateRequest')

router.post('/login', validateLogin, validate, controller)
```

Available schemas:  
`validateRegister` `validateLogin` `validateUpdateProfile` `validateChangePassword` `validateCreateResource`

Adding a new schema:

```js
// in validateRequest.js
const validateCreatePost = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').isLength({ min: 10 }).withMessage('Content too short'),
]

module.exports = { ..., validateCreatePost }
```

Error response shape:

```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

### errorHandler

Catches anything passed to `next(err)`.  
Handles JWT errors, Sequelize errors, Mongoose errors, and custom errors.  
Returns clean JSON without leaking stack traces.

```js
// throw from anywhere
const err = new Error('Not found')
err.statusCode = 404
next(err)
```

All errors follow the same shape:

```json
{
  "success": false,
  "error": "Error type",
  "message": "What went wrong"
}
```

---

### requestLogger

Logs every incoming request and its response.  
Requests that result in 4xx or 5xx are additionally marked as `[SECURITY LOG]`.

```
[2026-03-05T12:56:57.725Z] → INCOMING GET /api/dashboard from IP: ::1
[2026-03-05T12:56:57.732Z] ← RESPONSE GET /api/dashboard 200 | user: gareth | 7ms

[2026-03-05T12:59:25.380Z] → INCOMING GET /api/admin/users from IP: ::1
[2026-03-05T12:59:25.383Z] ← RESPONSE GET /api/admin/users 403 | user: userbiasa | 3ms
[SECURITY LOG] 403 on GET /api/admin/users — IP: ::1 — user: userbiasa

[RATE LIMIT] Login blocked — IP: ::1 — 2026-03-05T13:00:27.642Z
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | yes | — | Secret key for signing/verifying JWT |
| `JWT_EXPIRES_IN` | no | `1h` | Token expiry duration |
| `PORT` | no | `3000` | Server port |
| `NODE_ENV` | no | `development` | Environment flag |

---

## Project structure

```
middleware-modular-nodejs/
├── middleware/
│   ├── authenticateToken.js
│   ├── checkRole.js
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   ├── requestLogger.js
│   └── validateRequest.js
├── examples/
│   └── server.example.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Security coverage

Addresses the following [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) risks:

```
API1  Broken Object Level Authorization      checkRole
API2  Broken Authentication                  authenticateToken + rateLimiter
API4  Unrestricted Resource Consumption      rateLimiter
API5  Broken Function Level Authorization    checkRole
API7  Server Side Request Forgery            validateRequest
API8  Security Misconfiguration              errorHandler
API9  Improper Inventory Management          requestLogger
API10 Unsafe Consumption of APIs             validateRequest + errorHandler
```

---

## Known limitations

- JWT tokens cannot be invalidated before expiry. Implement a token blacklist with Redis if revocation is needed.
- Rate limiting state is stored in-memory. Use `rate-limit-redis` for multi-instance deployments.
- Logs are written to stdout. For production, replace `console.log` in `requestLogger.js` with Winston or Pino.

---

## License

MIT

---

*Developed as part of undergraduate thesis research.*  
*Universitas Singaperbangsa Karawang — 2026.*