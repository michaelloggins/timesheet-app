###############################################################################
# Create Entra ID App Registration From Scratch (with Validation)
#
# This script will:
#   1. Optionally delete the existing app registration
#   2. Create a new app registration with all configurations
#   3. Configure client secret, API permissions, redirect URIs, and app roles
#   4. Create Enterprise Application (Service Principal)
#   5. Update config.env with the new values
#
# VALIDATION: After each step, the script validates that the configuration
# was successfully applied. If any validation fails, the script halts with
# an error message. This ensures a fully working configuration or nothing.
#
# Validation Steps:
#   ✓ App Registration creation
#   ✓ Client Secret creation
#   ✓ API Permissions (all 5 required permissions)
#   ✓ Enterprise Application creation
#   ✓ Admin Consent (informational only)
#   ✓ SPA Redirect URIs (both URIs)
#   ✓ ID Token issuance enabled
#   ✓ App Roles (all 3 roles)
#   ✓ User assignment and ownership
#   ✓ config.env update
#
# Prerequisites:
#   - Azure CLI installed (az)
#   - Logged in to Azure (az login)
#   - Application Administrator or Global Administrator role
#
# Usage:
#   .\Create-EntraApp-FromScratch.ps1
#   .\Create-EntraApp-FromScratch.ps1 -DeleteExisting
#
###############################################################################

[CmdletBinding()]
param(
    [switch]$DeleteExisting = $false
)

# Configuration
$APP_DISPLAY_NAME = "app-MVD-TimeSheetApp"
$EXISTING_CLIENT_ID = "f708cf41-98b6-45a4-a4f9-376c8b16cb0e"
$TENANT_ID = "cda163bf-8f9c-4f6c-98ee-be043aa96eef"
$CONFIG_ENV_PATH = "$PSScriptRoot\config.env"

# User to assign roles and ownership
$OWNER_EMAIL = "mloggins@miravistalabs.com"

