# Test SharePoint access using app credentials
$settings = az webapp config appsettings list --name api-miravista-timesheet --resource-group rg-miravista-timesheet-prod | ConvertFrom-Json
$TENANT_ID = ($settings | Where-Object { $_.name -eq "TENANT_ID" }).value
$CLIENT_ID = ($settings | Where-Object { $_.name -eq "CLIENT_ID" }).value
$CLIENT_SECRET = ($settings | Where-Object { $_.name -eq "CLIENT_SECRET" }).value

Write-Host "Getting token for app $CLIENT_ID..."

$body = @{
    client_id = $CLIENT_ID
    scope = "https://graph.microsoft.com/.default"
    client_secret = $CLIENT_SECRET
    grant_type = "client_credentials"
}

$tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$TENANT_ID/oauth2/v2.0/token" -Method Post -Body $body
$token = $tokenResponse.access_token
Write-Host "Token acquired successfully"

Write-Host ""
Write-Host "Testing SharePoint site access..."
$headers = @{ Authorization = "Bearer $token" }
try {
    $site = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/miravistadiagnostics.sharepoint.com,792ca1fe-6b9c-4477-a6ed-77c7d7580770,839aa32b-8d19-4448-a943-b585be846207" -Headers $headers
    Write-Host "Site Name: $($site.displayName)"
    Write-Host "Site ID: $($site.id)"
} catch {
    Write-Host "Error accessing site: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}

Write-Host ""
Write-Host "Testing SharePoint lists access..."
try {
    $lists = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/miravistadiagnostics.sharepoint.com,792ca1fe-6b9c-4477-a6ed-77c7d7580770,839aa32b-8d19-4448-a943-b585be846207/lists" -Headers $headers
    Write-Host "Found $($lists.value.Count) lists:"
    $lists.value | ForEach-Object { Write-Host "  - $($_.displayName) ($($_.id))" }
} catch {
    Write-Host "Error accessing lists: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Testing specific list access..."
try {
    $list = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/miravistadiagnostics.sharepoint.com,792ca1fe-6b9c-4477-a6ed-77c7d7580770,839aa32b-8d19-4448-a943-b585be846207/lists/d0397451-38a0-4216-879d-cce788f27061" -Headers $headers
    Write-Host "List Name: $($list.displayName)"
    Write-Host "List ID: $($list.id)"
} catch {
    Write-Host "Error accessing list: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Testing list items access..."
try {
    $items = Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/sites/miravistadiagnostics.sharepoint.com,792ca1fe-6b9c-4477-a6ed-77c7d7580770,839aa32b-8d19-4448-a943-b585be846207/lists/d0397451-38a0-4216-879d-cce788f27061/items?`$top=5&`$expand=fields" -Headers $headers
    Write-Host "Found $($items.value.Count) items (showing first 5)"
} catch {
    Write-Host "Error accessing list items: $($_.Exception.Message)"
}
