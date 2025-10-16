# Database Setup Guide

## Overview

This folder contains SQL scripts for setting up the MiraVista Timesheet database on Azure SQL Database.

## Files

- **schema.sql** - Core database schema (tables, indexes, triggers)
- **views.sql** - Semantic views for reporting and Power BI integration
- **seed-data.sql** - Initial sample data for development
- **setup-managed-identity.sql** - Configure Azure Web App managed identity for database access

## Prerequisites

- Azure SQL Database provisioned
- SQL Server Management Studio (SSMS) or Azure Data Studio
- Database connection credentials

## Setup Instructions

### Option 1: Using Azure Data Studio / SSMS

1. Connect to your Azure SQL Database
2. Open and execute scripts in order:
   ```sql
   -- 1. Create schema
   :r schema.sql

   -- 2. Create views
   :r views.sql

   -- 3. Load seed data (optional for development)
   :r seed-data.sql
   ```

### Option 2: Using sqlcmd (Command Line)

```bash
# Set variables
DB_SERVER="your-server.database.windows.net"
DB_NAME="TimesheetDB"
DB_USER="sqladmin"
DB_PASSWORD="your-password"

# Run scripts
sqlcmd -S $DB_SERVER -d $DB_NAME -U $DB_USER -P $DB_PASSWORD -i schema.sql
sqlcmd -S $DB_SERVER -d $DB_NAME -U $DB_USER -P $DB_PASSWORD -i views.sql
sqlcmd -S $DB_SERVER -d $DB_NAME -U $DB_USER -P $DB_PASSWORD -i seed-data.sql
```

### Option 3: Using Azure CLI

```bash
az sql db show-connection-string \
  --client sqlcmd \
  --name TimesheetDB \
  --server your-server

# Then execute scripts using the connection string
```

## Database Schema

### Core Tables

1. **Departments** - Organizational departments
2. **Users** - Employee information (synced with Entra ID)
3. **Projects** - Work projects and categories
4. **Timesheets** - Weekly timesheet records
5. **TimeEntries** - Individual time entries
6. **TimesheetHistory** - Audit log of all timesheet changes
7. **SystemConfiguration** - Application settings

### Semantic Views (for Power BI)

1. **vw_FactTimeEntries** - Denormalized time entries with all dimensions
2. **vw_DepartmentScoreboard** - Real-time department compliance
3. **vw_LeadershipKPIs** - Executive dashboard metrics
4. **vw_MonthlyHoursByProject** - Aggregated hours by project
5. **vw_GrantReport** - Grant-specific reporting
6. **vw_EmployeeComplianceTrends** - Submission patterns
7. **vw_ManagerPerformance** - Approval speed metrics

## Security

### Firewall Rules

Ensure your IP address is whitelisted:

```bash
az sql server firewall-rule create \
  --resource-group rg-timesheet-prod \
  --server your-server \
  --name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

### Connection Security

- Always use encrypted connections (TLS 1.2+)
- Store connection strings in Azure Key Vault
- Use least privilege database permissions
- Enable Azure AD authentication

### Azure AD Authentication

The application supports both SQL authentication and Azure AD authentication:

**Local Development (Recommended):**
```env
# In backend/.env
DB_USE_AZURE_AD=true
```

This uses your Azure CLI credentials (`az login`) to connect to the database. You must be configured as an Azure AD admin on the SQL server.

**Production with Managed Identity:**

1. Run `setup-managed-identity.sql` in Azure Portal Query Editor to grant database access to the Web App
2. Configure Web App settings:
```bash
az webapp config appsettings set \
  --name api-miravista-timesheet \
  --resource-group rg-miravista-timesheet-prod \
  --settings DB_USE_AZURE_AD=true
```

See [PRODUCTION-DEPLOYMENT.md](../PRODUCTION-DEPLOYMENT.md) for detailed instructions.

## Maintenance

### Backup Strategy

Azure SQL Database provides automated backups:
- Point-in-time restore (PITR): 7-35 days
- Long-term retention: Up to 10 years

### Index Maintenance

Monitor index fragmentation:

```sql
SELECT
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    s.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 30
ORDER BY s.avg_fragmentation_in_percent DESC;
```

### Statistics Updates

Update statistics weekly:

```sql
EXEC sp_updatestats;
```

## Troubleshooting

### Connection Issues

```sql
-- Test connection
SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;
```

### Permission Issues

```sql
-- Check current user permissions
SELECT * FROM fn_my_permissions(NULL, 'DATABASE');
```

### View Errors

```sql
-- Refresh all views
EXEC sp_refreshview 'vw_FactTimeEntries';
EXEC sp_refreshview 'vw_DepartmentScoreboard';
-- ... (refresh all views)
```

## Migration

For migrating historical data from SharePoint:
1. Export data to Excel
2. Use the admin import endpoint: `POST /api/admin/import/timesheets`
3. Validate imported data

## Performance Monitoring

```sql
-- Top 10 slowest queries
SELECT TOP 10
    SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2)+1) AS query_text,
    qs.execution_count,
    qs.total_elapsed_time / 1000000 AS total_elapsed_time_sec,
    qs.total_worker_time / 1000000 AS total_cpu_time_sec
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY qs.total_elapsed_time DESC;
```

## Support

For database-related issues:
- Check Azure SQL Database logs in Azure Portal
- Monitor with Application Insights
- Contact IT team: helpdesk@miravistalabs.com
