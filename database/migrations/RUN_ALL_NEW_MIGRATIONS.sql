-- ============================================================
-- MiraVista Timesheet - Combined Migration Script
-- Run this in VSCode (SQL Server extension) or Azure Data Studio
-- ============================================================
-- Migrations included:
--   003_add_work_week_pattern.sql
--   010_add_legacy_sharepoint_import.sql
--   012_add_delegation_employees.sql
--   013_add_new_admin_roles.sql
--   014_add_project_targeting.sql
-- ============================================================

PRINT '============================================================';
PRINT 'Starting MiraVista Timesheet Migrations';
PRINT '============================================================';
GO

-- ============================================================
-- MIGRATION 003: Add Work Week Pattern to Users Table
-- ============================================================
PRINT '';
PRINT '>>> Migration 003: Add Work Week Pattern';
PRINT '------------------------------------------------------------';

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Users')
    AND name = 'WorkWeekPattern'
)
BEGIN
    ALTER TABLE Users
    ADD WorkWeekPattern VARCHAR(20) NULL
        CONSTRAINT CHK_Users_WorkWeekPattern
        CHECK (WorkWeekPattern IN ('MondayFriday', 'TuesdaySaturday'));

    PRINT 'Added WorkWeekPattern column to Users table';
END
ELSE
BEGIN
    PRINT 'WorkWeekPattern column already exists';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Users_WorkWeekPattern'
    AND object_id = OBJECT_ID('Users')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_WorkWeekPattern
    ON Users(WorkWeekPattern)
    WHERE WorkWeekPattern IS NOT NULL AND IsActive = 1;

    PRINT 'Created index IX_Users_WorkWeekPattern';
END
GO

PRINT 'Migration 003 completed';
GO

-- ============================================================
-- MIGRATION 010: Add Legacy SharePoint Import Tables
-- ============================================================
PRINT '';
PRINT '>>> Migration 010: Add Legacy SharePoint Import';
PRINT '------------------------------------------------------------';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LegacyImportTracking')
BEGIN
    CREATE TABLE LegacyImportTracking (
        ImportID INT IDENTITY(1,1) PRIMARY KEY,
        SharePointListItemID NVARCHAR(100) NOT NULL,
        SharePointListID NVARCHAR(100) NOT NULL,
        SharePointSiteID NVARCHAR(100) NOT NULL,
        UserID INT NULL,
        TimesheetID INT NULL,
        TimeEntryID INT NULL,
        SourceData NVARCHAR(MAX) NULL,
        ImportStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
        ImportedDate DATETIME2 NULL,
        ErrorMessage NVARCHAR(1000) NULL,
        CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_LegacyImport_User FOREIGN KEY (UserID)
            REFERENCES Users(UserID),
        CONSTRAINT FK_LegacyImport_Timesheet FOREIGN KEY (TimesheetID)
            REFERENCES Timesheets(TimesheetID),
        CONSTRAINT CHK_LegacyImport_Status CHECK (ImportStatus IN ('Pending', 'Imported', 'Skipped', 'Failed', 'UserNotFound', 'Duplicate')),
        CONSTRAINT UQ_LegacyImport_SPItem UNIQUE (SharePointListItemID, SharePointListID, SharePointSiteID)
    );
    PRINT 'Created LegacyImportTracking table';
END
ELSE
BEGIN
    PRINT 'LegacyImportTracking table already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LegacyImportBatch')
BEGIN
    CREATE TABLE LegacyImportBatch (
        BatchID INT IDENTITY(1,1) PRIMARY KEY,
        TriggerType VARCHAR(20) NOT NULL,
        TriggerUserID INT NULL,
        StartDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        EndDate DATETIME2 NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'Running',
        TotalItems INT NOT NULL DEFAULT 0,
        ImportedItems INT NOT NULL DEFAULT 0,
        SkippedItems INT NOT NULL DEFAULT 0,
        FailedItems INT NOT NULL DEFAULT 0,
        ErrorMessage NVARCHAR(MAX) NULL,
        CONSTRAINT FK_LegacyImportBatch_User FOREIGN KEY (TriggerUserID)
            REFERENCES Users(UserID),
        CONSTRAINT CHK_LegacyImportBatch_Status CHECK (Status IN ('Running', 'Completed', 'Failed', 'Cancelled')),
        CONSTRAINT CHK_LegacyImportBatch_Trigger CHECK (TriggerType IN ('Auto', 'Manual'))
    );
    PRINT 'Created LegacyImportBatch table';
