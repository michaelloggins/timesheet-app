-- Migration: 009_add_admin_audit_log
-- Add AdminAuditLog table for tracking administrative actions
-- This includes: User sync, Project CRUD, Department CRUD, Holiday CRUD, System config changes

-- =============================================
-- 1. CREATE AdminAuditLog TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminAuditLog')
BEGIN
    CREATE TABLE AdminAuditLog (
        AuditID BIGINT IDENTITY(1,1) PRIMARY KEY,
        ActionType VARCHAR(50) NOT NULL,           -- e.g., 'USER_SYNC', 'PROJECT_CREATE', 'DEPARTMENT_UPDATE'
        ActionByUserID INT NOT NULL,
        EntityType VARCHAR(50) NULL,               -- e.g., 'User', 'Project', 'Department', 'Holiday'
        EntityID INT NULL,                         -- The ID of the affected entity (if applicable)
        EntityName NVARCHAR(255) NULL,             -- Name/identifier for readability
        Details NVARCHAR(MAX) NULL,                -- JSON with additional details
        ActionDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        IPAddress VARCHAR(45) NULL,                -- Client IP if available
        CONSTRAINT FK_AdminAuditLog_ActionBy FOREIGN KEY (ActionByUserID)
            REFERENCES Users(UserID)
    );
    PRINT 'Created AdminAuditLog table';
END
GO

-- Create indexes for AdminAuditLog lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminAuditLog_ActionDate')
BEGIN
    CREATE INDEX IX_AdminAuditLog_ActionDate ON AdminAuditLog(ActionDate DESC);
    PRINT 'Created index IX_AdminAuditLog_ActionDate';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminAuditLog_ActionType')
BEGIN
    CREATE INDEX IX_AdminAuditLog_ActionType ON AdminAuditLog(ActionType);
    PRINT 'Created index IX_AdminAuditLog_ActionType';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AdminAuditLog_EntityType')
BEGIN
    CREATE INDEX IX_AdminAuditLog_EntityType ON AdminAuditLog(EntityType, EntityID);
    PRINT 'Created index IX_AdminAuditLog_EntityType';
END
GO

PRINT 'Migration 009_add_admin_audit_log completed successfully!';
GO
