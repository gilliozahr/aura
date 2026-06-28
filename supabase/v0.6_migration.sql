-- v0.6: Wardrobe Vision AI — add ai_metadata column to wardrobe_items
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS ai_metadata jsonb;
