# Setup Azure AD API Scope for Timesheet App
# This script helps configure the Azure AD app registration to expose an API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure AD API Scope Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$appId = "b9d05b88-ac4e-4f8b-b469-5147969c24ed"
$tenantId = "cda163bf-8f9c-4f6c-98ee-be043aa96eef"

Write-Host "App Registration ID: $appId" -ForegroundColor Yellow
Write-Host "Tenant ID: $tenantId" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Get App Object ID" -ForegroundColor Green
Write-Host "Running: az ad app show --id $appId --query id -o tsv" -ForegroundColor Gray

try {
    $objectId = az ad app show --id $appId --query id -o tsv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to get app object ID. Make sure you're logged in with 'az login'" -ForegroundColor Red
        exit 1
    }
    Write-Host "Object ID: $objectId" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Check current API configuration" -ForegroundColor Green
$currentApi = az ad app show --id $appId --query identifierUris -o json | ConvertFrom-Json

if ($currentApi -and $currentApi.Count -gt 0) {
    Write-Host "Current Application ID URI: $($currentApi[0])" -ForegroundColor Yellow
    Write-Host "API is already exposed!" -ForegroundColor Green
} else {
    Write-Host "No Application ID URI set. Setting it now..." -ForegroundColor Yellow

    Write-Host "Running: az ad app update --id $appId --identifier-uris api://$appId" -ForegroundColor Gray
    az ad app update --id $appId --identifier-uris "api://$appId"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to set Application ID URI" -ForegroundColor Red
        exit 1
    }
    Write-Host "Application ID URI set to: api://$appId" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 3: Add OAuth2 Permission Scope" -ForegroundColor Green
Write-Host "Creating 'access_as_user' scope..." -ForegroundColor Yellow

# Create the scope JSON
$scopeJson = @{
    oauth2PermissionScopes = @(
        @{
            id = (New-Guid).ToString()
            adminConsentDescription = "Allows the app to access timesheet data on behalf of the signed-in user"
            adminConsentDisplayName = "Access timesheet app"
            isEnabled = $true
            type = "User"
            userConsentDescription = "Allows the app to access your timesheet data"
            userConsentDisplayName = "Access your timesheet data"
            value = "access_as_user"
        }
    )
} | ConvertTo-Json -Depth 5

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$scopeJson | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Running: az ad app update --id $appId --set api=@$tempFile" -ForegroundColor Gray
az ad app update --id $appId --set "api=@$tempFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "OAuth2 permission scope 'access_as_user' added successfully!" -ForegroundColor Green
} else {
    Write-Host "Note: Scope may already exist or there was an error." -ForegroundColor Yellow
}

# Clean up temp file
Remove-Item $tempFile -ErrorAction SilentlyContinue
Write-Host ""

Write-Host "Step 4: Verify API Configuration" -ForegroundColor Green
$api = az ad app show --id $appId --query "api.oauth2PermissionScopes" -o json | ConvertFrom-Json

if ($api -and $api.Count -gt 0) {
    Write-Host "✓ API Scopes configured:" -ForegroundColor Green
    foreach ($scope in $api) {
        Write-Host "  - $($scope.value): $($scope.adminConsentDisplayName)" -ForegroundColor Cyan
    }
} else {
    Write-Host "Warning: No scopes found. You may need to configure this manually." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your frontend dev server (Ctrl+C and npm run dev:frontend)" -ForegroundColor White
Write-Host "2. Clear browser cache and localStorage" -ForegroundColor White
Write-Host "3. Sign out and sign back in" -ForegroundColor White
Write-Host "4. The API calls should now work!" -ForegroundColor White
Write-Host ""
Write-Host "If you still see errors, you may need to:" -ForegroundColor Yellow
Write-Host "- Grant admin consent in Azure Portal" -ForegroundColor White
Write-Host "- Add the API permission in 'API permissions' section" -ForegroundColor White
Write-Host ""
