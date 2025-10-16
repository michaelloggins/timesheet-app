-- =============================================
-- MiraVista Timesheet System - Seed Data
-- Initial data for development and testing
-- =============================================

USE TimesheetDB;
GO

-- =============================================
-- 1. Seed Departments
-- =============================================
INSERT INTO Departments (DepartmentCode, DepartmentName) VALUES
('1100', 'Clinical Laboratory'),
('1200', 'Research & Development'),
('1300', 'Quality Assurance'),
('1400', 'IT & Technology'),
('1500', 'Administration'),
('1600', 'Finance & Accounting'),
('1700', 'Human Resources'),
('1800', 'Operations');

PRINT 'Departments seeded';

-- =============================================
-- 2. Seed Projects (Sample data)
-- =============================================
INSERT INTO Projects (ProjectNumber, ProjectName, DepartmentID, ProjectType, GrantIdentifier) VALUES
-- Clinical Lab Projects
('CLN-001', 'Antibody Testing', 1, 'Work', NULL),
('CLN-002', 'PCR Diagnostics', 1, 'Work', 'GRANT-2024-001'),
('CLN-003', 'Sample Processing', 1, 'Work', NULL),

-- R&D Projects
('RND-001', 'New Assay Development', 2, 'Work', 'GRANT-2024-002'),
('RND-002', 'Clinical Trials Support', 2, 'Work', 'GRANT-2024-003'),
('RND-003', 'Lab Equipment Testing', 2, 'Work', NULL),

-- QA Projects
('QA-001', 'Quality Control', 3, 'Work', NULL),
('QA-002', 'Regulatory Compliance', 3, 'Work', NULL),
('QA-003', 'Documentation Review', 3, 'Work', NULL),

-- IT Projects
('IT-001', 'System Maintenance', 4, 'Work', NULL),
('IT-002', 'Timesheet Application Development', 4, 'Work', NULL),
('IT-003', 'Network Infrastructure', 4, 'Work', NULL),

-- Admin Projects
('ADM-001', 'General Administration', 5, 'Work', NULL),
('ADM-002', 'Meetings & Planning', 5, 'Work', NULL),

-- Common Projects (All Departments)
('PTO-001', 'Paid Time Off', 1, 'PTO', NULL),
('PTO-002', 'Paid Time Off', 2, 'PTO', NULL),
('PTO-003', 'Paid Time Off', 3, 'PTO', NULL),
('PTO-004', 'Paid Time Off', 4, 'PTO', NULL),
('PTO-005', 'Paid Time Off', 5, 'PTO', NULL),
('PTO-006', 'Paid Time Off', 6, 'PTO', NULL),
('PTO-007', 'Paid Time Off', 7, 'PTO', NULL),
('PTO-008', 'Paid Time Off', 8, 'PTO', NULL),

('HOL-001', 'Holiday', 1, 'Holiday', NULL),
('HOL-002', 'Holiday', 2, 'Holiday', NULL),
('HOL-003', 'Holiday', 3, 'Holiday', NULL),
('HOL-004', 'Holiday', 4, 'Holiday', NULL),
('HOL-005', 'Holiday', 5, 'Holiday', NULL),
('HOL-006', 'Holiday', 6, 'Holiday', NULL),
('HOL-007', 'Holiday', 7, 'Holiday', NULL),
('HOL-008', 'Holiday', 8, 'Holiday', NULL);

PRINT 'Projects seeded';

-- =============================================
-- 3. Seed Sample Users (for testing)
-- NOTE: Replace with actual Entra ID Object IDs
-- =============================================
-- These are placeholder users for development
-- In production, users will be created on first login

INSERT INTO Users (EntraIDObjectID, Email, Name, DepartmentID, Role) VALUES
-- Admins
('00000000-0000-0000-0000-000000000001', 'admin@miravistalabs.com', 'System Administrator', 5, 'TimesheetAdmin'),

-- Managers
('00000000-0000-0000-0000-000000000010', 'manager.lab@miravistalabs.com', 'John Smith', 1, 'Manager'),
('00000000-0000-0000-0000-000000000011', 'manager.rd@miravistalabs.com', 'Sarah Johnson', 2, 'Manager'),
('00000000-0000-0000-0000-000000000012', 'manager.qa@miravistalabs.com', 'Michael Brown', 3, 'Manager'),
('00000000-0000-0000-0000-000000000013', 'manager.it@miravistalabs.com', 'Emily Davis', 4, 'Manager'),

