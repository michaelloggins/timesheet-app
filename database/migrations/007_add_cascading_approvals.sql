-- Migration: 007_add_cascading_approvals
-- Phase 1: Add ApprovalDelegation table and enhance TimesheetHistory for cascading approvals
-- This migration supports org-chart based approvals using ManagerEntraID

-- =============================================
-- 1. CREATE ApprovalDelegation TABLE
-- Allows managers to delegate approval authority during absences
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApprovalDelegation')
BEGIN
    CREATE TABLE ApprovalDelegation (
        DelegationID INT IDENTITY(1,1) PRIMARY KEY,
        DelegatorUserID INT NOT NULL,       -- Manager delegating authority
        DelegateUserID INT NOT NULL,        -- Person receiving authority
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Reason NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME2 DEFAULT GETUTCDATE(),
        CreatedByUserID INT NOT NULL,
        CONSTRAINT FK_ApprovalDelegation_Delegator FOREIGN KEY (DelegatorUserID)
            REFERENCES Users(UserID),
        CONSTRAINT FK_ApprovalDelegation_Delegate FOREIGN KEY (DelegateUserID)
            REFERENCES Users(UserID),
        CONSTRAINT FK_ApprovalDelegation_CreatedBy FOREIGN KEY (CreatedByUserID)
            REFERENCES Users(UserID),
        CONSTRAINT CHK_ApprovalDelegation_DateRange CHECK (EndDate >= StartDate),
        CONSTRAINT CHK_ApprovalDelegation_NotSelf CHECK (DelegatorUserID != DelegateUserID)
    );
    PRINT 'Created ApprovalDelegation table';
END
GO

-- Add RevokedDate and RevokedByUserID columns if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ApprovalDelegation') AND name = 'RevokedDate')
BEGIN
    ALTER TABLE ApprovalDelegation ADD RevokedDate DATETIME2 NULL;
    PRINT 'Added RevokedDate column to ApprovalDelegation table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ApprovalDelegation') AND name = 'RevokedByUserID')
BEGIN
    ALTER TABLE ApprovalDelegation ADD RevokedByUserID INT NULL;
    ALTER TABLE ApprovalDelegation ADD CONSTRAINT FK_ApprovalDelegation_RevokedBy
        FOREIGN KEY (RevokedByUserID) REFERENCES Users(UserID);
    PRINT 'Added RevokedByUserID column to ApprovalDelegation table';
END
GO

-- Create indexes for ApprovalDelegation lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApprovalDelegation_Delegator')
BEGIN
    CREATE INDEX IX_ApprovalDelegation_Delegator ON ApprovalDelegation(DelegatorUserID)
        WHERE IsActive = 1;
    PRINT 'Created index IX_ApprovalDelegation_Delegator';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApprovalDelegation_Delegate')
BEGIN
    CREATE INDEX IX_ApprovalDelegation_Delegate ON ApprovalDelegation(DelegateUserID)
        WHERE IsActive = 1;
    PRINT 'Created index IX_ApprovalDelegation_Delegate';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApprovalDelegation_Active')
BEGIN
    CREATE INDEX IX_ApprovalDelegation_Active ON ApprovalDelegation(StartDate, EndDate)
        WHERE IsActive = 1;
    PRINT 'Created index IX_ApprovalDelegation_Active';
END
GO

-- =============================================
-- 2. ADD ApprovalType COLUMN TO TimesheetHistory
-- Tracks how the approval was performed (Primary, Delegate, Escalated, Admin)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TimesheetHistory') AND name = 'ApprovalType')
BEGIN
    ALTER TABLE TimesheetHistory ADD ApprovalType VARCHAR(20) NULL;
    PRINT 'Added ApprovalType column to TimesheetHistory table';
END
GO

-- Add check constraint for valid ApprovalType values
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_TimesheetHistory_ApprovalType')
BEGIN
    ALTER TABLE TimesheetHistory
        ADD CONSTRAINT CHK_TimesheetHistory_ApprovalType
        CHECK (ApprovalType IS NULL OR ApprovalType IN ('Primary', 'Delegate', 'Escalated', 'Admin'));
    PRINT 'Added ApprovalType check constraint to TimesheetHistory';
END
GO

-- =============================================
-- 3. ADD OnBehalfOfUserID COLUMN TO TimesheetHistory
-- Records the original manager when a delegate performs approval
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TimesheetHistory') AND name = 'OnBehalfOfUserID')
BEGIN
    ALTER TABLE TimesheetHistory ADD OnBehalfOfUserID INT NULL;
    PRINT 'Added OnBehalfOfUserID column to TimesheetHistory table';
END
GO

-- Add foreign key constraint for OnBehalfOfUserID
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TimesheetHistory_OnBehalfOf')
BEGIN
    ALTER TABLE TimesheetHistory
        ADD CONSTRAINT FK_TimesheetHistory_OnBehalfOf
        FOREIGN KEY (OnBehalfOfUserID) REFERENCES Users(UserID);
    PRINT 'Added OnBehalfOfUserID foreign key constraint to TimesheetHistory';
END
GO

-- =============================================
-- 4. ADD INDEX FOR ManagerEntraID LOOKUPS
-- Supports efficient org chart traversal for approvals
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_ManagerEntraID')
BEGIN
    CREATE INDEX IX_Users_ManagerEntraID ON Users(ManagerEntraID)
        WHERE IsActive = 1;
    PRINT 'Created index IX_Users_ManagerEntraID';
END
GO

-- =============================================
-- 5. UPDATE Action CHECK CONSTRAINT
-- Add 'Withdrawn' action if not already present (for completeness)
-- =============================================
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_TimesheetHistory_Action')
BEGIN
    -- Drop old constraint and recreate with additional valid actions
    ALTER TABLE TimesheetHistory DROP CONSTRAINT CHK_TimesheetHistory_Action;
    PRINT 'Dropped old CHK_TimesheetHistory_Action constraint';
END
GO

-- Recreate with all valid actions including Withdrawn and Delegated
ALTER TABLE TimesheetHistory
    ADD CONSTRAINT CHK_TimesheetHistory_Action
    CHECK (Action IN ('Created', 'Submitted', 'Approved', 'Returned', 'Unlocked', 'Modified', 'Withdrawn', 'Delegated'));
PRINT 'Recreated CHK_TimesheetHistory_Action constraint with additional actions';
GO

-- =============================================
-- 6. CREATE DelegationAuditLog TABLE
-- Audit trail for delegation creation and revocation
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DelegationAuditLog')
BEGIN
    CREATE TABLE DelegationAuditLog (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        DelegationID INT NOT NULL,
        Action VARCHAR(20) NOT NULL,
        ActionByUserID INT NOT NULL,
        DelegatorUserID INT NOT NULL,
        DelegateUserID INT NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Reason NVARCHAR(500) NULL,
        ActionDate DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT FK_DelegationAuditLog_ActionBy FOREIGN KEY (ActionByUserID)
            REFERENCES Users(UserID),
        CONSTRAINT CHK_DelegationAuditLog_Action CHECK (Action IN ('CREATED', 'REVOKED'))
    );
    PRINT 'Created DelegationAuditLog table';
END
GO

PRINT 'Migration 007_add_cascading_approvals completed successfully!';
GO
