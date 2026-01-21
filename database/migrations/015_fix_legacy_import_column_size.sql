-- =============================================
-- Migration: 015_fix_legacy_import_column_size.sql
-- Description: Increase SharePointSiteID column size to accommodate full compound site IDs
-- =============================================

PRINT 'Migration 015: Fix LegacyImportTracking column sizes';

-- The SharePoint Site ID can be a compound ID like:
-- miravistadiagnostics.sharepoint.com,792ca1fe-6b9c-4477-a6ed-77c7d7580770,839aa32b-8d19-4448-a943-b585be846207
-- This is ~107 characters, so we need to increase from NVARCHAR(100) to NVARCHAR(200)

-- First drop the unique constraint that includes this column
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_LegacyImport_SPItem')
BEGIN
    ALTER TABLE LegacyImportTracking DROP CONSTRAINT UQ_LegacyImport_SPItem;
    PRINT 'Dropped UQ_LegacyImport_SPItem constraint';
END
GO

-- Alter the column size
ALTER TABLE LegacyImportTracking ALTER COLUMN SharePointSiteID NVARCHAR(200) NOT NULL;
PRINT 'Altered SharePointSiteID to NVARCHAR(200)';
GO

-- Also increase SharePointListID just in case
ALTER TABLE LegacyImportTracking ALTER COLUMN SharePointListID NVARCHAR(200) NOT NULL;
PRINT 'Altered SharePointListID to NVARCHAR(200)';
GO

-- Recreate the unique constraint
ALTER TABLE LegacyImportTracking
ADD CONSTRAINT UQ_LegacyImport_SPItem UNIQUE (SharePointListItemID, SharePointListID, SharePointSiteID);
PRINT 'Recreated UQ_LegacyImport_SPItem constraint';
GO

PRINT 'Migration 015 completed';
GO
