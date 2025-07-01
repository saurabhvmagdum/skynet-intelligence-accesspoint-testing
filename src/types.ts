// types.ts - Define the data structure and types

export interface AccessPoint {
  id: string;
  subnetID: string;
  subnetName: string;
  description: string;
  input: string;
  output: string;
  inputType: 'text' | 'json' | 'file' | 'image';
  outputType: 'text' | 'json' | 'file' | 'image';
  capabilities: string[];
  tags: string[];
  promptExample: string;
  fileUpload: boolean;
  fileDownload: boolean;
  subnetURL: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VectorData {
  id: string;
  values: number[];
  metadata: {
    id: string;
    subnetID: string;
    fileUpload?: boolean;
    fileDownload?: boolean;
    description: string;
    tags: string[];
    promptExample?: string;
  };
}

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  pineconeApiKey: string;
  pineconeIndexName: string;
  pineconeEnvironment: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}