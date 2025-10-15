# GitHub Actions Setup Guide

This guide will help you configure GitHub Actions for automated CI/CD deployment of your Timesheet application.

## Overview

The repository includes three GitHub Actions workflows:

1. **Backend Deployment** - Deploys the Node.js API to Azure App Service
2. **Frontend Deployment** - Deploys the React app to Azure Static Web Apps
3. **Functions Deployment** - Deploys Azure Functions for scheduled tasks

## Prerequisites

Before setting up GitHub Actions, ensure you have:

- [x] Azure resources deployed (run `infrastructure/deploy-azure-resources.ps1`)
- [x] GitHub CLI installed and authenticated (`gh auth login`)
- [x] Azure CLI installed and authenticated (`az login`)
- [x] Repository pushed to GitHub

## Quick Setup (Automated)

The easiest way to configure GitHub Actions is using the automated script:

```powershell
cd infrastructure
.\Setup-GitHubActions.ps1
```

This script will:
1. Create an Azure Service Principal for GitHub Actions
2. Retrieve deployment tokens from your Azure resources
3. Configure all required GitHub repository secrets
4. Provide instructions for final manual steps

## Manual Setup

If you prefer to configure secrets manually, follow these steps:

### Step 1: Create Azure Service Principal

Create a service principal that GitHub Actions will use to deploy to Azure:

```powershell
# Get your subscription ID
$SUBSCRIPTION_ID = az account show --query id -o tsv

# Load your resource group name
. .\config.ps1

# Create service principal
az ad sp create-for-rbac `
  --name "sp-github-actions-timesheet" `
  --role Contributor `
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" `
  --sdk-auth
```

Copy the entire JSON output - you'll need it for the `AZURE_CREDENTIALS` secret.

### Step 2: Get Static Web App Deployment Token

```powershell
az staticwebapp secrets list `
  --name $FRONTEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query "properties.apiKey" `
  -o tsv
```

Save this for the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.

### Step 3: Get Function App Publish Profile

```powershell
az functionapp deployment list-publishing-profiles `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --xml
```

Save this for the `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` secret.

### Step 4: Configure GitHub Secrets

Go to your repository settings: `https://github.com/YOUR_USERNAME/timesheet-app/settings/secrets/actions`

Click **New repository secret** and add the following secrets:

#### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AZURE_CREDENTIALS` | Service principal JSON from Step 1 | `{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web App deployment token | From Step 2 |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | Function App publish profile XML | From Step 3 |

#### Frontend Environment Variables

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VITE_API_BASE_URL` | Backend API URL | `https://api-MVD-TimeSheet-timesheet.azurewebsites.net` |
| `VITE_TENANT_ID` | Azure AD Tenant ID | `cda163bf-8f9c-4f6c-98ee-be043aa96eef` |
| `VITE_CLIENT_ID` | Azure AD App Client ID | `b9d05b88-ac4e-4f8b-b469-5147969c24ed` |
| `VITE_REDIRECT_URI` | Frontend redirect URI | `https://app-MVD-TimeSheet-timesheet.azurestaticapps.net` |
| `VITE_AUTHORITY` | Azure AD authority URL | `https://login.microsoftonline.com/YOUR_TENANT_ID` |

### Step 5: Create Production Environment

GitHub Actions workflows use the `production` environment. Create it:

1. Go to: `https://github.com/YOUR_USERNAME/timesheet-app/settings/environments`
2. Click **New environment**
3. Name it: `production`
4. Click **Configure environment**
5. (Optional) Add protection rules if desired

## Verifying Setup

### Check Secrets

1. Go to: `https://github.com/YOUR_USERNAME/timesheet-app/settings/secrets/actions`
2. Verify all 8 secrets are listed

### Test Workflows

You can manually trigger workflows to test:

1. Go to: `https://github.com/YOUR_USERNAME/timesheet-app/actions`
2. Select a workflow (e.g., "Deploy Backend API")
3. Click **Run workflow** > **Run workflow**
4. Monitor the progress

## Workflow Triggers

Workflows are configured to run automatically:

