# Azure Functions - MiraVista Timesheet

This directory contains Azure Functions for scheduled background jobs and notifications.

## Functions

### 1. timesheetReminders
**Schedule**: Daily at 6:00 AM
**Purpose**: Send reminder emails to employees who haven't submitted timesheets
**Logic**:
- Query database for employees with unsubmitted timesheets
- Filter employees who are 2 days before due date
- Send reminder emails via Azure Communication Services

### 2. managerDigest
**Schedule**: Every Monday at 7:00 AM
**Purpose**: Send weekly digest emails to managers with pending approvals
**Logic**:
- Query database for all managers
- For each manager, get pending approvals
- Build digest data with RAG indicators (Red/Amber/Green)
- Send digest email with links to approval dashboard

### 3. escalationCheck
**Schedule**: Daily at 8:00 AM
**Purpose**: Escalate timesheets pending approval for more than 7 days
**Logic**:
- Query database for timesheets pending > 7 days
- Get management chain from Microsoft Graph API
- Send escalation notification to next level manager
- Update escalation status in database

### 4. paychexSync
**Schedule**: Daily at 2:00 AM
**Purpose**: Sync PTO schedules from Paychex (future feature)
**Status**: Disabled by default (ENABLE_PAYCHEX_SYNC=false)
**Logic**:
- Authenticate with Paychex API (OAuth 2.0)
- Fetch PTO schedules for all employees
- Insert new PTO entries and create timesheet entries

## Local Development

### Prerequisites
- Node.js 20+ LTS
- Azure Functions Core Tools v4
- Azure Storage Emulator (Azurite)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy settings file:
```bash
cp local.settings.json.example local.settings.json
```

3. Update `local.settings.json` with your configuration

4. Start Azurite (storage emulator):
```bash
azurite --silent
```

5. Run functions locally:
```bash
npm start
```

### Testing Functions

Test functions using Azure Functions Core Tools:

```bash
# Test specific function
func start --functions timesheetReminders

# Test with specific time
func start --functions timesheetReminders --verbose
```

## Deployment

### Using Azure CLI

```bash
# Build TypeScript
npm run build

# Deploy to Azure
func azure functionapp publish miravista-timesheet-functions
```

### Using GitHub Actions

CI/CD pipeline is configured in `.github/workflows/deploy-functions.yml`

## Configuration

### Application Settings (Production)

Set these in Azure Portal under Function App → Configuration:

```
DB_SERVER=prod-server.database.windows.net
DB_NAME=TimesheetDB
DB_USER=@Microsoft.KeyVault(SecretUri=...)
DB_PASSWORD=@Microsoft.KeyVault(SecretUri=...)
ACS_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=...)
ACS_SENDER_ADDRESS=noreply@miravistalabs.com
APP_URL=https://timesheet.miravistalabs.com
```

### Schedule Format

Functions use CRON expressions (6-field format):
```
{second} {minute} {hour} {day} {month} {day-of-week}
```

Examples:
- `0 0 6 * * *` - Daily at 6:00 AM
- `0 0 7 * * MON` - Every Monday at 7:00 AM
- `0 */15 * * * *` - Every 15 minutes

## Monitoring

### Application Insights

View function execution logs:
1. Azure Portal → Function App → Monitor
2. Application Insights → Logs
3. Query: `traces | where operation_Name == "timesheetReminders"`

### Alerts

Configure alerts for:
- Function execution failures
- Long execution times (> 5 minutes)
- High error rate (> 5%)

## Error Handling

All functions implement:
- Try-catch blocks
- Structured logging
- Error retry logic (via Azure Functions runtime)
- Dead-letter queue for persistent failures

## Best Practices

1. **Idempotency**: Functions should be safe to run multiple times
2. **Timeouts**: Keep execution time under 5 minutes
3. **Logging**: Log start, progress, and completion
4. **Error handling**: Catch and log all errors
5. **Testing**: Test with various scenarios

## Troubleshooting

### Function not triggering
- Check CRON expression syntax
- Verify function is enabled in Azure Portal
- Check Application Insights for errors

### Database connection issues
- Verify connection string in settings
- Check firewall rules on Azure SQL Database
- Test connection from Azure Portal

### Email not sending
- Verify ACS connection string
- Check sender address is verified
- Review ACS logs in Azure Portal

## Support

For issues or questions:
- IT Team: helpdesk@miravistalabs.com
- Documentation: See main README.md
