
###############################################################################
# Fix SPA Platform Configuration
#
# This script adds the SPA platform and redirect URIs to your app registration
#
###############################################################################

$CLIENT_ID = "e95e04f7-a47c-4552-924b-aed3b6654057"
$APP_NAME = "app-MVD-TimeSheetApp"

# Redirect URIs for SPA
$REDIRECT_URIS = @(
    "https://app-MVD-TimeSheet-timesheet.azurewebsites.net",
    "http://localhost:5173"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix SPA Platform Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App: $APP_NAME" -ForegroundColor Yellow
Write-Host "Client ID: $CLIENT_ID" -ForegroundColor Yellow
Write-Host ""

# Check login
try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not logged in. Run: az login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Get current configuration
Write-Host "Checking current configuration..." -ForegroundColor Cyan
try {
    $app = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json

    Write-Host "Current SPA redirect URIs: $($app.spa.redirectUris.Count)" -ForegroundColor Yellow
    if ($app.spa.redirectUris.Count -gt 0) {
        foreach ($uri in $app.spa.redirectUris) {
            Write-Host "  - $uri" -ForegroundColor Gray
        }
    } else {
        Write-Host "  (none configured)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Current Web redirect URIs: $($app.web.redirectUris.Count)" -ForegroundColor Yellow
    if ($app.web.redirectUris.Count -gt 0) {
        foreach ($uri in $app.web.redirectUris) {
            Write-Host "  - $uri" -ForegroundColor Gray
        }
    } else {
        Write-Host "  (none configured)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "ID Token Issuance: $($app.web.implicitGrantSettings.enableIdTokenIssuance)" -ForegroundColor Yellow

} catch {
    Write-Host "[ERROR] Could not retrieve app configuration" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Configure SPA platform
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuring SPA Platform" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setting SPA redirect URIs..." -ForegroundColor Yellow

try {
    # Method 1: Using az ad app update with spa-redirect-uris
    az ad app update --id $CLIENT_ID --spa-redirect-uris $REDIRECT_URIS[0] $REDIRECT_URIS[1] 2>&1 | Out-Null

    Write-Host "[OK] SPA redirect URIs configured:" -ForegroundColor Green
    foreach ($uri in $REDIRECT_URIS) {
        Write-Host "    - $uri" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to configure SPA URIs using method 1" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow

    # Method 2: Using manifest update
    try {
        $manifest = @{
            spa = @{
                redirectUris = $REDIRECT_URIS
            }
        }

        $manifestPath = "$env:TEMP\spa-manifest-$CLIENT_ID.json"
        $manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $manifestPath -Encoding utf8

        # This won't work with az ad app update, but we can show the user what to do
        Write-Host "[INFO] Please manually add the SPA platform in Azure Portal:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Go to Azure Portal > Entra ID > App registrations" -ForegroundColor White
        Write-Host "2. Click on: $APP_NAME" -ForegroundColor White
        Write-Host "3. Click: Authentication (left sidebar)" -ForegroundColor White
        Write-Host "4. Under 'Platform configurations', click: + Add a platform" -ForegroundColor White
        Write-Host "5. Select: Single-page application" -ForegroundColor White
        Write-Host "6. Add these Redirect URIs:" -ForegroundColor White
        foreach ($uri in $REDIRECT_URIS) {
            Write-Host "   $uri" -ForegroundColor Cyan
        }
        Write-Host "7. Check: ID tokens (used for implicit and hybrid flows)" -ForegroundColor White
        Write-Host "8. Click: Configure" -ForegroundColor White

        Remove-Item $manifestPath -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[ERROR] Alternative method also failed" -ForegroundColor Red
    }
}

Write-Host ""

# Enable ID tokens
Write-Host "Enabling ID token issuance..." -ForegroundColor Yellow

try {
    az ad app update --id $CLIENT_ID --enable-id-token-issuance true 2>&1 | Out-Null
    Write-Host "[OK] ID token issuance enabled" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to enable ID tokens" -ForegroundColor Red
}

Write-Host ""

# Verify final configuration
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

try {
    $finalApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json

    Write-Host "Final Configuration:" -ForegroundColor Green
    Write-Host ""

    Write-Host "SPA Redirect URIs: $($finalApp.spa.redirectUris.Count)" -ForegroundColor White
    if ($finalApp.spa.redirectUris.Count -gt 0) {
        foreach ($uri in $finalApp.spa.redirectUris) {
            Write-Host "  ✓ $uri" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ No SPA redirect URIs configured!" -ForegroundColor Red
        Write-Host "    You need to add them manually (see instructions above)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Web Redirect URIs: $($finalApp.web.redirectUris.Count)" -ForegroundColor White
    if ($finalApp.web.redirectUris.Count -gt 0) {
        foreach ($uri in $finalApp.web.redirectUris) {
            Write-Host "  ! $uri (should be moved to SPA)" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    $idTokenStatus = if ($finalApp.web.implicitGrantSettings.enableIdTokenIssuance) { "✓ Enabled" } else { "✗ Disabled" }
    Write-Host "ID Token Issuance: $idTokenStatus" -ForegroundColor White

} catch {
    Write-Host "[WARNING] Could not verify final configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Configuration update complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Please verify in Azure Portal:" -ForegroundColor Cyan
Write-Host "  Portal > Entra ID > App registrations > $APP_NAME > Authentication" -ForegroundColor Gray
Write-Host ""
