/**
 * Avatar Service
 * Handles fetching, caching, and serving user avatar images
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

// Avatar storage directory
const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');

// Ensure avatar directory exists
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

class AvatarService {
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
   * Compute SHA-256 hash of a buffer
   */
  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get avatar file path for a user
   */
  private getAvatarPath(userId: number): string {
    return path.join(AVATAR_DIR, `${userId}.jpg`);
  }

  /**
   * Fetch avatar from Microsoft Graph API
   */
  private async fetchAvatarFromGraph(entraId: string): Promise<Buffer | null> {
    try {
      // Try to get the photo - Graph API returns binary data
      const photoResponse = await this.graphClient
        .api(`/users/${entraId}/photo/$value`)
        .get();

      // Response could be ArrayBuffer or Buffer
      if (photoResponse instanceof ArrayBuffer) {
        return Buffer.from(photoResponse);
      } else if (Buffer.isBuffer(photoResponse)) {
        return photoResponse;
      } else if (photoResponse && typeof photoResponse === 'object') {
        // Sometimes it returns a stream-like object
        return Buffer.from(photoResponse);
      }
      return null;
    } catch (error: any) {
      // 404 means no photo available
      if (error.statusCode === 404) {
        logger.debug(`No avatar available for user ${entraId}`);
        return null;
      }
      // 429 means rate limited
      if (error.statusCode === 429) {
        logger.warn(`Rate limited when fetching avatar for ${entraId}`);
        return null;
      }
      logger.error(`Error fetching avatar for ${entraId}:`, error.message);
      return null;
    }
  }

  /**
   * Get or update cached avatar for a user
   * Returns the avatar path if available, null otherwise
   */
  async getAvatar(userId: number): Promise<{ path: string; updated: boolean } | null> {
    const pool = getPool();

    // Get user's Entra ID and current avatar hash
    const userResult = await pool.request()
      .input('userId', userId)
      .query('SELECT EntraIDObjectID, AvatarHash, AvatarUpdatedDate FROM Users WHERE UserID = @userId');

    if (userResult.recordset.length === 0) {
      return null;
    }

    const { EntraIDObjectID: entraId, AvatarHash: storedHash, AvatarUpdatedDate: lastUpdated } = userResult.recordset[0];

    if (!entraId) {
      return null;
    }

    const avatarPath = this.getAvatarPath(userId);
    const avatarExists = fs.existsSync(avatarPath);

    // Check if we should refresh (older than 24 hours or doesn't exist)
    const shouldRefresh = !avatarExists ||
      !lastUpdated ||
      (Date.now() - new Date(lastUpdated).getTime()) > 24 * 60 * 60 * 1000;

    if (!shouldRefresh && avatarExists) {
      // Return existing cached avatar
      return { path: avatarPath, updated: false };
    }

    // Fetch from Graph API
    const avatarBuffer = await this.fetchAvatarFromGraph(entraId);

    if (!avatarBuffer) {
      // No avatar available from Graph
      // If we have a cached one, keep using it
      if (avatarExists) {
        // Update timestamp to prevent frequent retries
        await pool.request()
          .input('userId', userId)
          .query('UPDATE Users SET AvatarUpdatedDate = GETUTCDATE() WHERE UserID = @userId');
        return { path: avatarPath, updated: false };
      }
      return null;
    }

    // Compute hash of new avatar
    const newHash = this.computeHash(avatarBuffer);

    // Check if avatar has changed
    if (storedHash === newHash && avatarExists) {
      // Same avatar, just update timestamp
      await pool.request()
        .input('userId', userId)
        .query('UPDATE Users SET AvatarUpdatedDate = GETUTCDATE() WHERE UserID = @userId');
      return { path: avatarPath, updated: false };
    }

    // Avatar changed or new - save it
    try {
      // Delete old avatar if exists
      if (avatarExists) {
        fs.unlinkSync(avatarPath);
      }

      // Write new avatar
      fs.writeFileSync(avatarPath, avatarBuffer);

      // Update database
      await pool.request()
        .input('userId', userId)
        .input('hash', newHash)
        .query('UPDATE Users SET AvatarHash = @hash, AvatarUpdatedDate = GETUTCDATE() WHERE UserID = @userId');

      logger.info(`Updated avatar for user ${userId}`);
      return { path: avatarPath, updated: true };
    } catch (error: any) {
      logger.error(`Failed to save avatar for user ${userId}:`, error.message);
      return avatarExists ? { path: avatarPath, updated: false } : null;
    }
  }

  /**
   * Get cached avatar path without refreshing
   * Used for serving requests when we want to avoid Graph API calls
   */
  getCachedAvatarPath(userId: number): string | null {
    const avatarPath = this.getAvatarPath(userId);
    return fs.existsSync(avatarPath) ? avatarPath : null;
  }

  /**
   * Sync avatar for a user using their own Graph token
   * Used when user logs in to refresh their avatar
   */
  async syncAvatarWithUserToken(userId: number, accessToken: string): Promise<boolean> {
    const pool = getPool();

    try {
      // Fetch avatar using user's token
      const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn(`Rate limited when syncing avatar for user ${userId}`);
        }
        return false;
      }

      const arrayBuffer = await response.arrayBuffer();
      const avatarBuffer = Buffer.from(arrayBuffer);
      const newHash = this.computeHash(avatarBuffer);

      // Check current hash
      const userResult = await pool.request()
        .input('userId', userId)
        .query('SELECT AvatarHash FROM Users WHERE UserID = @userId');

      const storedHash = userResult.recordset[0]?.AvatarHash;
      const avatarPath = this.getAvatarPath(userId);

      if (storedHash === newHash && fs.existsSync(avatarPath)) {
        // Same avatar, update timestamp only
        await pool.request()
          .input('userId', userId)
          .query('UPDATE Users SET AvatarUpdatedDate = GETUTCDATE() WHERE UserID = @userId');
        return true;
      }

      // Save new avatar
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
      fs.writeFileSync(avatarPath, avatarBuffer);

      // Update database
      await pool.request()
        .input('userId', userId)
        .input('hash', newHash)
        .query('UPDATE Users SET AvatarHash = @hash, AvatarUpdatedDate = GETUTCDATE() WHERE UserID = @userId');

      logger.info(`Synced avatar for user ${userId} using user token`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to sync avatar for user ${userId}:`, error.message);
      return false;
    }
  }
}

export const avatarService = new AvatarService();
