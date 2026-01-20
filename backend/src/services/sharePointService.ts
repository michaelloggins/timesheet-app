/**
 * SharePoint Service
 * Handles fetching data from SharePoint Lists via Microsoft Graph API
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { logger } from '../utils/logger';

/**
 * SharePoint List Item representing a legacy timesheet entry
 * Maps to the expected columns in the SharePoint list
 */
export interface SharePointTimesheetItem {
  id: string;                       // SharePoint list item ID
  fields: {
    Title?: string;                 // Employee name or identifier
    EmployeeEmail?: string;         // Employee email
    EmployeeName?: string;          // Alternative employee name field
    WorkDate?: string;              // Date of work (ISO format or date string)
    ProjectName?: string;           // Project name
    ProjectCode?: string;           // Project code/number
    HoursWorked?: number;           // Hours worked
    WorkLocation?: string;          // Office, WFH, Other
    Notes?: string;                 // Any notes
    Department?: string;            // Department name
    Status?: string;                // Status in legacy system
    Submitted?: boolean | string;   // Whether it was submitted
    ApprovedBy?: string;            // Approver name/email
    ApprovedDate?: string;          // Approval date
    Created?: string;               // SharePoint created date
    Modified?: string;              // SharePoint modified date
    [key: string]: any;             // Allow for other fields
  };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface SharePointListResponse {
  value: SharePointTimesheetItem[];
  '@odata.nextLink'?: string;
}

export interface SharePointListInfo {
  id: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

export interface FetchOptions {
  siteId: string;
  listId: string;
  modifiedSince?: Date;      // Only fetch items modified after this date
  top?: number;              // Page size (default 100)
  select?: string[];         // Fields to select
  filter?: string;           // OData filter expression
}

class SharePointService {
  private graphClient!: Client;
  private initialized: boolean = false;

  constructor() {
    // Initialize Graph client with app-only authentication
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      logger.warn('SharePoint service: Missing Azure AD credentials - service will not be available');
      this.initialized = false;
      return;
    }

