-- Migration: 006_add_user_title_and_hris_ids
-- Add Title (from Entra ID) and HRIS integration fields

-- Add Title column (job title from Entra ID)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Title')
BEGIN
    ALTER TABLE Users ADD Title NVARCHAR(200) NULL;
    PRINT 'Added Title column to Users table';
END
GO

-- Add PaychexEmployeeID for future Paychex HRIS integration
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'PaychexEmployeeID')
BEGIN
    ALTER TABLE Users ADD PaychexEmployeeID NVARCHAR(100) NULL;
    PRINT 'Added PaychexEmployeeID column to Users table';
END
GO

-- Add TAEmployeeID for future Time & Attendance integration
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'TAEmployeeID')
BEGIN
    ALTER TABLE Users ADD TAEmployeeID NVARCHAR(100) NULL;
    PRINT 'Added TAEmployeeID column to Users table';
END
GO

-- Create indexes for HRIS lookups (when populated)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_PaychexEmployeeID')
BEGIN
    CREATE INDEX IX_Users_PaychexEmployeeID ON Users(PaychexEmployeeID) WHERE PaychexEmployeeID IS NOT NULL;
    PRINT 'Created index IX_Users_PaychexEmployeeID';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_TAEmployeeID')
BEGIN
    CREATE INDEX IX_Users_TAEmployeeID ON Users(TAEmployeeID) WHERE TAEmployeeID IS NOT NULL;
    PRINT 'Created index IX_Users_TAEmployeeID';
END
GO
