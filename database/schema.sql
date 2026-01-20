-- =============================================
-- MiraVista Timesheet System - Database Schema
-- Version: 1.0
-- Azure SQL Database
-- =============================================

-- =============================================
-- 1. DEPARTMENTS TABLE
-- =============================================
CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentCode VARCHAR(20) NOT NULL UNIQUE,
    DepartmentName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- =============================================
-- 2. USERS TABLE
-- =============================================
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    EntraIDObjectID NVARCHAR(100) NOT NULL UNIQUE,
    EmployeeID NVARCHAR(50) NULL,
    Email NVARCHAR(255) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    DepartmentID INT NOT NULL,
    Role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    ManagerEntraID NVARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    DeactivatedDate DATETIME2 NULL,
    DeactivationReason NVARCHAR(500) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastLoginDate DATETIME2 NULL,
    CONSTRAINT FK_Users_Department FOREIGN KEY (DepartmentID)
        REFERENCES Departments(DepartmentID),
    CONSTRAINT CHK_Users_Role CHECK (Role IN ('Employee', 'Manager', 'TimesheetAdmin', 'Leadership', 'ProjectAdmin', 'AuditReviewer'))
);

-- =============================================
-- 3. PROJECTS TABLE
-- =============================================
CREATE TABLE Projects (
    ProjectID INT IDENTITY(1,1) PRIMARY KEY,
    ProjectNumber VARCHAR(50) NOT NULL UNIQUE,
    ProjectName NVARCHAR(200) NOT NULL,
    DepartmentID INT NOT NULL,
    ProjectType VARCHAR(20) NOT NULL DEFAULT 'Work',
    GrantIdentifier VARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Projects_Department FOREIGN KEY (DepartmentID)
        REFERENCES Departments(DepartmentID),
    CONSTRAINT CHK_Projects_Type CHECK (ProjectType IN ('Work', 'PTO', 'Holiday'))
);

-- =============================================
-- 4. TIMESHEETS TABLE
-- =============================================
CREATE TABLE Timesheets (
    TimesheetID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    PeriodStartDate DATE NOT NULL,
    PeriodEndDate DATE NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    SubmittedDate DATETIME2 NULL,
    ApprovedDate DATETIME2 NULL,
    ApprovedByUserID INT NULL,
    ReturnReason NVARCHAR(500) NULL,
    IsLocked BIT NOT NULL DEFAULT 0,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Timesheets_User FOREIGN KEY (UserID)
        REFERENCES Users(UserID),
    CONSTRAINT FK_Timesheets_ApprovedBy FOREIGN KEY (ApprovedByUserID)
        REFERENCES Users(UserID),
    CONSTRAINT CHK_Timesheets_Status CHECK (Status IN ('Draft', 'Submitted', 'Approved', 'Returned')),
    CONSTRAINT UQ_Timesheets_UserPeriod UNIQUE (UserID, PeriodStartDate)
);

-- =============================================
-- 5. TIME ENTRIES TABLE
-- =============================================
CREATE TABLE TimeEntries (
    TimeEntryID INT IDENTITY(1,1) PRIMARY KEY,
    TimesheetID INT NOT NULL,
    UserID INT NOT NULL,
    ProjectID INT NOT NULL,
    WorkDate DATE NOT NULL,
    HoursWorked DECIMAL(5,2) NOT NULL,
    WorkLocation VARCHAR(20) NOT NULL DEFAULT 'Office',
    Notes NVARCHAR(500) NULL,
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_TimeEntries_Timesheet FOREIGN KEY (TimesheetID)
        REFERENCES Timesheets(TimesheetID) ON DELETE CASCADE,
    CONSTRAINT FK_TimeEntries_User FOREIGN KEY (UserID)
        REFERENCES Users(UserID),
    CONSTRAINT FK_TimeEntries_Project FOREIGN KEY (ProjectID)
        REFERENCES Projects(ProjectID),
    CONSTRAINT CHK_TimeEntries_Hours CHECK (HoursWorked >= 0 AND HoursWorked <= 24),
    CONSTRAINT CHK_TimeEntries_Location CHECK (WorkLocation IN ('Office', 'WFH', 'Other')),
    CONSTRAINT UQ_TimeEntries_UserDateProject UNIQUE (UserID, WorkDate, ProjectID)
);

-- =============================================
-- 6. TIMESHEET HISTORY TABLE (Audit Log)
-- =============================================
CREATE TABLE TimesheetHistory (
    HistoryID BIGINT IDENTITY(1,1) PRIMARY KEY,
    TimesheetID INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    ActionByUserID INT NOT NULL,
    ActionDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Notes NVARCHAR(1000) NULL,
    PreviousStatus VARCHAR(20) NULL,
    NewStatus VARCHAR(20) NULL,
    CONSTRAINT FK_TimesheetHistory_Timesheet FOREIGN KEY (TimesheetID)
        REFERENCES Timesheets(TimesheetID),
    CONSTRAINT FK_TimesheetHistory_User FOREIGN KEY (ActionByUserID)
        REFERENCES Users(UserID),
    CONSTRAINT CHK_TimesheetHistory_Action CHECK (Action IN ('Created', 'Submitted', 'Approved', 'Returned', 'Unlocked', 'Modified'))
);

