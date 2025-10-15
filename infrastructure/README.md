# Infrastructure Deployment Guide

This directory contains scripts and configurations for deploying the MiraVista Timesheet System to Azure.

## 📁 Files

- **Configure-EntraApp.ps1** - PowerShell script to configure Entra ID app registration
- **deploy-azure-resources.sh** - Bash deployment script (Linux/Mac)
- **deploy-azure-resources.ps1** - PowerShell deployment script (Windows)
- **config.env** - Configuration file for Bash script
- **config.ps1** - Configuration file for PowerShell script
- **POST-DEPLOYMENT.md** - Detailed post-deployment setup guide

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI
   # https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

   # Login to Azure
   az login

   # Set subscription
   az account set --subscription "8d360715-dc0c-4ec3-b879-9e2d1213b76d"
   ```

2. **Access Requirements**
   - Contributor role on Azure subscription
   - Entra ID administrator access (Application Administrator or Global Administrator)

### Step 0: Configure Entra ID App Registration (AUTOMATED)

Before deploying Azure resources, complete the Entra ID app registration setup:

**Windows (PowerShell)**:
```powershell
# Make sure you're logged in to Azure CLI
az login

# Run the automated configuration script
.\Configure-EntraApp.ps1
```

This script will automatically:
- Create a client secret (24 months expiry)
- Configure API permissions (User.Read, User.ReadBasic.All, Directory.Read.All, User.Read.All)
- Grant admin consent
- Add redirect URIs for both production and local development
- Enable ID token issuance
- Create app roles (TimesheetAdmin, Manager, Leadership)
- Update config.env with the client secret

**Manual Alternative**: Follow the detailed guide in `docs/ENTRA-ID-SETUP.md`

### Step 1: Configure

Edit the configuration file for your platform:

**For Linux/Mac (Bash)**:
```bash
nano config.env
```

**For Windows (PowerShell)**:
```powershell
notepad config.ps1
```

Update the following values:
- Resource naming (ensure globally unique names)
- SQL admin password (strong password)
- Entra ID configuration (tenant ID, client ID, client secret)
- Email sender address

### Step 2: Run Deployment

**For Linux/Mac**:
```bash
chmod +x deploy-azure-resources.sh
./deploy-azure-resources.sh
```

**For Windows**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-azure-resources.ps1
```

### Step 3: Post-Deployment

Follow the comprehensive guide in [POST-DEPLOYMENT.md](./POST-DEPLOYMENT.md) to:
1. Initialize database schema
2. Configure Entra ID app registration
3. Set up email domain
4. Deploy application code
5. Configure monitoring

## 📋 Resources Created

The deployment script creates the following Azure resources:

| Resource | Type | Purpose |
|----------|------|---------|
| rg-miravista-timesheet-prod | Resource Group | Container for all resources |
| sql-miravista-prod | SQL Server | Database server |
| TimesheetDB | SQL Database | Application database (S1 tier) |
| kv-miravista-prod | Key Vault | Secrets management |
| plan-miravista-prod | App Service Plan | Hosting plan (B2 tier) |
| api-miravista-timesheet | App Service | Backend API |
| app-miravista-timesheet | Static Web App | Frontend SPA |
| func-miravista-jobs | Function App | Background jobs |
| stmiravistatimesheet | Storage Account | Blob storage |
| acs-miravista-prod | Communication Services | Email service |
| ai-miravista-prod | Application Insights | Monitoring & logging |

## 💰 Cost Estimate

Monthly Azure costs (approximate):

| Service | Tier/SKU | Monthly Cost |
|---------|----------|--------------|
| App Service Plan | B2 | ~$73 |
| SQL Database | S1 | ~$30 |
| Static Web App | Standard | ~$9 |
| Functions | Consumption | ~$10 |
| Storage | Standard LRS | ~$5 |
| Communication Services | Email | ~$1/1000 emails |
| Application Insights | Basic | ~$10 |
| **Total** | | **~$138/month** |

## 🔒 Security Best Practices

The deployment script implements:

✅ **Managed Identities** for passwordless authentication
✅ **Key Vault** for secrets management
✅ **Firewall Rules** on SQL Database
✅ **HTTPS Only** enforcement
✅ **TLS 1.2+** minimum encryption
✅ **Application Insights** for monitoring
✅ **Role-Based Access Control** (RBAC)

## 🔧 Customization

### Change Azure Region

Edit `LOCATION` in config file:
```bash
LOCATION="westus2"  # or eastus, northeurope, etc.
```

### Change Resource Tiers

Edit the deployment script to modify SKUs:
```bash
# App Service Plan
--sku B1  # Change to B1, S1, P1V2, etc.

# SQL Database
--service-objective S0  # Change to Basic, S0, S1, P1, etc.
```

### Add Additional Resources

The script is modular - add new sections following the existing pattern:
```bash
###############################################################################
# 12. CREATE ADDITIONAL RESOURCE
###############################################################################
echo -e "\n${YELLOW}[12/12] Creating Additional Resource...${NC}"

az [resource] create \
  --name $RESOURCE_NAME \
  --resource-group $RESOURCE_GROUP \
  # ... additional parameters

echo -e "${GREEN}✓ Additional Resource created${NC}"
```

## 🧪 Testing

### Validate Configuration

Before deployment, validate your config:
```bash
# Check resource name availability
az sql server check-name-availability \
  --name sql-miravista-prod

az storage account check-name \
  --name stmiravistatimesheet
```

### Dry Run

The script prompts for confirmation before creating resources. Review the output carefully.

### Rollback

To delete all resources:
```bash
az group delete \
  --name rg-miravista-timesheet-prod \
  --yes \
  --no-wait
```

## 📊 Monitoring Deployment

### Watch Deployment Progress

```bash
# Monitor resource group creation
az group show --name rg-miravista-timesheet-prod

# Monitor App Service deployment
az webapp log tail \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod
```

### Check Deployment Status

```bash
# List all resources in group
az resource list \
  --resource-group rg-miravista-timesheet-prod \
  --output table

# Check specific resource
az webapp show \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --query "[name,state,hostNames]"
```

## 🆘 Troubleshooting

### Issue: Resource name already exists

**Solution**: Resource names must be globally unique. Update the name in config file.

### Issue: Insufficient permissions

**Solution**: Ensure you have Contributor role on the subscription:
```bash
az role assignment list --assignee your-email@domain.com
```

### Issue: SQL password complexity

**Solution**: Password must meet requirements:
- At least 8 characters
- Contains uppercase, lowercase, numbers, and special characters

### Issue: Deployment script fails partway

**Solution**: Script is idempotent - you can re-run it. Already-created resources will be skipped or updated.

## 📞 Support

For deployment issues:
- Check [POST-DEPLOYMENT.md](./POST-DEPLOYMENT.md) for detailed steps
- Review Azure Portal activity log for errors
- Contact IT Help Desk: helpdesk@miravistalabs.com

## 🔄 CI/CD Integration

For automated deployments, see workflows in `.github/workflows/`:
- `deploy-backend.yml` - Backend API deployment
- `deploy-frontend.yml` - Frontend SPA deployment
- `deploy-functions.yml` - Azure Functions deployment

Set up the following GitHub Secrets:
- `AZURE_CREDENTIALS` - Azure service principal JSON
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web Apps deployment token
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - Functions publish profile
- Environment variables for frontend build

---

**Last Updated**: January 2025
**Maintained By**: MiraVista IT Team