END
ELSE
BEGIN
    PRINT 'LegacyImportBatch table already exists';
END
GO

-- Create indexes for LegacyImportTracking
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LegacyImport_Status')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LegacyImport_Status ON LegacyImportTracking(ImportStatus);
    PRINT 'Created index IX_LegacyImport_Status';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LegacyImport_User')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LegacyImport_User ON LegacyImportTracking(UserID) WHERE UserID IS NOT NULL;
    PRINT 'Created index IX_LegacyImport_User';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LegacyImport_SPItem')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LegacyImport_SPItem ON LegacyImportTracking(SharePointListItemID, SharePointListID);
    PRINT 'Created index IX_LegacyImport_SPItem';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LegacyImportBatch_Status')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LegacyImportBatch_Status ON LegacyImportBatch(Status);
    PRINT 'Created index IX_LegacyImportBatch_Status';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LegacyImportBatch_Date')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LegacyImportBatch_Date ON LegacyImportBatch(StartDate DESC);
    PRINT 'Created index IX_LegacyImportBatch_Date';
END
GO

-- Insert default configuration values
IF NOT EXISTS (SELECT 1 FROM SystemConfiguration WHERE ConfigKey = 'LegacyImport.Enabled')
BEGIN
    INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.Enabled', 'false', 'Enable/disable legacy SharePoint timesheet import');
    PRINT 'Added LegacyImport.Enabled config';
END
GO

IF NOT EXISTS (SELECT 1 FROM SystemConfiguration WHERE ConfigKey = 'LegacyImport.SharePointSiteId')
BEGIN
    INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.SharePointSiteId', '', 'SharePoint Site ID containing the legacy timesheet list');
    PRINT 'Added LegacyImport.SharePointSiteId config';
END
GO

IF NOT EXISTS (SELECT 1 FROM SystemConfiguration WHERE ConfigKey = 'LegacyImport.SharePointListId')
BEGIN
    INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.SharePointListId', '', 'SharePoint List ID for legacy timesheets');
    PRINT 'Added LegacyImport.SharePointListId config';
END
GO

IF NOT EXISTS (SELECT 1 FROM SystemConfiguration WHERE ConfigKey = 'LegacyImport.LastSyncDate')
BEGIN
    INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.LastSyncDate', '', 'Last successful sync date (ISO format)');
    PRINT 'Added LegacyImport.LastSyncDate config';
END
GO

IF NOT EXISTS (SELECT 1 FROM SystemConfiguration WHERE ConfigKey = 'LegacyImport.AutoSyncOnLogin')
BEGIN
    INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.AutoSyncOnLogin', 'true', 'Automatically check for new legacy data when users log in');
    PRINT 'Added LegacyImport.AutoSyncOnLogin config';
END
GO

PRINT 'Migration 010 completed';
GO

-- ============================================================
-- MIGRATION 012: Add Delegation Employees Table
-- ============================================================
PRINT '';
PRINT '>>> Migration 012: Add Delegation Employees';
PRINT '------------------------------------------------------------';

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DelegationEmployees')
BEGIN
    CREATE TABLE DelegationEmployees (
        DelegationEmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        DelegationID INT NOT NULL,
        EmployeeUserID INT NOT NULL,
        CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_DelegationEmployees_Delegation FOREIGN KEY (DelegationID)
            REFERENCES ApprovalDelegation(DelegationID) ON DELETE CASCADE,
        CONSTRAINT FK_DelegationEmployees_Employee FOREIGN KEY (EmployeeUserID)
            REFERENCES Users(UserID),
        CONSTRAINT UQ_DelegationEmployees_Unique UNIQUE (DelegationID, EmployeeUserID)
    );
    PRINT 'Created DelegationEmployees table';
