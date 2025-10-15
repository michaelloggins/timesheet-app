###############################################################################
# Configure Entra ID App Registration (Version 2 - Improved)
#
# This improved version uses manifest files and better error handling to ensure
# all configurations are properly applied.
#
# Prerequisites:
#   - Azure CLI installed (az)
#   - Logged in to Azure (az login)
#   - Application Administrator or Global Administrator role
#
# Usage:
#   .\Configure-EntraApp-v2.ps1
#
###############################################################################

[CmdletBinding()]
param(
    [switch]$SkipSecretCreation = $false
)

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
Write-Host "Entra ID App Configuration (v2)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "[OK] Azure CLI version $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Azure CLI is not installed" -ForegroundColor Red
    exit 1
}

try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not logged in to Azure CLI. Run: az login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify app exists
Write-Host "Verifying app registration..." -ForegroundColor Cyan
try {
    $app = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json
    Write-Host "[OK] Found app: $($app.displayName)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] App not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Client Secret
$clientSecret = $null
if (-not $SkipSecretCreation) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 1: Client Secret" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $createSecret = Read-Host "Do you want to create a NEW client secret? (y/n)"

    if ($createSecret -eq 'y') {
        $secretName = "Production Secret - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "Creating client secret..." -ForegroundColor Yellow

        try {
            $secretResult = az ad app credential reset --id $CLIENT_ID --append --display-name $secretName --years 2 --output json | ConvertFrom-Json
            $clientSecret = $secretResult.password

            Write-Host "[OK] Client secret created!" -ForegroundColor Green
            Write-Host ""
            Write-Host "CLIENT SECRET (save this now!):" -ForegroundColor Yellow -BackgroundColor Red
            Write-Host $clientSecret -ForegroundColor White
            Write-Host ""

            $null = Read-Host "Press Enter after you've saved the secret"
        } catch {
            Write-Host "[ERROR] Failed to create secret: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "[SKIPPED] Using existing client secret" -ForegroundColor Yellow
    }

    Write-Host ""
}

# API Permissions - Using direct API calls for better reliability
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: API Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Configuring Microsoft Graph permissions..." -ForegroundColor Yellow

$graphApiId = "00000003-0000-0000-c000-000000000000"

# Define required permissions
$requiredResourceAccess = @{
    resourceAppId = $graphApiId
    resourceAccess = @(
        @{ id = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"; type = "Scope" }    # User.Read
        @{ id = "b340eb25-3456-403f-be2f-af7a0d370277"; type = "Scope" }    # User.ReadBasic.All
        @{ id = "7427e0e9-2fba-42fe-b0c0-848c9e6a8182"; type = "Scope" }    # offline_access
        @{ id = "7ab1d382-f21e-4acd-a863-ba3e13f7da61"; type = "Role" }     # Directory.Read.All
        @{ id = "df021288-bdef-4463-88db-98f22de89214"; type = "Role" }     # User.Read.All
    )
}

# Convert to JSON and save to temp file
$manifestPath = "$env:TEMP\app-permissions-$CLIENT_ID.json"
"[$($requiredResourceAccess | ConvertTo-Json -Depth 10 -Compress)]" | Out-File -FilePath $manifestPath -Encoding utf8 -NoNewline

try {
    az ad app update --id $CLIENT_ID --required-resource-accesses "@$manifestPath" 2>&1 | Out-Null

    Write-Host "[OK] Permissions configured:" -ForegroundColor Green
    Write-Host "    - User.Read (Delegated)" -ForegroundColor Gray
    Write-Host "    - User.ReadBasic.All (Delegated)" -ForegroundColor Gray
    Write-Host "    - offline_access (Delegated)" -ForegroundColor Gray
    Write-Host "    - Directory.Read.All (Application)" -ForegroundColor Gray
    Write-Host "    - User.Read.All (Application)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to configure permissions" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Remove-Item $manifestPath -ErrorAction SilentlyContinue

Write-Host ""

# Admin Consent
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Admin Consent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Granting admin consent..." -ForegroundColor Yellow

try {
    # Ensure service principal exists
    $sp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if (-not $sp) {
        Write-Host "Creating service principal..." -ForegroundColor Yellow
        az ad sp create --id $CLIENT_ID 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }

    # Grant admin consent
    az ad app permission admin-consent --id $CLIENT_ID 2>&1 | Out-Null
    Write-Host "[OK] Admin consent granted" -ForegroundColor Green
    Write-Host "    Waiting for propagation..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
} catch {
    Write-Host "[WARNING] Could not grant admin consent automatically" -ForegroundColor Yellow
    Write-Host "    You must manually grant consent in Azure Portal:" -ForegroundColor Yellow
    Write-Host "    Portal > Entra ID > App registrations > $APP_DISPLAY_NAME > API permissions" -ForegroundColor Gray
    Write-Host "    Click 'Grant admin consent for [Your Organization]'" -ForegroundColor Gray
}

Write-Host ""

# Redirect URIs
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Redirect URIs (SPA)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Configuring redirect URIs..." -ForegroundColor Yellow

try {
    # Set SPA redirect URIs
    $uriArgs = $REDIRECT_URIS | ForEach-Object { $_ }
    az ad app update --id $CLIENT_ID --spa-redirect-uris @uriArgs 2>&1 | Out-Null

    Write-Host "[OK] SPA redirect URIs configured:" -ForegroundColor Green
    foreach ($uri in $REDIRECT_URIS) {
        Write-Host "    - $uri" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to configure redirect URIs" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""

# ID Token
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 5: ID Token Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Enabling ID token issuance..." -ForegroundColor Yellow

try {
    az ad app update --id $CLIENT_ID --enable-id-token-issuance true 2>&1 | Out-Null
    Write-Host "[OK] ID token issuance enabled" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to enable ID tokens" -ForegroundColor Red
}

Write-Host ""

# App Roles
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 6: App Roles" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Configuring app roles..." -ForegroundColor Yellow

# Check current roles
$currentApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json
$existingRoles = @($currentApp.appRoles | Where-Object { $_.value -in @("TimesheetAdmin", "Manager", "Leadership") })

if ($existingRoles.Count -eq 3) {
    Write-Host "[OK] App roles already exist:" -ForegroundColor Green
    foreach ($role in $existingRoles) {
        Write-Host "    - $($role.displayName) ($($role.value))" -ForegroundColor Gray
    }
} else {
    # Preserve existing roles and add new ones
    $allRoles = @($currentApp.appRoles)

    # Remove any existing partial roles
    $allRoles = $allRoles | Where-Object { $_.value -notin @("TimesheetAdmin", "Manager", "Leadership") }

    # Add our required roles
    $newRoles = @(
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

    $allRoles += $newRoles

    # Save to temp file
    $rolesPath = "$env:TEMP\app-roles-$CLIENT_ID.json"
    $allRoles | ConvertTo-Json -Depth 10 | Out-File -FilePath $rolesPath -Encoding utf8

    try {
        az ad app update --id $CLIENT_ID --app-roles "@$rolesPath" 2>&1 | Out-Null

        Write-Host "[OK] App roles created:" -ForegroundColor Green
        Write-Host "    - Timesheet Admin (TimesheetAdmin)" -ForegroundColor Gray
        Write-Host "    - Manager (Manager)" -ForegroundColor Gray
        Write-Host "    - Leadership (Leadership)" -ForegroundColor Gray
    } catch {
        Write-Host "[ERROR] Failed to create app roles" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }

    Remove-Item $rolesPath -ErrorAction SilentlyContinue
}

Write-Host ""

# Update config.env
if ($clientSecret) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Step 7: Update config.env" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "Updating config.env file..." -ForegroundColor Yellow

    try {
        if (Test-Path $CONFIG_ENV_PATH) {
            $configContent = Get-Content $CONFIG_ENV_PATH -Raw
            $configContent = $configContent -replace 'CLIENT_SECRET="[^"]*"', "CLIENT_SECRET=`"$clientSecret`""
            Set-Content -Path $CONFIG_ENV_PATH -Value $configContent -NoNewline

            Write-Host "[OK] config.env updated with new secret" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] config.env not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Failed to update config.env" -ForegroundColor Red
    }

    Write-Host ""
}

# Final Verification
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$finalApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json

Write-Host ""
Write-Host "Current Configuration:" -ForegroundColor Green

# Check SPA redirects
Write-Host "  SPA Redirect URIs: $($finalApp.spa.redirectUris.Count) configured" -ForegroundColor White
foreach ($uri in $finalApp.spa.redirectUris) {
    Write-Host "    - $uri" -ForegroundColor Gray
}

# Check ID token
$idTokenStatus = if ($finalApp.web.implicitGrantSettings.enableIdTokenIssuance) { "Enabled" } else { "Disabled" }
Write-Host "  ID Token Issuance: $idTokenStatus" -ForegroundColor White

# Check permissions
$graphPerms = $finalApp.requiredResourceAccess | Where-Object { $_.resourceAppId -eq $graphApiId }
Write-Host "  API Permissions: $($graphPerms.resourceAccess.Count) configured" -ForegroundColor White

# Check app roles
$configuredRoles = @($finalApp.appRoles | Where-Object { $_.value -in @("TimesheetAdmin", "Manager", "Leadership") })
Write-Host "  App Roles: $($configuredRoles.Count) configured" -ForegroundColor White

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($clientSecret) {
    Write-Host "NEW CLIENT SECRET:" -ForegroundColor Yellow -BackgroundColor Red
    Write-Host $clientSecret -ForegroundColor White
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verify in Azure Portal:" -ForegroundColor White
Write-Host "   Portal > Entra ID > App registrations > $APP_DISPLAY_NAME" -ForegroundColor Gray
Write-Host "   - API permissions should have green checkmarks" -ForegroundColor Gray
Write-Host "   - Authentication should show 2 SPA redirect URIs" -ForegroundColor Gray
Write-Host "   - App roles should show 3 roles" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Assign users to roles:" -ForegroundColor White
Write-Host "   Portal > Entra ID > Enterprise applications > $APP_DISPLAY_NAME" -ForegroundColor Gray
Write-Host "   - Click 'Users and groups'" -ForegroundColor Gray
Write-Host "   - Add users and assign them appropriate roles" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Proceed with deployment:" -ForegroundColor White
Write-Host "   .\Deploy-Azure-Resources.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "Configuration script completed!" -ForegroundColor Green
