-- Migration: 011_add_new_admin_roles
-- Add ProjectAdmin and AuditReviewer roles to the Users table
-- ProjectAdmin: Access to Admin Panel -> Projects section only
-- AuditReviewer: Access to Admin -> Audit -> Timesheet Activity only

-- =============================================
-- 1. DROP AND RECREATE ROLE CHECK CONSTRAINT
-- Update to include new roles: ProjectAdmin, AuditReviewer
-- =============================================
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

PRINT 'Migration 011_add_new_admin_roles completed successfully!';
GO
