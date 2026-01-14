-- Migration: 008_add_delegation_revocation_and_audit
-- Phase 2: Add revocation tracking to ApprovalDelegation and create audit log table
-- This migration supports the delegation management API

-- =============================================
-- 1. ADD RevokedDate COLUMN TO ApprovalDelegation
-- Tracks when a delegation was revoked
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ApprovalDelegation') AND name = 'RevokedDate')
BEGIN
    ALTER TABLE ApprovalDelegation ADD RevokedDate DATETIME2 NULL;
    PRINT 'Added RevokedDate column to ApprovalDelegation table';
END
GO

-- =============================================
-- 2. ADD RevokedByUserID COLUMN TO ApprovalDelegation
-- Tracks who revoked the delegation
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ApprovalDelegation') AND name = 'RevokedByUserID')
BEGIN
    ALTER TABLE ApprovalDelegation ADD RevokedByUserID INT NULL;
    PRINT 'Added RevokedByUserID column to ApprovalDelegation table';
END
GO

-- Add foreign key constraint for RevokedByUserID
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ApprovalDelegation_RevokedBy')
BEGIN
    ALTER TABLE ApprovalDelegation
        ADD CONSTRAINT FK_ApprovalDelegation_RevokedBy
        FOREIGN KEY (RevokedByUserID) REFERENCES Users(UserID);
    PRINT 'Added RevokedByUserID foreign key constraint to ApprovalDelegation';
END
GO

-- =============================================
-- 3. CREATE DelegationAuditLog TABLE
-- Tracks all delegation create/revoke actions for audit purposes
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DelegationAuditLog')
BEGIN
    CREATE TABLE DelegationAuditLog (
        AuditID BIGINT IDENTITY(1,1) PRIMARY KEY,
        DelegationID INT NOT NULL,
        Action VARCHAR(20) NOT NULL,
        ActionByUserID INT NOT NULL,
        DelegatorUserID INT NOT NULL,
        DelegateUserID INT NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Reason NVARCHAR(500) NULL,
        ActionDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_DelegationAuditLog_ActionBy FOREIGN KEY (ActionByUserID)
            REFERENCES Users(UserID),
        CONSTRAINT FK_DelegationAuditLog_Delegator FOREIGN KEY (DelegatorUserID)
            REFERENCES Users(UserID),
        CONSTRAINT FK_DelegationAuditLog_Delegate FOREIGN KEY (DelegateUserID)
            REFERENCES Users(UserID),
        CONSTRAINT CHK_DelegationAuditLog_Action CHECK (Action IN ('CREATED', 'REVOKED'))
    );
    PRINT 'Created DelegationAuditLog table';
END
GO

-- Create index for DelegationAuditLog lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DelegationAuditLog_DelegationID')
BEGIN
    CREATE INDEX IX_DelegationAuditLog_DelegationID ON DelegationAuditLog(DelegationID);
    PRINT 'Created index IX_DelegationAuditLog_DelegationID';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DelegationAuditLog_ActionDate')
BEGIN
    CREATE INDEX IX_DelegationAuditLog_ActionDate ON DelegationAuditLog(ActionDate);
    PRINT 'Created index IX_DelegationAuditLog_ActionDate';
END
GO

-- =============================================
-- 4. CREATE VIEW FOR ACTIVE DELEGATIONS
-- Simplifies querying currently active delegations
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ActiveDelegations')
BEGIN
    DROP VIEW vw_ActiveDelegations;
    PRINT 'Dropped existing vw_ActiveDelegations view';
END
GO

CREATE VIEW vw_ActiveDelegations AS
SELECT
    d.DelegationID,
    d.DelegatorUserID,
    d.DelegateUserID,
    d.StartDate,
    d.EndDate,
    d.Reason,
    d.CreatedDate,
    d.CreatedByUserID,
    delegator.Name AS DelegatorName,
    delegator.Email AS DelegatorEmail,
    delegate.Name AS DelegateName,
    delegate.Email AS DelegateEmail
FROM ApprovalDelegation d
INNER JOIN Users delegator ON d.DelegatorUserID = delegator.UserID
INNER JOIN Users delegate ON d.DelegateUserID = delegate.UserID
WHERE d.IsActive = 1
    AND CAST(GETUTCDATE() AS DATE) BETWEEN d.StartDate AND d.EndDate;
GO
PRINT 'Created vw_ActiveDelegations view';
GO

PRINT 'Migration 008_add_delegation_revocation_and_audit completed successfully!';
GO
