###############################################################################
# MiraVista Timesheet - Azure Configuration (PowerShell)
#
# IMPORTANT: Fill in all values before running deployment script
# DO NOT commit this file with sensitive values to source control
###############################################################################

# Azure Subscription & Location
$LOCATION = "centralus"
$OWNER = "IT-Team"

# Resource Naming
$RESOURCE_GROUP = "rg-miravista-timesheet-prod"
$SQL_SERVER_NAME = "sql-miravista-prod"            # Must be globally unique
$SQL_DATABASE_NAME = "TimesheetDB"
$KEY_VAULT_NAME = "kv-miravista-prod"              # Must be globally unique, 3-24 chars
$APP_SERVICE_PLAN = "plan-miravista-prod"
$BACKEND_APP_NAME = "api-miravista-timesheet"      # Must be globally unique
$FRONTEND_APP_NAME = "app-miravista-timesheet"     # Must be globally unique
$FUNCTIONS_APP_NAME = "func-miravista-jobs"        # Must be globally unique
$STORAGE_ACCOUNT_NAME = "stmiravistatimesheet"     # Must be globally unique, lowercase, no hyphens
$ACS_NAME = "acs-miravista-prod"
$APP_INSIGHTS_NAME = "ai-miravista-prod"

# Database Configuration
$SQL_ADMIN_USER = "sqladmin"
$SQL_ADMIN_PASSWORD = "YourSecurePassword123!"     # CHANGE THIS - Min 8 chars, complex

# Microsoft Entra ID Configuration
# Get these from Azure Portal > Entra ID > App Registrations
$TENANT_ID = "your-tenant-id-here"
$CLIENT_ID = "your-client-id-here"
$CLIENT_SECRET = "your-client-secret-here"         # CHANGE THIS

# Email Configuration
$ACS_SENDER_ADDRESS = "noreply@miravistalabs.com"
