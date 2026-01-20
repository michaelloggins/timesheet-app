/**
 * Legacy Import Sync Component
 * Handles background auto-sync of legacy SharePoint data on app load
 * This component has no visible UI - it runs silently in the background
 */

import { useEffect } from 'react';
import { useLegacyAutoSync } from '../../hooks/useLegacyImport';

/**
 * Silent background sync component
 * Add this to the app layout to enable auto-sync on login
 */
export const LegacyImportSync = () => {
  const { isChecking, shouldSync, isSyncing } = useLegacyAutoSync();

  // Log for debugging (can be removed in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isChecking) {
        console.log('[LegacyImportSync] Checking if auto-sync is needed...');
      } else if (shouldSync) {
        console.log('[LegacyImportSync] Auto-sync is needed, triggering...');
      } else if (isSyncing) {
        console.log('[LegacyImportSync] Auto-sync in progress...');
      }
    }
  }, [isChecking, shouldSync, isSyncing]);

  // This component renders nothing - it's purely for side effects
  return null;
};

export default LegacyImportSync;
