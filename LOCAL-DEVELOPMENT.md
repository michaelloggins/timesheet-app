# Local Development Setup Guide

This guide will help you set up and run the MiraVista Timesheet application on your local development PC.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Port Configuration](#port-configuration)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Database Setup](#database-setup)
- [Authentication Setup](#authentication-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **npm** >= 10.0.0 (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Azure CLI** (for database access) ([Install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- **VS Code** (recommended) ([Download](https://code.visualstudio.com/))

Verify installations:
```bash
node --version    # Should be >= 20.0.0
npm --version     # Should be >= 10.0.0
git --version
az --version
```

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already cloned)
git clone https://github.com/michaelloggins/timesheet-app.git
cd timesheet-app

# Install all dependencies
npm install
```

The workspace setup will automatically install dependencies for all three projects:
- `backend/` - Backend API
- `frontend/` - Frontend React app
- `functions/` - Azure Functions

### 2. Configure Environment Variables

#### Backend Configuration

```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the .env file with your settings
notepad backend/.env
```

**Required Backend Variables:**
```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Azure SQL Database
DB_SERVER=sql-miravista-prod.database.windows.net
DB_NAME=TimesheetDB
DB_USER=sqladmin
DB_PASSWORD=<your-password>
DB_ENCRYPT=true

# Microsoft Entra ID
TENANT_ID=<your-tenant-id>
CLIENT_ID=<your-client-id>
CLIENT_SECRET=<your-client-secret>
AUTHORITY=https://login.microsoftonline.com/<your-tenant-id>

# Security
JWT_SECRET=<generate-a-strong-secret-32-chars-minimum>
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=debug

# Feature Flags
ENABLE_PAYCHEX_SYNC=false
ENABLE_DIGITAL_SIGNAGE=true
ENABLE_GAMIFICATION=true
```

#### Frontend Configuration

```bash
# Copy the example environment file
cp frontend/.env.example frontend/.env

# Edit the .env file
notepad frontend/.env
```

**Required Frontend Variables:**
```env
# API Configuration - Points to local backend
VITE_API_BASE_URL=http://localhost:3001/api

# Microsoft Entra ID / MSAL Configuration
VITE_TENANT_ID=<your-tenant-id>
VITE_CLIENT_ID=<your-client-id>
VITE_REDIRECT_URI=http://localhost:5173
VITE_AUTHORITY=https://login.microsoftonline.com/<your-tenant-id>

# Microsoft Graph API
VITE_GRAPH_SCOPES=User.Read,User.ReadBasic.All,Directory.Read.All

# Feature Flags
VITE_ENABLE_DIGITAL_SIGNAGE=true
VITE_ENABLE_GAMIFICATION=true
VITE_ENABLE_PAYCHEX_SYNC=false

# Environment
VITE_ENVIRONMENT=development
```

### 3. Run the Application

**Option A: Run Everything Together (Recommended)**
```bash
# Start both backend and frontend concurrently
npm run dev
```

This will start:
- **Backend API** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

**Option B: Run Components Separately**

In separate terminal windows:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Port Configuration

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| **Frontend (Vite)** | 5173 | http://localhost:5173 |
| **Backend API** | 3001 | http://localhost:3001 |
| **Backend API Docs** | 3001 | http://localhost:3001/api-docs |
| **Backend Health** | 3001 | http://localhost:3001/health |

### Changing Ports

#### Backend Port
Edit `backend/.env`:
```env
PORT=3001  # Change to desired port
```

#### Frontend Port
Edit `frontend/vite.config.ts`:
```typescript
server: {
  port: 5173,  // Change to desired port
  // ...
}
```

**Important:** If you change the backend port, you must also update:
1. `frontend/.env` - Update `VITE_API_BASE_URL`
2. `frontend/vite.config.ts` - Update proxy target
3. `backend/.env` - Update `API_BASE_URL`

## API Path Configuration

### Frontend to Backend Communication

The frontend communicates with the backend in two ways:

#### 1. Development Proxy (Recommended for Local Dev)

The Vite dev server proxies `/api` requests to the backend. This is configured in `frontend/vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // Backend URL
      changeOrigin: true,
    },
  },
}
```

**How it works:**
- Frontend makes request to: `http://localhost:5173/api/timesheets`
- Vite proxy forwards to: `http://localhost:3001/api/timesheets`

**Advantages:**
- No CORS issues during development
- Simple frontend code (no need to specify full URLs)
- Mimics production behavior

#### 2. Direct API Calls (Alternative)

Alternatively, the frontend can call the backend directly using `VITE_API_BASE_URL`:

```typescript
// In your API service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

**Configuration:**
```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:3001/api
```

**Advantages:**
- More explicit API endpoint configuration
- Easier to switch between different backend environments

**Disadvantages:**
- Requires CORS to be configured in backend
- Backend must include `http://localhost:5173` in `ALLOWED_ORIGINS`

## Database Setup

### Option 1: Use Azure SQL Database (Recommended)

If you have access to the Azure SQL database:

