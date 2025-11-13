-- Create location_mapping table to track ID relationships
CREATE TABLE IF NOT EXISTS location_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_location_id UUID NOT NULL,
  duplicate_location_id UUID NOT NULL,
  master_name TEXT NOT NULL,
  duplicate_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert mapping relationships
INSERT INTO location_mapping (master_location_id, duplicate_location_id, master_name, duplicate_name) VALUES
-- Bar Bea: Keep 550e8400-e29b-41d4-a716-446655440002, map 29dfaf69-4e95-44c8-9743-3305b4f1fa54
('550e8400-e29b-41d4-a716-446655440002', '29dfaf69-4e95-44c8-9743-3305b4f1fa54', 'Bar Bea', 'Bar Bea'),

-- Van Kinsbergen: Keep 550e8400-e29b-41d4-a716-446655440001, map bafc9823-bc18-4fa7-bb63-dc70e03184f4
('550e8400-e29b-41d4-a716-446655440001', 'bafc9823-bc18-4fa7-bb63-dc70e03184f4', 'Van Kinsbergen', 'van Kinsbergen'),

-- L'Amour Toujours: Keep 550e8400-e29b-41d4-a716-446655440003, map f77a28ab-2653-4887-b176-de3baff42d65
('550e8400-e29b-41d4-a716-446655440003', 'f77a28ab-2653-4887-b176-de3baff42d65', 'L''Amour Toujours', 'l''Amour-Toujours');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_mapping_duplicate ON location_mapping(duplicate_location_id);
CREATE INDEX IF NOT EXISTS idx_location_mapping_master ON location_mapping(master_location_id);
