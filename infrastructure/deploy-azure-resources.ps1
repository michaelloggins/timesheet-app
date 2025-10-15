###############################################################################
# MiraVista Timesheet - Azure Resource Deployment Script (PowerShell)
#
# This script provisions all required Azure resources for PRODUCTION environment
#
# Prerequisites:
# - Azure CLI installed and logged in (az login)
# - Contributor access to Azure subscription
# - PowerShell 5.1+ (Windows 11 default) or PowerShell 7+
#
# Usage: .\deploy-azure-resources.ps1
###############################################################################

$ErrorActionPreference = "Stop"

# Load configuration
. .\config.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "MiraVista Timesheet - Azure Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Environment: PRODUCTION"
Write-Host "Location: $LOCATION"
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host ""

# Confirm deployment
$confirm = Read-Host "Do you want to proceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled."
    exit 0
}

###############################################################################
# 0. REGISTER REQUIRED AZURE RESOURCE PROVIDERS
###############################################################################
Write-Host "`n[0/11] Registering Azure Resource Providers..." -ForegroundColor Yellow

$providers = @(
    "Microsoft.Sql",
    "Microsoft.KeyVault",
    "Microsoft.Web",
    "Microsoft.Storage",
    "Microsoft.Communication",
    "Microsoft.Insights"
)

