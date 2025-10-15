# MiraVista Timesheet - Deployment Quick Start

## 🚀 Complete Azure Deployment in 5 Steps

This guide will walk you through deploying the complete MiraVista Timesheet System to Azure.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Azure CLI installed ([Download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- [ ] Azure subscription with Contributor access
- [ ] Access to company DNS (for email domain verification)
- [ ] Entra ID admin permissions
- [ ] Command line access (PowerShell or Bash)

---

## Step 1: Login to Azure

```bash
# Login to Azure
az login

# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your-Subscription-Name"

# Verify
az account show
```

---

## Step 2: Configure Deployment

Navigate to infrastructure folder and edit configuration:

### For Windows (PowerShell):
```powershell
cd "C:\Projects\Timesheet App\infrastructure"
notepad config.ps1
```

### For Linux/Mac (Bash):
```bash
cd infrastructure
nano config.env
```

### Required Configuration Changes:

1. **Update Resource Names** (must be globally unique):
   ```
   SQL_SERVER_NAME="sql-miravista-prod-[YOUR-UNIQUE-ID]"
   KEY_VAULT_NAME="kv-miravista-[YOUR-UNIQUE-ID]"
   BACKEND_APP_NAME="api-timesheet-[YOUR-UNIQUE-ID]"
   FRONTEND_APP_NAME="app-timesheet-[YOUR-UNIQUE-ID]"
   FUNCTIONS_APP_NAME="func-jobs-[YOUR-UNIQUE-ID]"
   STORAGE_ACCOUNT_NAME="sttimesheet[UNIQUEID]"
   ```

2. **Set Strong SQL Password**:
   ```
   SQL_ADMIN_PASSWORD="YourSecureP@ssw0rd123!"
   ```
   Requirements: Min 8 chars, uppercase, lowercase, number, special char

3. **Entra ID Configuration** (get these from Azure Portal):
   ```
   TENANT_ID="your-tenant-id"
   CLIENT_ID="your-client-id"
   CLIENT_SECRET="your-client-secret"
   ```
   *Leave as placeholders for now - we'll configure Entra ID after deployment*

---

## Step 3: Run Deployment Script

### For Windows:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-azure-resources.ps1
```

### For Linux/Mac:
```bash
chmod +x deploy-azure-resources.sh
./deploy-azure-resources.sh
```

**What it does:**
- Creates resource group
- Provisions Azure SQL Database
- Creates Key Vault for secrets
- Sets up App Service Plan
- Creates Backend API App Service
- Creates Frontend Static Web App
- Provisions Azure Functions
- Sets up Storage Account
- Configures Azure Communication Services
- Creates Application Insights

**Duration:** ~15-20 minutes

---

## Step 4: Initialize Database

After deployment completes, initialize the database schema:

```bash
# Get your SQL connection info from deployment-info.txt
cat deployment-info.txt

# Connect and run schema
cd ../database

sqlcmd -S [your-server].database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i schema.sql

sqlcmd -S [your-server].database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i views.sql

sqlcmd -S [your-server].database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i seed-data.sql
```

**Verify:**
```bash
sqlcmd -S [your-server].database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -Q "SELECT COUNT(*) FROM Users; SELECT COUNT(*) FROM Projects;"
```

---

## Step 5: Configure Entra ID

### A. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Entra ID → App registrations
2. Click **New registration**
3. Settings:
   - **Name**: `MiraVista Timesheet`
   - **Account types**: Single tenant
   - **Redirect URI**:
     - Type: Single-page application (SPA)
     - URI: `https://[your-frontend-app].azurestaticapps.net`
4. Click **Register**

### B. Note the IDs

Copy these values (you'll need them):
- **Application (client) ID**
- **Directory (tenant) ID**

### C. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Production Secret`
4. Expires: 24 months
5. Click **Add**
6. **COPY THE VALUE IMMEDIATELY** (you won't see it again)

### D. Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Add **Delegated permissions**:
   - `User.Read`
   - `User.ReadBasic.All`
4. Add **Application permissions**:
   - `Directory.Read.All`
5. Click **Grant admin consent for [Your Organization]**

### E. Update Azure Configuration

```bash
# Update backend with Entra ID info
az webapp config appsettings set \
  --name [your-backend-app] \
  --resource-group rg-miravista-timesheet-prod \
  --settings \
    TENANT_ID="[copied-tenant-id]" \
    CLIENT_ID="[copied-client-id]" \
    CLIENT_SECRET="[copied-secret-value]"
```

---

## Step 6: Deploy Application Code

### Backend Deployment

```bash
cd ../backend
npm install
npm run build

az webapp deploy \
  --resource-group rg-miravista-timesheet-prod \
  --name [your-backend-app] \
  --src-path ./dist \
  --type zip \
  --async true
```

### Frontend Deployment

```bash
cd ../frontend

# Update .env with your values
cat > .env << EOF
VITE_API_BASE_URL=https://[your-backend-app].azurewebsites.net/api
VITE_TENANT_ID=[your-tenant-id]
VITE_CLIENT_ID=[your-client-id]
VITE_REDIRECT_URI=https://[your-frontend-app].azurestaticapps.net
VITE_AUTHORITY=https://login.microsoftonline.com/[your-tenant-id]
EOF

npm install
npm run build

# Get Static Web App deployment token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name [your-frontend-app] \
  --query "properties.apiKey" \
  --output tsv)

# Deploy using SWA CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./dist --deployment-token $DEPLOY_TOKEN
```

### Functions Deployment

```bash
cd ../functions
npm install
npm run build

func azure functionapp publish [your-functions-app]
```

---

## Step 7: Test the Application

### 1. Test Backend Health

```bash
curl https://[your-backend-app].azurewebsites.net/health
```

Expected: `{"status":"healthy"}`

### 2. Test Frontend

Navigate to: `https://[your-frontend-app].azurestaticapps.net`

Should redirect to Microsoft login page.

### 3. First Login

1. Login with your Entra ID account
2. Grant permissions when prompted
3. Should see the dashboard

---

## What's Next?

### Immediate Tasks

1. **Set up email domain** (see infrastructure/POST-DEPLOYMENT.md)
   - Add DNS records
   - Verify domain in Azure Communication Services
   - Create sender addresses

2. **Create Leadership security group**
   - In Entra ID → Groups → New group
   - Add leadership members
   - Update backend configuration with group ID

3. **Configure monitoring alerts**
   - Set up Application Insights alerts
   - Configure notification action groups

### Optional Enhancements

- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure GitHub Actions for CI/CD
- [ ] Set up staging environment
- [ ] Configure backup policies
- [ ] Create operational runbooks

---

## Troubleshooting

### Can't connect to database

```bash
# Check firewall rules
az sql server firewall-rule list \
  --resource-group rg-miravista-timesheet-prod \
  --server [your-sql-server]

# Add your IP if needed
az sql server firewall-rule create \
  --resource-group rg-miravista-timesheet-prod \
  --server [your-sql-server] \
  --name "MyIP" \
  --start-ip-address [your-ip] \
  --end-ip-address [your-ip]
```

### Authentication errors

- Verify redirect URI matches exactly
- Check client secret hasn't expired
- Ensure admin consent was granted
- Clear browser cache and retry

### Deployment failed

```bash
# Check deployment logs
az webapp log tail \
  --name [your-backend-app] \
  --resource-group rg-miravista-timesheet-prod

# Check function logs
az functionapp log tail \
  --name [your-functions-app] \
  --resource-group rg-miravista-timesheet-prod
```

---

## Cost Management

### Monitor Costs

```bash
# View current month costs
az consumption usage list \
  --start-date $(date -d "1 day ago" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?contains(instanceName,'miravista')].{Name:instanceName,Cost:pretaxCost}" \
  --output table
```

### Set Budget Alerts

1. Azure Portal → Cost Management → Budgets
2. Create new budget: $200/month
3. Set alert at 80% threshold

---

## Support Resources

- **Detailed Guide**: See `infrastructure/POST-DEPLOYMENT.md`
- **Infrastructure README**: See `infrastructure/README.md`
- **Database Setup**: See `database/README.md`
- **Functions Guide**: See `functions/README.md`
- **IT Help Desk**: helpdesk@miravistalabs.com

---

## Deployment Checklist

Track your progress:

- [ ] Azure CLI configured
- [ ] Configuration file updated
- [ ] Deployment script executed successfully
- [ ] Database schema initialized
- [ ] Entra ID app registration created
- [ ] API permissions granted
- [ ] Client secret created
- [ ] Backend code deployed
- [ ] Frontend code deployed
- [ ] Functions deployed
- [ ] Application tested successfully
- [ ] Email domain configured (optional for MVP)
- [ ] Monitoring alerts set up
- [ ] Team notified of new system

---

**Estimated Total Time:** 2-3 hours
**Difficulty Level:** Intermediate

**Questions?** Open an issue in the repository or contact IT support.
