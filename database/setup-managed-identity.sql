-- Setup Managed Identity for Azure Web App to access TimesheetDB
-- This script must be run by an Azure AD admin user
-- Run this in Azure Data Studio or Azure Portal Query Editor

-- Connect to TimesheetDB database (not master)
USE TimesheetDB;
GO

-- Create a user for the managed identity
-- Replace 'api-miravista-timesheet' with your Web App name
CREATE USER [api-miravista-timesheet] FROM EXTERNAL PROVIDER;
GO

-- Grant necessary permissions
-- For full application access, grant db_datareader and db_datawriter
ALTER ROLE db_datareader ADD MEMBER [api-miravista-timesheet];
ALTER ROLE db_datawriter ADD MEMBER [api-miravista-timesheet];
ALTER ROLE db_ddladmin ADD MEMBER [api-miravista-timesheet]; -- Only if app needs to create/modify schema
GO

-- Verify the user was created
SELECT name, type_desc, authentication_type_desc
FROM sys.database_principals
WHERE name = 'api-miravista-timesheet';
GO

-- Grant execute permissions on stored procedures if needed
-- GRANT EXECUTE TO [api-miravista-timesheet];
-- GO

PRINT 'Managed identity setup complete!';
