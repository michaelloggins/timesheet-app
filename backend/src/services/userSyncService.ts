/**
 * User Sync Service
 * Syncs users and departments from Entra ID security groups to the database
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from './notificationService';

interface EntraUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
}

interface EntraGroup {
  id: string;
  displayName: string;
  description?: string;
}

interface UserSyncDetail {
  name: string;
  email: string;
  role: string;
  department?: string;
}

interface UserUpdateDetail {
  name: string;
  email: string;
  changes: {
    field: string;
    from: string | null;
    to: string | null;
  }[];
}

interface DepartmentSyncDetail {
  name: string;
  code: string;
}

interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
  departmentsCreated: number;
  departmentsUpdated: number;
  conflicts: string[];
  errors: string[];
  // Detailed info
  createdUsers: UserSyncDetail[];
  updatedUsers: UserUpdateDetail[];
  deactivatedUsers: UserSyncDetail[];
  createdDepartments: DepartmentSyncDetail[];
  updatedDepartments: DepartmentSyncDetail[];
}

interface DepartmentConflict {
  userId: string;
  userName: string;
  userEmail: string;
  managerEntraId: string | null;
  departments: string[];
}

type UserRole = 'Employee' | 'Manager' | 'TimesheetAdmin' | 'Leadership';

const DEPARTMENT_GROUP_PREFIX = 'SG-MVD-Dept';

class UserSyncService {
  private graphClient: Client;

  constructor() {
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

  /**
   * Get all groups matching the department prefix
   */
  private async getDepartmentGroups(): Promise<EntraGroup[]> {
    const groups: EntraGroup[] = [];

    try {
      let response = await this.graphClient
        .api('/groups')
        .filter(`startswith(displayName, '${DEPARTMENT_GROUP_PREFIX}')`)
        .select('id,displayName,description')
        .top(999)
        .get();

      groups.push(...response.value);

      while (response['@odata.nextLink']) {
        response = await this.graphClient.api(response['@odata.nextLink']).get();
        groups.push(...response.value);
      }

      logger.info(`Found ${groups.length} department groups with prefix '${DEPARTMENT_GROUP_PREFIX}'`);
    } catch (error) {
      logger.error('Error fetching department groups:', error);
      throw error;
    }

    return groups;
  }

  /**
   * Get owners of a group (returns array of Entra IDs)
   */
  private async getGroupOwners(groupId: string): Promise<string[]> {
    const ownerIds: string[] = [];

    try {
      const response = await this.graphClient
        .api(`/groups/${groupId}/owners`)
        .select('id')
        .get();

      for (const owner of response.value) {
        if (owner['@odata.type'] === '#microsoft.graph.user') {
          ownerIds.push(owner.id);
        }
      }
    } catch (error) {
      logger.warn(`Could not get owners for group ${groupId}:`, error);
    }

    return ownerIds;
  }

  /**
   * Get all members of a security group
   * @param groupId - The Entra ID group ID
   * @param transitive - If true, includes members from nested groups (uses transitiveMembers endpoint)
   */
  private async getGroupMembers(groupId: string, transitive: boolean = false): Promise<EntraUser[]> {
    const members: EntraUser[] = [];
    const endpoint = transitive ? 'transitiveMembers' : 'members';

    try {
      let response = await this.graphClient
        .api(`/groups/${groupId}/${endpoint}`)
        .select('id,displayName,mail,userPrincipalName,jobTitle,department,employeeId')
        .top(999)
        .get();

      members.push(...response.value.filter((m: any) => m['@odata.type'] === '#microsoft.graph.user'));

      while (response['@odata.nextLink']) {
        response = await this.graphClient.api(response['@odata.nextLink']).get();
        members.push(...response.value.filter((m: any) => m['@odata.type'] === '#microsoft.graph.user'));
      }
    } catch (error) {
      logger.error(`Error fetching group ${endpoint} for ${groupId}:`, error);
      throw error;
    }

    return members;
  }

  /**
   * Get manager for a user
   */
  private async getUserManager(userId: string): Promise<string | null> {
    try {
      const manager = await this.graphClient
        .api(`/users/${userId}/manager`)
        .select('id')
        .get();
      return manager?.id || null;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.warn(`Could not get manager for user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Sync departments from Entra ID groups
   */
  async syncDepartmentsFromGroups(): Promise<{
    created: number;
    updated: number;
    errors: string[];
    createdDepartments: DepartmentSyncDetail[];
    updatedDepartments: DepartmentSyncDetail[];
  }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [] as string[],
      createdDepartments: [] as DepartmentSyncDetail[],
      updatedDepartments: [] as DepartmentSyncDetail[],
    };
    const pool = getPool();

    try {
      const groups = await this.getDepartmentGroups();

      for (const group of groups) {
        try {
          // Extract department name by stripping prefix (SG-MVD-Dept-IT-1100 → IT-1100)
          const deptName = group.displayName.replace(DEPARTMENT_GROUP_PREFIX, '').replace(/^[-_\s]+/, '').trim();
          const deptCode = deptName.split('-')[0] || deptName.substring(0, 20); // First part as code (IT from IT-1100)

          // Get group owners
          const ownerIds = await this.getGroupOwners(group.id);

          // Check if department exists (by Entra Group ID)
          const existing = await pool.request()
            .input('entraGroupId', group.id)
            .query('SELECT DepartmentID FROM Departments WHERE EntraGroupID = @entraGroupId');

          if (existing.recordset.length > 0) {
            // Update existing
            await pool.request()
              .input('id', existing.recordset[0].DepartmentID)
              .input('name', deptName)
              .input('code', deptCode || deptName.substring(0, 20))
              .input('owners', JSON.stringify(ownerIds))
              .query(`
                UPDATE Departments
                SET DepartmentName = @name,
                    DepartmentCode = @code,
                    OwnerEntraIDs = @owners,
                    ModifiedDate = GETUTCDATE()
                WHERE DepartmentID = @id
              `);
            result.updated++;
            result.updatedDepartments.push({ name: deptName, code: deptCode });
          } else {
            // Create new
            await pool.request()
              .input('entraGroupId', group.id)
              .input('name', deptName)
              .input('code', deptCode || deptName.substring(0, 20))
              .input('owners', JSON.stringify(ownerIds))
              .query(`
                INSERT INTO Departments (EntraGroupID, DepartmentName, DepartmentCode, OwnerEntraIDs, IsActive)
                VALUES (@entraGroupId, @name, @code, @owners, 1)
              `);
            result.created++;
            result.createdDepartments.push({ name: deptName, code: deptCode });
            logger.info(`Created department: ${deptName}`);
          }
        } catch (error: any) {
          result.errors.push(`Failed to sync department ${group.displayName}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch department groups: ${error.message}`);
    }

    return result;
  }

  /**
   * Get user's department based on department group membership
   * Returns departmentId and detects conflicts
   */
  private async getUserDepartmentFromGroups(
    userId: string,
    departmentGroups: Map<string, { groupId: string; departmentId: number; name: string }>
  ): Promise<{ departmentId: number | null; conflict: string[] }> {
    const userDepartments: string[] = [];
    let departmentId: number | null = null;

    for (const [groupId, dept] of departmentGroups) {
      try {
        // Check if user is member of this group
        const response = await this.graphClient
          .api(`/groups/${groupId}/members/${userId}`)
          .get();

        if (response) {
          userDepartments.push(dept.name);
          if (!departmentId) {
            departmentId = dept.departmentId;
          }
        }
      } catch (error: any) {
        // 404 means user is not a member - that's expected
        if (error.statusCode !== 404) {
          logger.warn(`Error checking membership for user ${userId} in group ${groupId}:`, error.message);
        }
      }
    }

    return {
      departmentId,
      conflict: userDepartments.length > 1 ? userDepartments : [],
    };
  }

  /**
   * Send conflict notification emails
   */
  private async sendConflictNotifications(conflicts: DepartmentConflict[]): Promise<void> {
    if (conflicts.length === 0) return;

    const pool = getPool();

    // Get all TimesheetAdmin emails
    const adminsResult = await pool.request()
      .query("SELECT Email, Name FROM Users WHERE Role = 'TimesheetAdmin' AND IsActive = 1");
    const adminEmails = adminsResult.recordset.map((u: any) => u.Email);

    for (const conflict of conflicts) {
      const subject = `Department Conflict: ${conflict.userName}`;
      const html = `
        <h2>Department Group Conflict Detected</h2>
        <p>User <strong>${conflict.userName}</strong> (${conflict.userEmail}) is a member of multiple department groups:</p>
        <ul>
          ${conflict.departments.map(d => `<li>${d}</li>`).join('')}
        </ul>
        <p>Please resolve this conflict by removing the user from all but one department group in Entra ID.</p>
        <p>The user has been assigned to the first department found: <strong>${conflict.departments[0]}</strong></p>
      `;

      // Email admins
      for (const adminEmail of adminEmails) {
        try {
          await notificationService.sendSyncConflict(adminEmail, subject, html);
        } catch (error) {
          logger.error(`Failed to send conflict email to admin ${adminEmail}:`, error);
        }
      }

      // Email user's manager if available
      if (conflict.managerEntraId) {
        const managerResult = await pool.request()
          .input('entraId', conflict.managerEntraId)
          .query('SELECT Email FROM Users WHERE EntraIDObjectID = @entraId AND IsActive = 1');

        if (managerResult.recordset.length > 0) {
          try {
            await notificationService.sendSyncConflict(managerResult.recordset[0].Email, subject, html);
          } catch (error) {
            logger.error(`Failed to send conflict email to manager:`, error);
          }
        }
      }
    }
  }

  /**
   * Sync users from configured security groups
   */
  async syncUsersFromGroups(): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      deactivated: 0,
      departmentsCreated: 0,
      departmentsUpdated: 0,
      conflicts: [],
      errors: [],
      createdUsers: [],
      updatedUsers: [],
      deactivatedUsers: [],
      createdDepartments: [],
      updatedDepartments: [],
    };

    const pool = getPool();

    // First sync departments
    logger.info('Syncing departments from Entra ID groups...');
    const deptResult = await this.syncDepartmentsFromGroups();
    result.departmentsCreated = deptResult.created;
    result.departmentsUpdated = deptResult.updated;
    result.createdDepartments = deptResult.createdDepartments;
    result.updatedDepartments = deptResult.updatedDepartments;
    result.errors.push(...deptResult.errors);

    // Build department group map
    const departmentGroups = new Map<string, { groupId: string; departmentId: number; name: string }>();
    const deptRows = await pool.request()
      .query('SELECT DepartmentID, EntraGroupID, DepartmentName FROM Departments WHERE EntraGroupID IS NOT NULL AND IsActive = 1');

    for (const row of deptRows.recordset) {
      departmentGroups.set(row.EntraGroupID, {
        groupId: row.EntraGroupID,
        departmentId: row.DepartmentID,
        name: row.DepartmentName,
      });
    }

    // Role group mappings
    // Note: Users group uses transitive members to support nested groups
    const groupMappings: { groupId: string; role: UserRole; transitive: boolean }[] = [];
    if (process.env.ENTRA_GROUP_ADMINS) {
      groupMappings.push({ groupId: process.env.ENTRA_GROUP_ADMINS, role: 'TimesheetAdmin', transitive: false });
    }
    if (process.env.ENTRA_GROUP_MANAGERS) {
      groupMappings.push({ groupId: process.env.ENTRA_GROUP_MANAGERS, role: 'Manager', transitive: false });
    }
    if (process.env.ENTRA_GROUP_USERS) {
      groupMappings.push({ groupId: process.env.ENTRA_GROUP_USERS, role: 'Employee', transitive: true });
    }

    if (groupMappings.length === 0) {
      result.errors.push('No Entra ID role groups configured');
      return result;
    }

    // Collect all users with their highest role
    const userRoleMap = new Map<string, { user: EntraUser; role: UserRole }>();
    const roleHierarchy: UserRole[] = ['TimesheetAdmin', 'Manager', 'Employee'];

    for (const { groupId, role, transitive } of groupMappings) {
      try {
        logger.info(`Fetching ${transitive ? 'transitive ' : ''}members from role group for ${role}...`);
        const members = await this.getGroupMembers(groupId, transitive);
        logger.info(`Found ${members.length} members`);

        for (const user of members) {
          const existing = userRoleMap.get(user.id);
          if (!existing || roleHierarchy.indexOf(role) < roleHierarchy.indexOf(existing.role)) {
            userRoleMap.set(user.id, { user, role });
          }
        }
      } catch (error: any) {
        result.errors.push(`Failed to fetch role group ${groupId}: ${error.message}`);
      }
    }

    // Track users for deactivation and conflicts
    const seenEntraIds = new Set<string>();
    const conflicts: DepartmentConflict[] = [];

    // Process each user
    for (const [entraId, { user, role }] of userRoleMap) {
      seenEntraIds.add(entraId);

      try {
        // Get manager
        const managerEntraId = await this.getUserManager(entraId);

        // Get department from group membership
        let departmentId: number | null = null;

        if (departmentGroups.size > 0) {
          const deptInfo = await this.getUserDepartmentFromGroups(entraId, departmentGroups);
          departmentId = deptInfo.departmentId;

          if (deptInfo.conflict.length > 0) {
            conflicts.push({
              userId: entraId,
              userName: user.displayName,
              userEmail: user.mail || user.userPrincipalName,
              managerEntraId,
              departments: deptInfo.conflict,
            });
            result.conflicts.push(`${user.displayName}: ${deptInfo.conflict.join(', ')}`);
          }
        }

        // Check if user exists - get full details for change tracking
        const existing = await pool.request()
          .input('entraId', entraId)
          .query(`
            SELECT u.UserID, u.IsActive, u.Email, u.Name, u.Title, u.Role, u.DepartmentID, d.DepartmentName
            FROM Users u
            LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
            WHERE u.EntraIDObjectID = @entraId
          `);

        const email = user.mail || user.userPrincipalName;
        const newDeptName = departmentId ? (departmentGroups.get([...departmentGroups.entries()].find(([, v]) => v.departmentId === departmentId)?.[0] || '')?. name || null) : null;

        if (existing.recordset.length > 0) {
          const oldUser = existing.recordset[0];
          const wasDeactivated = !oldUser.IsActive;

          // Track changes
          const changes: { field: string; from: string | null; to: string | null }[] = [];
          if (oldUser.Email !== email) changes.push({ field: 'Email', from: oldUser.Email, to: email });
          if (oldUser.Name !== user.displayName) changes.push({ field: 'Name', from: oldUser.Name, to: user.displayName });
          if (oldUser.Title !== (user.jobTitle || null)) changes.push({ field: 'Title', from: oldUser.Title, to: user.jobTitle || null });
          if (oldUser.Role !== role) changes.push({ field: 'Role', from: oldUser.Role, to: role });
          if (oldUser.DepartmentID !== departmentId) changes.push({ field: 'Department', from: oldUser.DepartmentName, to: newDeptName });
          if (wasDeactivated) changes.push({ field: 'Status', from: 'Inactive', to: 'Active' });

          await pool.request()
            .input('entraId', entraId)
            .input('email', email)
            .input('name', user.displayName)
            .input('title', user.jobTitle || null)
            .input('departmentId', departmentId)
            .input('role', role)
            .input('managerEntraId', managerEntraId)
            .input('employeeId', user.employeeId || null)
            .query(`
              UPDATE Users
              SET Email = @email,
                  Name = @name,
                  Title = @title,
                  DepartmentID = @departmentId,
                  Role = @role,
                  ManagerEntraID = @managerEntraId,
                  EmployeeID = @employeeId,
                  IsActive = 1,
                  DeactivatedDate = NULL,
                  DeactivationReason = NULL
              WHERE EntraIDObjectID = @entraId
            `);

          if (wasDeactivated) {
            logger.info(`Reactivated user ${user.displayName}`);
          }

          // Only count as updated if there were actual changes
          if (changes.length > 0) {
            result.updated++;
            result.updatedUsers.push({
              name: user.displayName,
              email,
              changes,
            });
          }
        } else {
          await pool.request()
            .input('entraId', entraId)
            .input('email', email)
            .input('name', user.displayName)
            .input('title', user.jobTitle || null)
            .input('departmentId', departmentId)
            .input('role', role)
            .input('managerEntraId', managerEntraId)
            .input('employeeId', user.employeeId || null)
            .query(`
              INSERT INTO Users (EntraIDObjectID, Email, Name, Title, DepartmentID, Role, ManagerEntraID, EmployeeID)
              VALUES (@entraId, @email, @name, @title, @departmentId, @role, @managerEntraId, @employeeId)
            `);

          result.created++;
          result.createdUsers.push({
            name: user.displayName,
            email,
            role,
            department: newDeptName || undefined,
          });
          logger.info(`Created user ${user.displayName}`);
        }
      } catch (error: any) {
        result.errors.push(`Failed to sync user ${user.displayName}: ${error.message}`);
      }
    }

    // Send conflict notifications
    if (conflicts.length > 0) {
      logger.warn(`Found ${conflicts.length} department conflicts`);
      await this.sendConflictNotifications(conflicts);
    }

    // Deactivate users no longer in any group
    if (process.env.ENTRA_SYNC_DEACTIVATE === 'true') {
      try {
        const allUsers = await pool.request()
          .query(`
            SELECT u.EntraIDObjectID, u.Name, u.Email, u.Role, d.DepartmentName
            FROM Users u
            LEFT JOIN Departments d ON u.DepartmentID = d.DepartmentID
            WHERE u.IsActive = 1
          `);

        for (const dbUser of allUsers.recordset) {
          if (!seenEntraIds.has(dbUser.EntraIDObjectID)) {
            await pool.request()
              .input('entraId', dbUser.EntraIDObjectID)
              .query(`
                UPDATE Users
                SET IsActive = 0,
                    DeactivatedDate = GETUTCDATE(),
                    DeactivationReason = 'Removed from all Entra ID security groups'
                WHERE EntraIDObjectID = @entraId
              `);
            logger.info(`Deactivated user ${dbUser.Name}`);
            result.deactivated++;
            result.deactivatedUsers.push({
              name: dbUser.Name,
              email: dbUser.Email,
              role: dbUser.Role,
              department: dbUser.DepartmentName || undefined,
            });
          }
        }
      } catch (error: any) {
        result.errors.push(`Failed to deactivate users: ${error.message}`);
      }
    }

    logger.info(`Sync complete: ${result.created} users created, ${result.updated} updated, ${result.deactivated} deactivated, ${result.departmentsCreated} depts created, ${result.conflicts.length} conflicts`);
    return result;
  }

  /**
   * Sync a single user by their Entra ID
   */
  async syncSingleUser(entraId: string): Promise<boolean> {
    try {
      const user = await this.graphClient
        .api(`/users/${entraId}`)
        .select('id,displayName,mail,userPrincipalName,jobTitle,department,employeeId')
        .get();

      const managerEntraId = await this.getUserManager(entraId);
      const pool = getPool();
      const email = user.mail || user.userPrincipalName;

      // Build department group map
      const departmentGroups = new Map<string, { groupId: string; departmentId: number; name: string }>();
      const deptRows = await pool.request()
        .query('SELECT DepartmentID, EntraGroupID, DepartmentName FROM Departments WHERE EntraGroupID IS NOT NULL AND IsActive = 1');

      for (const row of deptRows.recordset) {
        departmentGroups.set(row.EntraGroupID, {
          groupId: row.EntraGroupID,
          departmentId: row.DepartmentID,
          name: row.DepartmentName,
        });
      }

      // Get department from group membership
      let departmentId: number | null = null;
      if (departmentGroups.size > 0) {
        const deptInfo = await this.getUserDepartmentFromGroups(entraId, departmentGroups);
        departmentId = deptInfo.departmentId;
      }

      // Check if user exists
      const existing = await pool.request()
        .input('entraId', entraId)
        .query('SELECT UserID FROM Users WHERE EntraIDObjectID = @entraId');

      if (existing.recordset.length > 0) {
        await pool.request()
          .input('entraId', entraId)
          .input('email', email)
          .input('name', user.displayName)
          .input('title', user.jobTitle || null)
          .input('departmentId', departmentId)
          .input('managerEntraId', managerEntraId)
          .input('employeeId', user.employeeId || null)
          .query(`
            UPDATE Users
            SET Email = @email,
                Name = @name,
                Title = @title,
                DepartmentID = @departmentId,
                ManagerEntraID = @managerEntraId,
                EmployeeID = @employeeId
            WHERE EntraIDObjectID = @entraId
          `);
      } else {
        await pool.request()
          .input('entraId', entraId)
          .input('email', email)
          .input('name', user.displayName)
          .input('title', user.jobTitle || null)
          .input('departmentId', departmentId)
          .input('role', 'Employee')
          .input('managerEntraId', managerEntraId)
          .input('employeeId', user.employeeId || null)
          .query(`
            INSERT INTO Users (EntraIDObjectID, Email, Name, Title, DepartmentID, Role, ManagerEntraID, EmployeeID)
            VALUES (@entraId, @email, @name, @title, @departmentId, @role, @managerEntraId, @employeeId)
          `);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to sync user ${entraId}:`, error);
      return false;
    }
  }
}

export const userSyncService = new UserSyncService();