END
ELSE
BEGIN
    PRINT 'DelegationEmployees table already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DelegationEmployees_DelegationID')
BEGIN
    CREATE INDEX IX_DelegationEmployees_DelegationID ON DelegationEmployees(DelegationID);
    PRINT 'Created index IX_DelegationEmployees_DelegationID';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DelegationEmployees_EmployeeUserID')
BEGIN
    CREATE INDEX IX_DelegationEmployees_EmployeeUserID ON DelegationEmployees(EmployeeUserID);
    PRINT 'Created index IX_DelegationEmployees_EmployeeUserID';
END
GO

-- Update DelegationAuditLog constraint to include UPDATED action
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_DelegationAuditLog_Action')
BEGIN
    ALTER TABLE DelegationAuditLog DROP CONSTRAINT CHK_DelegationAuditLog_Action;
    PRINT 'Dropped old CHK_DelegationAuditLog_Action constraint';
END
GO

ALTER TABLE DelegationAuditLog
    ADD CONSTRAINT CHK_DelegationAuditLog_Action
    CHECK (Action IN ('CREATED', 'REVOKED', 'UPDATED'));
PRINT 'Recreated CHK_DelegationAuditLog_Action constraint with UPDATED action';
GO

PRINT 'Migration 012 completed';
GO

-- ============================================================
-- MIGRATION 013: Add New Admin Roles
-- ============================================================
PRINT '';
PRINT '>>> Migration 013: Add New Admin Roles';
PRINT '------------------------------------------------------------';

IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Users_Role')
BEGIN
    ALTER TABLE Users DROP CONSTRAINT CHK_Users_Role;
    PRINT 'Dropped existing CHK_Users_Role constraint';
END
GO

ALTER TABLE Users ADD CONSTRAINT CHK_Users_Role
    CHECK (Role IN ('Employee', 'Manager', 'TimesheetAdmin', 'Leadership', 'ProjectAdmin', 'AuditReviewer'));
PRINT 'Created new CHK_Users_Role constraint with ProjectAdmin and AuditReviewer roles';
GO

PRINT 'Migration 013 completed';
GO

-- ============================================================
-- MIGRATION 014: Add Project Targeting (Multi-Department)
-- ============================================================
PRINT '';
PRINT '>>> Migration 014: Add Project Targeting';
PRINT '------------------------------------------------------------';

-- Make DepartmentID nullable on Projects table
IF EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Projects'
    AND COLUMN_NAME = 'DepartmentID'
    AND IS_NULLABLE = 'NO'
)
BEGIN
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Projects_Department')
    BEGIN
        ALTER TABLE Projects DROP CONSTRAINT FK_Projects_Department;
        PRINT 'Dropped FK_Projects_Department constraint';
    END

    ALTER TABLE Projects ALTER COLUMN DepartmentID INT NULL;
    PRINT 'Modified Projects.DepartmentID to allow NULL values';

    ALTER TABLE Projects ADD CONSTRAINT FK_Projects_Department
        FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID);
    PRINT 'Re-added FK_Projects_Department constraint';
END
ELSE
BEGIN
    PRINT 'Projects.DepartmentID already allows NULL';
END
GO

-- Create ProjectDepartments junction table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectDepartments')
BEGIN
    CREATE TABLE ProjectDepartments (
        ProjectDepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL,
        DepartmentID INT NOT NULL,
        CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_ProjectDepartments_Project FOREIGN KEY (ProjectID)
            REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectDepartments_Department FOREIGN KEY (DepartmentID)
            REFERENCES Departments(DepartmentID),
        CONSTRAINT UQ_ProjectDepartments_Unique UNIQUE (ProjectID, DepartmentID)
    );
    PRINT 'Created ProjectDepartments table';
END
ELSE
BEGIN
    PRINT 'ProjectDepartments table already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProjectDepartments_ProjectID')
BEGIN
    CREATE INDEX IX_ProjectDepartments_ProjectID ON ProjectDepartments(ProjectID);
    PRINT 'Created index IX_ProjectDepartments_ProjectID';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProjectDepartments_DepartmentID')
