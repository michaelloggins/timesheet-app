/**
 * Work Week Service
 * Determines user's work week pattern based on Entra ID security group membership
 *
 * Supports two work week patterns:
 * - SG-MVD-Timesheet-WorkWeekMF (Monday-Friday): Standard M-F work week
 * - SG-MVD-Timesheet-WorkWeekTS (Tuesday-Saturday): Alternate T-S work week
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

// Work week pattern types
export type WorkWeekPattern = 'MondayFriday' | 'TuesdaySaturday';

// Day of week constants (0 = Sunday, 1 = Monday, etc.)
export const WORK_DAYS: Record<WorkWeekPattern, readonly number[]> = {
  MondayFriday: [1, 2, 3, 4, 5], // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
  TuesdaySaturday: [2, 3, 4, 5, 6], // Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
};

// Security group names for work week patterns
const WORK_WEEK_GROUPS = {
  MondayFriday: process.env.ENTRA_GROUP_WORKWEEK_MF || 'SG-MVD-Timesheet-WorkWeekMF',
  TuesdaySaturday: process.env.ENTRA_GROUP_WORKWEEK_TS || 'SG-MVD-Timesheet-WorkWeekTS',
} as const;

export interface WorkWeekInfo {
  pattern: WorkWeekPattern;
  workDays: number[];
  defaultHoursPerDay: number;
  defaultProjectId: number | null;
}

export interface DefaultTimeEntry {
  workDate: string;
  projectId: number;
  hoursWorked: number;
  workLocation: 'Office' | 'WFH' | 'Other';
}

class WorkWeekService {
  private graphClient: Client | null = null;

  /**
   * Initialize Microsoft Graph client lazily
   */
  private getGraphClient(): Client {
    if (!this.graphClient) {
      const credential = new ClientSecretCredential(
        process.env.TENANT_ID!,
        process.env.CLIENT_ID!,
        process.env.CLIENT_SECRET!
      );

      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken('https://graph.microsoft.com/.default');
            return token.token;
          },
        },
      });
    }
    return this.graphClient;
  }

  /**
   * Check if user is a member of a specific security group
   * Supports nested groups (transitive membership)
   */
  private async isUserInGroup(userEntraId: string, groupName: string): Promise<boolean> {
    try {
      const graphClient = this.getGraphClient();

      // First, find the group by display name
      const groupResponse = await graphClient
        .api('/groups')
        .filter(`displayName eq '${groupName}'`)
        .select('id')
        .get();

      if (!groupResponse.value || groupResponse.value.length === 0) {
        logger.warn(`Work week group '${groupName}' not found in Entra ID`);
        return false;
      }

      const groupId = groupResponse.value[0].id;

      // Check transitive membership (supports nested groups)
      // Uses checkMemberGroups API which checks if user is member directly or via nested groups
      try {
        const membershipCheck = await graphClient
          .api(`/users/${userEntraId}/checkMemberGroups`)
          .post({
            groupIds: [groupId]
          });

        // Returns array of group IDs the user is a member of (from the provided list)
        return membershipCheck.value && membershipCheck.value.includes(groupId);
      } catch (error: any) {
        // Fallback to direct membership check if checkMemberGroups fails
        logger.warn(`checkMemberGroups failed, falling back to direct check: ${error.message}`);
        try {
          await graphClient
            .api(`/groups/${groupId}/members/${userEntraId}`)
            .get();
          return true;
        } catch (fallbackError: any) {
          if (fallbackError.statusCode === 404) {
            return false;
          }
          throw fallbackError;
        }
      }
    } catch (error) {
      logger.error(`Error checking group membership for user ${userEntraId} in group ${groupName}:`, error);
      return false;
    }
  }

  /**
   * Get user's work week pattern
   *
   * Priority:
   * 1. Check database for cached/admin-set WorkWeekPattern
   * 2. If NULL in database, check Entra ID security groups:
   *    a. Check TuesdaySaturday group first (less common, explicit assignment)
   *    b. Default to MondayFriday
   * 3. Default to MondayFriday on any error
   */
  async getUserWorkWeekPattern(userEntraId: string): Promise<WorkWeekPattern> {
    try {
      // First, check if there's a cached/admin-set pattern in the database
      const pool = getPool();
      const dbResult = await pool.request()
        .input('entraId', userEntraId)
        .query(`
          SELECT WorkWeekPattern
          FROM Users
          WHERE EntraIDObjectID = @entraId AND IsActive = 1
        `);

      if (dbResult.recordset.length > 0 && dbResult.recordset[0].WorkWeekPattern) {
        const pattern = dbResult.recordset[0].WorkWeekPattern as WorkWeekPattern;
        logger.info(`User ${userEntraId} has ${pattern} work week pattern (from database)`);
        return pattern;
      }

      // No cached pattern - check Entra ID groups
      // Check TuesdaySaturday first (explicit non-standard schedule)
      const isTuesdaySaturday = await this.isUserInGroup(
        userEntraId,
        WORK_WEEK_GROUPS.TuesdaySaturday
      );

      if (isTuesdaySaturday) {
        logger.info(`User ${userEntraId} has Tuesday-Saturday work week pattern (from Entra ID)`);
        return 'TuesdaySaturday';
      }

      // Default to Monday-Friday (standard)
      logger.info(`User ${userEntraId} has Monday-Friday work week pattern (default)`);
      return 'MondayFriday';
    } catch (error) {
      logger.error(`Error determining work week pattern for user ${userEntraId}:`, error);
      // Default to Monday-Friday on error
      return 'MondayFriday';
    }
  }

  /**
   * Set/cache user's work week pattern in the database
   * This can be used by admins to override the Entra ID group lookup
   *
   * @param userEntraId - The user's Entra ID
   * @param pattern - The work week pattern to set (null to clear and use Entra ID lookup)
   */
  async setUserWorkWeekPattern(
    userEntraId: string,
    pattern: WorkWeekPattern | null
  ): Promise<void> {
    const pool = getPool();
    await pool.request()
      .input('entraId', userEntraId)
      .input('pattern', pattern)
      .query(`
        UPDATE Users
        SET WorkWeekPattern = @pattern, ModifiedDate = GETUTCDATE()
        WHERE EntraIDObjectID = @entraId
      `);

    logger.info(
      `Updated work week pattern for user ${userEntraId} to ${pattern || 'NULL (use Entra ID)'}`
    );
  }

  /**
   * Get the default "Standard Work" project ID
   */
  async getDefaultProjectId(): Promise<number | null> {
    try {
      const pool = getPool();
      const result = await pool.request()
        .query(`
          SELECT TOP 1 ProjectID
          FROM Projects
          WHERE (ProjectNumber = 'WRK-001' OR ProjectName = 'Standard Work')
            AND IsActive = 1
            AND ProjectType = 'Work'
          ORDER BY
            CASE WHEN ProjectNumber = 'WRK-001' THEN 0 ELSE 1 END,
            ProjectID
        `);

      if (result.recordset.length > 0) {
        return result.recordset[0].ProjectID;
      }

      // Fallback: get any active Work project
      const fallbackResult = await pool.request()
        .query(`
          SELECT TOP 1 ProjectID
          FROM Projects
          WHERE ProjectType = 'Work' AND IsActive = 1
          ORDER BY ProjectID
        `);

      return fallbackResult.recordset.length > 0
        ? fallbackResult.recordset[0].ProjectID
        : null;
    } catch (error) {
      logger.error('Error fetching default project ID:', error);
      return null;
    }
  }

  /**
   * Get complete work week info for a user
   */
  async getWorkWeekInfo(userEntraId: string): Promise<WorkWeekInfo> {
    const pattern = await this.getUserWorkWeekPattern(userEntraId);
    const defaultProjectId = await this.getDefaultProjectId();

    return {
      pattern,
      workDays: [...WORK_DAYS[pattern]],
      defaultHoursPerDay: 8,
      defaultProjectId,
    };
  }

  /**
   * Generate default time entries for a given week based on user's work week pattern
   *
   * @param userEntraId - The user's Entra ID
   * @param weekStartDate - The Sunday start date of the week (YYYY-MM-DD format)
   * @returns Array of default time entries for the work days
   */
  async generateDefaultEntries(
    userEntraId: string,
    weekStartDate: string
  ): Promise<DefaultTimeEntry[]> {
    const workWeekInfo = await this.getWorkWeekInfo(userEntraId);

    if (!workWeekInfo.defaultProjectId) {
      logger.warn('No default project found for generating default entries');
      return [];
    }

    const entries: DefaultTimeEntry[] = [];
    const startDate = new Date(weekStartDate + 'T00:00:00');

    // Generate entries for each work day
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);

      const dayOfWeek = currentDate.getDay();

      if (workWeekInfo.workDays.includes(dayOfWeek)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        entries.push({
          workDate: dateStr,
          projectId: workWeekInfo.defaultProjectId,
          hoursWorked: workWeekInfo.defaultHoursPerDay,
          workLocation: 'Office',
        });
      }
    }

    return entries;
  }

  /**
   * Check if a specific date is a work day for the given pattern
   */
  isWorkDay(date: Date | string, pattern: WorkWeekPattern): boolean {
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    const dayOfWeek = d.getDay();
    return WORK_DAYS[pattern].includes(dayOfWeek);
  }

  /**
   * Get work days within a date range for a specific pattern
   */
  getWorkDaysInRange(
    startDate: string,
    endDate: string,
    pattern: WorkWeekPattern
  ): string[] {
    const workDays: string[] = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    const current = new Date(start);
    while (current <= end) {
      if (this.isWorkDay(current, pattern)) {
        workDays.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays;
  }
}

export const workWeekService = new WorkWeekService();
