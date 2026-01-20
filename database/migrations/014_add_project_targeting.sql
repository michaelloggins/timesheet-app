-- Migration: 011_add_project_targeting
-- Add ProjectDepartments and ProjectEmployees tables to support multi-department and employee targeting
-- This allows projects to be assigned to:
-- 1. All Departments (company-wide) - DepartmentID IS NULL and no entries in ProjectDepartments
-- 2. One or more specific Departments - entries in ProjectDepartments junction table
-- 3. Specific employees - entries in ProjectEmployees junction table
-- The goal is to limit visible projects to only those relevant to the user's reporting requirements

-- =============================================
-- 1. MODIFY Projects TABLE - Allow NULL DepartmentID
-- NULL means no default department (will use junction tables instead)
-- For backward compatibility, existing projects with DepartmentID remain as-is
-- =============================================

-- Check if DepartmentID column allows NULLs, if not, alter it
IF EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Projects'
    AND COLUMN_NAME = 'DepartmentID'
    AND IS_NULLABLE = 'NO'
)
BEGIN
    -- Drop existing foreign key constraint
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Projects_Department')
    BEGIN
        ALTER TABLE Projects DROP CONSTRAINT FK_Projects_Department;
        PRINT 'Dropped FK_Projects_Department constraint';
    END

    -- Modify column to allow NULLs
    ALTER TABLE Projects ALTER COLUMN DepartmentID INT NULL;
    PRINT 'Modified Projects.DepartmentID to allow NULL values';

    -- Re-add foreign key constraint
    ALTER TABLE Projects ADD CONSTRAINT FK_Projects_Department
        FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID);
    PRINT 'Re-added FK_Projects_Department constraint';
END
GO

-- =============================================
-- 2. CREATE ProjectDepartments TABLE
-- Junction table for project-to-department many-to-many relationship
-- =============================================
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
GO

-- Create indexes for ProjectDepartments lookups
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

-- =============================================
-- 3. CREATE ProjectEmployees TABLE
-- Junction table for direct project-to-employee assignments
-- =============================================
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
GO

-- Create indexes for ProjectEmployees lookups
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

-- =============================================
-- 4. CREATE VIEW FOR USER ACCESSIBLE PROJECTS
-- Returns projects a user can access based on:
-- 1. Universal projects (no department assignments and no employee assignments)
-- 2. Projects assigned to the user's department (via ProjectDepartments)
-- 3. Projects directly assigned to the user (via ProjectEmployees)
-- =============================================
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

-- =============================================
-- 5. MIGRATE EXISTING PROJECT DEPARTMENT ASSIGNMENTS
-- For existing projects with DepartmentID set, create entries in ProjectDepartments
-- This ensures backward compatibility
-- =============================================
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

PRINT 'Migration 011_add_project_targeting completed successfully!';
GO
