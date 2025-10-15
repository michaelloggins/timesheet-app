/**
 * Organizational Chart Service
 * Real-time queries to Microsoft Entra ID via Graph API
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { logger } from '../utils/logger';

interface Manager {
  id: string;
  displayName: string;
  mail: string;
  jobTitle: string;
}

class OrgChartService {
  private graphClient: Client;
  private managerCache: Map<string, { manager: Manager | null; timestamp: number }>;
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const credential = new ClientSecretCredential(
      process.env.TENANT_ID!,
      process.env.CLIENT_ID!,
      process.env.CLIENT_SECRET!
    );

    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken(process.env.GRAPH_API_SCOPES || 'https://graph.microsoft.com/.default');
          return token.token;
        },
      },
    });

    this.managerCache = new Map();
  }

  /**
   * Get direct manager from Entra ID
   */
  async getDirectManager(employeeEntraId: string): Promise<Manager | null> {
    // Check cache
    const cached = this.managerCache.get(employeeEntraId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
      return cached.manager;
    }

    try {
      const manager = await this.graphClient
        .api(`/users/${employeeEntraId}/manager`)
        .select('id,displayName,mail,jobTitle')
        .get();

      const managerData = manager
        ? {
            id: manager.id,
            displayName: manager.displayName,
            mail: manager.mail,
            jobTitle: manager.jobTitle,
          }
        : null;

      // Cache result
      this.managerCache.set(employeeEntraId, {
        manager: managerData,
        timestamp: Date.now(),
      });

      return managerData;
    } catch (error) {
      logger.error('Error fetching manager from Entra ID:', error);
      return null;
    }
  }

  /**
   * Get full management chain up to CEO/VP level
   */
  async getManagementChain(employeeEntraId: string): Promise<Manager[]> {
    const chain: Manager[] = [];
    let currentId = employeeEntraId;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops

    while (depth < maxDepth) {
      const manager = await this.getDirectManager(currentId);

      if (!manager) {
        break;
      }

      chain.push(manager);
      currentId = manager.id;
      depth++;
    }

    return chain;
  }

  /**
   * Check if one user is the direct manager of another
   */
  async isDirectManager(managerEntraId: string, employeeEntraId: string): Promise<boolean> {
    const manager = await this.getDirectManager(employeeEntraId);
    return manager?.id === managerEntraId;
  }

  /**
   * Get direct reports for a manager
   */
  async getDirectReports(managerEntraId: string): Promise<any[]> {
    try {
      const reports = await this.graphClient
        .api(`/users/${managerEntraId}/directReports`)
        .select('id,displayName,mail,jobTitle,department')
        .get();

      return reports.value || [];
    } catch (error) {
      logger.error('Error fetching direct reports from Entra ID:', error);
      return [];
    }
  }

  /**
   * Check if user is member of Leadership group
   */
  async isLeadershipMember(userEntraId: string): Promise<boolean> {
    const leadershipGroupId = process.env.LEADERSHIP_GROUP_ID;

    if (!leadershipGroupId) {
      logger.warn('LEADERSHIP_GROUP_ID not configured');
      return false;
    }

    try {
      const memberOf = await this.graphClient
        .api(`/users/${userEntraId}/memberOf`)
        .get();

      return memberOf.value.some((group: any) => group.id === leadershipGroupId);
    } catch (error) {
      logger.error('Error checking leadership group membership:', error);
      return false;
    }
  }
}

export const orgChartService = new OrgChartService();
