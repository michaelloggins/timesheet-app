###############################################################################
# Create Enterprise Application (Service Principal)
#
# This script creates the Enterprise Application (Service Principal) for your
# App Registration and shows where to find it in Azure Portal.
#
# The Enterprise Application is required for:
#   - User and group assignments
#   - Role assignments
#   - Single sign-on configuration
#   - Admin consent workflows
#
###############################################################################

$CLIENT_ID = "e95e04f7-a47c-4552-924b-aed3b6654057"
$APP_NAME = "app-MVD-TimeSheetApp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create Enterprise Application" -ForegroundColor Cyan
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

# Check if App Registration exists
Write-Host "Verifying App Registration..." -ForegroundColor Cyan
try {
    $app = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    Write-Host "[OK] App Registration found: $($app.displayName)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] App Registration not found with Client ID: $CLIENT_ID" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if Service Principal (Enterprise App) already exists
Write-Host "Checking for existing Enterprise Application..." -ForegroundColor Cyan
try {
    $sp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if ($sp) {
        Write-Host "[OK] Enterprise Application already exists!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Enterprise Application Details:" -ForegroundColor Yellow
        Write-Host "  Display Name: $($sp.displayName)" -ForegroundColor Gray
        Write-Host "  Object ID: $($sp.id)" -ForegroundColor Gray
        Write-Host "  App ID: $($sp.appId)" -ForegroundColor Gray
        Write-Host "  Service Principal Type: $($sp.servicePrincipalType)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Where to find it in Azure Portal:" -ForegroundColor Cyan
        Write-Host "  1. Go to: https://portal.azure.com" -ForegroundColor Gray
        Write-Host "  2. Navigate to: Entra ID > Enterprise applications" -ForegroundColor Gray
        Write-Host "  3. Search for: $APP_NAME" -ForegroundColor Gray
        Write-Host "  4. Click on it to manage users and roles" -ForegroundColor Gray
        Write-Host ""
        exit 0
    }
} catch {
    Write-Host "[INFO] Enterprise Application does not exist yet" -ForegroundColor Yellow
}

Write-Host ""

# Create Service Principal
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Enterprise Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating Service Principal..." -ForegroundColor Yellow

try {
    $newSp = az ad sp create --id $CLIENT_ID --output json | ConvertFrom-Json

    Write-Host "[OK] Enterprise Application created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Enterprise Application Details:" -ForegroundColor Green
    Write-Host "  Display Name: $($newSp.displayName)" -ForegroundColor White
    Write-Host "  Object ID: $($newSp.id)" -ForegroundColor White
    Write-Host "  App ID: $($newSp.appId)" -ForegroundColor White
    Write-Host ""

    # Wait for propagation
    Write-Host "Waiting for propagation..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

} catch {
    Write-Host "[ERROR] Failed to create Enterprise Application" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# Show where to find it
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Where to Find Your Enterprise App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Azure Portal Navigation:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
Write-Host ""
Write-Host "2. Navigate to: Microsoft Entra ID" -ForegroundColor White
Write-Host "   (Search for 'Entra ID' at the top)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. In left sidebar, click: Enterprise applications" -ForegroundColor White
Write-Host ""
Write-Host "4. In the search box, type: $APP_NAME" -ForegroundColor White
Write-Host "   Or search by App ID: $CLIENT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Click on: $APP_NAME" -ForegroundColor White
Write-Host ""
Write-Host "6. Now you can:" -ForegroundColor White
Write-Host "   - Click 'Users and groups' to assign users" -ForegroundColor Gray
Write-Host "   - Assign users to app roles (Admin, Manager, Leadership)" -ForegroundColor Gray
Write-Host "   - View sign-in logs" -ForegroundColor Gray
Write-Host "   - Configure single sign-on settings" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps: Assign Users to Roles" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To assign users to app roles:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. In Enterprise application page, click 'Users and groups'" -ForegroundColor White
Write-Host ""
Write-Host "2. Click '+ Add user/group'" -ForegroundColor White
Write-Host ""
Write-Host "3. Under 'Users', click 'None Selected'" -ForegroundColor White
Write-Host ""
Write-Host "4. Search for and select a user (e.g., yourself)" -ForegroundColor White
Write-Host ""
Write-Host "5. Click 'Select'" -ForegroundColor White
Write-Host ""
Write-Host "6. Under 'Select a role', click 'None Selected'" -ForegroundColor White
Write-Host ""
Write-Host "7. Choose a role:" -ForegroundColor White
Write-Host "   - Timesheet Admin (for administrators)" -ForegroundColor Gray
Write-Host "   - Manager (for timesheet approvers)" -ForegroundColor Gray
Write-Host "   - Leadership (for executives)" -ForegroundColor Gray
Write-Host ""
Write-Host "8. Click 'Select'" -ForegroundColor White
Write-Host ""
Write-Host "9. Click 'Assign'" -ForegroundColor White
Write-Host ""

Write-Host "Repeat for all users who need access to the application." -ForegroundColor Yellow
Write-Host ""

Write-Host "Enterprise Application created successfully!" -ForegroundColor Green
Write-Host ""

# Optional: Try to grant admin consent if not already done
Write-Host "Would you like to grant admin consent now? (y/n): " -ForegroundColor Yellow -NoNewline
$grantConsent = Read-Host

if ($grantConsent -eq 'y') {
    Write-Host ""
    Write-Host "Granting admin consent..." -ForegroundColor Yellow

    try {
        az ad app permission admin-consent --id $CLIENT_ID 2>&1 | Out-Null
        Write-Host "[OK] Admin consent granted!" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Could not grant admin consent automatically" -ForegroundColor Yellow
        Write-Host "You may need to grant it manually in the portal:" -ForegroundColor Yellow
        Write-Host "  App registrations > $APP_NAME > API permissions > Grant admin consent" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
