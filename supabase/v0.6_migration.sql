-- v0.6: Wardrobe Vision AI + Location Intelligence
-- Safe: all statements use ADD COLUMN IF NOT EXISTS

-- Wardrobe Vision AI: store AI metadata per wardrobe item
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS ai_metadata jsonb;

-- Location Intelligence: store user's preferred location
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS longitude double precision;
