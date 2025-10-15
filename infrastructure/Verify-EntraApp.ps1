###############################################################################
# Verify Entra ID App Registration Configuration
#
# This script checks the current configuration of your Entra ID app registration
# and shows what's missing or needs to be configured.
#
###############################################################################

$CLIENT_ID = "f708cf41-98b6-45a4-a4f9-376c8b16cb0e"
$APP_NAME = "app-MVD-TimeSheetApp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Entra ID App Registration Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    if (-not $account) { throw "Not logged in" }
    Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not logged in to Azure CLI" -ForegroundColor Red
    Write-Host "Run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get app details
Write-Host "Fetching app registration details..." -ForegroundColor Cyan
try {
    $app = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json
    Write-Host "[OK] Found app: $($app.displayName)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Could not find app registration" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Current Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Redirect URIs
Write-Host "1. Redirect URIs (SPA):" -ForegroundColor Yellow
if ($app.spa.redirectUris.Count -gt 0) {
    foreach ($uri in $app.spa.redirectUris) {
        Write-Host "   [OK] $uri" -ForegroundColor Green
    }
} else {
    Write-Host "   [MISSING] No SPA redirect URIs configured" -ForegroundColor Red
}

# Check Web Redirect URIs
if ($app.web.redirectUris.Count -gt 0) {
    Write-Host "   Web redirect URIs (should be SPA):" -ForegroundColor Yellow
    foreach ($uri in $app.web.redirectUris) {
        Write-Host "   [WARNING] $uri (should be moved to SPA)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Check ID Token
Write-Host "2. ID Token Issuance:" -ForegroundColor Yellow
if ($app.web.implicitGrantSettings.enableIdTokenIssuance) {
    Write-Host "   [OK] ID tokens enabled" -ForegroundColor Green
} else {
    Write-Host "   [MISSING] ID tokens not enabled" -ForegroundColor Red
}

Write-Host ""

# Check API Permissions
Write-Host "3. API Permissions:" -ForegroundColor Yellow

$requiredPermissions = @{
    "e1fe6dd8-ba31-4d61-89e7-88639da4683d" = "User.Read (Delegated)"
    "b340eb25-3456-403f-be2f-af7a0d370277" = "User.ReadBasic.All (Delegated)"
    "7427e0e9-2fba-42fe-b0c0-848c9e6a8182" = "offline_access (Delegated)"
    "7ab1d382-f21e-4acd-a863-ba3e13f7da61" = "Directory.Read.All (Application)"
    "df021288-bdef-4463-88db-98f22de89214" = "User.Read.All (Application)"
}

$graphPermissions = $app.requiredResourceAccess | Where-Object { $_.resourceAppId -eq "00000003-0000-0000-c000-000000000000" }

if ($graphPermissions) {
    $configuredPermissions = $graphPermissions.resourceAccess | ForEach-Object { $_.id }

    foreach ($permId in $requiredPermissions.Keys) {
        if ($configuredPermissions -contains $permId) {
            Write-Host "   [OK] $($requiredPermissions[$permId])" -ForegroundColor Green
        } else {
            Write-Host "   [MISSING] $($requiredPermissions[$permId])" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [MISSING] No Microsoft Graph permissions configured" -ForegroundColor Red
}

Write-Host ""

# Check Admin Consent
Write-Host "4. Admin Consent Status:" -ForegroundColor Yellow
try {
    $sp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    if ($sp) {
        Write-Host "   [OK] Service principal exists" -ForegroundColor Green
        Write-Host "   [INFO] Check Azure Portal for admin consent status" -ForegroundColor Yellow
    } else {
        Write-Host "   [WARNING] Service principal not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARNING] Could not verify service principal" -ForegroundColor Yellow
}

Write-Host ""

# Check App Roles
Write-Host "5. App Roles:" -ForegroundColor Yellow

$requiredRoles = @("TimesheetAdmin", "Manager", "Leadership")

if ($app.appRoles.Count -gt 0) {
    $configuredRoles = $app.appRoles | Where-Object { $_.value -in $requiredRoles }

    foreach ($roleName in $requiredRoles) {
        $role = $configuredRoles | Where-Object { $_.value -eq $roleName }
        if ($role) {
            Write-Host "   [OK] $($role.displayName) ($($role.value))" -ForegroundColor Green
        } else {
            Write-Host "   [MISSING] $roleName" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [MISSING] No app roles configured" -ForegroundColor Red
}

Write-Host ""

# Check Client Secrets
Write-Host "6. Client Secrets:" -ForegroundColor Yellow
if ($app.passwordCredentials.Count -gt 0) {
    foreach ($cred in $app.passwordCredentials) {
        $expiryDate = [DateTime]::Parse($cred.endDateTime)
        $daysUntilExpiry = ($expiryDate - (Get-Date)).Days

        if ($daysUntilExpiry -gt 30) {
            Write-Host "   [OK] Secret: $($cred.displayName) (expires: $($expiryDate.ToString('yyyy-MM-dd')))" -ForegroundColor Green
        } elseif ($daysUntilExpiry -gt 0) {
            Write-Host "   [WARNING] Secret: $($cred.displayName) (expires soon: $($expiryDate.ToString('yyyy-MM-dd')))" -ForegroundColor Yellow
        } else {
            Write-Host "   [EXPIRED] Secret: $($cred.displayName) (expired: $($expiryDate.ToString('yyyy-MM-dd')))" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [MISSING] No client secrets configured" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run Configure-EntraApp.ps1 to automatically fix any missing items" -ForegroundColor Yellow
Write-Host ""
