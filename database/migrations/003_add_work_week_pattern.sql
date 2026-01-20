-- =============================================
-- Migration: Add Work Week Pattern to Users Table
-- Version: 003
-- Description: Adds WorkWeekPattern column to Users table
--              to cache user's work week schedule preference
-- =============================================

-- Add WorkWeekPattern column to Users table
-- Values: 'MondayFriday' (default), 'TuesdaySaturday'
-- NULL means use Entra ID group lookup (dynamic)
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

-- Add index for faster lookups by work week pattern
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

-- Add comment documenting the column usage
EXEC sys.sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Work week pattern: MondayFriday (default M-F schedule) or TuesdaySaturday (T-S schedule). NULL means look up from Entra ID security groups.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'Users',
    @level2type = N'COLUMN', @level2name = N'WorkWeekPattern';
GO

PRINT 'Migration 003_add_work_week_pattern completed successfully';
GO
