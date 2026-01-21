# Run migration 015 to fix column size
$settings = az webapp config appsettings list --name api-miravista-timesheet --resource-group rg-miravista-timesheet-prod | ConvertFrom-Json

$DB_SERVER = ($settings | Where-Object { $_.name -eq "DB_SERVER" }).value
$DB_NAME = ($settings | Where-Object { $_.name -eq "DB_NAME" }).value
$DB_USER = ($settings | Where-Object { $_.name -eq "DB_USER" }).value
$DB_PASSWORD = ($settings | Where-Object { $_.name -eq "DB_PASSWORD" }).value

Write-Host "Running migration 015 on $DB_NAME..."

$connectionString = "Server=$DB_SERVER;Database=$DB_NAME;User Id=$DB_USER;Password=$DB_PASSWORD;Encrypt=True;TrustServerCertificate=False;"

# SQL commands to run
$sql1 = @"
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_LegacyImport_SPItem')
BEGIN
    ALTER TABLE LegacyImportTracking DROP CONSTRAINT UQ_LegacyImport_SPItem;
    PRINT 'Dropped UQ_LegacyImport_SPItem constraint';
END
"@

$sql2 = "ALTER TABLE LegacyImportTracking ALTER COLUMN SharePointSiteID NVARCHAR(200) NOT NULL;"
$sql3 = "ALTER TABLE LegacyImportTracking ALTER COLUMN SharePointListID NVARCHAR(200) NOT NULL;"

$sql4 = @"
ALTER TABLE LegacyImportTracking
ADD CONSTRAINT UQ_LegacyImport_SPItem UNIQUE (SharePointListItemID, SharePointListID, SharePointSiteID);
"@

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    Write-Host "Connected to database"

    # Run each command
    foreach ($sql in @($sql1, $sql2, $sql3, $sql4)) {
        $command = $connection.CreateCommand()
        $command.CommandText = $sql
        $command.ExecuteNonQuery() | Out-Null
        Write-Host "Executed: $($sql.Substring(0, [Math]::Min(60, $sql.Length)))..."
    }

    Write-Host ""
    Write-Host "Migration 015 completed successfully!" -ForegroundColor Green

    $connection.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
