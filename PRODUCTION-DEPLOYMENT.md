# Production Deployment Configuration

This document explains how database authentication is configured for local development vs. production deployment.

## Current Setup

### Local Development
- **Authentication**: Azure AD (Entra ID) using `DefaultAzureCredential`
- **Configuration**: `DB_USE_AZURE_AD=true` in `backend/.env`
- **How it works**: Uses your Azure CLI login credentials automatically
- **Advantages**:
  - No password management
  - More secure
  - Automatic credential refresh

### Production (Azure Web App)
- **Authentication**: SQL Authentication (default)
- **Configuration**: `DB_USE_AZURE_AD` not set or set to `false`
- **Credentials**: Managed via Azure Web App environment variables
- **Current Status**: ✅ Working as-is with existing GitHub Actions

## Do You Need to Change Anything?

**Short answer: No, not right now.**

Your current GitHub Actions workflows in `.github/workflows/deploy-backend.yml` will continue to work without any changes. The production environment uses SQL authentication with credentials stored in Azure Web App settings.

## Two Authentication Options for Production

### Option 1: SQL Authentication (Current - No Changes Needed)

**Current Setup:**
- Production uses SQL username/password authentication
- Credentials stored in Azure Web App environment variables
- GitHub Actions deploys code, Azure Web App provides credentials at runtime

**Azure Web App Environment Variables (already configured):**
```env
DB_SERVER=sql-miravista-prod.database.windows.net
DB_NAME=TimesheetDB
DB_USER=sqladmin
DB_PASSWORD=<secure-password>
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
# DB_USE_AZURE_AD is not set (defaults to false)
```

**GitHub Actions: No changes required** ✅

---

### Option 2: Managed Identity (Recommended for Future)

**Why switch?**
- No passwords to manage or rotate
- Better security posture
- Uses Azure Web App's managed identity
- Follows Azure best practices

**Implementation Steps:**

#### Step 1: Grant Database Access to Managed Identity

The Azure Web App already has a managed identity:
- **Principal ID**: `d56f8ad0-8061-4cc7-b894-b0104517da59`
- **Name**: `api-miravista-timesheet`

Run the SQL script in [`database/setup-managed-identity.sql`](./database/setup-managed-identity.sql):

1. Open Azure Portal → SQL Database → TimesheetDB → Query Editor
2. Login with Azure AD credentials (mloggins@miravistalabs.com)
3. Execute the SQL script:

```sql
USE TimesheetDB;
GO

CREATE USER [api-miravista-timesheet] FROM EXTERNAL PROVIDER;
GO

ALTER ROLE db_datareader ADD MEMBER [api-miravista-timesheet];
ALTER ROLE db_datawriter ADD MEMBER [api-miravista-timesheet];
ALTER ROLE db_ddladmin ADD MEMBER [api-miravista-timesheet];
GO
```

#### Step 2: Update Azure Web App Settings

```bash
# Enable Azure AD authentication
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings DB_USE_AZURE_AD=true

# Optional: Remove DB_PASSWORD for security (DB_USER can stay for reference)
az webapp config appsettings delete \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --setting-names DB_PASSWORD
```

#### Step 3: Test Deployment

After making these changes, trigger a deployment:

```bash
# Push a change to trigger deployment
git commit --allow-empty -m "Test managed identity authentication"
git push origin main

# Wait for deployment, then check health endpoint
curl https://api-miravista-timesheet.azurewebsites.net/health
```

**GitHub Actions: Still no changes required** ✅

The application code already supports both authentication methods via the `DB_USE_AZURE_AD` environment variable.

---

## How It Works

The backend code in `backend/src/config/database.ts` automatically detects which authentication method to use:

```typescript
// Reads DB_USE_AZURE_AD environment variable
const useAzureAd = process.env.DB_USE_AZURE_AD === 'true';

if (useAzureAd) {
  // Local Dev: Uses DefaultAzureCredential (Azure CLI login)
  // Production: Uses Managed Identity
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken('https://database.windows.net/');
  // ... use token for authentication
} else {
  // Uses DB_USER and DB_PASSWORD
  // ... traditional SQL authentication
}
```

### Local Development (Azure CLI)
When running locally with `DB_USE_AZURE_AD=true`:
1. `DefaultAzureCredential` looks for Azure CLI credentials
2. Finds your `az login` session
3. Gets an access token for SQL Database
4. Connects using that token

### Production (Managed Identity)
When running on Azure Web App with `DB_USE_AZURE_AD=true`:
1. `DefaultAzureCredential` detects it's running in Azure
2. Automatically uses the Web App's managed identity
3. Gets an access token for SQL Database
4. Connects using that token

No code changes needed - it's all automatic! 🎉

---

## Troubleshooting

### Production deployment fails with database authentication error

**Symptom**: Health endpoint returns 503, logs show "Login failed"

**Solution**:
1. Check Azure Web App environment variables include database settings
2. If using managed identity, verify the SQL user was created (Step 1 above)
3. Check Web App logs: `az webapp log tail --name api-miravista-timesheet --resource-group rg-miravista-timesheet-prod`

### Local development can't connect to database

**Symptom**: "Login failed" or authentication errors locally

**Solution**:
1. Ensure you're logged into Azure CLI: `az login`
2. Verify `DB_USE_AZURE_AD=true` in `backend/.env`
3. Check you're set as Azure AD admin on SQL server: `az sql server ad-admin list --server sql-miravista-prod --resource-group rg-miravista-timesheet-prod`
4. Verify your IP is whitelisted in SQL firewall rules

---

## Summary

| Environment | Auth Method | Configuration | Changes Needed |
|-------------|-------------|---------------|----------------|
| **Local Dev** | Azure AD (CLI) | `DB_USE_AZURE_AD=true` | ✅ Already configured |
| **Production (Current)** | SQL Authentication | Not set or `false` | ✅ No changes needed |
| **Production (Future)** | Managed Identity | `DB_USE_AZURE_AD=true` | Optional - see Option 2 |

**Recommendation**: Keep current setup for now (SQL auth in production). Switch to managed identity when you have time to test thoroughly.