1. **Add your IP to firewall:**
```bash
az login

az sql server firewall-rule create \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod \
  --name "YourName-LocalDev" \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

2. **Test connection:**
```bash
# Using Azure CLI
az sql db show-connection-string \
  --client ado.net \
  --name TimesheetDB \
  --server sql-miravista-prod
```

3. **Update backend/.env with database credentials**

### Option 2: Use Local SQL Server (Optional)

If you want to run a local database:

1. Install SQL Server Express or use Docker
2. Run database migration scripts from `backend/src/db/`
3. Update `backend/.env` with local connection string

## Authentication Setup

The application uses Microsoft Entra ID (formerly Azure AD) for authentication.

### Getting Entra ID Credentials

1. **Contact your admin** to get the following values:
   - Tenant ID
   - Client ID (Application ID)
   - Client Secret (for backend)

2. **Or check the Azure Portal:**
   - Go to Azure Portal > Entra ID > App Registrations
   - Find the "MiraVista Timesheet" app
   - Copy the Application (client) ID and Directory (tenant) ID

### Configuring Redirect URIs

For local development, ensure your app registration has these redirect URIs:

**Single-Page Application (SPA) Redirects:**
- `http://localhost:5173`
- `http://localhost:5173/`
- `http://localhost:3000` (alternative port)

To add these:
1. Azure Portal > Entra ID > App Registrations > Your App
2. Authentication > Add a platform > Single-page application
3. Add redirect URIs
4. Save

## Running Specific Tasks

### Build Projects

```bash
# Build everything
npm run build

# Build backend only
npm run build:backend

# Build frontend only
npm run build:frontend
```

### Run Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run tests in watch mode
cd frontend && npm run test:watch
```

### Linting

```bash
# Lint everything
npm run lint

# Auto-fix linting issues
npm run lint:backend -- --fix
npm run lint:frontend -- --fix
```

### Format Code

```bash
# Format all files with Prettier
npm run format
```

## Development Workflow

### Typical Development Session

1. **Start the dev servers:**
```bash
npm run dev
```

2. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/health

3. **Make code changes:**
   - Both backend and frontend support hot-reload
   - Changes will automatically refresh in the browser

4. **Monitor logs:**
   - Backend logs appear in the terminal
   - Frontend logs appear in browser console
   - Backend logs also written to `backend/logs/app.log`

### Project Structure

```
timesheet-app/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Database access
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # TypeScript types
│   │   └── server.ts     # Entry point
│   ├── .env             # Environment variables (create this)
│   └── package.json
│
├── frontend/            # React/Vite SPA
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API services
│   │   ├── store/       # State management (Zustand)
│   │   ├── pages/       # Page components
│   │   └── App.tsx      # Main app component
│   ├── .env            # Environment variables (create this)
│   └── vite.config.ts  # Vite configuration
│
├── functions/          # Azure Functions (background jobs)
│   └── src/
│
└── package.json        # Root workspace config
```

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change the port in backend/.env
PORT=3002
```

### CORS Errors

**Error:** `Access to fetch at 'http://localhost:3001/api/...' from origin 'http://localhost:5173' has been blocked by CORS`

**Solution:**
1. Check `backend/.env` includes frontend URL in `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

2. Verify Vite proxy is configured correctly in `frontend/vite.config.ts`

### Database Connection Errors

**Error:** `ConnectionError: Failed to connect to sql-miravista-prod.database.windows.net:1433`

**Solutions:**
1. **Check firewall rules:**
```bash
az sql server firewall-rule list \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod
```

2. **Add your IP:**
```bash
# Get your public IP
curl ifconfig.me

# Add firewall rule
az sql server firewall-rule create \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod \
  --name "MyLocalDev" \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

3. **Verify credentials in backend/.env**

### Authentication Errors

**Error:** `AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application`

**Solution:**
1. Go to Azure Portal > Entra ID > App Registrations
2. Select your app > Authentication
3. Add `http://localhost:5173` as a redirect URI
4. Ensure it's configured as "Single-page application" type

### Module Not Found Errors

**Error:** `Cannot find module 'xyz'`

**Solution:**
```bash
# Clean install
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

### Environment Variables Not Loading

**Problem:** Environment variables are undefined

**Solution:**
1. **Backend:** Ensure `.env` file exists in `backend/` directory
2. **Frontend:** Ensure `.env` file exists in `frontend/` directory
3. **Frontend:** All variables must start with `VITE_`
4. Restart dev servers after changing `.env` files

## Additional Resources

- [Backend API Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Infrastructure Setup](./infrastructure/README.md)
- [Azure Portal](https://portal.azure.com)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)

## Quick Reference Commands

```bash
# Install everything
npm install

# Start development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Backend only
npm run dev:backend
npm run build:backend
npm run test:backend

# Frontend only
npm run dev:frontend
npm run build:frontend
npm run test:frontend

# Check what's running on a port
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section above
- Review existing [GitHub Issues](https://github.com/michaelloggins/timesheet-app/issues)
- Contact the development team

---

**Happy Coding!** 🚀

*Last Updated: October 2025*
