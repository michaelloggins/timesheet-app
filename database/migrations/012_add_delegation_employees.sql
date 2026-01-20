-- Migration: 010_add_delegation_employees
-- Add DelegationEmployees table to support scoping delegations to specific employees
-- This allows managers to delegate approval authority for only a subset of their direct reports

-- =============================================
-- 1. CREATE DelegationEmployees TABLE
-- Junction table linking delegations to specific employees
-- =============================================
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
GO

-- Create indexes for DelegationEmployees lookups
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

-- =============================================
-- 2. UPDATE DelegationAuditLog CHECK CONSTRAINT
-- Add 'UPDATED' as a valid action
-- =============================================
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

PRINT 'Migration 010_add_delegation_employees completed successfully!';
GO
