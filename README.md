# Skynet Intelligence Access Points

Real-time synchronization system between Supabase and Pinecone vector database

## Features
- Automated bi-directional sync between Supabase and Pinecone
- CRUD operations with transactional consistency
- Bulk import/export capabilities
- Health monitoring for both databases
- CI/CD pipeline with GitHub Actions

## Installation
```bash
npm install
```

## Configuration
Create `.env` file:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=accesspoints
```

## Usage
```typescript
const syncManager = new DataSyncManager();

// Sync existing data
await syncManager.syncSupabaseToPinecone();

// Real-time operations
await syncManager.createAccessPoint(newAccessPoint);
```

## CI/CD Pipeline
Automatic sync triggers on:
- Schema changes to access points
- Direct modifications to core sync logic
- Manual workflow dispatch

## Overview
This project manages access points data synchronization between Supabase (PostgreSQL) and Pinecone (vector database). It ensures that access points defined in the `accesspoint.ts` file are properly uploaded and maintained in both databases.

## Features
- Synchronize access points between Supabase and Pinecone
- Bulk upload access points from file
- Search access points using semantic search (Pinecone) with text search fallback (Supabase)
- Health check for database connections
- Automated synchronization via GitHub Actions

## Setup

### Prerequisites
- Node.js v16 or higher
- Supabase account and project
- Pinecone account and index

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # Supabase Configuration
   DATABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Pinecone Configuration
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=your_pinecone_index_name

   # Optional: OpenAI for better embeddings (recommended)
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

### Syncing Access Points from File
To sync access points defined in `accesspoint.ts` to both Supabase and Pinecone:

```bash
npm run sync-only
```

or

```bash
npm run sync-initial
```

### Running All Examples
```bash
npm run dev
```

### Health Check
```bash
npm run health-check
```

### Sync Supabase to Pinecone
```bash
npm run sync-supabase-to-pinecone
```

## Adding New Access Points

1. Edit the `src/accesspoint.ts` file to add new access points to the `accessPointsData` array
2. Run the sync command to update both databases:
   ```bash
   npm run sync-only
   ```

## GitHub Actions

This project includes GitHub Actions workflows that can:
- Run health checks on a schedule
- Sync data when access points are updated
- Manually trigger various sync operations

## Development

### Building the Project
```bash
npm run build
```

### Running in Production
```bash
npm start
```