# MiraVista Timesheet Tracking System

> **Rapid Time Tracking. Accurate Results.**
> Modern timesheet management for MiraVista Diagnostics

![Project Status](https://img.shields.io/badge/status-Phase%201%20MVP-blue)
![Node Version](https://img.shields.io/badge/node-20%2B-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Support](#support)

---

## 🔬 Overview

The MiraVista Timesheet Tracking System is a modern web application designed to streamline time entry, approval workflows, and grant reporting for MiraVista Diagnostics. Built with React and Node.js, it integrates seamlessly with Microsoft Entra ID and provides real-time organizational hierarchy management.

### Key Features

- ⚡ **Fast & Intuitive**: 15-minute setup, 2-minute weekly timesheet entry
- 🎯 **Accurate**: 15-minute increment tracking with validation
- 🏆 **Engaging**: Gamification features improve compliance to 95%+
- 📊 **Insightful**: Real-time reporting and Power BI integration
- 🔒 **Secure**: Enterprise-grade security with Azure and Entra ID

### Architecture Highlights

- **Real-time Org Chart**: No duplication - queries Entra ID directly
- **API-First Design**: RESTful backend with TypeScript
- **Modern Frontend**: React 18.2 with Fluent UI v9
- **Cloud-Native**: Azure PaaS services (App Service, SQL, Functions)
- **Automated Workflows**: Background jobs for reminders and digests

---

## 📁 Project Structure

```
miravista-timesheet/
├── backend/                # Node.js/Express API
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # TypeScript types
│   │   ├── repositories/  # Data access layer
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/              # React SPA
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Timesheet/
│   │   │   ├── Approvals/
│   │   │   ├── Scoreboard/
│   │   │   ├── Reports/
│   │   │   └── Admin/
│   │   ├── config/       # App configuration
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API clients
│   │   ├── store/        # State management (Zustand)
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper functions
│   ├── package.json
│   └── vite.config.ts
│
├── functions/            # Azure Functions
│   ├── src/
│   │   ├── timesheetReminders/
│   │   ├── managerDigest/
│   │   ├── escalationCheck/
│   │   └── paychexSync/
│   └── package.json
│
├── database/             # SQL scripts
│   ├── schema.sql       # Database schema
│   ├── views.sql        # Semantic views for Power BI
│   ├── seed-data.sql    # Initial data
│   └── README.md
│
├── docs/                 # Documentation (from PRD files)
│   ├── miravista-prd.md
│   ├── miravista-architecture.md
│   └── acs-setup-guide.md
│
├── .gitignore
├── package.json         # Root workspace configuration
└── README.md           # This file
```

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18.2+ with TypeScript
- **Build Tool**: Vite 4.x
- **UI Library**: Fluent UI React v9
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Auth**: @azure/msal-react

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.x with TypeScript
- **Database**: Azure SQL Database
- **ORM/Query**: mssql (node-mssql)
- **Auth**: passport-azure-ad

### Infrastructure
- **Cloud**: Microsoft Azure
- **Compute**: Azure App Service (B2/S1 tier)
- **Database**: Azure SQL Database (S1 tier)
- **Functions**: Azure Functions (Consumption plan)
- **Email**: Azure Communication Services
- **Monitoring**: Application Insights

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x LTS or higher
- **npm**: v10.x or higher
- **Azure CLI**: v2.50+ ([Install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- **Git**: v2.30+
- **Azure SQL Database**: Provisioned instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/miravista/timesheet-app.git
   cd timesheet-app
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Frontend:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   cd database
   # Using sqlcmd
   sqlcmd -S your-server.database.windows.net -d TimesheetDB -U sqladmin -P password -i schema.sql
   sqlcmd -S your-server.database.windows.net -d TimesheetDB -U sqladmin -P password -i views.sql
   sqlcmd -S your-server.database.windows.net -d TimesheetDB -U sqladmin -P password -i seed-data.sql
   ```

   See [database/README.md](./database/README.md) for detailed instructions.

5. **Configure Entra ID**

   Register the application in Azure Portal:
   - Navigate to Entra ID → App registrations → New registration
   - Name: `MiraVista Timesheet`
   - Redirect URI: `http://localhost:5173` (dev)
   - Configure API permissions:
     - `User.Read`
     - `User.ReadBasic.All`
     - `Directory.Read.All`
   - Create client secret
   - Copy Client ID and Tenant ID to `.env` files

---

## 💻 Development

### Run Locally

Start both backend and frontend simultaneously:

```bash
# From project root
npm run dev
```

Or start individually:

```bash
# Backend (runs on http://localhost:3001)
npm run dev:backend

# Frontend (runs on http://localhost:5173)
npm run dev:frontend
```

### Run Azure Functions Locally

```bash
cd functions
npm install
npm start
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow TypeScript best practices
   - Write tests for new features
   - Update documentation

3. **Run Tests**
   ```bash
   npm test                  # Run all tests
   npm run test:coverage     # With coverage report
   ```

4. **Lint & Format**
   ```bash
   npm run lint              # Check linting
   npm run format            # Format code
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Code Style

- **Formatting**: Prettier (2-space indentation)
- **Linting**: ESLint with TypeScript rules
- **Commit Messages**: Conventional Commits format
  - `feat:` New features
  - `fix:` Bug fixes
  - `docs:` Documentation
  - `refactor:` Code refactoring
  - `test:` Test updates
  - `chore:` Maintenance tasks

---

## 🚢 Deployment

### Azure Deployment

#### Prerequisites
```bash
az login
az account set --subscription "your-subscription-id"
```

#### Deploy Backend
```bash
cd backend
npm run build
az webapp up --name miravista-timesheet-api --resource-group rg-timesheet-prod
```

#### Deploy Frontend
```bash
cd frontend
npm run build
az webapp up --name miravista-timesheet-web --resource-group rg-timesheet-prod
```

#### Deploy Functions
```bash
cd functions
npm run build
func azure functionapp publish miravista-timesheet-functions
```

### Environment Variables (Production)

Set via Azure Portal or CLI:
```bash
az webapp config appsettings set \
  --name miravista-timesheet-api \
  --resource-group rg-timesheet-prod \
  --settings \
    DB_SERVER=prod-server.database.windows.net \
    DB_NAME=TimesheetDB \
    TENANT_ID=your-tenant-id \
    CLIENT_ID=your-client-id
```

Use Azure Key Vault for secrets:
```bash
az keyvault secret set \
  --vault-name kv-timesheet-prod \
  --name db-password \
  --value "your-secure-password"
```

---

## 📚 Documentation

### Architecture & Design
- [Product Requirements Document](./docs/miravista-prd.md)
- [Technical Architecture](./docs/miravista-architecture.md)
- [Azure Communication Services Setup](./docs/acs-setup-guide.md)

### Component Documentation
- [Backend README](./backend/README.md) - Coming soon
- [Frontend README](./frontend/README.md) - Coming soon
- [Database README](./database/README.md)
- [Functions README](./functions/README.md)

### API Documentation
- Base URL: `http://localhost:3001/api` (dev)
- Authentication: Bearer token (Entra ID)
- Swagger docs: Coming in Phase 2

---

## 🧪 Testing

### Unit Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

Target: 80% code coverage

---

## 📈 Monitoring

### Application Insights

View application performance:
- Azure Portal → Application Insights → Performance
- Query logs with Kusto Query Language (KQL)
- Set up alerts for errors and performance degradation

### Health Checks

- Backend health: `GET /health`
- Database connectivity check included
- Entra ID connectivity check included

---

## 🔒 Security

### Best Practices

- All connections use TLS 1.2+
- Database encrypted at rest (TDE)
- Secrets stored in Azure Key Vault
- Parameterized SQL queries (no SQL injection)
- CORS configured for allowed origins only
- Rate limiting enabled
- Helmet.js security headers
- Regular dependency updates

### Authentication Flow

1. User logs in via Microsoft Entra ID
2. Frontend receives access token
3. Token sent with each API request
4. Backend validates token with Entra ID
5. User permissions checked (RBAC)

---

## 🤝 Contributing

We welcome contributions from the MiraVista team!

### Guidelines
1. Follow the code style and conventions
2. Write tests for new features
3. Update documentation
4. Create detailed PR descriptions
5. Request review from 2+ team members

---

## 📞 Support

### Internal Support
- **IT Help Desk**: helpdesk@miravistalabs.com
- **Project Repository**: GitHub Issues
- **Documentation**: See `/docs` folder

### Troubleshooting

Common issues and solutions:

1. **Can't connect to database**
   - Check firewall rules in Azure Portal
   - Verify connection string in `.env`
   - Ensure IP is whitelisted

2. **Authentication not working**
   - Verify Entra ID app registration
   - Check client ID and tenant ID
   - Clear browser cache and retry

3. **Functions not triggering**
   - Check CRON expression syntax
   - Verify function is enabled in Azure
   - Check Application Insights for errors

---

## 📄 License

Copyright © 2025 MiraVista Diagnostics
Internal use only - Proprietary and confidential

---

## 🙏 Acknowledgments

- MiraVista Diagnostics team for requirements and feedback
- IT department for infrastructure support
- All beta testers for valuable input

---

## 🗺️ Roadmap

### Phase 1: Core MVP (Current) ✅
- [x] Database setup
- [x] Entra ID authentication
- [x] Basic timesheet entry
- [x] Approval workflow
- [x] Scoreboard dashboard
- [ ] Testing and deployment

### Phase 2: Enhanced Features
- [ ] Bulk entry
- [ ] Work location tracking
- [ ] Manager digest emails
- [ ] Historical viewing

### Phase 3: Reporting & Compliance
- [ ] All report types
- [ ] Excel export
- [ ] Power BI views
- [ ] Grant reporting

### Phase 4: Migration & Admin
- [ ] Excel import tool
- [ ] Data migration
- [ ] Admin configuration

### Phase 5: Paychex Integration
- [ ] PTO sync
- [ ] Auto-fill functionality

---

**Built with 💚 for MiraVista Diagnostics**
*Rapid Time Tracking. Accurate Results.*
