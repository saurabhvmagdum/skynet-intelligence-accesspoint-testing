// pineconeOperations.ts - Handle Pinecone vector database operations

import { Pinecone } from '@pinecone-database/pinecone';
import { AccessPoint, VectorData, APIResponse } from './types';
import dotenv from 'dotenv';
dotenv.config();// Ensure environment variables are loaded


const EMBEDDING_DIMENSION = 1024; // OpenAI's text-embedding-ada-002 dimension

class PineconeOperations {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'accesspoints-data-manager';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables.');
    }

    this.pinecone = new Pinecone({ apiKey });
  }

  // Convert AccessPoint to vector embedding
  private async generateEmbedding(accessPoint: AccessPoint): Promise<number[]> {
    // Create a rich text representation of the access point for embedding
    const textToEmbed = [
      `ID: ${accessPoint.id}`,
      `Subnet: ${accessPoint.subnetName} (${accessPoint.subnetID})`,
      `Description: ${accessPoint.description}`,
      `Input: ${accessPoint.input} (${accessPoint.inputType})`,
      `Output: ${accessPoint.output} (${accessPoint.outputType})`,
      `Capabilities: ${accessPoint.capabilities.join(', ')}`,
      `Tags: ${accessPoint.tags.join(', ')}`,
      accessPoint.promptExample ? `Example: ${accessPoint.promptExample}` : ''
    ].filter(Boolean).join('\n');
    
    // Check if OpenAI API key is available for better embeddings
    if (process.env.OPENAI_API_KEY) {
      try {
        // If you have the OpenAI package installed, you could use it here
        // This is a placeholder for actual OpenAI API call
        console.log('Using OpenAI for embeddings (placeholder - not actually calling API)');
        // In a real implementation, you would call the OpenAI API here
      } catch (error) {
        console.warn('Failed to generate OpenAI embedding, falling back to hash-based method:', error);
      }
    }
    
    // Fallback: Generate a deterministic hash-based vector if OpenAI key is missing
    console.warn('Warning: OPENAI_API_KEY not found. Using a basic hash-based embedding. For better search results, please provide an OpenAI API key.');
    const vector = new Array(EMBEDDING_DIMENSION).fill(0);
    let hash = 0;
    for (let i = 0; i < textToEmbed.length; i++) {
      const char = textToEmbed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Ensure 32-bit integer
      vector[i % EMBEDDING_DIMENSION] = (hash % 2000 - 1000) / 1000; // Normalize to [-1, 1]
    }
    
    return vector;
  }

  // Upsert access point to Pinecone
  async upsertAccessPoint(accessPoint: AccessPoint): Promise<APIResponse<void>> {
    try {
      const index = this.pinecone.index(this.indexName);
      const embedding = await this.generateEmbedding(accessPoint);

      const vectorData: VectorData = {
        id: accessPoint.id,
          values: embedding,
          metadata: {
          id: accessPoint.id,
          subnetID: accessPoint.subnetID,
          description: accessPoint.description,
          fileUpload: accessPoint.fileUpload,
          fileDownload: accessPoint.fileDownload,
          promptExample: accessPoint.promptExample || '',
          tags: accessPoint.tags || []
          }
      };

      await index.upsert([vectorData]);
      return { success: true };
    } catch (error: any) {
      console.error(`Error upserting to Pinecone: ${error.message}`);
      return { success: false, error: `Failed to upsert to Pinecone: ${error.message}` };
    }
  }

  // Update access point in Pinecone
  async updateAccessPoint(accessPoint: AccessPoint): Promise<APIResponse<void>> {
    // Pinecone updates are done via upsert
    return this.upsertAccessPoint(accessPoint);
  }

  // Search similar access points
  async searchSimilar(query: string, topK: number = 10): Promise<APIResponse<any[]>> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Generate embedding for the query (same method as for access points)
      const queryAccessPoint: AccessPoint = {
        id: 'query',
        subnetID: '',
        subnetName: '',
        description: query,
        input: '',
        output: '',
        inputType: 'text',
        outputType: 'text',
        capabilities: [],
        tags: query.split(' '),
        promptExample: '',
        fileUpload: false,
        fileDownload: false,
        subnetURL: '',
      };

      const queryEmbedding = await this.generateEmbedding(queryAccessPoint);

      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
      });

      return { success: true, data: searchResponse.matches || [] };
    } catch (error: any) {
      console.error(`Error searching Pinecone: ${error.message}`);
      return { success: false, error: `Failed to search Pinecone: ${error.message}` };
    }
  }

  // Search by metadata filters
  async searchByFilter(filter: Record<string, any>, topK: number = 10): Promise<APIResponse<any[]>> {
    try {
      const index = this.pinecone.index(this.indexName);

      const searchResponse = await index.query({
        vector: new Array(EMBEDDING_DIMENSION).fill(0), // Dummy vector for metadata-only search
        topK: topK,
        includeMetadata: true,
        filter: filter
      });

      return { success: true, data: searchResponse.matches || [] };
    } catch (error: any) {
      console.error(`Error filtering Pinecone: ${error.message}`);
      return { success: false, error: `Failed to filter Pinecone: ${error.message}` };
    }
  }

  // Delete access point from Pinecone
  async deleteAccessPoint(id: string): Promise<APIResponse<void>> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(id);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting from Pinecone: ${error.message}`);
      return { success: false, error: `Failed to delete from Pinecone: ${error.message}` };
    }
  }

  // Bulk upsert access points
  async bulkUpsertAccessPoints(accessPoints: AccessPoint[]): Promise<APIResponse<void>> {
    try {
      const index = this.pinecone.index(this.indexName);
      const vectorsData: VectorData[] = [];

      for (const accessPoint of accessPoints) {
        const embedding = await this.generateEmbedding(accessPoint);
        vectorsData.push({
          id: accessPoint.id,
          values: embedding,
          metadata: {
          id: accessPoint.id,
          subnetID: accessPoint.subnetID,
          description: accessPoint.description,
          fileUpload: accessPoint.fileUpload,
          fileDownload: accessPoint.fileDownload,
          promptExample: accessPoint.promptExample || '',
          tags: accessPoint.tags || []
          }
        });
      }

      // Pinecone has a limit on batch size, so we'll process in chunks
      const chunkSize = 100;
      for (let i = 0; i < vectorsData.length; i += chunkSize) {
        const chunk = vectorsData.slice(i, i + chunkSize);
        await index.upsert(chunk);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Error bulk upserting to Pinecone: ${error.message}`);
      return { success: false, error: `Failed to bulk upsert to Pinecone: ${error.message}` };
    }
  }

  // Get vector by ID
  async getVector(id: string): Promise<APIResponse<any>> {
    try {
      const index = this.pinecone.index(this.indexName);
      const response = await index.fetch([id]);
      const vectorData = response.records && response.records[id] ? response.records[id] : null;
      if (!vectorData) {
        return { success: false, error: `Vector with id ${id} not found in Pinecone.` };
      }
      return { success: true, data: vectorData };
    } catch (error: any) {
      console.error(`Error fetching from Pinecone: ${error.message}`);
      return { success: false, error: `Failed to fetch from Pinecone: ${error.message}` };
    }
  }
}

export default PineconeOperations;