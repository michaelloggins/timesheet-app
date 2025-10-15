# Post-Deployment Configuration Guide

After successfully running the Azure deployment script, follow these steps to complete the setup.

---

## 1. Initialize Database Schema

### Connect to Azure SQL Database

```bash
# Get connection string
az sql db show-connection-string \
  --client sqlcmd \
  --name TimesheetDB \
  --server sql-miravista-prod

# Connect and run schema scripts
cd ../database

sqlcmd -S sql-miravista-prod.database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i schema.sql

sqlcmd -S sql-miravista-prod.database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i views.sql

sqlcmd -S sql-miravista-prod.database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -P "YourPassword" \
  -i seed-data.sql
```

### Verify Database Setup

```sql
-- Check tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';

-- Check views
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS;

-- Check sample data
SELECT COUNT(*) FROM Users;
SELECT COUNT(*) FROM Projects;
```

---

## 2. Configure Microsoft Entra ID

### Create App Registration

1. **Navigate to Azure Portal**
   - Go to Entra ID → App registrations
   - Click "New registration"

2. **Configure Basic Settings**
   - **Name**: `MiraVista Timesheet`
   - **Supported account types**: Single tenant
   - **Redirect URI**:
     - Type: Single-page application (SPA)
     - URI: `https://app-miravista-timesheet.azurestaticapps.net`
   - Click "Register"

3. **Note the IDs**
   - Copy **Application (client) ID**
   - Copy **Directory (tenant) ID**
   - Update these in `infrastructure/config.env` or `config.ps1`

### Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Choose **Delegated permissions** and add:
   - `User.Read`
   - `User.ReadBasic.All`
4. Choose **Application permissions** and add:
   - `Directory.Read.All`
5. Click **Grant admin consent for [Your Organization]**

### Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Production Secret`
4. Expires: 24 months (or per your policy)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately (you won't see it again)
7. Update `CLIENT_SECRET` in config files

### Configure Authentication

1. Go to **Authentication**
2. Under **Single-page application**, verify redirect URI
3. Under **Implicit grant and hybrid flows**, enable:
   - ✓ ID tokens (used for implicit and hybrid flows)
4. Click **Save**

### Configure Token Configuration (Optional)

1. Go to **Token configuration**
2. Add optional claims if needed for roles/groups

---

## 3. Configure Azure Communication Services Email

### Add Email Domain

1. **Navigate to Azure Portal**
   - Go to Communication Services → `acs-miravista-prod`
   - Click **Email** → **Provision domains**

2. **Add Custom Domain**
   - Click **+ Add domain**
   - Select **Custom Domains**
   - Enter: `miravistalabs.com`

3. **Get DNS Records**
   - Azure will provide TXT and CNAME records for verification
   - Example:
     ```
     TXT @ ms-domain-verification=xxxxxx
     CNAME selector1._domainkey selector1-acs-miravista-prod._domainkey.azurecomm.net
     CNAME selector2._domainkey selector2-acs-miravista-prod._domainkey.azurecomm.net
     ```

4. **Configure DNS**
   - Add these records in your DNS provider (GoDaddy, Cloudflare, etc.)
   - Wait 24-48 hours for propagation

5. **Verify Domain**
   - Return to Azure Portal
   - Click **Verify** next to your domain
   - Status should change to ✓ **Verified**

6. **Add Sender Addresses**
   - Go to **Domains** → Select `miravistalabs.com`
   - Click **+ Add sender address**
   - Add:
     - `noreply@miravistalabs.com`
     - `timesheets@miravistalabs.com`

### Test Email Sending

```bash
# Update backend app settings with verified sender
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings ACS_SENDER_ADDRESS="noreply@miravistalabs.com"
```

---

## 4. Create Leadership Security Group

### In Entra ID

1. Go to **Entra ID** → **Groups** → **New group**
2. Configure:
   - **Group type**: Security
   - **Group name**: `Leadership Team`
   - **Group description**: `Leadership access for timesheet system`
   - **Members**: Add VP and C-level executives
3. Click **Create**
4. **Copy the Object ID** of the group
5. Update backend configuration:

```bash
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings LEADERSHIP_GROUP_ID="<group-object-id>"
```

---

## 5. Deploy Application Code

### Option A: Using GitHub Actions (Recommended)

See `.github/workflows/` for automated deployment workflows.

### Option B: Manual Deployment

#### Deploy Backend

```bash
cd backend
npm run build

# Deploy to App Service
az webapp deploy \
  --resource-group rg-miravista-timesheet-prod \
  --name api-miravista-timesheet \
  --src-path ./dist \
  --type zip
```

#### Deploy Frontend

```bash
cd frontend
npm run build

# Get deployment token
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name app-miravista-timesheet \
  --query "properties.apiKey" \
  --output tsv)

# Deploy (requires GitHub Actions or Azure Static Web Apps CLI)
npm install -g @azure/static-web-apps-cli
swa deploy ./dist \
  --deployment-token $DEPLOY_TOKEN
```

#### Deploy Functions

```bash
cd functions
npm run build

func azure functionapp publish func-miravista-jobs
```

---

## 6. Configure CORS

### Backend API CORS

```bash
az webapp cors add \
  --resource-group rg-miravista-timesheet-prod \
  --name api-miravista-timesheet \
  --allowed-origins "https://app-miravista-timesheet.azurestaticapps.net"
```

---

## 7. Configure Custom Domain (Optional)

### For Backend API

1. **Purchase SSL certificate** or use App Service Managed Certificate
2. **Add custom domain**:
   ```bash
   az webapp config hostname add \
     --resource-group rg-miravista-timesheet-prod \
     --webapp-name api-miravista-timesheet \
     --hostname api.timesheet.miravistalabs.com
   ```
3. **Bind SSL certificate**

### For Frontend

1. In Azure Portal → Static Web Apps → Custom domains
2. Add: `timesheet.miravistalabs.com`
3. Configure DNS CNAME record
4. SSL is automatic with Static Web Apps

---

## 8. Configure Monitoring & Alerts

### Set Up Alerts

```bash
# Create action group for notifications
az monitor action-group create \
  --name "Timesheet-Alerts" \
  --resource-group rg-miravista-timesheet-prod \
  --short-name "TS-Alert" \
  --email helpdesk helpdesk@miravistalabs.com

# Create alert for API errors
az monitor metrics alert create \
  --name "API-High-Error-Rate" \
  --resource-group rg-miravista-timesheet-prod \
  --scopes "/subscriptions/{sub-id}/resourceGroups/rg-miravista-timesheet-prod/providers/Microsoft.Web/sites/api-miravista-timesheet" \
  --condition "count Http5xx > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "Timesheet-Alerts"
```

### Configure Application Insights Dashboards

1. Azure Portal → Application Insights → `ai-miravista-prod`
2. Create custom dashboard with:
   - Request rates
   - Response times
   - Failed requests
   - Database query performance
   - Function execution status

---

## 9. Test the Application

### Smoke Tests

1. **Backend Health Check**
   ```bash
   curl https://api-miravista-timesheet.azurewebsites.net/health
   ```
   Expected: `{"status":"healthy"}`

2. **Frontend Access**
   - Navigate to `https://app-miravista-timesheet.azurestaticapps.net`
   - Should redirect to Microsoft login
   - After login, should see dashboard

3. **Database Connectivity**
   - Login to application
   - Try creating a test timesheet
   - Verify data in database

4. **Functions Status**
   ```bash
   az functionapp function show \
     --name func-miravista-jobs \
     --resource-group rg-miravista-timesheet-prod \
     --function-name timesheetReminders
   ```

5. **Email Test**
   - Trigger a timesheet submission
   - Verify email received by manager

---

## 10. Security Hardening

### Review Firewall Rules

```bash
# List SQL firewall rules
az sql server firewall-rule list \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod

# Remove your IP after setup (keep only Azure services)
az sql server firewall-rule delete \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod \
  --name AllowMyIP
```

### Enable Diagnostic Logging

```bash
# Enable for App Service
az monitor diagnostic-settings create \
  --name "AppService-Diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/rg-miravista-timesheet-prod/providers/Microsoft.Web/sites/api-miravista-timesheet" \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true}]' \
  --workspace "/subscriptions/{sub-id}/resourcegroups/rg-miravista-timesheet-prod/providers/microsoft.operationalinsights/workspaces/ai-miravista-prod"
```

### Review Key Vault Access Policies

```bash
az keyvault list-deleted --resource-group rg-miravista-timesheet-prod
```

---

## 11. Backup & Disaster Recovery

### Configure Database Backups

Azure SQL automatically creates backups. Verify settings:

```bash
az sql db show \
  --resource-group rg-miravista-timesheet-prod \
  --server sql-miravista-prod \
  --name TimesheetDB \
  --query "[backupStorageRedundancy,earliestRestoreDate]"
```

### Export Database Schema

```bash
# For version control
sqlcmd -S sql-miravista-prod.database.windows.net \
  -d TimesheetDB \
  -U sqladmin \
  -Q "SELECT * INTO schema_backup FROM INFORMATION_SCHEMA.TABLES"
```

---

## 12. Documentation & Handoff

### Create Operations Runbook

Document:
- Deployment procedures
- Monitoring dashboard URLs
- Escalation contacts
- Backup/restore procedures
- Common troubleshooting steps

### Update README

Update the main README.md with:
- Production URLs
- Support contact information
- Access request procedures

---

## Troubleshooting

### Issue: Can't connect to database

**Solution**:
- Check firewall rules
- Verify connection string in app settings
- Test with sqlcmd from local machine

### Issue: Authentication failing

**Solution**:
- Verify Entra ID app registration settings
- Check redirect URIs match exactly
- Ensure admin consent granted for API permissions
- Clear browser cache and retry

### Issue: Emails not sending

**Solution**:
- Verify domain is verified in ACS
- Check sender address is created
- Review ACS logs in Azure Portal
- Ensure connection string is correct in Key Vault

### Issue: Functions not triggering

**Solution**:
- Check CRON expression syntax
- Verify function is enabled in Azure Portal
- Check Application Insights for errors
- Review function app logs

---

## Support

For issues or questions:
- IT Help Desk: helpdesk@miravistalabs.com
- Azure Support: Open ticket in Azure Portal
- Documentation: See main README.md

---

## Checklist

Use this checklist to track post-deployment tasks:

- [ ] Database schema initialized
- [ ] Entra ID app registration configured
- [ ] Client secret created and stored
- [ ] API permissions granted and consented
- [ ] Email domain verified in ACS
- [ ] Sender addresses created
- [ ] Leadership security group created
- [ ] Backend code deployed
- [ ] Frontend code deployed
- [ ] Functions deployed
- [ ] CORS configured
- [ ] Custom domains configured (optional)
- [ ] Monitoring alerts set up
- [ ] Application tested end-to-end
- [ ] Security hardening completed
- [ ] Backup verification
- [ ] Documentation updated
- [ ] Team trained

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________
