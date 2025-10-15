###############################################################################
# Create Azure Functions Only - Quick Resume Script
###############################################################################

$ErrorActionPreference = "Stop"

# Load configuration
. .\config.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "Creating Azure Functions Only" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

###############################################################################
# CREATE AZURE FUNCTIONS
###############################################################################
Write-Host "Creating Azure Functions App..." -ForegroundColor Yellow

# Note: Using Windows OS for Functions as Linux consumption plans may not be available in all regions
az functionapp create `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --storage-account $STORAGE_ACCOUNT_NAME `
  --consumption-plan-location $LOCATION `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --os-type Windows

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Azure Functions" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Azure Functions created" -ForegroundColor Green

# Assign Managed Identity
Write-Host "Assigning Managed Identity..." -ForegroundColor Yellow
az functionapp identity assign `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to assign Managed Identity to Functions" -ForegroundColor Red
    exit 1
}

# Get the managed identity
$FUNCTIONS_IDENTITY = az functionapp identity show `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query principalId `
  --output tsv

if ([string]::IsNullOrWhiteSpace($FUNCTIONS_IDENTITY)) {
    Write-Host "[ERROR] Failed to retrieve Functions Managed Identity" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Managed Identity assigned: $FUNCTIONS_IDENTITY" -ForegroundColor Green

# Grant Key Vault access
Write-Host "Granting Key Vault access..." -ForegroundColor Yellow
$kvResourceId = "/subscriptions/$((az account show --query id -o tsv))/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

az role assignment create `
  --role "Key Vault Secrets User" `
  --assignee-object-id $FUNCTIONS_IDENTITY `
  --assignee-principal-type ServicePrincipal `
  --scope $kvResourceId 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to configure Key Vault access for Functions" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Key Vault access granted" -ForegroundColor Green
Write-Host "Waiting for RBAC propagation..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Configure application settings
Write-Host "Configuring application settings..." -ForegroundColor Yellow

# Build settings array - each setting needs to be properly quoted
$settings = @(
    "DB_SERVER=${SQL_SERVER_NAME}.database.windows.net"
    "DB_NAME=$SQL_DATABASE_NAME"
    "DB_USER=$SQL_ADMIN_USER"
    "`"DB_PASSWORD=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/db-password/)`""
    "DB_ENCRYPT=true"
    "`"ACS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/acs-connection-string/)`""
    "ACS_SENDER_ADDRESS=$ACS_SENDER_ADDRESS"
    "APP_URL=https://${FRONTEND_APP_NAME}.azurestaticapps.net"
)

# Use direct call with proper argument splatting
$result = az functionapp config appsettings set `
    --name $FUNCTIONS_APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings @settings 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to configure Functions settings" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Application settings configured" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Azure Functions Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Function App: $FUNCTIONS_APP_NAME" -ForegroundColor White
Write-Host "Managed Identity: $FUNCTIONS_IDENTITY" -ForegroundColor White
Write-Host ""
