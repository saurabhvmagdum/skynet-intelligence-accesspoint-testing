// dataSyncManager.ts - Manage synchronization between Supabase and Pinecone

import SupabaseOperations from './supabaseOperations';
import PineconeOperations from './pineconeOperations';
import { AccessPoint, APIResponse } from './types';
import { accessPointsData } from './accesspoint'; // Import the data
import dotenv from 'dotenv';
dotenv.config();

class DataSyncManager {
  private supabaseOps: SupabaseOperations;
  private pineconeOps: PineconeOperations;

  constructor() {
    this.supabaseOps = new SupabaseOperations();
    this.pineconeOps = new PineconeOperations();
  }

  // Create access point in both databases
  async createAccessPoint(accessPoint: AccessPoint): Promise<APIResponse<AccessPoint>> {
    try {
      // First, create in Supabase
      console.log('Processing access point:', accessPoint.id);
      const supabaseResult = await this.supabaseOps.createAccessPoint(accessPoint);
      if (!supabaseResult.success) {
        return supabaseResult;
      }

      // Then, create in Pinecone
      const pineconeResult = await this.pineconeOps.upsertAccessPoint(accessPoint);
      if (!pineconeResult.success) {
        // Rollback Supabase if Pinecone fails
        await this.supabaseOps.deleteAccessPoint(accessPoint.id);
        return { success: false, error: 'Failed to sync to Pinecone, rolled back Supabase' };
      }

      return supabaseResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error creating access point:', errorMessage);
      return { success: false, error: `Failed to create access point: ${errorMessage}` };
    }
  }

  // Update access point in both databases
  async updateAccessPoint(id: string, updates: Partial<AccessPoint>): Promise<APIResponse<AccessPoint>> {
    try {
      // First, update in Supabase
      const supabaseResult = await this.supabaseOps.updateAccessPoint(id, updates);
      if (!supabaseResult.success) {
        return supabaseResult;
      }

      // Then, update in Pinecone (need full object)
      const fullAccessPoint = supabaseResult.data!;
      const pineconeResult = await this.pineconeOps.updateAccessPoint(fullAccessPoint);
      if (!pineconeResult.success) {
        console.error('Failed to update Pinecone, but Supabase was updated successfully');
        // Note: You might want to implement a retry mechanism or queue here
      }

      return supabaseResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error updating access point:', errorMessage);
      return { success: false, error: `Failed to update access point: ${errorMessage}` };
    }
  }

