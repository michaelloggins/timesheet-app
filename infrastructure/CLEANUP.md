# Cleanup Guide - Remove Failed Deployment Resources

If you need to clean up a failed or partial deployment before re-running, follow these steps.

## Quick Cleanup Commands

### PowerShell

```powershell
# Delete main resource group
az group delete `
  --name rg-miravista-timesheet-prod `
  --yes `
  --no-wait

# Delete Application Insights managed resource group
# Note: Replace the GUID with your actual managed RG name
az group delete `
  --name ai_ai-miravista-prod_54119aa4-2d4b-40b8-8bc4-61e3bdd91971_managed `
  --yes `
  --no-wait
```

### Or use this script to find and delete all MiraVista resource groups

```powershell
# List all MiraVista-related resource groups
Write-Host "Finding all MiraVista resource groups..." -ForegroundColor Yellow
$rgs = az group list --query "[?contains(name, 'miravista')].name" --output tsv

if ($rgs) {
    Write-Host "`nFound resource groups:" -ForegroundColor Cyan
    $rgs | ForEach-Object { Write-Host "  - $_" }

    $confirm = Read-Host "`nDelete all these resource groups? (yes/no)"
    if ($confirm -eq "yes") {
        $rgs | ForEach-Object {
            Write-Host "Deleting $_..." -ForegroundColor Yellow
            az group delete --name $_ --yes --no-wait
        }
        Write-Host "`n✓ Deletion initiated for all resource groups" -ForegroundColor Green
        Write-Host "Note: Deletion happens in background. Check Azure Portal to confirm." -ForegroundColor Yellow
    } else {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host "No MiraVista resource groups found." -ForegroundColor Green
}
```

## What Gets Deleted

Deleting these resource groups will remove:

### Main Resource Group (rg-miravista-timesheet-prod)
- SQL Server and Database
- Key Vault
- App Service Plan
- Backend API App Service
- Frontend Static Web App
- Storage Account
- Azure Communication Services
- Application Insights
- Azure Functions

### Managed Resource Group (ai_*_managed)
- Log Analytics Workspace (automatically created by Application Insights)

## Important Notes

1. **Managed Resource Groups Are Normal**
   - Azure automatically creates managed resource groups for certain services
   - Application Insights creates: `ai_[name]_[guid]_managed`
   - These are automatically deleted when the parent resource group is deleted
   - However, sometimes they persist and need manual cleanup

2. **--no-wait Flag**
   - Deletion happens in the background
   - Can take 5-15 minutes to complete
   - You can proceed with re-deployment once deletion starts

3. **Verify Deletion**
   ```powershell
   # Check if resource groups are deleted
   az group list --output table
   ```

4. **If Deletion Fails**
   - Some resources have soft-delete enabled (Key Vault, etc.)
   - You may need to purge them manually:
   ```powershell
   # Purge soft-deleted Key Vault
   az keyvault purge --name kv-miravista-prod
   ```

## After Cleanup

Once resource groups are deleted (or deletion has started), you can re-run:

```powershell
.\deploy-azure-resources.ps1
```

The script will create fresh resources with proper configuration.

## Alternative: Keep Resources and Update Settings

If you want to keep existing resources and just fix configuration:

```powershell
# Update backend settings only
az webapp config appsettings set `
  --name api-miravista-timesheet `
  --resource-group rg-miravista-timesheet-prod `
  --settings `
    "DB_ENCRYPT=true" `
    [other settings...]
```

However, a clean deployment is recommended after failed attempts to ensure consistency.
