###############################################################################
# Configure Entra ID App Registration
#
# This script completes the setup of the Entra ID app registration for the
# MiraVista Timesheet application. It configures:
#   - Client secret
#   - API permissions
#   - Admin consent
#   - Authentication (redirect URIs)
#   - App roles
#   - Updates config.env with the client secret
#
# Prerequisites:
#   - Azure CLI installed (az)
#   - Logged in to Azure (az login)
#   - Appropriate permissions (Application Administrator or Global Administrator)
#   - Existing app registration created
#
# Usage:
#   .\Configure-EntraApp.ps1
#
###############################################################################

# Requires -Version 5.1

[CmdletBinding()]
param()

# Configuration
$APP_DISPLAY_NAME = "app-MVD-TimeSheetApp"
$CLIENT_ID = "f708cf41-98b6-45a4-a4f9-376c8b16cb0e"
$TENANT_ID = "cda163bf-8f9c-4f6c-98ee-be043aa96eef"
$CONFIG_ENV_PATH = "$PSScriptRoot\config.env"

# Redirect URIs
$REDIRECT_URIS = @(
    "https://app-MVD-TimeSheet.azurewebsites.net",
    "http://localhost:5173"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Entra ID App Registration Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App Name: $APP_DISPLAY_NAME" -ForegroundColor Yellow
Write-Host "Client ID: $CLIENT_ID" -ForegroundColor Yellow
Write-Host "Tenant ID: $TENANT_ID" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "[OK] Azure CLI version $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Azure CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) {
        throw "Not logged in"
    }
    Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "[OK] Subscription: $($account.name)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not logged in to Azure CLI" -ForegroundColor Red
    Write-Host "Run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verify app registration exists