    try {
      const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const token = await credential.getToken('https://graph.microsoft.com/.default');
            return token.token;
          },
        },
      });
      this.initialized = true;
      logger.info('SharePoint service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SharePoint service:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isAvailable(): boolean {
    return this.initialized;
  }

  /**
   * Get SharePoint site information by site URL or ID
   */
  async getSiteInfo(siteIdOrUrl: string): Promise<{ id: string; displayName: string; webUrl: string } | null> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    try {
      const site = await this.graphClient
        .api(`/sites/${siteIdOrUrl}`)
        .select('id,displayName,webUrl')
        .get();

      return {
        id: site.id,
        displayName: site.displayName,
        webUrl: site.webUrl,
      };
    } catch (error) {
      logger.error(`Failed to get site info for ${siteIdOrUrl}:`, error);
      return null;
    }
  }

  /**
   * Get lists from a SharePoint site
   */
  async getLists(siteId: string): Promise<SharePointListInfo[]> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    try {
      const response = await this.graphClient
        .api(`/sites/${siteId}/lists`)
        .select('id,displayName,webUrl,description')
        .filter("list/hidden eq false") // Exclude hidden lists
        .top(100)
        .get();

      return response.value.map((list: any) => ({
        id: list.id,
        displayName: list.displayName,
        webUrl: list.webUrl,
        description: list.description,
      }));
    } catch (error) {
      logger.error(`Failed to get lists for site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Get list columns/schema to understand the structure
   */
  async getListColumns(siteId: string, listId: string): Promise<Array<{ name: string; displayName: string; type: string }>> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    try {
      const response = await this.graphClient
        .api(`/sites/${siteId}/lists/${listId}/columns`)
        .select('name,displayName,columnGroup')
        .get();

      return response.value
        .filter((col: any) => !col.readOnly) // Exclude system columns
        .map((col: any) => ({
          name: col.name,
          displayName: col.displayName,
          type: col.columnGroup || 'unknown',
        }));
    } catch (error) {
      logger.error(`Failed to get columns for list ${listId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch timesheet items from a SharePoint list
   * Handles pagination automatically
   */
  async fetchTimesheetItems(options: FetchOptions): Promise<SharePointTimesheetItem[]> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    const { siteId, listId, modifiedSince, top = 100, select, filter } = options;
    const items: SharePointTimesheetItem[] = [];

    try {
      const apiUrl = `/sites/${siteId}/lists/${listId}/items`;
      let request = this.graphClient.api(apiUrl).expand('fields').top(top);

      // Build filter
      const filters: string[] = [];
      if (modifiedSince) {
        filters.push(`fields/Modified ge '${modifiedSince.toISOString()}'`);
      }
      if (filter) {
        filters.push(filter);
      }
      if (filters.length > 0) {
        request = request.filter(filters.join(' and '));
      }

      // Select specific fields if provided
      if (select && select.length > 0) {
        const fieldsSelect = select.map(f => `fields/${f}`).join(',');
        request = request.select(`id,createdDateTime,lastModifiedDateTime,${fieldsSelect}`);
      }

      // Order by modified date descending to get newest first
      request = request.orderby('lastModifiedDateTime desc');

      logger.info(`Fetching SharePoint list items from ${siteId}/${listId}`);

      // Fetch first page
      let response = await request.get();
      items.push(...response.value);

      // Handle pagination
      while (response['@odata.nextLink']) {
        logger.info(`Fetching next page... (${items.length} items so far)`);
        response = await this.graphClient.api(response['@odata.nextLink']).get();
        items.push(...response.value);
      }

      logger.info(`Fetched ${items.length} items from SharePoint list`);
      return items;
    } catch (error: any) {
      logger.error(`Failed to fetch items from list ${listId}:`, error);
      throw new Error(`Failed to fetch SharePoint list items: ${error.message}`);
    }
  }

  /**
   * Fetch a single item by ID
   */
  async fetchItemById(siteId: string, listId: string, itemId: string): Promise<SharePointTimesheetItem | null> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    try {
      const item = await this.graphClient
        .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
        .expand('fields')
        .get();

      return item;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error(`Failed to fetch item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get count of items in a list (for progress tracking)
   */
  async getItemCount(siteId: string, listId: string, modifiedSince?: Date): Promise<number> {
    if (!this.initialized) {
      throw new Error('SharePoint service is not initialized');
    }

    try {
      let request = this.graphClient
        .api(`/sites/${siteId}/lists/${listId}/items`)
        .count(true)
        .top(1);

      if (modifiedSince) {
        request = request.filter(`fields/Modified ge '${modifiedSince.toISOString()}'`);
      }

      const response = await request.get();
      return response['@odata.count'] || response.value?.length || 0;
    } catch (error) {
      logger.error(`Failed to get item count:`, error);
      return 0;
    }
  }

  /**
   * Parse date from various SharePoint date formats
   */
  parseSharePointDate(dateValue: string | undefined): Date | null {
    return parseSharePointDate(dateValue);
  }

  /**
   * Parse hours from string or number
   */
  parseHours(hoursValue: string | number | undefined): number {
    return parseHours(hoursValue);
  }

  /**
   * Normalize work location string
   */
  normalizeWorkLocation(location: string | undefined): 'Office' | 'WFH' | 'Other' {
    return normalizeWorkLocation(location);
  }
}

// ======================================
// UTILITY FUNCTIONS (exported for testing)
// ======================================

/**
 * Parse date from various SharePoint date formats
 */
export function parseSharePointDate(dateValue: string | undefined): Date | null {
  if (!dateValue) return null;

  try {
    // Try ISO format first
    const isoDate = new Date(dateValue);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try common US date formats (MM/DD/YYYY, M/D/YYYY)
    const usMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try other common formats
    const parsed = Date.parse(dateValue);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse hours from string or number
 */
export function parseHours(hoursValue: string | number | undefined): number {
  if (typeof hoursValue === 'number') {
    return hoursValue;
  }
  if (typeof hoursValue === 'string') {
    const parsed = parseFloat(hoursValue.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Normalize work location string
 */
export function normalizeWorkLocation(location: string | undefined): 'Office' | 'WFH' | 'Other' {
  if (!location) return 'Office';

  const normalized = location.toLowerCase().trim();
  if (normalized.includes('wfh') || normalized.includes('home') || normalized.includes('remote')) {
    return 'WFH';
  }
  if (normalized.includes('office') || normalized.includes('onsite')) {
    return 'Office';
  }
  return 'Other';
}

// Export singleton instance
export const sharePointService = new SharePointService();
