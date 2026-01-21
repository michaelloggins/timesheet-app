-- =============================================
-- Migration: 010_add_legacy_sharepoint_import.sql
-- Description: Add tables to track legacy SharePoint timesheet imports
-- =============================================

-- =============================================
-- LEGACY IMPORT TRACKING TABLE
-- Tracks which SharePoint list items have been imported to avoid duplicates
-- =============================================
CREATE TABLE LegacyImportTracking (
    ImportID INT IDENTITY(1,1) PRIMARY KEY,
    SharePointListItemID NVARCHAR(100) NOT NULL,  -- SharePoint List Item ID
    SharePointListID NVARCHAR(100) NOT NULL,       -- SharePoint List GUID
    SharePointSiteID NVARCHAR(100) NOT NULL,       -- SharePoint Site GUID
    UserID INT NULL,                               -- Mapped user ID (NULL if user not found)
    TimesheetID INT NULL,                          -- Created/updated timesheet
    TimeEntryID INT NULL,                          -- Created/updated time entry
    SourceData NVARCHAR(MAX) NULL,                 -- Original SharePoint data (JSON)
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

-- =============================================
-- LEGACY IMPORT BATCH TABLE
-- Tracks import batches for audit and status display
-- =============================================
CREATE TABLE LegacyImportBatch (
    BatchID INT IDENTITY(1,1) PRIMARY KEY,
    TriggerType VARCHAR(20) NOT NULL,              -- 'Auto' (on login) or 'Manual' (admin triggered)
    TriggerUserID INT NULL,                        -- User who triggered (NULL for auto)
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

-- =============================================
-- SYSTEM CONFIGURATION FOR LEGACY IMPORT
-- Stores SharePoint list connection details and feature flag
-- =============================================
-- Note: These will be added to SystemConfig table via INSERT
-- The actual config values should be set by admin

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE NONCLUSTERED INDEX IX_LegacyImport_Status ON LegacyImportTracking(ImportStatus);
CREATE NONCLUSTERED INDEX IX_LegacyImport_User ON LegacyImportTracking(UserID) WHERE UserID IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_LegacyImport_SPItem ON LegacyImportTracking(SharePointListItemID, SharePointListID);
CREATE NONCLUSTERED INDEX IX_LegacyImportBatch_Status ON LegacyImportBatch(Status);
CREATE NONCLUSTERED INDEX IX_LegacyImportBatch_Date ON LegacyImportBatch(StartDate DESC);

GO

-- =============================================
-- INSERT DEFAULT CONFIGURATION VALUES
-- =============================================
-- These are placeholders - actual values must be configured by admin
IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'LegacyImport.Enabled')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.Enabled', 'false', 'Enable/disable legacy SharePoint timesheet import');
END

IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'LegacyImport.SharePointSiteId')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.SharePointSiteId', '', 'SharePoint Site ID containing the legacy timesheet list');
END

IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'LegacyImport.SharePointListId')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.SharePointListId', '', 'SharePoint List ID for legacy timesheets');
END

IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'LegacyImport.LastSyncDate')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.LastSyncDate', '', 'Last successful sync date (ISO format)');
END

IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'LegacyImport.AutoSyncOnLogin')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, Description)
    VALUES ('LegacyImport.AutoSyncOnLogin', 'true', 'Automatically check for new legacy data when users log in');
END

GO

PRINT 'Migration 010 completed: Legacy SharePoint import tables created';