BEGIN
    CREATE INDEX IX_ProjectDepartments_DepartmentID ON ProjectDepartments(DepartmentID);
    PRINT 'Created index IX_ProjectDepartments_DepartmentID';
END
GO

-- Create ProjectEmployees junction table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectEmployees')
BEGIN
    CREATE TABLE ProjectEmployees (
        ProjectEmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL,
        UserID INT NOT NULL,
        CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_ProjectEmployees_Project FOREIGN KEY (ProjectID)
            REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectEmployees_User FOREIGN KEY (UserID)
            REFERENCES Users(UserID),
        CONSTRAINT UQ_ProjectEmployees_Unique UNIQUE (ProjectID, UserID)
    );
    PRINT 'Created ProjectEmployees table';
END
ELSE
BEGIN
    PRINT 'ProjectEmployees table already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProjectEmployees_ProjectID')
BEGIN
    CREATE INDEX IX_ProjectEmployees_ProjectID ON ProjectEmployees(ProjectID);
    PRINT 'Created index IX_ProjectEmployees_ProjectID';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProjectEmployees_UserID')
BEGIN
    CREATE INDEX IX_ProjectEmployees_UserID ON ProjectEmployees(UserID);
    PRINT 'Created index IX_ProjectEmployees_UserID';
END
GO

-- Create view for user accessible projects
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_UserAccessibleProjects')
BEGIN
    DROP VIEW vw_UserAccessibleProjects;
    PRINT 'Dropped existing vw_UserAccessibleProjects view';
END
GO

CREATE VIEW vw_UserAccessibleProjects AS
SELECT DISTINCT
    p.ProjectID,
    p.ProjectNumber,
    p.ProjectName,
    p.DepartmentID,
    p.ProjectType,
    p.GrantIdentifier,
    p.IsActive,
    p.CreatedDate,
    p.ModifiedDate,
    u.UserID
FROM Projects p
CROSS JOIN Users u
WHERE p.IsActive = 1
    AND u.IsActive = 1
    AND (
        -- Universal project: no departments assigned AND no employees assigned
        (
            NOT EXISTS (SELECT 1 FROM ProjectDepartments pd WHERE pd.ProjectID = p.ProjectID)
            AND NOT EXISTS (SELECT 1 FROM ProjectEmployees pe WHERE pe.ProjectID = p.ProjectID)
        )
        -- OR user's department is assigned to the project
        OR EXISTS (
            SELECT 1 FROM ProjectDepartments pd
            WHERE pd.ProjectID = p.ProjectID AND pd.DepartmentID = u.DepartmentID
        )
        -- OR user is directly assigned to the project
        OR EXISTS (
            SELECT 1 FROM ProjectEmployees pe
            WHERE pe.ProjectID = p.ProjectID AND pe.UserID = u.UserID
        )
    );
GO
PRINT 'Created vw_UserAccessibleProjects view';
GO

-- Migrate existing project department assignments
INSERT INTO ProjectDepartments (ProjectID, DepartmentID)
SELECT p.ProjectID, p.DepartmentID
FROM Projects p
WHERE p.DepartmentID IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM ProjectDepartments pd
        WHERE pd.ProjectID = p.ProjectID AND pd.DepartmentID = p.DepartmentID
    );
PRINT 'Migrated existing project department assignments to ProjectDepartments table';
GO

PRINT 'Migration 014 completed';
GO

-- ============================================================
-- ALL MIGRATIONS COMPLETE
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'All migrations completed successfully!';
PRINT '============================================================';
PRINT '';
PRINT 'Summary of changes:';
PRINT '  - Users.WorkWeekPattern column added';
PRINT '  - LegacyImportTracking table created';
PRINT '  - LegacyImportBatch table created';
PRINT '  - DelegationEmployees table created';
PRINT '  - ProjectAdmin and AuditReviewer roles added';
PRINT '  - ProjectDepartments table created';
PRINT '  - ProjectEmployees table created';
PRINT '  - vw_UserAccessibleProjects view created';
PRINT '============================================================';
GO
