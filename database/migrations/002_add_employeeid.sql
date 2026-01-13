-- Migration: Add EmployeeID column to Users table
-- Date: 2026-01-12
-- Description: Adds EmployeeID field synced from Entra ID

-- Add EmployeeID column if it doesn't exist
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'EmployeeID'
)
BEGIN
    ALTER TABLE Users ADD EmployeeID NVARCHAR(50) NULL;
    PRINT 'Added EmployeeID column to Users table';
END
ELSE
BEGIN
    PRINT 'EmployeeID column already exists';
END
GO

-- Add index on EmployeeID for faster lookups
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Users_EmployeeID' AND object_id = OBJECT_ID('Users')
)
BEGIN
    CREATE INDEX IX_Users_EmployeeID ON Users(EmployeeID) WHERE EmployeeID IS NOT NULL;
    PRINT 'Created index on EmployeeID';
END
GO