foreach ($provider in $providers) {
    Write-Host "Checking provider: $provider..." -ForegroundColor Gray

    $providerJson = az provider show --namespace $provider --output json 2>$null
    if ($providerJson) {
        $providerStatus = $providerJson | ConvertFrom-Json

        if ($providerStatus.registrationState -eq "Registered") {
            Write-Host "  [OK] $provider is already registered" -ForegroundColor Green
        } elseif ($providerStatus.registrationState -eq "Registering") {
            Write-Host "  [INFO] $provider is currently registering, waiting..." -ForegroundColor Yellow

            # Wait for registration to complete
            $maxWait = 60
            $waited = 0
            while ($waited -lt $maxWait) {
                Start-Sleep -Seconds 5
                $waited += 5

                $checkJson = az provider show --namespace $provider --output json 2>$null
                if ($checkJson) {
                    $check = $checkJson | ConvertFrom-Json
                    if ($check.registrationState -eq "Registered") {
                        Write-Host "  [OK] $provider registration completed" -ForegroundColor Green
                        break
                    }
                }
            }

            if ($waited -ge $maxWait) {
                Write-Host "  [WARNING] $provider registration is taking longer than expected" -ForegroundColor Yellow
                Write-Host "  Continuing anyway, but deployment may fail if registration is not complete" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [INFO] Registering $provider..." -ForegroundColor Yellow
            $registerOutput = az provider register --namespace $provider 2>&1

            # Check if registration was initiated successfully
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [INFO] $provider registration initiated, waiting for completion..." -ForegroundColor Yellow

                # Wait for registration to complete
                $maxWait = 300  # 5 minutes max
                $waited = 0
                $registered = $false

                while ($waited -lt $maxWait) {
                    Start-Sleep -Seconds 10
                    $waited += 10

                    $checkJson = az provider show --namespace $provider --output json 2>$null
                    if ($checkJson) {
                        $check = $checkJson | ConvertFrom-Json
                        if ($check.registrationState -eq "Registered") {
                            Write-Host "  [OK] $provider registration completed after $waited seconds" -ForegroundColor Green
                            $registered = $true
                            break
                        } else {
                            Write-Host "  [INFO] Still registering... ($waited seconds elapsed, state: $($check.registrationState))" -ForegroundColor Gray
                        }
                    }
                }

                if (-not $registered) {
                    Write-Host "  [WARNING] $provider registration did not complete within $maxWait seconds" -ForegroundColor Yellow
                    Write-Host "  You can check status manually: az provider show -n $provider" -ForegroundColor Yellow
                    Write-Host "  Deployment may fail if this provider is required immediately" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  [WARNING] Failed to initiate registration for $provider" -ForegroundColor Yellow
                Write-Host "  You may need to register it manually or have insufficient permissions" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  [WARNING] Could not check status of $provider" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[OK] Resource provider check complete" -ForegroundColor Green

###############################################################################
# 1. CREATE RESOURCE GROUP
###############################################################################
Write-Host "`n[1/11] Creating Resource Group..." -ForegroundColor Yellow

az group create `
  --name $RESOURCE_GROUP `
  --location $LOCATION `
  --tags Environment=Production Application=Timesheet Owner=$OWNER

Write-Host "[OK] Resource Group created" -ForegroundColor Green

###############################################################################
# 2. CREATE AZURE SQL DATABASE
###############################################################################
Write-Host "`n[2/11] Creating Azure SQL Server and Database..." -ForegroundColor Yellow

az sql server create `
  --name $SQL_SERVER_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --admin-user $SQL_ADMIN_USER `
  --admin-password $SQL_ADMIN_PASSWORD `
  --enable-public-network true

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create SQL Server" -ForegroundColor Red
    exit 1
}

az sql server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Azure Services firewall rule" -ForegroundColor Red
    exit 1
}

# Add client IP firewall rule
# Configure your IP address in config.ps1 or hardcode it here
$MY_IP = "75.112.191.3"

Write-Host "Adding firewall rule for IP: $MY_IP" -ForegroundColor Gray

az sql server firewall-rule create --resource-group $RESOURCE_GROUP --server $SQL_SERVER_NAME --name "AllowMyIP" --start-ip-address $MY_IP --end-ip-address $MY_IP 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Failed to create client IP firewall rule" -ForegroundColor Yellow
    Write-Host "You can add it manually later in Azure Portal" -ForegroundColor Gray
} else {
    Write-Host "[OK] Client IP firewall rule created for $MY_IP" -ForegroundColor Green
}

az sql db create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name $SQL_DATABASE_NAME `
  --service-objective S1 `
  --backup-storage-redundancy Local `
  --zone-redundant false

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create SQL Database" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] SQL Server and Database created" -ForegroundColor Green

###############################################################################
# 3. CREATE KEY VAULT
###############################################################################
Write-Host "`n[3/11] Creating Azure Key Vault..." -ForegroundColor Yellow

# Check if Key Vault already exists (may be in soft-deleted state)
Write-Host "Checking for existing Key Vault..." -ForegroundColor Gray
$tempErrorPref = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$existingVaultJson = az keyvault show --name $KEY_VAULT_NAME --resource-group $RESOURCE_GROUP --output json 2>&1 | Where-Object { $_ -notmatch "ERROR:" }
$ErrorActionPreference = $tempErrorPref
$existingVault = $null
if ($existingVaultJson) {
    try {
        $existingVault = $existingVaultJson | ConvertFrom-Json
    } catch {
        # Ignore JSON parsing errors
    }
}

if ($existingVault) {
    Write-Host "[OK] Key Vault already exists, skipping creation" -ForegroundColor Green
} else {
    # Check if vault is in soft-deleted state
    Write-Host "Checking for soft-deleted Key Vault..." -ForegroundColor Gray
    $deletedVaultJson = az keyvault list-deleted --query "[?name=='$KEY_VAULT_NAME']" --output json 2>$null
    $deletedVault = $null
    if ($deletedVaultJson) {
        $deletedVault = $deletedVaultJson | ConvertFrom-Json
    }

    if ($deletedVault -and $deletedVault.Count -gt 0) {
        Write-Host "Found soft-deleted Key Vault, recovering..." -ForegroundColor Yellow
        az keyvault recover --name $KEY_VAULT_NAME --resource-group $RESOURCE_GROUP 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to recover Key Vault" -ForegroundColor Red
            Write-Host "You may need to purge it manually: az keyvault purge --name $KEY_VAULT_NAME" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "[OK] Key Vault recovered" -ForegroundColor Green
    } else {
        # Create new Key Vault - don't set purge protection to avoid conflicts
        Write-Host "Creating new Key Vault..." -ForegroundColor Gray
        az keyvault create `
          --name $KEY_VAULT_NAME `
          --resource-group $RESOURCE_GROUP `
          --location $LOCATION `
          --retention-days 90 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to create Key Vault" -ForegroundColor Red
            exit 1
        }
        Write-Host "[OK] Key Vault created" -ForegroundColor Green
    }
}

Write-Host "Waiting for Key Vault to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Get current user's object ID to grant Key Vault permissions
Write-Host "Granting current user Key Vault permissions..." -ForegroundColor Gray
$currentUserJson = az ad signed-in-user show --output json 2>$null
if ($currentUserJson) {
    $currentUser = $currentUserJson | ConvertFrom-Json
    $currentUserId = $currentUser.id

    Write-Host "Current user ID: $currentUserId" -ForegroundColor Gray

    # Grant Key Vault Secrets Officer role using RBAC
    $kvResourceId = "/subscriptions/$((az account show --query id -o tsv))/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

    az role assignment create `
        --role "Key Vault Secrets Officer" `
        --assignee $currentUserId `
        --scope $kvResourceId 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Key Vault permissions granted" -ForegroundColor Green
        Write-Host "Waiting for RBAC propagation..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    } else {
        Write-Host "[WARNING] Failed to grant Key Vault RBAC permissions" -ForegroundColor Yellow
        Write-Host "Trying legacy access policy method..." -ForegroundColor Yellow

        # Fallback to access policy model
        az keyvault set-policy `
            --name $KEY_VAULT_NAME `
            --upn $currentUser.userPrincipalName `
            --secret-permissions get list set delete 2>&1 | Out-Null

        Start-Sleep -Seconds 10
    }
}

az keyvault secret set `
  --vault-name $KEY_VAULT_NAME `
  --name "db-password" `
  --value "$SQL_ADMIN_PASSWORD"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to store secrets in Key Vault" -ForegroundColor Red
    Write-Host "You may need to grant yourself permissions manually:" -ForegroundColor Yellow
    Write-Host "  az role assignment create --role 'Key Vault Secrets Officer' --assignee-object-id YOUR_USER_ID --scope /subscriptions/SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" -ForegroundColor Gray
    exit 1
}

Write-Host "[OK] Key Vault created and secrets stored" -ForegroundColor Green

###############################################################################
# 4. CREATE APP SERVICE PLAN
###############################################################################
Write-Host "`n[4/11] Creating App Service Plan..." -ForegroundColor Yellow

az appservice plan create `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku B2

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create App Service Plan" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] App Service Plan created" -ForegroundColor Green

# Verify App Service Plan exists before proceeding
Write-Host "Verifying App Service Plan..." -ForegroundColor Yellow
$planCheck = az appservice plan show --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] App Service Plan verification failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] App Service Plan verified" -ForegroundColor Green

###############################################################################
# 5. CREATE BACKEND API APP SERVICE
###############################################################################
Write-Host "`n[5/11] Creating Backend API App Service..." -ForegroundColor Yellow

az webapp create `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --plan $APP_SERVICE_PLAN `
  --runtime "NODE:20-lts"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Backend API App Service" -ForegroundColor Red
    exit 1
}

az webapp identity assign `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to assign Managed Identity to Backend API" -ForegroundColor Red
    exit 1
}

$BACKEND_IDENTITY = az webapp identity show `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query principalId `
  --output tsv

if ([string]::IsNullOrWhiteSpace($BACKEND_IDENTITY)) {
    Write-Host "[ERROR] Failed to retrieve Backend API Managed Identity" -ForegroundColor Red
    exit 1
}

# Grant Key Vault Secrets User role to Backend API managed identity
$kvResourceId = "/subscriptions/$((az account show --query id -o tsv))/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME"

az role assignment create `
  --role "Key Vault Secrets User" `
  --assignee-object-id $BACKEND_IDENTITY `
  --assignee-principal-type ServicePrincipal `
  --scope $kvResourceId 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to configure Key Vault access for Backend API" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for RBAC propagation..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host "[OK] Backend API App Service created with Managed Identity" -ForegroundColor Green

###############################################################################
# 6. CREATE FRONTEND STATIC WEB APP
###############################################################################
Write-Host "`n[6/11] Creating Frontend Static Web App..." -ForegroundColor Yellow

az staticwebapp create `
  --name $FRONTEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Frontend Static Web App" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Frontend Static Web App created" -ForegroundColor Green

###############################################################################
# 7. CREATE STORAGE ACCOUNT
###############################################################################
Write-Host "`n[7/11] Creating Storage Account..." -ForegroundColor Yellow

az storage account create `
  --name $STORAGE_ACCOUNT_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS `
  --kind StorageV2 `
  --access-tier Hot

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Storage Account" -ForegroundColor Red
    exit 1
}

$STORAGE_KEY = az storage account keys list `
  --resource-group $RESOURCE_GROUP `
  --account-name $STORAGE_ACCOUNT_NAME `
  --query '[0].value' `
  --output tsv

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($STORAGE_KEY)) {
    Write-Host "[ERROR] Failed to retrieve Storage Account keys" -ForegroundColor Red
    exit 1
}

az storage container create `
  --name exports `
  --account-name $STORAGE_ACCOUNT_NAME `
  --account-key $STORAGE_KEY

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create storage container" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Storage Account created" -ForegroundColor Green

###############################################################################
# 8. CREATE AZURE COMMUNICATION SERVICES
###############################################################################
Write-Host "`n[8/11] Creating Azure Communication Services..." -ForegroundColor Yellow

az communication create `
  --name $ACS_NAME `
  --resource-group $RESOURCE_GROUP `
  --location global `
  --data-location UnitedStates

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Azure Communication Services" -ForegroundColor Red
    exit 1
}

$ACS_CONNECTION_STRING = az communication list-key `
  --name $ACS_NAME `
  --resource-group $RESOURCE_GROUP `
  --query primaryConnectionString `
  --output tsv

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ACS_CONNECTION_STRING)) {
    Write-Host "[ERROR] Failed to retrieve ACS connection string" -ForegroundColor Red
    exit 1
}

