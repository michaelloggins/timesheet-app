-- Migration: Add 'Withdrawn' as a valid audit action
-- Date: 2026-01-13

-- Drop the existing constraint
ALTER TABLE TimesheetHistory DROP CONSTRAINT CHK_TimesheetHistory_Action;

-- Add the updated constraint with 'Withdrawn' option
ALTER TABLE TimesheetHistory ADD CONSTRAINT CHK_TimesheetHistory_Action
    CHECK (Action IN ('Created', 'Submitted', 'Approved', 'Returned', 'Unlocked', 'Modified', 'Withdrawn'));
