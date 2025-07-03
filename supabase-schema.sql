-- supabase-schema.sql
-- Run this SQL in your Supabase SQL editor to create the required table

-- Create access_points table
CREATE TABLE IF NOT EXISTS access_points (
    id VARCHAR(255) PRIMARY KEY,
    subnet_id VARCHAR(50) NOT NULL,
    subnet_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    input VARCHAR(255) NOT NULL,
    output VARCHAR(255) NOT NULL,
    input_type VARCHAR(50) NOT NULL CHECK (input_type IN ('text', 'json', 'file', 'image')),
    output_type VARCHAR(50) NOT NULL CHECK (output_type IN ('text', 'json', 'file', 'image')),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    prompt_example TEXT,
    file_upload BOOLEAN NOT NULL DEFAULT FALSE,
    file_download BOOLEAN NOT NULL DEFAULT FALSE,
    subnet_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_access_points_subnet_id ON access_points(subnet_id);
CREATE INDEX IF NOT EXISTS idx_access_points_subnet_name ON access_points(subnet_name);
CREATE INDEX IF NOT EXISTS idx_access_points_tags ON access_points USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_access_points_capabilities ON access_points USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_access_points_input_type ON access_points(input_type);
CREATE INDEX IF NOT EXISTS idx_access_points_output_type ON access_points(output_type);
CREATE INDEX IF NOT EXISTS idx_access_points_created_at ON access_points(created_at);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_access_points_updated_at 
    BEFORE UPDATE ON access_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE access_points ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON access_points
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access for anonymous users (optional)
CREATE POLICY "Allow read access for anonymous users" ON access_points
    FOR SELECT USING (true);



-- Grant necessary permissions (adjust based on your needs)
GRANT SELECT, INSERT, UPDATE, DELETE ON access_points TO authenticated;


-- Optional: Create a function for full-text search
CREATE OR REPLACE FUNCTION search_access_points(search_query TEXT)
RETURNS TABLE (
    id VARCHAR(255),
    subnet_name VARCHAR(100),
    description TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id,
        ap.subnet_name,
        ap.description,
        ts_rank(
            to_tsvector('english', ap.description || ' ' || array_to_string(ap.tags, ' ') || ' ' || array_to_string(ap.capabilities, ' ')),
            plainto_tsquery('english', search_query)
        ) AS relevance_score
    FROM access_points ap
    WHERE to_tsvector('english', ap.description || ' ' || array_to_string(ap.tags, ' ') || ' ' || array_to_string(ap.capabilities, ' '))
          @@ plainto_tsquery('english', search_query)
    ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;