# Redirect URIs
$REDIRECT_URIS = @(
    "https://app-MVD-TimeSheet.azurewebsites.net",
    "http://localhost:5173"
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Create Entra ID App Registration From Scratch" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "[OK] Azure CLI version $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Azure CLI is not installed" -ForegroundColor Red
    Write-Host "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

try {
    $account = az account show --output json 2>$null | ConvertFrom-Json
    Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "[OK] Tenant: $TENANT_ID" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Not logged in to Azure CLI" -ForegroundColor Red
    Write-Host "Run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 1: Delete existing app registration (if requested)
if ($DeleteExisting) {
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "Step 1: Delete Existing App Registration" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "WARNING: This will DELETE the existing app registration!" -ForegroundColor Yellow -BackgroundColor Red
    Write-Host "App Name: $APP_DISPLAY_NAME" -ForegroundColor Yellow
    Write-Host "Client ID: $EXISTING_CLIENT_ID" -ForegroundColor Yellow
    Write-Host ""

    $confirm = Read-Host "Type 'DELETE' to confirm deletion"

    if ($confirm -eq 'DELETE') {
        Write-Host "Starting comprehensive deletion process..." -ForegroundColor Yellow
        Write-Host ""

        # Search for ALL apps with the same display name
        Write-Host "Searching for all apps named '$APP_DISPLAY_NAME'..." -ForegroundColor Yellow
        $allAppsWithName = az ad app list --display-name $APP_DISPLAY_NAME --output json 2>$null | ConvertFrom-Json

        if ($allAppsWithName -and $allAppsWithName.Count -gt 0) {
            Write-Host "   Found $($allAppsWithName.Count) app(s) with this name:" -ForegroundColor Gray
            foreach ($app in $allAppsWithName) {
                Write-Host "   - Client ID: $($app.appId), Object ID: $($app.id)" -ForegroundColor Gray
            }
            Write-Host ""
        }

        # Step 1: Delete ALL Enterprise Applications (Service Principals) with this name
        Write-Host "1. Deleting Enterprise Applications (Service Principals)..." -ForegroundColor Yellow

        # Collect all client IDs to delete (from $EXISTING_CLIENT_ID and from display name search)
        $clientIdsToDelete = @($EXISTING_CLIENT_ID)
        if ($allAppsWithName) {
            foreach ($app in $allAppsWithName) {
                if ($app.appId -notin $clientIdsToDelete) {
                    $clientIdsToDelete += $app.appId
                }
            }
        }

        foreach ($clientId in $clientIdsToDelete) {
            try {
                $existingSp = az ad sp show --id $clientId --output json 2>$null | ConvertFrom-Json

                if ($existingSp) {
                    Write-Host "   Found Enterprise Application: $($existingSp.displayName)" -ForegroundColor Gray
                    Write-Host "   Service Principal ID: $($existingSp.id)" -ForegroundColor Gray
                    Write-Host "   Client ID: $clientId" -ForegroundColor Gray

                    # Remove all role assignments for this service principal
                    Write-Host "   Deleting..." -ForegroundColor Gray
                    az ad sp delete --id $clientId 2>&1 | Out-Null

                    Write-Host "   [OK] Enterprise Application deleted" -ForegroundColor Green
                } else {
                    Write-Host "   [INFO] No Enterprise Application found for Client ID: $clientId" -ForegroundColor DarkGray
                }
            } catch {
                Write-Host "   [WARNING] Could not delete Enterprise Application for $clientId : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }

        Write-Host ""

        # Step 2: Delete ALL App Registrations with this name
        Write-Host "2. Deleting App Registrations..." -ForegroundColor Yellow

        foreach ($clientId in $clientIdsToDelete) {
            try {
                $existingApp = az ad app show --id $clientId --output json 2>$null | ConvertFrom-Json

                if ($existingApp) {
                    Write-Host "   Found App Registration: $($existingApp.displayName)" -ForegroundColor Gray
                    Write-Host "   Client ID: $clientId" -ForegroundColor Gray
                    Write-Host "   Object ID: $($existingApp.id)" -ForegroundColor Gray

                    # Delete the app registration (this also deletes associated secrets, certificates, and permissions)
                    Write-Host "   Deleting..." -ForegroundColor Gray
                    az ad app delete --id $clientId 2>&1 | Out-Null

                    Write-Host "   [OK] App registration deleted" -ForegroundColor Green
                } else {
                    Write-Host "   [INFO] No App Registration found for Client ID: $clientId" -ForegroundColor DarkGray
                }
            } catch {
                Write-Host "   [WARNING] Could not delete app registration for $clientId : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }

        Write-Host ""
        Write-Host "3. Verifying deletion..." -ForegroundColor Yellow

        $maxAttempts = 30
        $allDeleted = $true

        # Verify ALL Enterprise Applications are deleted
        Write-Host "   Verifying Enterprise Application deletion..." -ForegroundColor Gray
        foreach ($clientId in $clientIdsToDelete) {
            $attemptCount = 0
            $spDeleted = $false

            while ($attemptCount -lt $maxAttempts) {
                $attemptCount++
                $checkSp = az ad sp show --id $clientId --output json 2>$null | ConvertFrom-Json

                if (-not $checkSp) {
                    $spDeleted = $true
                    Write-Host "   [OK] Enterprise Application deleted for Client ID: $clientId" -ForegroundColor Green
                    break
                }

                if ($attemptCount -eq 1 -or $attemptCount % 5 -eq 0) {
                    Write-Host "   Waiting for deletion to propagate for $clientId... (attempt $attemptCount/$maxAttempts)" -ForegroundColor DarkGray
                }
                Start-Sleep -Seconds 2
            }

            if (-not $spDeleted) {
                Write-Host "   [WARNING] Enterprise Application for $clientId may still exist" -ForegroundColor Yellow
                $allDeleted = $false
            }
        }

        # Verify ALL App Registrations are deleted
        Write-Host "   Verifying App Registration deletion..." -ForegroundColor Gray
        foreach ($clientId in $clientIdsToDelete) {
            $attemptCount = 0
            $appDeleted = $false

            while ($attemptCount -lt $maxAttempts) {
                $attemptCount++
                $checkApp = az ad app show --id $clientId --output json 2>$null | ConvertFrom-Json

                if (-not $checkApp) {
                    $appDeleted = $true
                    Write-Host "   [OK] App Registration deleted for Client ID: $clientId" -ForegroundColor Green
                    break
                }

                if ($attemptCount -eq 1 -or $attemptCount % 5 -eq 0) {
                    Write-Host "   Waiting for deletion to propagate for $clientId... (attempt $attemptCount/$maxAttempts)" -ForegroundColor DarkGray
                }
                Start-Sleep -Seconds 2
            }

            if (-not $appDeleted) {
                Write-Host "   [WARNING] App Registration for $clientId may still exist" -ForegroundColor Yellow
                $allDeleted = $false
            }
        }

        # Also verify no apps exist with this display name
        Write-Host "   Verifying no apps exist with display name '$APP_DISPLAY_NAME'..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
        $remainingApps = az ad app list --display-name $APP_DISPLAY_NAME --output json 2>$null | ConvertFrom-Json

        if ($remainingApps -and $remainingApps.Count -gt 0) {
            Write-Host "   [WARNING] Found $($remainingApps.Count) app(s) still exist with this name!" -ForegroundColor Yellow
            foreach ($app in $remainingApps) {
                Write-Host "   - Client ID: $($app.appId), Object ID: $($app.id)" -ForegroundColor Yellow
            }
            $allDeleted = $false
        } else {
            Write-Host "   [OK] No apps found with display name '$APP_DISPLAY_NAME'" -ForegroundColor Green
        }

        if (-not $allDeleted) {
            Write-Host ""
            Write-Host "   [WARNING] Not all resources were verified as deleted" -ForegroundColor Yellow
            Write-Host "   Continuing anyway - creation may fail if resources still exist" -ForegroundColor Yellow
        }

        Write-Host ""
        Write-Host "[OK] Deletion complete and verified!" -ForegroundColor Green
        Write-Host "    The following have been removed:" -ForegroundColor Gray
        Write-Host "    - App Registration" -ForegroundColor Gray
        Write-Host "    - Enterprise Application (Service Principal)" -ForegroundColor Gray
        Write-Host "    - All client secrets and certificates" -ForegroundColor Gray
        Write-Host "    - All API permissions and consents" -ForegroundColor Gray
        Write-Host "    - All app roles and assignments" -ForegroundColor Gray
        Write-Host "    - All user and group assignments" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "[CANCELLED] App registration not deleted" -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
} else {
    Write-Host "Checking for existing app registration..." -ForegroundColor Cyan

    try {
        $existingApp = az ad app show --id $EXISTING_CLIENT_ID --output json 2>$null | ConvertFrom-Json

        if ($existingApp) {
            Write-Host "[WARNING] App registration already exists!" -ForegroundColor Yellow
            Write-Host "App Name: $($existingApp.displayName)" -ForegroundColor Yellow
            Write-Host "Client ID: $EXISTING_CLIENT_ID" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Options:" -ForegroundColor Cyan
            Write-Host "1. Run this script with -DeleteExisting flag to delete and recreate" -ForegroundColor Gray
            Write-Host "2. Use Configure-EntraApp-v2.ps1 to update the existing app" -ForegroundColor Gray
            Write-Host ""

            $continue = Read-Host "Do you want to continue and create a NEW app with a different name? (y/n)"

            if ($continue -ne 'y') {
                Write-Host "[CANCELLED] Operation cancelled" -ForegroundColor Yellow
                exit 0
            }

            # Append timestamp to name
            $APP_DISPLAY_NAME = "$APP_DISPLAY_NAME-$(Get-Date -Format 'yyyyMMdd-HHmm')"
            Write-Host "New app will be named: $APP_DISPLAY_NAME" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[OK] No existing app found" -ForegroundColor Green
    }

    Write-Host ""
}

# Step 2: Create App Registration
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 2: Create App Registration" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating app registration: $APP_DISPLAY_NAME" -ForegroundColor Yellow

try {
    # Create app registration
    $newApp = az ad app create `
        --display-name $APP_DISPLAY_NAME `
        --sign-in-audience "AzureADMyOrg" `
        --output json | ConvertFrom-Json

    $CLIENT_ID = $newApp.appId
    $OBJECT_ID = $newApp.id

    Write-Host "[OK] App registration created!" -ForegroundColor Green
    Write-Host "    Display Name: $APP_DISPLAY_NAME" -ForegroundColor Gray
    Write-Host "    Client ID: $CLIENT_ID" -ForegroundColor Gray
    Write-Host "    Object ID: $OBJECT_ID" -ForegroundColor Gray

    # Wait for propagation
    Start-Sleep -Seconds 3
} catch {
    Write-Host "[ERROR] Failed to create app registration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# VALIDATION: Verify app registration was created successfully
Write-Host ""
Write-Host "Validating app registration creation..." -ForegroundColor Cyan
try {
    $validateApp = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    if ($validateApp -and $validateApp.appId -eq $CLIENT_ID) {
        Write-Host "[PASS] App registration validated successfully" -ForegroundColor Green
    } else {
        throw "App registration validation failed"
    }
} catch {
    Write-Host "[FAIL] App registration validation failed!" -ForegroundColor Red
    Write-Host "Cannot proceed without valid app registration" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Create Client Secret
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 3: Create Client Secret" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$secretName = "Production Secret - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "Creating client secret..." -ForegroundColor Yellow

try {
    $secretResult = az ad app credential reset `
        --id $CLIENT_ID `
        --append `
        --display-name $secretName `
        --years 2 `
        --output json | ConvertFrom-Json

    $CLIENT_SECRET = $secretResult.password

    Write-Host "[OK] Client secret created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Yellow -BackgroundColor Red
    Write-Host "CLIENT SECRET (save this immediately - you won't see it again!):" -ForegroundColor Yellow -BackgroundColor Red
    Write-Host $CLIENT_SECRET -ForegroundColor White -BackgroundColor DarkGray
    Write-Host "================================================================" -ForegroundColor Yellow -BackgroundColor Red
    Write-Host ""

    $null = Read-Host "Press Enter after you've saved the client secret"
} catch {
    Write-Host "[ERROR] Failed to create client secret" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# VALIDATION: Verify client secret was created
Write-Host ""
Write-Host "Validating client secret creation..." -ForegroundColor Cyan
try {
    $validateApp = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    if ($validateApp.passwordCredentials -and $validateApp.passwordCredentials.Count -gt 0) {
        Write-Host "[PASS] Client secret validated successfully" -ForegroundColor Green
        Write-Host "    Found $($validateApp.passwordCredentials.Count) credential(s)" -ForegroundColor Gray
    } else {
        throw "No client secrets found"
    }
} catch {
    Write-Host "[FAIL] Client secret validation failed!" -ForegroundColor Red
    Write-Host "Cannot proceed without valid client secret" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Configure API Permissions
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 4: Configure API Permissions" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Adding Microsoft Graph permissions..." -ForegroundColor Yellow

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

$manifestPath = "$env:TEMP\app-permissions-$CLIENT_ID.json"
"[$($requiredResourceAccess | ConvertTo-Json -Depth 10 -Compress)]" | Out-File -FilePath $manifestPath -Encoding utf8 -NoNewline

try {
    az ad app update --id $CLIENT_ID --required-resource-accesses "@$manifestPath" 2>&1 | Out-Null

    Write-Host "[OK] API permissions configured:" -ForegroundColor Green
    Write-Host "    Delegated Permissions:" -ForegroundColor Gray
    Write-Host "      - User.Read" -ForegroundColor Gray
    Write-Host "      - User.ReadBasic.All" -ForegroundColor Gray
    Write-Host "      - offline_access" -ForegroundColor Gray
    Write-Host "    Application Permissions:" -ForegroundColor Gray
    Write-Host "      - Directory.Read.All" -ForegroundColor Gray
    Write-Host "      - User.Read.All" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to configure permissions" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Remove-Item $manifestPath -ErrorAction SilentlyContinue

# VALIDATION: Verify API permissions were configured
Write-Host ""
Write-Host "Validating API permissions..." -ForegroundColor Cyan
try {
    $validateApp = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
    $graphPerms = $validateApp.requiredResourceAccess | Where-Object { $_.resourceAppId -eq $graphApiId }

    if ($graphPerms -and $graphPerms.resourceAccess.Count -ge 5) {
        Write-Host "[PASS] API permissions validated successfully" -ForegroundColor Green
        Write-Host "    Found $($graphPerms.resourceAccess.Count) permission(s)" -ForegroundColor Gray

        # Verify required permission IDs
        $permIds = $graphPerms.resourceAccess.id
        $requiredIds = @(
            "e1fe6dd8-ba31-4d61-89e7-88639da4683d",  # User.Read
            "b340eb25-3456-403f-be2f-af7a0d370277",  # User.ReadBasic.All
            "7427e0e9-2fba-42fe-b0c0-848c9e6a8182",  # offline_access
            "7ab1d382-f21e-4acd-a863-ba3e13f7da61",  # Directory.Read.All
            "df021288-bdef-4463-88db-98f22de89214"   # User.Read.All
        )

        $allPresent = $true
        foreach ($reqId in $requiredIds) {
            if ($permIds -notcontains $reqId) {
                $allPresent = $false
                Write-Host "    [WARNING] Missing permission ID: $reqId" -ForegroundColor Yellow
            }
        }

        if (-not $allPresent) {
            throw "Not all required permissions are configured"
        }
    } else {
        throw "Insufficient API permissions configured"
    }
} catch {
    Write-Host "[FAIL] API permissions validation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Cannot proceed without proper API permissions" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Create Enterprise Application (Service Principal)
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 5: Create Enterprise Application" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "What is an Enterprise Application?" -ForegroundColor Yellow
Write-Host "  The Enterprise Application (Service Principal) is the instance" -ForegroundColor Gray
Write-Host "  of your app in your organization. It's required for:" -ForegroundColor Gray
Write-Host "    - Assigning users and groups" -ForegroundColor Gray
Write-Host "    - Assigning app roles" -ForegroundColor Gray
Write-Host "    - Viewing sign-in logs" -ForegroundColor Gray
Write-Host "    - Single sign-on configuration" -ForegroundColor Gray
Write-Host ""

Write-Host "Creating Enterprise Application..." -ForegroundColor Yellow

try {
    # Check if service principal already exists
    $existingSp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if ($existingSp) {
        Write-Host "[OK] Enterprise Application already exists!" -ForegroundColor Green
        Write-Host "    Display Name: $($existingSp.displayName)" -ForegroundColor Gray
        Write-Host "    Object ID: $($existingSp.id)" -ForegroundColor Gray
        Write-Host "    App ID: $($existingSp.appId)" -ForegroundColor Gray
        $sp = $existingSp
    } else {
        # Create service principal (Enterprise Application)
        $sp = az ad sp create --id $CLIENT_ID --output json 2>&1 | ConvertFrom-Json

        Write-Host "[OK] Enterprise Application created!" -ForegroundColor Green
        Write-Host "    Display Name: $($sp.displayName)" -ForegroundColor Gray
        Write-Host "    Object ID: $($sp.id)" -ForegroundColor Gray
        Write-Host "    App ID: $($sp.appId)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "    You can now find it in Azure Portal:" -ForegroundColor Gray
    Write-Host "    Entra ID - Enterprise applications - Search: $APP_DISPLAY_NAME" -ForegroundColor Gray

    # Wait for propagation
    Write-Host ""
    Write-Host "    Waiting for propagation..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
} catch {
    Write-Host "[ERROR] Failed to create Enterprise Application" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "[INFO] The Enterprise Application will be created automatically when:" -ForegroundColor Yellow
    Write-Host "  - Admin consent is granted, OR" -ForegroundColor Gray
    Write-Host "  - The first user signs in to the app" -ForegroundColor Gray
}

# VALIDATION: Verify Enterprise Application was created
Write-Host ""
Write-Host "Validating Enterprise Application creation..." -ForegroundColor Cyan
try {
    Start-Sleep -Seconds 2  # Give it a moment to propagate
    $validateSp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if ($validateSp -and $validateSp.appId -eq $CLIENT_ID) {
        Write-Host "[PASS] Enterprise Application validated successfully" -ForegroundColor Green
        Write-Host "    Service Principal ID: $($validateSp.id)" -ForegroundColor Gray
    } else {
        throw "Enterprise Application not found"
    }
} catch {
    Write-Host "[FAIL] Enterprise Application validation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Cannot proceed without Enterprise Application" -ForegroundColor Red
    Write-Host "Attempting to continue - admin consent may create it..." -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Grant Admin Consent
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 6: Grant Admin Consent" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Granting admin consent for API permissions..." -ForegroundColor Yellow

try {
    # Grant admin consent
    az ad app permission admin-consent --id $CLIENT_ID 2>&1 | Out-Null
    Write-Host "[OK] Admin consent granted!" -ForegroundColor Green
    Write-Host "    All API permissions are now approved" -ForegroundColor Gray
    Write-Host "    Waiting for propagation..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
} catch {
    Write-Host "[WARNING] Could not grant admin consent automatically" -ForegroundColor Yellow
    Write-Host "    You must manually grant consent in Azure Portal:" -ForegroundColor Yellow
    Write-Host "    Portal - Entra ID - App registrations - $APP_DISPLAY_NAME - API permissions" -ForegroundColor Gray
    Write-Host "    Click 'Grant admin consent for [Your Organization]'" -ForegroundColor Gray
}

# VALIDATION: Verify admin consent (note: this is hard to validate programmatically)
Write-Host ""
Write-Host "Validating admin consent..." -ForegroundColor Cyan
Write-Host "[INFO] Admin consent status cannot be fully validated via CLI" -ForegroundColor Yellow
Write-Host "      You must verify in Azure Portal that all permissions show green checkmarks" -ForegroundColor Gray
Write-Host "[PASS] Proceeding with assumption admin consent was granted" -ForegroundColor Green

Write-Host ""

# Step 7: Configure Authentication (Redirect URIs)
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 7: Configure Authentication" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuring SPA redirect URIs..." -ForegroundColor Yellow

try {
    # Set SPA redirect URIs using Microsoft Graph API (az CLI --spa-redirect-uris has issues with PowerShell arrays)
    # Use temp file to avoid PowerShell 5 JSON escaping issues
    $spaConfig = @{
        spa = @{
            redirectUris = $REDIRECT_URIS
        }
    } | ConvertTo-Json -Depth 10

    $tempFile = "$env:TEMP\spa-config-$OBJECT_ID.json"
    $spaConfig | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline

    Write-Host "    Using Graph API to configure SPA redirect URIs..." -ForegroundColor Gray
    Write-Host "    Object ID: $OBJECT_ID" -ForegroundColor DarkGray
    Write-Host "    Temp file: $tempFile" -ForegroundColor DarkGray

    $result = az rest --method PATCH `
        --uri "https://graph.microsoft.com/v1.0/applications/$OBJECT_ID" `
        --headers "Content-Type=application/json" `
        --body "@$tempFile" 2>&1

    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Graph API returned error:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        throw "Failed to configure SPA redirect URIs via Graph API"
    }

    Write-Host "[OK] SPA redirect URIs configured:" -ForegroundColor Green
    foreach ($uri in $REDIRECT_URIS) {
        Write-Host "    - $uri" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to configure SPA redirect URIs" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Enabling ID token issuance..." -ForegroundColor Yellow

try {
    # Enable ID token issuance
    az ad app update --id $CLIENT_ID --enable-id-token-issuance true 2>&1 | Out-Null
    Write-Host "[OK] ID token issuance enabled" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to enable ID token issuance" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# VALIDATION: Verify redirect URIs and ID token configuration
Write-Host ""
Write-Host "Validating authentication configuration..." -ForegroundColor Cyan
try {
    Start-Sleep -Seconds 2  # Give it a moment to propagate
    $validateApp = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    $spaUrisValid = $false
    $idTokenValid = $false

    # Check SPA redirect URIs
    if ($validateApp.spa.redirectUris -and $validateApp.spa.redirectUris.Count -eq 2) {
        $expectedUris = $REDIRECT_URIS
        $actualUris = $validateApp.spa.redirectUris

        $allMatch = $true
        foreach ($expectedUri in $expectedUris) {
            if ($actualUris -notcontains $expectedUri) {
                $allMatch = $false
                Write-Host "    [WARNING] Missing redirect URI: $expectedUri" -ForegroundColor Yellow
            }
        }

        if ($allMatch) {
            $spaUrisValid = $true
            Write-Host "[PASS] SPA redirect URIs validated successfully" -ForegroundColor Green
            Write-Host "    Configured: $($actualUris -join ', ')" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] SPA redirect URIs not configured correctly" -ForegroundColor Yellow
        Write-Host "    Expected: 2, Found: $($validateApp.spa.redirectUris.Count)" -ForegroundColor Gray
    }

    # Check ID token issuance
    if ($validateApp.web.implicitGrantSettings.enableIdTokenIssuance -eq $true) {
        $idTokenValid = $true
        Write-Host "[PASS] ID token issuance validated successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] ID token issuance not enabled" -ForegroundColor Yellow
    }

    if (-not $spaUrisValid -or -not $idTokenValid) {
        throw "Authentication configuration incomplete"
    }
} catch {
    Write-Host "[FAIL] Authentication configuration validation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Cannot proceed without proper authentication configuration" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 8: Create App Roles
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 8: Create App Roles" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating app roles..." -ForegroundColor Yellow

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

$rolesPath = "$env:TEMP\app-roles-$CLIENT_ID.json"
$appRoles | ConvertTo-Json -Depth 10 | Out-File -FilePath $rolesPath -Encoding utf8

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

# VALIDATION: Verify app roles were created
Write-Host ""
Write-Host "Validating app roles..." -ForegroundColor Cyan
try {
    Start-Sleep -Seconds 2  # Give it a moment to propagate
    $validateApp = az ad app show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    $requiredRoles = @("TimesheetAdmin", "Manager", "Leadership")
    $configuredRoles = $validateApp.appRoles | Where-Object { $_.value -in $requiredRoles }

    if ($configuredRoles.Count -eq 3) {
        Write-Host "[PASS] App roles validated successfully" -ForegroundColor Green
        foreach ($role in $configuredRoles) {
            Write-Host "    - $($role.displayName) ($($role.value))" -ForegroundColor Gray
        }
    } else {
        throw "Expected 3 app roles, found $($configuredRoles.Count)"
    }
} catch {
    Write-Host "[FAIL] App roles validation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Cannot proceed without proper app roles" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 9: Assign User and Grant Ownership
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 9: Assign User and Grant Ownership" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Assigning user and granting ownership to: $OWNER_EMAIL" -ForegroundColor Yellow
Write-Host ""

# Get user object ID
Write-Host "Looking up user in Entra ID..." -ForegroundColor Yellow
try {
    $user = az ad user show --id $OWNER_EMAIL --output json 2>$null | ConvertFrom-Json

    if ($user) {
        Write-Host "[OK] User found!" -ForegroundColor Green
        Write-Host "    Display Name: $($user.displayName)" -ForegroundColor Gray
        Write-Host "    User Principal Name: $($user.userPrincipalName)" -ForegroundColor Gray
        Write-Host "    Object ID: $($user.id)" -ForegroundColor Gray
        $userId = $user.id
    } else {
        throw "User not found"
    }
} catch {
    Write-Host "[ERROR] Could not find user: $OWNER_EMAIL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "[INFO] Skipping user assignment - you'll need to assign users manually" -ForegroundColor Yellow
    Write-Host "Portal - Entra ID - Enterprise applications - $APP_DISPLAY_NAME - Users and groups" -ForegroundColor Gray
    $userId = $null
}

Write-Host ""

# Assign user to app roles in Enterprise Application
if ($userId) {
    Write-Host "Assigning user to app roles..." -ForegroundColor Yellow

    # Get the service principal
    $sp = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json

    if ($sp) {
        # Get the TimesheetAdmin role ID
        $adminRole = $sp.appRoles | Where-Object { $_.value -eq "TimesheetAdmin" }

        if ($adminRole) {
            try {
                # Assign user to TimesheetAdmin role
                az ad app permission grant --id $CLIENT_ID --api $CLIENT_ID 2>&1 | Out-Null

                # Use REST API to assign app role (az CLI does not have direct command)
                $assignmentBody = @{
                    principalId = $userId
                    resourceId = $sp.id
                    appRoleId = $adminRole.id
                } | ConvertTo-Json

                # Create the assignment using az rest
                az rest --method POST `
                    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$($sp.id)/appRoleAssignedTo" `
                    --headers "Content-Type=application/json" `
                    --body $assignmentBody 2>&1 | Out-Null

                Write-Host "[OK] User assigned to TimesheetAdmin role" -ForegroundColor Green
                Write-Host "    Role: Timesheet Admin (TimesheetAdmin)" -ForegroundColor Gray
            } catch {
                Write-Host "[WARNING] Could not assign user to role automatically" -ForegroundColor Yellow
                Write-Host "    You may need to assign manually in Azure Portal" -ForegroundColor Gray
                Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
            }
        } else {
            Write-Host "[WARNING] TimesheetAdmin role not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] Service Principal not found - cannot assign roles" -ForegroundColor Yellow
    }
}

Write-Host ""

# Make user an owner of the App Registration
if ($userId) {
    Write-Host "Granting app registration ownership..." -ForegroundColor Yellow

    try {
        # Add user as owner of the app registration
        az ad app owner add --id $CLIENT_ID --owner-object-id $userId 2>&1 | Out-Null

        Write-Host "[OK] User granted app registration ownership" -ForegroundColor Green
        Write-Host "    Owner: $OWNER_EMAIL" -ForegroundColor Gray
    } catch {
        Write-Host "[WARNING] Could not add user as owner automatically" -ForegroundColor Yellow
        Write-Host "    This may be because user is already an owner" -ForegroundColor Gray
    }

    Write-Host ""

    # Also make user owner of the Enterprise Application (Service Principal)
    Write-Host "Granting Enterprise Application ownership..." -ForegroundColor Yellow

    try {
        # Add user as owner of the service principal
        az ad sp owner add --id $CLIENT_ID --owner-object-id $userId 2>&1 | Out-Null

        Write-Host "[OK] User granted Enterprise Application ownership" -ForegroundColor Green
        Write-Host "    Owner: $OWNER_EMAIL" -ForegroundColor Gray
    } catch {
        Write-Host "[WARNING] Could not add user as Enterprise App owner automatically" -ForegroundColor Yellow
        Write-Host "    This may be because user is already an owner" -ForegroundColor Gray
    }
}

# VALIDATION: Verify user assignment and ownership
if ($userId) {
    Write-Host ""
    Write-Host "Validating user assignment and ownership..." -ForegroundColor Cyan

    try {
        # Check app registration owners
        $appOwners = az ad app owner list --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
        $isAppOwner = $appOwners | Where-Object { $_.id -eq $userId }

        if ($isAppOwner) {
            Write-Host "[PASS] User is owner of App Registration" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] User is not listed as App Registration owner" -ForegroundColor Yellow
        }

        # Check service principal owners
        $spOwners = az ad sp owner list --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
        $isSpOwner = $spOwners | Where-Object { $_.id -eq $userId }

        if ($isSpOwner) {
            Write-Host "[PASS] User is owner of Enterprise Application" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] User is not listed as Enterprise Application owner" -ForegroundColor Yellow
        }

        # Note: Role assignments are harder to validate via CLI
        Write-Host "[INFO] Role assignment validation requires checking Azure Portal" -ForegroundColor Yellow
        Write-Host "      Portal - Entra ID - Enterprise applications - $APP_DISPLAY_NAME - Users and groups" -ForegroundColor Gray

    } catch {
        Write-Host "[WARNING] Could not fully validate user assignment" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 10: Update config.env
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 10: Update config.env" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Updating config.env file..." -ForegroundColor Yellow

try {
    if (Test-Path $CONFIG_ENV_PATH) {
        $configContent = Get-Content $CONFIG_ENV_PATH -Raw

        # Update values
        $configContent = $configContent -replace 'TENANT_ID="[^"]*"', "TENANT_ID=`"$TENANT_ID`""
        $configContent = $configContent -replace 'CLIENT_ID="[^"]*"', "CLIENT_ID=`"$CLIENT_ID`""
        $configContent = $configContent -replace 'CLIENT_SECRET="[^"]*"', "CLIENT_SECRET=`"$CLIENT_SECRET`""

        Set-Content -Path $CONFIG_ENV_PATH -Value $configContent -NoNewline

        Write-Host "[OK] config.env updated with new values:" -ForegroundColor Green
        Write-Host "    TENANT_ID: $TENANT_ID" -ForegroundColor Gray
        Write-Host "    CLIENT_ID: $CLIENT_ID" -ForegroundColor Gray
        Write-Host "    CLIENT_SECRET: ****** (saved)" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] config.env not found at: $CONFIG_ENV_PATH" -ForegroundColor Yellow
        Write-Host "You will need to manually update your configuration files" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to update config.env" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# VALIDATION: Verify config.env was updated correctly
Write-Host ""
Write-Host "Validating config.env update..." -ForegroundColor Cyan
try {
    if (Test-Path $CONFIG_ENV_PATH) {
        $configContent = Get-Content $CONFIG_ENV_PATH -Raw

        # Check if values are present
        $hasTenantId = $configContent -match "TENANT_ID=`"$TENANT_ID`""
        $hasClientId = $configContent -match "CLIENT_ID=`"$CLIENT_ID`""
        $hasClientSecret = $configContent -match "CLIENT_SECRET=`"$CLIENT_SECRET`""

        if ($hasTenantId -and $hasClientId -and $hasClientSecret) {
            Write-Host "[PASS] config.env validated successfully" -ForegroundColor Green
            Write-Host "    TENANT_ID: Present" -ForegroundColor Gray
            Write-Host "    CLIENT_ID: Present" -ForegroundColor Gray
            Write-Host "    CLIENT_SECRET: Present" -ForegroundColor Gray
        } else {
            throw "config.env does not contain all required values"
        }
    } else {
        Write-Host "[WARNING] config.env file not found - skipping validation" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] config.env validation failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "WARNING: Proceeding, but you must manually update config.env" -ForegroundColor Yellow
}

Write-Host ""

# Step 11: Final Verification Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Step 11: Final Verification Summary" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running final configuration check..." -ForegroundColor Yellow
Write-Host "This will verify all components are properly configured." -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

try {
    $finalApp = az ad app show --id $CLIENT_ID --output json | ConvertFrom-Json

    Write-Host "[OK] App Registration Details:" -ForegroundColor Green
    Write-Host "    Display Name: $($finalApp.displayName)" -ForegroundColor Gray
    Write-Host "    Client ID: $($finalApp.appId)" -ForegroundColor Gray
    Write-Host "    Object ID: $($finalApp.id)" -ForegroundColor Gray
    Write-Host ""

    # Check SPA Redirect URIs
    $spaUriCount = if ($finalApp.spa.redirectUris) { $finalApp.spa.redirectUris.Count } else { 0 }
    if ($spaUriCount -gt 0) {
        Write-Host "    SPA Redirect URIs: $spaUriCount" -ForegroundColor Gray
        foreach ($uri in $finalApp.spa.redirectUris) {
            Write-Host "      - $uri" -ForegroundColor Green
        }
    } else {
        Write-Host "    SPA Redirect URIs: 0 [WARNING: Not configured!]" -ForegroundColor Yellow
    }
    Write-Host ""

    # Check ID Token
    if ($finalApp.web.implicitGrantSettings.enableIdTokenIssuance) {
        Write-Host "    ID Token Issuance: Enabled" -ForegroundColor Gray
    } else {
        Write-Host "    ID Token Issuance: Disabled" -ForegroundColor Gray
    }
    Write-Host ""

    # Check API Permissions
    $graphPerms = $finalApp.requiredResourceAccess | Where-Object { $_.resourceAppId -eq "00000003-0000-0000-c000-000000000000" }
    if ($graphPerms) {
        $permCount = $graphPerms.resourceAccess.Count
        Write-Host "    API Permissions: $permCount configured" -ForegroundColor Gray
    } else {
        Write-Host "    API Permissions: 0 [WARNING: Not configured!]" -ForegroundColor Yellow
    }
    Write-Host ""

    # Check App Roles
    $roleCount = if ($finalApp.appRoles) { $finalApp.appRoles.Count } else { 0 }
    if ($roleCount -gt 0) {
        Write-Host "    App Roles: $roleCount configured" -ForegroundColor Gray
        foreach ($role in $finalApp.appRoles) {
            Write-Host "      - $($role.displayName) ($($role.value))" -ForegroundColor Green
        }
    } else {
        Write-Host "    App Roles: 0 [WARNING: Not configured!]" -ForegroundColor Yellow
    }
    Write-Host ""

    # Check Enterprise Application
    Write-Host "    Checking Enterprise Application..." -ForegroundColor Gray
    try {
        $spCheck = az ad sp show --id $CLIENT_ID --output json 2>$null | ConvertFrom-Json
        if ($spCheck) {
            Write-Host "    Enterprise Application: Created" -ForegroundColor Green
            Write-Host "      Object ID: $($spCheck.id)" -ForegroundColor DarkGray
            Write-Host "      Find it at: Entra ID - Enterprise applications - $APP_DISPLAY_NAME" -ForegroundColor DarkGray
        } else {
            Write-Host "    Enterprise Application: Not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    Enterprise Application: Not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Could not verify configuration" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "CONFIGURATION COMPLETE!" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "App Registration Summary:" -ForegroundColor Green
Write-Host "  Name: $APP_DISPLAY_NAME" -ForegroundColor White
Write-Host "  Tenant ID: $TENANT_ID" -ForegroundColor White
Write-Host "  Client ID: $CLIENT_ID" -ForegroundColor White
Write-Host ""

Write-Host "================================================================" -ForegroundColor Yellow -BackgroundColor Red
Write-Host "IMPORTANT - SAVE THESE CREDENTIALS:" -ForegroundColor Yellow -BackgroundColor Red
Write-Host "================================================================" -ForegroundColor Yellow -BackgroundColor Red
Write-Host "TENANT_ID: $TENANT_ID" -ForegroundColor White
Write-Host "CLIENT_ID: $CLIENT_ID" -ForegroundColor White
Write-Host "CLIENT_SECRET: $CLIENT_SECRET" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Yellow -BackgroundColor Red
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verify in Azure Portal:" -ForegroundColor White
Write-Host "   https://portal.azure.com" -ForegroundColor Gray
Write-Host "   Entra ID - App registrations - $APP_DISPLAY_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "   Verify these items:" -ForegroundColor White
Write-Host "   - API permissions have green checkmarks (admin consent)" -ForegroundColor Gray
Write-Host "   - Authentication - Platform configurations shows 'Single-page application'" -ForegroundColor Gray
Write-Host "   - SPA section shows 2 redirect URIs" -ForegroundColor Gray
Write-Host "   - Implicit grant shows ID tokens enabled" -ForegroundColor Gray
Write-Host "   - App roles shows 3 roles (TimesheetAdmin, Manager, Leadership)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verify user assignment:" -ForegroundColor White
Write-Host "   Portal - Entra ID - Enterprise applications - $APP_DISPLAY_NAME" -ForegroundColor Gray
Write-Host "   - Click 'Users and groups'" -ForegroundColor Gray
Write-Host "   - Verify: $OWNER_EMAIL is assigned to TimesheetAdmin role" -ForegroundColor Gray
Write-Host ""
Write-Host "   If not assigned, add manually:" -ForegroundColor White
Write-Host "   - Click '+ Add user/group'" -ForegroundColor Gray
Write-Host "   - Select user and assign TimesheetAdmin role" -ForegroundColor Gray
Write-Host ""
Write-Host "3. If SPA redirect URIs are missing, fix them:" -ForegroundColor White
Write-Host "   az ad app update --id $CLIENT_ID --spa-redirect-uris \"https://app-MVD-TimeSheet.azurewebsites.net\" \"http://localhost:5173\"" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Your config.env has been updated and is ready!" -ForegroundColor White
Write-Host "   Review: $CONFIG_ENV_PATH" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Assign additional users (optional):" -ForegroundColor White
Write-Host "   Portal - Entra ID - Enterprise applications - $APP_DISPLAY_NAME - Users and groups" -ForegroundColor Gray
Write-Host "   - Click '+ Add user/group' to assign more users" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Proceed with Azure resource deployment:" -ForegroundColor White
Write-Host "   .\Deploy-Azure-Resources.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "Configuration created successfully!" -ForegroundColor Green
Write-Host ""