-- =============================================
-- 7. SYSTEM CONFIGURATION TABLE
-- =============================================
CREATE TABLE SystemConfiguration (
    ConfigID INT IDENTITY(1,1) PRIMARY KEY,
    ConfigKey VARCHAR(100) NOT NULL UNIQUE,
    ConfigValue NVARCHAR(500) NOT NULL,
    Description NVARCHAR(500) NULL,
    ModifiedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ModifiedByUserID INT NULL,
    CONSTRAINT FK_SystemConfig_User FOREIGN KEY (ModifiedByUserID)
        REFERENCES Users(UserID)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE NONCLUSTERED INDEX IX_Users_EntraID ON Users(EntraIDObjectID);
CREATE NONCLUSTERED INDEX IX_Users_Email ON Users(Email);
CREATE NONCLUSTERED INDEX IX_Users_Department ON Users(DepartmentID) WHERE IsActive = 1;

-- Timesheets indexes
CREATE NONCLUSTERED INDEX IX_Timesheets_User_Period ON Timesheets(UserID, PeriodStartDate);
CREATE NONCLUSTERED INDEX IX_Timesheets_Status ON Timesheets(Status);
CREATE NONCLUSTERED INDEX IX_Timesheets_Status_Submitted ON Timesheets(Status, SubmittedDate);
CREATE NONCLUSTERED INDEX IX_Timesheets_ApprovedBy ON Timesheets(ApprovedByUserID) WHERE ApprovedByUserID IS NOT NULL;

-- TimeEntries indexes
CREATE NONCLUSTERED INDEX IX_TimeEntries_Timesheet ON TimeEntries(TimesheetID);
CREATE NONCLUSTERED INDEX IX_TimeEntries_User_Date ON TimeEntries(UserID, WorkDate);
CREATE NONCLUSTERED INDEX IX_TimeEntries_Project ON TimeEntries(ProjectID);
CREATE NONCLUSTERED INDEX IX_TimeEntries_Date ON TimeEntries(WorkDate);

-- Covering index for reporting
CREATE NONCLUSTERED INDEX IX_TimeEntries_Reporting
    ON TimeEntries(WorkDate, ProjectID, UserID)
    INCLUDE (HoursWorked, WorkLocation);

-- Projects indexes
CREATE NONCLUSTERED INDEX IX_Projects_Department ON Projects(DepartmentID) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_Projects_Grant ON Projects(GrantIdentifier) WHERE GrantIdentifier IS NOT NULL;

-- History indexes
CREATE NONCLUSTERED INDEX IX_TimesheetHistory_Timesheet ON TimesheetHistory(TimesheetID);
CREATE NONCLUSTERED INDEX IX_TimesheetHistory_ActionDate ON TimesheetHistory(ActionDate);

GO

-- =============================================
-- SAMPLE TRIGGERS
-- =============================================

-- Trigger to update ModifiedDate on Timesheets
CREATE TRIGGER trg_Timesheets_UpdateModifiedDate
ON Timesheets
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Timesheets
    SET ModifiedDate = GETUTCDATE()
    FROM Timesheets t
    INNER JOIN inserted i ON t.TimesheetID = i.TimesheetID;
END;
GO

-- Trigger to update ModifiedDate on TimeEntries
CREATE TRIGGER trg_TimeEntries_UpdateModifiedDate
ON TimeEntries
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE TimeEntries
    SET ModifiedDate = GETUTCDATE()
    FROM TimeEntries te
    INNER JOIN inserted i ON te.TimeEntryID = i.TimeEntryID;
END;
GO

-- Trigger to log timesheet history
CREATE TRIGGER trg_Timesheets_LogHistory
ON Timesheets
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Action VARCHAR(50);

    -- Determine action
    IF EXISTS (SELECT * FROM deleted)
        SET @Action = 'Modified';
    ELSE
        SET @Action = 'Created';

    -- Log status changes
    INSERT INTO TimesheetHistory (TimesheetID, Action, ActionByUserID, PreviousStatus, NewStatus)
    SELECT
        i.TimesheetID,
        @Action,
        ISNULL(i.ApprovedByUserID, i.UserID),
        d.Status,
        i.Status
    FROM inserted i
    LEFT JOIN deleted d ON i.TimesheetID = d.TimesheetID
    WHERE i.Status <> ISNULL(d.Status, '');
END;
GO

PRINT 'Database schema created successfully!';
