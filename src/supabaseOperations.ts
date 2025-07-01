// supabaseOperations.ts - Handle Supabase database operations

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AccessPoint, APIResponse } from './types';
import dotenv from 'dotenv';
dotenv.config();



class SupabaseOperations {
  private supabase: SupabaseClient;
  private tableName = 'access_points';

  constructor() {
    const supabaseUrl = process.env.DATABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Utility to convert object keys from camelCase to snake_case
  private toSnakeCase(obj: Record<string, any>): Record<string, any> {
    if (!obj) return {};
    
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Handle null/undefined values
        if (obj[key] === null || obj[key] === undefined) {
          newObj[key.toLowerCase()] = obj[key];
          continue;
        }

        // Convert camelCase to snake_case
        const snakeKey = key
          // Handle lowercase to uppercase transitions (e.g., subnetID -> subnet_id)
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          // Handle consecutive uppercase letters except the last one (e.g., APIKey -> api_key)
          .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
          .toLowerCase()
          .replace(/^_/, ''); // Remove leading underscore if present

        newObj[snakeKey] = obj[key];
      }
    }
    return newObj;
  }

  // Utility to convert object keys from snake_case to camelCase
  private toCamelCase(obj: Record<string, any>): Record<string, any> {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
      }
    }
    return newObj;
  }

  // Create access point in Supabase
  async createAccessPoint(accessPoint: AccessPoint): Promise<APIResponse<AccessPoint>> {
    try {
      const dataToInsert = {
        ...this.toSnakeCase(accessPoint as Record<string, any>),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        console.error(`Supabase insert error: ${error.message}`);
        return { success: false, error: `Failed to create access point: ${error.message}` };
      }

      return { success: true, data: this.toCamelCase(data) as AccessPoint };
    } catch (error: any) {
      console.error(`Error creating access point: ${error.message}`);
      return { success: false, error: `Failed to create access point: ${error.message}` };
    }
  }

  // Update access point in Supabase
  async updateAccessPoint(id: string, updates: Partial<AccessPoint>): Promise<APIResponse<AccessPoint>> {
    try {
      const dataToUpdate = {
        ...this.toSnakeCase(updates as Record<string, any>),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Supabase update error: ${error.message}`);
        return { success: false, error: `Failed to update access point: ${error.message}` };
      }

      return { success: true, data: this.toCamelCase(data) as AccessPoint };
    } catch (error: any) {
      console.error(`Error updating access point: ${error.message}`);
      return { success: false, error: `Failed to update access point: ${error.message}` };
    }
  }

  // Get access point by ID from Supabase
  async getAccessPoint(id: string): Promise<APIResponse<AccessPoint>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Supabase get error: ${error.message}`);
        if (error.code === 'PGRST116') {
          return { success: false, error: `Access point with id ${id} not found.` };
        }
        return { success: false, error: `Failed to get access point: ${error.message}` };
      }

      return { success: true, data: this.toCamelCase(data) as AccessPoint };
    } catch (error: any) {
      console.error(`Error getting access point: ${error.message}`);
      return { success: false, error: `Failed to get access point: ${error.message}` };
    }
  }

  // Get all access points from Supabase
  async getAllAccessPoints(): Promise<APIResponse<AccessPoint[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Supabase select error: ${error.message}`);
        return { success: false, error: `Failed to get all access points: ${error.message}` };
      }

      const convertedData = data.map(item => this.toCamelCase(item) as AccessPoint);
      return { success: true, data: convertedData };
    } catch (error: any) {
      console.error(`Error getting all access points: ${error.message}`);
      return { success: false, error: `Failed to get all access points: ${error.message}` };
    }
  }

  // Delete access point from Supabase
  async deleteAccessPoint(id: string): Promise<APIResponse<void>> {
    try {
      console.log(`Deleting access point with ID: ${id} from Supabase`);
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Supabase delete error: ${error.message}`);
        return { success: false, error: `Failed to delete access point: ${error.message}` };
      }

      console.log(`Successfully deleted access point with ID: ${id} from Supabase`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting access point: ${error.message}`);
      return { success: false, error: `Failed to delete access point: ${error.message}` };
    }
  }

  // Search access points in Supabase using text search
  async searchAccessPoints(query: string): Promise<APIResponse<AccessPoint[]>> {
    try {
      // Use the search_access_points function defined in the SQL schema
      const { data, error } = await this.supabase
        .rpc('search_access_points', { search_query: query })
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Supabase search error: ${error.message}`);
        return { success: false, error: `Failed to search access points: ${error.message}` };
      }

      const convertedData = data ? data.map((item: Record<string, any>) => this.toCamelCase(item) as AccessPoint) : [];
      return { success: true, data: convertedData };
    } catch (error: any) {
      console.error(`Error searching access points: ${error.message}`);
      return { success: false, error: `Failed to search access points: ${error.message}` };
    }
  }

  // Bulk insert access points to Supabase
  async bulkInsertAccessPoints(accessPoints: AccessPoint[]): Promise<APIResponse<any>> {
    try {
      // Convert each access point to snake_case and add timestamps
      console.log(`Starting bulk upsert of ${accessPoints.length} access points to Supabase...`);
      const dataToInsert = accessPoints.map(ap => ({
        ...this.toSnakeCase(ap as Record<string, any>),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from(this.tableName)
        .upsert(dataToInsert, { onConflict: 'id' });

      if (error) {
        console.error('Supabase bulk insert error:', error);
        
        // Provide more specific error message for RLS policy violations
        if (error.code === '42501' && error.message.includes('row-level security policy')) {
          return { 
            success: false, 
            error: 'Row-level security policy violation. Please ensure your API key has the necessary permissions.' 
          };
        }
        
        return { success: false, error: `Failed to bulk insert access points: ${error.message}` };
      }

      console.log(`Successfully upserted ${dataToInsert.length} access points to Supabase`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error bulk inserting access points: ${error.message}`);
      return { success: false, error: `Failed to bulk insert access points: ${error.message}` };
    }
  }
}

export default SupabaseOperations;