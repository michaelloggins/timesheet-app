###############################################################################
# Setup GitHub Actions for Timesheet Application
#
# This script configures GitHub repository secrets needed for CI/CD deployments
# Prerequisites:
#   1. GitHub CLI (gh) must be installed and authenticated
#   2. Azure CLI (az) must be installed and authenticated
#   3. Azure resources must already be deployed
###############################################################################

$ErrorActionPreference = "Stop"

# Load configuration
. .\config.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "GitHub Actions Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if gh CLI is installed
try {
    gh --version | Out-Null
    Write-Host "[OK] GitHub CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] GitHub CLI is not installed. Please install it from https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check if az CLI is installed
try {
    az version | Out-Null
    Write-Host "[OK] Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Azure CLI is not installed. Please install it from https://aka.ms/InstallAzureCLIDirect" -ForegroundColor Red
    exit 1
}

# Check if logged into GitHub
try {
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Not authenticated"
    }
    Write-Host "[OK] Authenticated to GitHub" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not authenticated to GitHub. Run: gh auth login" -ForegroundColor Red
    exit 1
}

# Check if logged into Azure
try {
    $azAccount = az account show 2>&1 | ConvertFrom-Json
    Write-Host "[OK] Authenticated to Azure (Subscription: $($azAccount.name))" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not authenticated to Azure. Run: az login" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Azure Service Principal" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get subscription ID
$SUBSCRIPTION_ID = az account show --query id -o tsv

# Create service principal for GitHub Actions
Write-Host "Creating service principal for GitHub Actions..." -ForegroundColor Yellow

$SP_NAME = "sp-github-actions-timesheet"

# Check if service principal already exists
$existingSp = az ad sp list --display-name $SP_NAME --query "[0]" -o json 2>&1 | ConvertFrom-Json

if ($existingSp) {
    Write-Host "[INFO] Service principal '$SP_NAME' already exists" -ForegroundColor Yellow
    $APP_ID = $existingSp.appId

    # Create new credentials
    Write-Host "Creating new credentials for existing service principal..." -ForegroundColor Yellow
    $sp = az ad sp credential reset --id $APP_ID --query "{clientId:appId, clientSecret:password, tenantId:tenant}" -o json | ConvertFrom-Json
} else {
    Write-Host "Creating new service principal..." -ForegroundColor Yellow
    $sp = az ad sp create-for-rbac `
        --name $SP_NAME `
        --role Contributor `
        --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" `
        --query "{clientId:appId, clientSecret:password, tenantId:tenant}" `
        -o json | ConvertFrom-Json
}

if (-not $sp) {
    Write-Host "[ERROR] Failed to create service principal" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Service principal created/updated" -ForegroundColor Green

# Create Azure credentials JSON for GitHub
$azureCredentials = @{
    clientId = $sp.clientId
    clientSecret = $sp.clientSecret
    subscriptionId = $SUBSCRIPTION_ID
    tenantId = $sp.tenantId
} | ConvertTo-Json -Compress

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Getting Azure Resource Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get Static Web App deployment token
Write-Host "Getting Static Web App deployment token..." -ForegroundColor Yellow
$swaToken = az staticwebapp secrets list `
    --name $FRONTEND_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.apiKey" `
    -o tsv

if ([string]::IsNullOrWhiteSpace($swaToken)) {
    Write-Host "[WARNING] Could not retrieve Static Web App token. Frontend deployment may not work." -ForegroundColor Yellow
    Write-Host "          Make sure Static Web App is deployed first." -ForegroundColor Yellow
    $swaToken = "PLACEHOLDER_TOKEN"
} else {
    Write-Host "[OK] Static Web App token retrieved" -ForegroundColor Green
}

# Get Function App publish profile
Write-Host "Getting Function App publish profile..." -ForegroundColor Yellow
$functionPublishProfile = az functionapp deployment list-publishing-profiles `
    --name $FUNCTIONS_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --xml

if ([string]::IsNullOrWhiteSpace($functionPublishProfile)) {
    Write-Host "[WARNING] Could not retrieve Function App publish profile. Functions deployment may not work." -ForegroundColor Yellow
    Write-Host "          Make sure Function App is deployed first." -ForegroundColor Yellow
    $functionPublishProfile = "PLACEHOLDER_PROFILE"
} else {
    Write-Host "[OK] Function App publish profile retrieved" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting GitHub Repository Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Set GitHub secrets
$secrets = @{
    # Azure credentials
    "AZURE_CREDENTIALS" = $azureCredentials

    # Frontend environment variables
    "VITE_API_BASE_URL" = "https://${BACKEND_APP_NAME}.azurewebsites.net"
    "VITE_TENANT_ID" = $TENANT_ID
    "VITE_CLIENT_ID" = $CLIENT_ID
    "VITE_REDIRECT_URI" = "https://${FRONTEND_APP_NAME}.azurestaticapps.net"
    "VITE_AUTHORITY" = "https://login.microsoftonline.com/${TENANT_ID}"

    # Deployment tokens
    "AZURE_STATIC_WEB_APPS_API_TOKEN" = $swaToken
    "AZURE_FUNCTIONAPP_PUBLISH_PROFILE" = $functionPublishProfile
}

foreach ($secretName in $secrets.Keys) {
    Write-Host "Setting secret: $secretName..." -ForegroundColor Yellow

    $secretValue = $secrets[$secretName]

    # Use gh secret set command
    $secretValue | gh secret set $secretName

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Secret '$secretName' set successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to set secret '$secretName'" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Production Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Note: GitHub environments must be created through the web UI for free accounts." -ForegroundColor Yellow
Write-Host "      Go to: Settings > Environments > New environment > 'production'" -ForegroundColor Yellow

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "GitHub Actions Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Secrets configured:" -ForegroundColor White
Write-Host "  - AZURE_CREDENTIALS" -ForegroundColor Cyan
Write-Host "  - VITE_API_BASE_URL" -ForegroundColor Cyan
Write-Host "  - VITE_TENANT_ID" -ForegroundColor Cyan
Write-Host "  - VITE_CLIENT_ID" -ForegroundColor Cyan
Write-Host "  - VITE_REDIRECT_URI" -ForegroundColor Cyan
Write-Host "  - VITE_AUTHORITY" -ForegroundColor Cyan
Write-Host "  - AZURE_STATIC_WEB_APPS_API_TOKEN" -ForegroundColor Cyan
Write-Host "  - AZURE_FUNCTIONAPP_PUBLISH_PROFILE" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create 'production' environment in GitHub repo settings" -ForegroundColor White
Write-Host "  2. Verify secrets at: https://github.com/YOUR_USERNAME/timesheet-app/settings/secrets/actions" -ForegroundColor White
Write-Host "  3. Push changes to trigger deployments" -ForegroundColor White
Write-Host "  4. Monitor workflows at: https://github.com/YOUR_USERNAME/timesheet-app/actions" -ForegroundColor White
Write-Host ""