-- Leadership
('00000000-0000-0000-0000-000000000020', 'vp.operations@miravistalabs.com', 'Dr. Williams', 5, 'Leadership'),

-- Employees
('00000000-0000-0000-0000-000000000100', 'employee1@miravistalabs.com', 'Alice Cooper', 1, 'Employee'),
('00000000-0000-0000-0000-000000000101', 'employee2@miravistalabs.com', 'Bob Martinez', 1, 'Employee'),
('00000000-0000-0000-0000-000000000102', 'employee3@miravistalabs.com', 'Carol White', 2, 'Employee'),
('00000000-0000-0000-0000-000000000103', 'employee4@miravistalabs.com', 'David Lee', 2, 'Employee'),
('00000000-0000-0000-0000-000000000104', 'employee5@miravistalabs.com', 'Emma Wilson', 3, 'Employee');

PRINT 'Sample users seeded';

-- =============================================
-- 4. Seed System Configuration
-- =============================================
INSERT INTO SystemConfiguration (ConfigKey, ConfigValue, Description) VALUES
('TIMESHEET_DUE_DAY', '5', 'Day of week timesheets are due (1=Monday, 5=Friday)'),
('REMINDER_DAYS_BEFORE', '2', 'Send reminder X days before due date'),
('ESCALATION_DAYS', '7', 'Escalate unapproved timesheets after X days'),
('WORK_HOURS_PER_DAY', '8', 'Standard work hours per day'),
('WORK_DAYS_PER_WEEK', '5', 'Standard work days per week'),
('ENABLE_PAYCHEX_SYNC', 'false', 'Enable Paychex integration'),
('ENABLE_DIGITAL_SIGNAGE', 'true', 'Enable digital signage mode'),
('ENABLE_GAMIFICATION', 'true', 'Enable gamification features');

PRINT 'System configuration seeded';

-- =============================================
-- 5. Sample Timesheet Data (for testing)
-- =============================================
-- Create a sample timesheet for testing
DECLARE @UserID INT = (SELECT UserID FROM Users WHERE Email = 'employee1@miravistalabs.com');
DECLARE @ProjectID INT = (SELECT ProjectID FROM Projects WHERE ProjectNumber = 'CLN-001');
DECLARE @TimesheetID INT;
DECLARE @WeekStart DATE = DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE));
DECLARE @WeekEnd DATE = DATEADD(DAY, 6, @WeekStart);

-- Create timesheet
INSERT INTO Timesheets (UserID, PeriodStartDate, PeriodEndDate, Status)
VALUES (@UserID, @WeekStart, @WeekEnd, 'Draft');

SET @TimesheetID = SCOPE_IDENTITY();

-- Add time entries
INSERT INTO TimeEntries (TimesheetID, UserID, ProjectID, WorkDate, HoursWorked, WorkLocation)
VALUES
    (@TimesheetID, @UserID, @ProjectID, @WeekStart, 8.0, 'Office'),
    (@TimesheetID, @UserID, @ProjectID, DATEADD(DAY, 1, @WeekStart), 8.0, 'Office'),
    (@TimesheetID, @UserID, @ProjectID, DATEADD(DAY, 2, @WeekStart), 8.0, 'WFH'),
    (@TimesheetID, @UserID, @ProjectID, DATEADD(DAY, 3, @WeekStart), 8.0, 'Office'),
    (@TimesheetID, @UserID, @ProjectID, DATEADD(DAY, 4, @WeekStart), 8.0, 'Office');

PRINT 'Sample timesheet created';
GO

-- =============================================
-- Summary
-- =============================================
SELECT 'Seed Data Summary' AS Info;
GO

SELECT 'Departments' AS TableName, COUNT(*) AS [RowCount] FROM Departments
UNION ALL
SELECT 'Users', COUNT(*) FROM Users
UNION ALL
SELECT 'Projects', COUNT(*) FROM Projects
UNION ALL
SELECT 'Timesheets', COUNT(*) FROM Timesheets
UNION ALL
SELECT 'TimeEntries', COUNT(*) FROM TimeEntries
UNION ALL
SELECT 'SystemConfiguration', COUNT(*) FROM SystemConfiguration;

PRINT 'Seed data complete!';
GO