### Backend Deployment
- **Triggers on**: Push to `main` branch when files in `backend/` change
- **Manual trigger**: Available via workflow_dispatch

### Frontend Deployment
- **Triggers on**: Push to `main` branch when files in `frontend/` change
- **Manual trigger**: Available via workflow_dispatch

### Functions Deployment
- **Triggers on**: Push to `main` branch when files in `functions/` change
- **Manual trigger**: Available via workflow_dispatch

## Workflow Details

### Backend Workflow (deploy-backend.yml)

1. **Build**: Installs dependencies, runs tests, linter, and builds TypeScript
2. **Package**: Creates deployment ZIP with production dependencies
3. **Deploy**: Uploads to Azure App Service
4. **Verify**: Health check on deployed API

### Frontend Workflow (deploy-frontend.yml)

1. **Build**: Installs dependencies, runs tests, linter, and builds with Vite
2. **Deploy**: Uploads to Azure Static Web Apps
3. **Notify**: Reports success/failure

### Functions Workflow (deploy-functions.yml)

1. **Build**: Installs dependencies and compiles TypeScript
2. **Deploy**: Uploads to Azure Functions
3. **Verify**: Confirms deployment success

## Troubleshooting

### Workflow Fails: "Resource not found"

**Cause**: Azure resources may not be deployed or names don't match workflow configuration.

**Solution**:
1. Verify resources exist: `az resource list -g $RESOURCE_GROUP`
2. Check workflow env variables match your resource names
3. Update workflow files if needed

### Workflow Fails: "Authentication failed"

**Cause**: Service principal credentials are incorrect or expired.

**Solution**:
1. Re-run `Setup-GitHubActions.ps1` to create new credentials
2. Or manually reset credentials:
   ```powershell
   az ad sp credential reset --id YOUR_APP_ID
   ```

### Frontend Build Fails: "Environment variable not set"

**Cause**: Missing `VITE_*` secrets.

**Solution**: Verify all 5 frontend environment variable secrets are set in GitHub.

### Static Web App Deployment Fails

**Cause**: Invalid deployment token.

**Solution**:
1. Get new token: `az staticwebapp secrets list --name $FRONTEND_APP_NAME -g $RESOURCE_GROUP --query "properties.apiKey" -o tsv`
2. Update `AZURE_STATIC_WEB_APPS_API_TOKEN` secret in GitHub

## Monitoring Deployments

### View Workflow Runs

- Go to: `https://github.com/YOUR_USERNAME/timesheet-app/actions`
- Click on any workflow run to see details
- View logs for each step

### View Azure Resources

After successful deployment:

- **Backend API**: `https://api-MVD-TimeSheet-timesheet.azurewebsites.net/health`
- **Frontend App**: `https://app-MVD-TimeSheet-timesheet.azurestaticapps.net`
- **Azure Portal**: https://portal.azure.com

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Rotate credentials regularly** - Re-run setup script to generate new credentials
3. **Use environment protection rules** for production deployments
4. **Review workflow logs** for any exposed sensitive data
5. **Limit service principal scope** to only required resource group

## Additional Configuration

### Adding Branch Protection

To require workflows to pass before merging:

1. Go to: `https://github.com/YOUR_USERNAME/timesheet-app/settings/branches`
2. Add rule for `main` branch
3. Check "Require status checks to pass"
4. Select your workflow checks

### Notifications

Configure Slack/Teams notifications by adding steps to workflows:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {"text": "Deployment failed!"}
```

## Next Steps

After GitHub Actions is configured:

1. Make a small change to trigger a deployment
2. Monitor the workflow in the Actions tab
3. Verify the deployment in Azure
4. Set up branch protection rules
5. Configure notifications (optional)

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions tab
2. Review Azure deployment logs in Azure Portal
3. Verify all secrets are correctly configured
4. Ensure Azure resources are running

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Login Action](https://github.com/Azure/login)
- [Azure Web App Deploy](https://github.com/Azure/webapps-deploy)
- [Azure Static Web Apps Deploy](https://github.com/Azure/static-web-apps-deploy)
- [Azure Functions Action](https://github.com/Azure/functions-action)
