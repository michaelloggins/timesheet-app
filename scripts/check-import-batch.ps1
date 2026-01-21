# Check import batch error from database
$settings = az webapp config appsettings list --name api-miravista-timesheet --resource-group rg-miravista-timesheet-prod | ConvertFrom-Json

$DB_SERVER = ($settings | Where-Object { $_.name -eq "DB_SERVER" }).value
$DB_NAME = ($settings | Where-Object { $_.name -eq "DB_NAME" }).value
$DB_USER = ($settings | Where-Object { $_.name -eq "DB_USER" }).value
$DB_PASSWORD = ($settings | Where-Object { $_.name -eq "DB_PASSWORD" }).value

Write-Host "Connecting to database $DB_NAME on $DB_SERVER..."

$connectionString = "Server=$DB_SERVER;Database=$DB_NAME;User Id=$DB_USER;Password=$DB_PASSWORD;Encrypt=True;TrustServerCertificate=False;"

$query = @"
SELECT TOP 5
    BatchID,
    TriggerType,
    Status,
    TotalItems,
    ImportedItems,
    SkippedItems,
    FailedItems,
    ErrorMessage,
    StartDate,
    EndDate
FROM LegacyImportBatch
ORDER BY BatchID DESC
"@

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandText = $query

    $reader = $command.ExecuteReader()

    while ($reader.Read()) {
        Write-Host ""
        Write-Host "=== Batch $($reader['BatchID']) ===" -ForegroundColor Cyan
        Write-Host "Status: $($reader['Status'])"
        Write-Host "Total Items: $($reader['TotalItems'])"
        Write-Host "Imported: $($reader['ImportedItems'])"
        Write-Host "Skipped: $($reader['SkippedItems'])"
        Write-Host "Failed: $($reader['FailedItems'])"
        Write-Host "Error Message: $($reader['ErrorMessage'])"
        Write-Host "Started: $($reader['StartDate'])"
        Write-Host "Ended: $($reader['EndDate'])"
    }

    $reader.Close()
    $connection.Close()
} catch {
    Write-Host "Database error: $($_.Exception.Message)" -ForegroundColor Red
}

# Also check for failed import tracking records
Write-Host ""
Write-Host "=== Recent Failed Imports ===" -ForegroundColor Yellow

$query2 = @"
SELECT TOP 10
    ImportID,
    SharePointListItemID,
    ImportStatus,
    ErrorMessage
FROM LegacyImportTracking
WHERE ImportStatus IN ('Failed', 'UserNotFound')
ORDER BY ModifiedDate DESC
"@

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandText = $query2

    $reader = $command.ExecuteReader()

    $count = 0
    while ($reader.Read()) {
        $count++
        Write-Host "  Item $($reader['SharePointListItemID']): $($reader['ImportStatus']) - $($reader['ErrorMessage'])"
    }

    if ($count -eq 0) {
        Write-Host "  No failed imports found in tracking table"
    }

    $reader.Close()
    $connection.Close()
} catch {
    Write-Host "Database error: $($_.Exception.Message)" -ForegroundColor Red
}
