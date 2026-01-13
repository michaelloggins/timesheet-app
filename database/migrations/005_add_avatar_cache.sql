-- Migration: Add avatar caching columns to Users table
-- Date: 2026-01-13

-- Add columns for avatar caching
ALTER TABLE Users ADD AvatarHash NVARCHAR(64) NULL;
ALTER TABLE Users ADD AvatarUpdatedDate DATETIME2 NULL;

-- Create index for avatar lookups
CREATE INDEX IX_Users_AvatarHash ON Users(AvatarHash) WHERE AvatarHash IS NOT NULL;