az keyvault secret set `
  --vault-name $KEY_VAULT_NAME `
  --name "acs-connection-string" `
  --value "$ACS_CONNECTION_STRING"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to store ACS connection string in Key Vault" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Azure Communication Services created" -ForegroundColor Green
Write-Host "[WARNING] Manual step required: Configure email domain in Azure Portal" -ForegroundColor Yellow

###############################################################################
# 9. CREATE APPLICATION INSIGHTS
###############################################################################
Write-Host "`n[9/11] Creating Application Insights..." -ForegroundColor Yellow

az monitor app-insights component create `
  --app $APP_INSIGHTS_NAME `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --application-type web `
  --kind web

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create Application Insights" -ForegroundColor Red
    exit 1
}

$APP_INSIGHTS_KEY = az monitor app-insights component show `
  --app $APP_INSIGHTS_NAME `
  --resource-group $RESOURCE_GROUP `
  --query instrumentationKey `
  --output tsv

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($APP_INSIGHTS_KEY)) {
    Write-Host "[ERROR] Failed to retrieve Application Insights key" -ForegroundColor Red
    exit 1
}

az keyvault secret set `
  --vault-name $KEY_VAULT_NAME `
  --name "app-insights-key" `
  --value "$APP_INSIGHTS_KEY"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to store Application Insights key in Key Vault" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Application Insights created" -ForegroundColor Green