  // Delete access point from both databases
  async deleteAccessPoint(id: string): Promise<APIResponse<void>> {
    try {
      // Delete from both databases (order doesn't matter much for deletion)
      const [supabaseResult, pineconeResult] = await Promise.allSettled([
        this.supabaseOps.deleteAccessPoint(id),
        this.pineconeOps.deleteAccessPoint(id)
      ]);

      const supabaseSuccess = supabaseResult.status === 'fulfilled' && supabaseResult.value.success;
      const pineconeSuccess = pineconeResult.status === 'fulfilled' && pineconeResult.value.success;

      if (supabaseResult.status === 'rejected') {
        console.error('Supabase deletion failed:', supabaseResult.reason);
      }

      if (pineconeResult.status === 'rejected') {
        console.error('Pinecone deletion failed:', pineconeResult.reason);
      }

      if (!supabaseSuccess && !pineconeSuccess) {
        return { success: false, error: 'Failed to delete from both databases' };
      }

      if (!supabaseSuccess) {
        console.error('Failed to delete from Supabase but succeeded in Pinecone');
      }

      if (!pineconeSuccess) {
        console.error('Failed to delete from Pinecone but succeeded in Supabase');
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error deleting access point:', errorMessage);
      return { success: false, error: `Failed to delete access point: ${errorMessage}` };
    }
  }

  // Get access point (from Supabase as source of truth)
  async getAccessPoint(id: string): Promise<APIResponse<AccessPoint>> {
    return this.supabaseOps.getAccessPoint(id);
  }

  // Get all access points (from Supabase)
  async getAllAccessPoints(): Promise<APIResponse<AccessPoint[]>> {
    return this.supabaseOps.getAllAccessPoints();
  }

  // Search access points using Pinecone for semantic search
  async searchAccessPoints(query: string, topK: number = 10): Promise<APIResponse<AccessPoint[]>> {
    try {
      // Use Pinecone for semantic search
      const pineconeResult = await this.pineconeOps.searchSimilar(query, topK);
      if (!pineconeResult.success) {
        // Fallback to Supabase text search
        return this.supabaseOps.searchAccessPoints(query);
      }

      // Get full access point data from Supabase using IDs from Pinecone
            const ids = (pineconeResult.data as Array<{id: string}>).map((match) => match.id);
      const accessPoints: AccessPoint[] = [];

      for (const id of ids) {
        const apResult = await this.supabaseOps.getAccessPoint(id);
        if (apResult.success && apResult.data) {
          accessPoints.push(apResult.data);
        }
      }

      return { success: true, data: accessPoints };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error searching access points:', errorMessage);
      return { success: false, error: `Failed to search access points: ${errorMessage}` };
    }
  }

  // Bulk sync all access points from file to both Supabase and Pinecone
  async bulkSyncAccessPoints(accessPoints: AccessPoint[]): Promise<APIResponse<void>> {
    try {
      console.log(`Starting bulk sync of ${accessPoints.length} access points to Supabase...`);
      
      // Sync to Supabase
      const supabaseResult = await this.supabaseOps.bulkInsertAccessPoints(accessPoints);
      if (!supabaseResult.success) {
        console.error('Failed to bulk sync to Supabase:', supabaseResult.error);
        return { success: false, error: `Failed to bulk sync to Supabase: ${supabaseResult.error}` };
      }
      
      console.log('Supabase sync successful. Now syncing to Pinecone...');

      // Sync to Pinecone
      const pineconeResult = await this.pineconeOps.bulkUpsertAccessPoints(accessPoints);
      if (!pineconeResult.success) {
        console.error('Failed to bulk sync to Pinecone, but Supabase sync succeeded:', pineconeResult.error);
        // Implement a retry mechanism for Pinecone
        console.log('Attempting to retry Pinecone sync...');
        const retryResult = await this.pineconeOps.bulkUpsertAccessPoints(accessPoints);
        if (!retryResult.success) {
          console.error('Retry failed. Please run syncSupabaseToPinecone later to ensure consistency.');
          return { success: false, error: 'Failed to sync to Pinecone after retry. Supabase sync was successful.' };
        }
      }

      console.log('Successfully synced all access points to both Supabase and Pinecone.');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error bulk syncing access points:', errorMessage);
      return { success: false, error: `Failed to bulk sync access points: ${errorMessage}` };
    }
  }

  // Sync existing data from Supabase to Pinecone (useful for initial setup or recovery)
  async syncSupabaseToPinecone(): Promise<APIResponse<void>> {
    try {
      const allAccessPointsResult = await this.supabaseOps.getAllAccessPoints();
      if (!allAccessPointsResult.success) {
        return { success: false, error: 'Failed to fetch data from Supabase' };
      }

      const accessPoints = allAccessPointsResult.data || [];
      console.log(`Found ${accessPoints.length} access points in Supabase to sync.`);

      if (accessPoints.length === 0) {
        console.log('No access points to sync. Exiting.');
        return { success: true };
      }

      const pineconeResult = await this.pineconeOps.bulkUpsertAccessPoints(accessPoints);
      return pineconeResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error syncing Supabase to Pinecone:', errorMessage);
      return { success: false, error: `Failed to sync Supabase to Pinecone: ${errorMessage}` };
    }
  }

  // Health check for both databases
  async healthCheck(): Promise<{ supabase: boolean; pinecone: boolean }> {
    try {
      const [supabaseCheck, pineconeCheck] = await Promise.allSettled([
        this.supabaseOps.getAllAccessPoints(),
        this.pineconeOps.searchSimilar('test', 1)
      ]);

      return {
        supabase: supabaseCheck.status === 'fulfilled' && supabaseCheck.value.success,
        pinecone: pineconeCheck.status === 'fulfilled' && pineconeCheck.value.success
      };
    } catch (error) {
      console.error('Error during health check:', error);
      return { supabase: false, pinecone: false };
    }
  }

  // Main run method
  async run(): Promise<void> {
    console.log('Starting the synchronization process...');
    try {
      const result = await this.bulkSyncAccessPoints(accessPointsData);
      if (!result.success) {
        console.error('Synchronization from Supabase to Pinecone failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('An unexpected error occurred during synchronization:', errorMessage);
    }
  }
}

// Direct execution block
if (require.main === module) {
  const syncManager = new DataSyncManager();
  syncManager.run().finally(() => {
    console.log('Script finished.');
  });
}