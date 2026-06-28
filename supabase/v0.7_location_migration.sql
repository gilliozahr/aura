-- v0.7 migration: add location fields to user_profiles
-- Safe: uses IF NOT EXISTS / does not drop existing columns

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS longitude double precision;
