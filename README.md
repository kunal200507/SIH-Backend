# Enirikshan Backend

Backend API for the Enirikshan project. It currently provides authentication, JWT sessions, role-based permissions, audit-ready user data, and protected route foundations for projects, grievances, alerts, and users.

The project uses native ES modules, Express, PostgreSQL, and Prisma 7.

## Features

- Citizen registration with a generated username
- Staff login using Officer ID and password
- Admin-only staff account provisioning
- Bcrypt password hashing
- Short-lived JWT access tokens
- Rotating refresh tokens stored as hashes in PostgreSQL
- HttpOnly cookie authentication with JSON token responses
- Database-configurable role permissions
- Geographic profile fields for state, district, constituency, and agency scope
- Prisma seed data based on the supplied permission matrix
- Basic audit log model

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm

## Installation

```powershell
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your PostgreSQL connection and unique JWT secrets.

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/enirikshan?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-refresh-secret"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL_DAYS="7"
PORT="3000"
NODE_ENV="development"
```

Do not commit `.env` or real secrets to source control.

## Database Setup

Generate the Prisma client:

```powershell
npm run prisma:generate
```

Create and apply the first migration:

```powershell
npx prisma migrate dev --name init
```

Seed the role/action permission matrix:

```powershell
npm run prisma:seed
```

The database contains these main models:

- `User`: citizen, staff, MP, agency, ministry, and admin accounts
- `RefreshToken`: hashed refresh tokens and revocation state
- `Permission`: role/action allow-deny rules and scope labels
- `AuditLog`: user activity records

The schema is defined in `prisma/schema.prisma`.

## Running the API

Development mode with automatic restart:

```powershell
npm run dev
```

Production-style start:

```powershell
npm start
```

The default server URL is:

```text
http://localhost:3000
```

Health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Authentication API

All routes are mounted under `/api/auth`.

### Register a citizen

```http
POST /api/auth/register/citizen
Content-Type: application/json
```

```json
{
  "fullName": "Asha Sharma",
  "email": "asha@example.com",
  "password": "strong-password"
}
```

A citizen must provide a name, password, and either an email or phone number. The response contains a generated username and tokens.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "CIT-1234567890-1234",
  "password": "strong-password"
}
```

Staff users log in with their Officer ID as the username.

### Get the current user

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

The access token can also be supplied through the `accessToken` HttpOnly cookie.

### Refresh a session

```http
POST /api/auth/refresh
```

The refresh token is read from the `refreshToken` HttpOnly cookie. It may also be supplied in the JSON body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

Refresh tokens are rotated. The token used for refresh is revoked after a successful request.

### Logout

```http
POST /api/auth/logout
```

The current refresh token is revoked and authentication cookies are cleared.

### Create a staff account

This endpoint is restricted to users with the `ADMIN` role.

```http
POST /api/auth/staff
Authorization: Bearer <admin-access-token>
Content-Type: application/json
```

```json
{
  "role": "STATE_NODAL",
  "fullName": "Raj Kumar",
  "officerId": "OFF-1001",
  "password": "strong-password",
  "state": "Maharashtra",
  "designation": "State Nodal Officer"
}
```

Supported staff roles:

- `MINISTRY`
- `STATE_NODAL`
- `DISTRICT_AUTHORITY`
- `MP`
- `IMPLEMENTING_AGENCY`

## Protected API Routes

| Method | Route | Requirement |
| --- | --- | --- |
| `GET` | `/api/projects` | Authenticated role and `view_national_data` permission |
| `GET` | `/api/grievances` | Authentication and `track_grievance` permission |
| `GET` | `/api/alerts` | Authentication and `view_ai_alerts` permission |
| `GET` | `/api/users/:id` | `ADMIN` or `MINISTRY` role |

The project, grievance, and alert endpoints currently return placeholder responses. Their database models and business operations still need to be implemented.

## Roles

The supported roles are:

- `ADMIN`
- `MINISTRY`
- `STATE_NODAL`
- `DISTRICT_AUTHORITY`
- `MP`
- `IMPLEMENTING_AGENCY`
- `CITIZEN`

Permissions are stored in the `Permission` table instead of being hardcoded only in route files. The seed script creates an allow/deny record for every role and action.

Available actions include:

- `view_national_data`
- `view_state_data`
- `view_district_data`
- `recommend_work`
- `review_recommendation`
- `sanction_work`
- `assign_implementing_agency`
- `execute_work`
- `update_work_progress`
- `upload_execution_documents`
- `view_ai_alerts`
- `investigate_anomaly`
- `inspect_works`
- `generate_reports`
- `file_grievance`
- `track_grievance`

## Project Structure

```text
server/
└── src/
    ├── app.js
    ├── config/
    │   ├── db.js
    │   └── env.js
    ├── controllers/
    ├── middleware/
    ├── routes/
    ├── services/
    └── utils/

prisma/
├── schema.prisma
└── seed.js

prisma.config.ts
.env.example
package.json
```

## Useful Commands

```powershell
npm test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`npm test` currently performs a Node.js syntax check on the application entrypoint. A full automated API test suite has not been added yet.

## Security Notes

- Passwords are stored only as bcrypt hashes.
- Refresh tokens are stored only as SHA-256 hashes.
- Access and refresh tokens use separate secrets.
- Cookies are HttpOnly and use `secure` automatically in production.
- Use strong, different JWT secrets in every deployed environment.
- Add rate limiting, email/phone verification, and production CORS allowlists before deployment.
