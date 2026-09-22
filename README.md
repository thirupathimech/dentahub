# DentaHub

DentaHub is a monolithic dental clinic management system foundation built with:

- Java 17 + Spring Boot 3.3
- React + TypeScript + Vite
- Tailwind CSS
- MySQL 8

The repository keeps the application layers together while separating the two development folders:

- `backend/` — Spring Boot API and MySQL integration
- `frontend/` — React, Vite, and Tailwind UI

The current slice includes the application shell, responsive side navigation, a data-backed dashboard, and working Patients, Appointments, Doctors, Branch, and Settings modules. No starter records are inserted; all counts and lists come from MySQL.

## Run locally

### 1. Configure environment

Backend and frontend each have their own environment file:

```bash
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Update database or admin login values in `backend/.env` if needed. The frontend reads only `frontend/.env` through Vite.

Default starter login:

- Email: `admin@dentahub.com`
- Password: `admin123`

### 2. Start MySQL

```bash
docker compose --env-file backend/.env up -d mysql
```

The default database is `dentahub`, with `root/root` credentials. Override `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` when needed.

### 3. Start the Spring Boot API

```bash
cd backend
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

### 4. Start the React app

```bash
cd frontend
npm install
npm run dev
```

The UI runs at `http://localhost:5173`. Vite proxies `/api` requests to Spring Boot.

## Build the frontend

```bash
cd frontend
npm run build
```

The generated `frontend/dist` can later be copied to Spring Boot's static resources when we wire the production packaging step.

## Login

The UI login calls `POST /api/auth/login` and stores the returned starter session token in browser storage. The credentials are controlled through `APP_ADMIN_EMAIL` and `APP_ADMIN_PASSWORD` in `backend/.env`. This is an initial env-backed login flow; JWT/session persistence and role-based authorization should be added before production use.

## Current navigation

Dashboard, Patients, Appointments, Doctors, Branch, and Settings are implemented with MySQL-backed APIs and forms. Consultation, Dental Chart, Treatment Plans, Treatments, Billing, Payments, and Users / Roles remain navigation placeholders for the next slice.
