# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiraVista Timesheet Tracking System - a timesheet management application for MiraVista Diagnostics. Monorepo with React frontend, Node.js/Express backend, and Azure Functions for background jobs.

## Common Commands

### Development
```bash
npm run dev              # Start both backend and frontend concurrently
npm run dev:backend      # Backend only (http://localhost:3001)
npm run dev:frontend     # Frontend only (http://localhost:5173)
```

### Building
```bash
npm run build            # Build both backend and frontend
npm run build:backend    # Backend only (TypeScript -> dist/)
npm run build:frontend   # Frontend only (Vite build)
```

### Testing
```bash
npm test                 # Run all tests (backend + frontend)
npm run test:backend     # Backend tests (Jest)
npm run test:frontend    # Frontend tests (Vitest)

# Single test file
cd backend && npx jest path/to/test.ts
cd frontend && npx vitest path/to/test.tsx
```

### Linting & Formatting
```bash
npm run lint             # Lint both packages
npm run format           # Prettier format all files
cd backend && npm run lint:fix    # Fix backend lint issues
cd frontend && npm run lint:fix   # Fix frontend lint issues
```

### Azure Functions (local)
```bash
cd functions && npm start    # Requires Azure Functions Core Tools
```

## Architecture

### Backend (Express + TypeScript)
- **Entry point**: `backend/src/server.ts`
- **Layered architecture**:
  - `controllers/` - HTTP request handlers
  - `services/` - Business logic
  - `repositories/` - Data access (Azure SQL via mssql)
  - `middleware/` - Auth, error handling, rate limiting
- **Auth**: Azure AD (Entra ID) via passport-azure-ad with bearer token validation
- **Database**: Azure SQL Database with connection pooling

### Frontend (React + TypeScript + Vite)
- **Entry point**: `frontend/src/main.tsx`, app at `frontend/src/App.tsx`
- **UI Library**: Fluent UI v9 (@fluentui/react-components)
- **State**: Zustand stores (`store/`) + TanStack Query for server state
- **Auth**: @azure/msal-react with MSAL browser
- **Path aliases**: `@components/`, `@services/`, etc. configured in vite.config.ts

### Azure Functions
- Timer-triggered background jobs in `functions/src/`:
  - `timesheetReminders/` - Send reminder emails
  - `managerDigest/` - Manager summary emails
  - `escalationCheck/` - Escalation workflows
  - `paychexSync/` - PTO sync integration

### Database (Azure SQL)
- Schema in `database/schema.sql`
- Semantic views for Power BI in `database/views.sql`
- Core tables: Users, Departments, Projects, Timesheets, TimeEntries, TimesheetHistory

## Key Patterns

### Authentication Flow
1. Frontend authenticates via MSAL against Entra ID
2. Access token sent as Bearer token to backend
3. Backend validates token via passport-azure-ad
4. User looked up in database by EntraIDObjectID
5. Role-based authorization: Employee, Manager, TimesheetAdmin, Leadership

### API Routes
All routes prefixed with `/api/`:
- `/api/auth` - Authentication endpoints
- `/api/timesheets` - Timesheet CRUD
- `/api/approvals` - Manager approval workflows
- `/api/projects` - Project management
- `/api/reports` - Reporting endpoints
- `/api/dashboard` - Dashboard aggregations
- `/api/admin` - Admin operations (TimesheetAdmin role)
- `/api/admin/import` - Data import (Excel)

### Environment Variables
- Backend: `.env` file in `backend/` (copy from `.env.example`)
- Frontend: `.env` file in `frontend/` with `VITE_` prefix
- Key vars: `DB_SERVER`, `DB_NAME`, `TENANT_ID`, `CLIENT_ID`

## Commit Message Format
Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
