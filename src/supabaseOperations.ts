// databaseOperations.ts - Handle PostgreSQL database operations

import { Pool, PoolClient } from 'pg';
import { AccessPoint, APIResponse } from './types';
import dotenv from 'dotenv';
dotenv.config();

class DatabaseOperations {
  private pool: Pool;
  private tableName = 'access_points';
 
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be set in environment variables.');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

  // Build dynamic insert query
  private buildInsertQuery(data: Record<string, any>): { query: string; values: any[] } {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    return { query, values };
  }

  // Build dynamic update query
  private buildUpdateQuery(data: Record<string, any>, id: string): { query: string; values: any[] } {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    return { query, values: [...values, id] };
  }

  // Create access point in PostgreSQL
  async createAccessPoint(accessPoint: AccessPoint): Promise<APIResponse<AccessPoint>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const dataToInsert = {
        ...this.toSnakeCase(accessPoint as Record<string, any>),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { query, values } = this.buildInsertQuery(dataToInsert);
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'Failed to create access point: No data returned' };
      }

      return { success: true, data: this.toCamelCase(result.rows[0]) as AccessPoint };
    } catch (error: any) {
      console.error(`Error creating access point: ${error.message}`);
      return { success: false, error: `Failed to create access point: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Update access point in PostgreSQL
  async updateAccessPoint(id: string, updates: Partial<AccessPoint>): Promise<APIResponse<AccessPoint>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const dataToUpdate = {
        ...this.toSnakeCase(updates as Record<string, any>),
        updated_at: new Date().toISOString(),
      };

      const { query, values } = this.buildUpdateQuery(dataToUpdate, id);
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return { success: false, error: `Access point with id ${id} not found.` };
      }

      return { success: true, data: this.toCamelCase(result.rows[0]) as AccessPoint };
    } catch (error: any) {
      console.error(`Error updating access point: ${error.message}`);
      return { success: false, error: `Failed to update access point: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Get access point by ID from PostgreSQL
  async getAccessPoint(id: string): Promise<APIResponse<AccessPoint>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return { success: false, error: `Access point with id ${id} not found.` };
      }

      return { success: true, data: this.toCamelCase(result.rows[0]) as AccessPoint };
    } catch (error: any) {
      console.error(`Error getting access point: ${error.message}`);
      return { success: false, error: `Failed to get access point: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Get all access points from PostgreSQL
  async getAllAccessPoints(): Promise<APIResponse<AccessPoint[]>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
      const result = await client.query(query);

      const convertedData = result.rows.map((row: any) => this.toCamelCase(row) as AccessPoint);

      return { success: true, data: convertedData };
    } catch (error: any) {
      console.error(`Error getting all access points: ${error.message}`);
      return { success: false, error: `Failed to get all access points: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Delete access point from PostgreSQL
  async deleteAccessPoint(id: string): Promise<APIResponse<void>> {
    let client: PoolClient | null = null;
    
    try {
      console.log(`Deleting access point with ID: ${id} from PostgreSQL`);
      client = await this.pool.connect();
      
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await client.query(query, [id]);

      if (result.rowCount === 0) {
        return { success: false, error: `Access point with id ${id} not found.` };
      }

      console.log(`Successfully deleted access point with ID: ${id} from PostgreSQL`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting access point: ${error.message}`);
      return { success: false, error: `Failed to delete access point: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Search access points in PostgreSQL using text search
  async searchAccessPoints(query: string): Promise<APIResponse<AccessPoint[]>> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      // Use full-text search or ILIKE for partial matches
      // This assumes you have a search function or use basic text search
      const searchQuery = `
        SELECT * FROM ${this.tableName}
        WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location, '')) 
        @@ plainto_tsquery('english', $1)
        OR name ILIKE $2
        OR description ILIKE $2
        OR location ILIKE $2
        ORDER BY created_at DESC
      `;
      
      const likePattern = `%${query}%`;
      const result = await client.query(searchQuery, [query, likePattern]);

      const convertedData = result.rows.map((row: any) => this.toCamelCase(row) as AccessPoint);
      return { success: true, data: convertedData };
    } catch (error: any) {
      console.error(`Error searching access points: ${error.message}`);
      return { success: false, error: `Failed to search access points: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Bulk insert access points to PostgreSQL
  async bulkInsertAccessPoints(accessPoints: AccessPoint[]): Promise<APIResponse<any>> {
    let client: PoolClient | null = null;
    
    try {
      console.log(`Starting bulk upsert of ${accessPoints.length} access points to PostgreSQL...`);
      client = await this.pool.connect();
      
      // Start transaction
      await client.query('BEGIN');
      
      // Convert each access point to snake_case and add timestamps
      const dataToInsert = accessPoints.map(ap => ({
        ...this.toSnakeCase(ap as Record<string, any>),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Build bulk upsert query
      if (dataToInsert.length > 0) {
        const firstRow = dataToInsert[0];
        const columns = Object.keys(firstRow);
        const placeholders = dataToInsert.map((_, rowIndex) => 
          `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const values = dataToInsert.flatMap(row => Object.values(row));
        
        const conflictColumns = ['id']; // Assuming 'id' is the conflict column
        const updateSet = columns
          .filter(col => !conflictColumns.includes(col))
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');
        
        const query = `
          INSERT INTO ${this.tableName} (${columns.join(', ')})
          VALUES ${placeholders}
          ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateSet}
        `;
        
        await client.query(query, values);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Successfully upserted ${dataToInsert.length} access points to PostgreSQL`);
      return { success: true };
    } catch (error: any) {
      // Rollback transaction on error
      if (client) {
        await client.query('ROLLBACK');
      }
      
      console.error(`Error bulk inserting access points: ${error.message}`);
      return { success: false, error: `Failed to bulk insert access points: ${error.message}` };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Close database connections
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default DatabaseOperations;