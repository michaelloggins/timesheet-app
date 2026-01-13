-- Migration: Add 'Other' as a valid work location option
-- Date: 2026-01-13

-- Drop the existing constraint
ALTER TABLE TimeEntries DROP CONSTRAINT CHK_TimeEntries_Location;

-- Add the updated constraint with 'Other' option
ALTER TABLE TimeEntries ADD CONSTRAINT CHK_TimeEntries_Location
    CHECK (WorkLocation IN ('Office', 'WFH', 'Other'));

-- Update the column default comment (informational only)
-- Default remains 'Office'