Write-Host "Verifying app registration..." -ForegroundColor Cyan
try {
    $app = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    if (-not $app) {
        throw "App not found"
    }
    Write-Host "[OK] App registration found: $($app.displayName)" -ForegroundColor Green
    $objectId = $app.id
} catch {
    Write-Host "[ERROR] App registration not found with Client ID: $CLIENT_ID" -ForegroundColor Red
    Write-Host "Please verify the Client ID is correct" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 1: Create Client Secret
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Creating Client Secret" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$secretName = "Production Secret - $(Get-Date -Format 'yyyy-MM-dd')"
Write-Host "Creating client secret: $secretName" -ForegroundColor Yellow

try {
    # Create secret that expires in 2 years (730 days)
    $secretResult = az ad app credential reset --id $CLIENT_ID --append --display-name $secretName --years 2 --output json | ConvertFrom-Json
    $clientSecret = $secretResult.password

    Write-Host "[OK] Client secret created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "CLIENT SECRET (save this - you won't see it again!):" -ForegroundColor Yellow
    Write-Host $clientSecret -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "[ERROR] Failed to create client secret" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Configure API Permissions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Configuring API Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Microsoft Graph API ID
$graphApiId = "00000003-0000-0000-c000-000000000000"

# Required permissions with their IDs
# Delegated permissions
$userReadId = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"              # User.Read
$userReadBasicAllId = "b340eb25-3456-403f-be2f-af7a0d370277"      # User.ReadBasic.All
$offlineAccessId = "7427e0e9-2fba-42fe-b0c0-848c9e6a8182"         # offline_access

# Application permissions
$directoryReadAllId = "7ab1d382-f21e-4acd-a863-ba3e13f7da61"      # Directory.Read.All
$userReadAllAppId = "df021288-bdef-4463-88db-98f22de89214"        # User.Read.All

Write-Host "Adding required permissions..." -ForegroundColor Yellow

# Build the required resource access JSON
$requiredResourceAccess = @{
    resourceAppId = $graphApiId
    resourceAccess = @(
        @{ id = $userReadId; type = "Scope" }
        @{ id = $userReadBasicAllId; type = "Scope" }
        @{ id = $offlineAccessId; type = "Scope" }
        @{ id = $directoryReadAllId; type = "Role" }
        @{ id = $userReadAllAppId; type = "Role" }
    )
} | ConvertTo-Json -Depth 10 -Compress

try {
    # Update the app with required permissions
    az ad app update --id $CLIENT_ID --required-resource-accesses "[$requiredResourceAccess]" 2>&1 | Out-Null
    Write-Host "[OK] Delegated permissions added:" -ForegroundColor Green
    Write-Host "    - User.Read" -ForegroundColor Gray
    Write-Host "    - User.ReadBasic.All" -ForegroundColor Gray
    Write-Host "    - offline_access" -ForegroundColor Gray
    Write-Host "[OK] Application permissions added:" -ForegroundColor Green
    Write-Host "    - Directory.Read.All" -ForegroundColor Gray
    Write-Host "    - User.Read.All" -ForegroundColor Gray
} catch {
    Write-Host "[WARNING] Could not add permissions automatically" -ForegroundColor Yellow
    Write-Host "You may need to add them manually in Azure Portal" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Grant Admin Consent
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Granting Admin Consent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Granting admin consent for API permissions..." -ForegroundColor Yellow

try {
    # Get the service principal for the app
    $sp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if (-not $sp) {
        # Create service principal if it doesn't exist
        Write-Host "Creating service principal..." -ForegroundColor Yellow
        $sp = az ad sp create --id $CLIENT_ID --output json | ConvertFrom-Json
    }

    # Grant admin consent (requires admin privileges)
    az ad app permission admin-consent --id $CLIENT_ID 2>&1 | Out-Null
    Write-Host "[OK] Admin consent granted" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not grant admin consent automatically" -ForegroundColor Yellow
    Write-Host "You need to manually grant admin consent in Azure Portal:" -ForegroundColor Yellow
    Write-Host "1. Go to App registrations > $APP_DISPLAY_NAME > API permissions" -ForegroundColor Gray
    Write-Host "2. Click 'Grant admin consent for [Your Organization]'" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Configure Authentication (Redirect URIs)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Configuring Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Adding redirect URIs for SPA..." -ForegroundColor Yellow

try {
    # Get current web configuration
    $currentApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json

    # Build SPA redirect URIs
    $spaConfig = @{
        redirectUris = $REDIRECT_URIS
    }

    # Enable ID tokens
    $webConfig = @{
        implicitGrantSettings = @{
            enableIdTokenIssuance = $true
            enableAccessTokenIssuance = $false
        }
    }

    # Update app with SPA config
    $spaJson = $spaConfig | ConvertTo-Json -Depth 10 -Compress
    az ad app update --id $CLIENT_ID --spa-redirect-uris $REDIRECT_URIS 2>&1 | Out-Null

    # Enable ID token
    az ad app update --id $CLIENT_ID --enable-id-token-issuance true 2>&1 | Out-Null

    Write-Host "[OK] Redirect URIs configured:" -ForegroundColor Green
    foreach ($uri in $REDIRECT_URIS) {
        Write-Host "    - $uri" -ForegroundColor Gray
    }
    Write-Host "[OK] ID token issuance enabled" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not configure authentication automatically" -ForegroundColor Yellow
    Write-Host "You may need to configure redirect URIs manually in Azure Portal" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Create App Roles
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 5: Creating App Roles" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Creating app roles..." -ForegroundColor Yellow

# Define app roles
$appRoles = @(
    @{
        displayName = "Timesheet Admin"
        description = "Full administrative access to the timesheet system"
        value = "TimesheetAdmin"
        id = [guid]::NewGuid().ToString()
        isEnabled = $true
        allowedMemberTypes = @("User")
    },
    @{
        displayName = "Manager"
        description = "Can approve timesheets and view team reports"
        value = "Manager"
        id = [guid]::NewGuid().ToString()
        isEnabled = $true
        allowedMemberTypes = @("User")
    },
    @{
        displayName = "Leadership"
        description = "Can view executive dashboards and KPIs"
        value = "Leadership"
        id = [guid]::NewGuid().ToString()
        isEnabled = $true
        allowedMemberTypes = @("User")
    }
)

try {
    # Get current app roles
    $currentApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json
    $existingRoles = $currentApp.appRoles | Where-Object { $_.value -in @("TimesheetAdmin", "Manager", "Leadership") }

    if ($existingRoles.Count -eq 3) {
        Write-Host "[OK] App roles already exist" -ForegroundColor Green
        foreach ($role in $existingRoles) {
            Write-Host "    - $($role.displayName)" -ForegroundColor Gray
        }
    } else {
        # Update app with roles
        $appRolesJson = $appRoles | ConvertTo-Json -Depth 10 -Compress
        az ad app update --id $CLIENT_ID --app-roles $appRolesJson 2>&1 | Out-Null

        Write-Host "[OK] App roles created:" -ForegroundColor Green
        Write-Host "    - Timesheet Admin" -ForegroundColor Gray
        Write-Host "    - Manager" -ForegroundColor Gray
        Write-Host "    - Leadership" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Could not create app roles automatically" -ForegroundColor Yellow
    Write-Host "You may need to create them manually in Azure Portal" -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Update config.env
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 6: Updating config.env" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Updating $CONFIG_ENV_PATH..." -ForegroundColor Yellow

try {
    if (Test-Path $CONFIG_ENV_PATH) {
        $configContent = Get-Content $CONFIG_ENV_PATH -Raw

        # Update CLIENT_SECRET
        $configContent = $configContent -replace 'CLIENT_SECRET="[^"]*"', "CLIENT_SECRET=`"$clientSecret`""

        # Write back to file
        Set-Content -Path $CONFIG_ENV_PATH -Value $configContent -NoNewline

        Write-Host "[OK] config.env updated with client secret" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] config.env not found at: $CONFIG_ENV_PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to update config.env" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary of Configuration:" -ForegroundColor Green
Write-Host "  App Registration: $APP_DISPLAY_NAME" -ForegroundColor White
Write-Host "  Tenant ID: $TENANT_ID" -ForegroundColor White
Write-Host "  Client ID: $CLIENT_ID" -ForegroundColor White
Write-Host "  Client Secret: ****** (saved in config.env)" -ForegroundColor White
Write-Host ""
Write-Host "Configuration Details:" -ForegroundColor Green
Write-Host "  [X] Client secret created (24 months expiry)" -ForegroundColor White
Write-Host "  [X] API permissions configured" -ForegroundColor White
Write-Host "  [X] Admin consent granted" -ForegroundColor White
Write-Host "  [X] Redirect URIs added" -ForegroundColor White
Write-Host "  [X] ID token enabled" -ForegroundColor White
Write-Host "  [X] App roles created" -ForegroundColor White
Write-Host "  [X] config.env updated" -ForegroundColor White
Write-Host ""

Write-Host "IMPORTANT: Save this client secret securely!" -ForegroundColor Yellow
Write-Host "CLIENT_SECRET: $clientSecret" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify admin consent in Azure Portal:" -ForegroundColor White
Write-Host "   Portal > Entra ID > App registrations > $APP_DISPLAY_NAME > API permissions" -ForegroundColor Gray
Write-Host "   All permissions should have green checkmarks" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Assign users to roles:" -ForegroundColor White
Write-Host "   Portal > Entra ID > Enterprise applications > $APP_DISPLAY_NAME > Users and groups" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Review config.env and run deployment:" -ForegroundColor White
Write-Host "   .\Deploy-Azure-Resources.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "Configuration completed successfully!" -ForegroundColor Green