###############################################################################
# 10. CREATE AZURE FUNCTIONS
###############################################################################
Write-Host "`n[10/11] Creating Azure Functions App..." -ForegroundColor Yellow

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

az functionapp identity assign `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to assign Managed Identity to Functions" -ForegroundColor Red
    exit 1
}

$FUNCTIONS_IDENTITY = az functionapp identity show `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query principalId `
  --output tsv

if ([string]::IsNullOrWhiteSpace($FUNCTIONS_IDENTITY)) {
    Write-Host "[ERROR] Failed to retrieve Functions Managed Identity" -ForegroundColor Red
    exit 1
}

# Grant Key Vault Secrets User role to Functions managed identity
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

Write-Host "Waiting for RBAC propagation..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host "[OK] Azure Functions created with Managed Identity" -ForegroundColor Green

###############################################################################
# 11. CONFIGURE APPLICATION SETTINGS
###############################################################################
Write-Host "`n[11/11] Configuring Application Settings..." -ForegroundColor Yellow

# Configure Backend API settings
Write-Host "Configuring Backend API settings..." -ForegroundColor Yellow
az webapp config appsettings set `
  --name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings `
    "NODE_ENV=production" `
    "DB_SERVER=${SQL_SERVER_NAME}.database.windows.net" `
    "DB_NAME=$SQL_DATABASE_NAME" `
    "DB_USER=$SQL_ADMIN_USER" `
    "DB_PASSWORD=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/db-password/)" `
    "DB_ENCRYPT=true" `
    "TENANT_ID=$TENANT_ID" `
    "CLIENT_ID=$CLIENT_ID" `
    "CLIENT_SECRET=$CLIENT_SECRET" `
    "ACS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/acs-connection-string/)" `
    "ACS_SENDER_ADDRESS=$ACS_SENDER_ADDRESS" `
    "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=${APP_INSIGHTS_KEY}" `
    "ENABLE_PAYCHEX_SYNC=false" `
    "ENABLE_DIGITAL_SIGNAGE=true"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to configure Backend API settings" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Backend API settings configured" -ForegroundColor Green

# Configure Functions settings
Write-Host "Configuring Azure Functions settings..." -ForegroundColor Yellow
az functionapp config appsettings set `
  --name $FUNCTIONS_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings `
    "DB_SERVER=${SQL_SERVER_NAME}.database.windows.net" `
    "DB_NAME=$SQL_DATABASE_NAME" `
    "DB_USER=$SQL_ADMIN_USER" `
    "DB_PASSWORD=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/db-password/)" `
    "DB_ENCRYPT=true" `
    "ACS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://${KEY_VAULT_NAME}.vault.azure.net/secrets/acs-connection-string/)" `
    "ACS_SENDER_ADDRESS=$ACS_SENDER_ADDRESS" `
    "APP_URL=https://${FRONTEND_APP_NAME}.azurestaticapps.net" `
    "APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to configure Azure Functions settings" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Application settings configured" -ForegroundColor Green

###############################################################################
# DEPLOYMENT SUMMARY
###############################################################################
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resources created:"
Write-Host "  [OK] Resource Group: $RESOURCE_GROUP"
Write-Host "  [OK] SQL Server: ${SQL_SERVER_NAME}.database.windows.net"
Write-Host "  [OK] SQL Database: $SQL_DATABASE_NAME"
Write-Host "  [OK] Key Vault: $KEY_VAULT_NAME"
Write-Host "  [OK] App Service Plan: $APP_SERVICE_PLAN"
Write-Host "  [OK] Backend API: https://${BACKEND_APP_NAME}.azurewebsites.net"
Write-Host "  [OK] Frontend: https://${FRONTEND_APP_NAME}.azurestaticapps.net"
Write-Host "  [OK] Functions: $FUNCTIONS_APP_NAME"
Write-Host "  [OK] Storage: $STORAGE_ACCOUNT_NAME"
Write-Host "  [OK] Communication Services: $ACS_NAME"
Write-Host "  [OK] Application Insights: $APP_INSIGHTS_NAME"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Initialize database schema - see database/README.md"
Write-Host "2. Configure Entra ID app registration"
Write-Host "3. Set up email domain in Azure Communication Services"
Write-Host "4. Deploy application code - backend, frontend, functions"
Write-Host "5. Configure custom domain and SSL - optional"
Write-Host ""
Write-Host "See POST-DEPLOYMENT.md for detailed instructions"
Write-Host ""

# Save deployment info
$deploymentInfo = @"
MiraVista Timesheet - Deployment Information
Generated: $(Get-Date)

Resource Group: $RESOURCE_GROUP
Location: $LOCATION

SQL Server: ${SQL_SERVER_NAME}.database.windows.net
Database: $SQL_DATABASE_NAME
Admin User: $SQL_ADMIN_USER

Backend API: https://${BACKEND_APP_NAME}.azurewebsites.net
Frontend: https://${FRONTEND_APP_NAME}.azurestaticapps.net
Functions: $FUNCTIONS_APP_NAME

Key Vault: $KEY_VAULT_NAME
Storage Account: $STORAGE_ACCOUNT_NAME
Communication Services: $ACS_NAME
Application Insights: $APP_INSIGHTS_NAME

Your IP added to firewall: $MY_IP
"@

$deploymentInfo | Out-File -FilePath "deployment-info.txt" -Encoding utf8

Write-Host "Deployment info saved to deployment-info.txt" -ForegroundColor Green
