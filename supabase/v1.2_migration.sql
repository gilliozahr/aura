-- AURA v1.2 migration
-- Shopping Link Intelligence + Size Profile
-- Run this AFTER supabase/schema.sql and supabase/v0.9_migration.sql

-- ── User size profile ────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS size_profile jsonb NOT NULL DEFAULT '{}';

-- ── Shopping products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_products (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url                text NOT NULL,
  title              text,
  brand              text,
  price              numeric,
  currency           text,
  category           text,
  color              text,
  material           text,
  description        text,
  image_urls         jsonb NOT NULL DEFAULT '[]',
  available_sizes    jsonb NOT NULL DEFAULT '[]',
  size_guide         jsonb NOT NULL DEFAULT '{}',
  extraction_source  text,
  extraction_status  text,
  extracted_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_products' AND policyname = 'shopping_products_select_own'
  ) THEN
    CREATE POLICY shopping_products_select_own
      ON public.shopping_products FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_products' AND policyname = 'shopping_products_insert_own'
  ) THEN
    CREATE POLICY shopping_products_insert_own
      ON public.shopping_products FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_products' AND policyname = 'shopping_products_update_own'
  ) THEN
    CREATE POLICY shopping_products_update_own
      ON public.shopping_products FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_products' AND policyname = 'shopping_products_delete_own'
  ) THEN
    CREATE POLICY shopping_products_delete_own
      ON public.shopping_products FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Shopping recommendations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_recommendations (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id                  uuid REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  decision                    text NOT NULL,
  confidence_score            integer NOT NULL DEFAULT 0,
  wardrobe_match_score        integer NOT NULL DEFAULT 0,
  style_dna_fit_score         integer NOT NULL DEFAULT 0,
  size_fit_score              integer NOT NULL DEFAULT 0,
  duplicate_risk_score        integer NOT NULL DEFAULT 0,
  occasion_usefulness_score   integer NOT NULL DEFAULT 0,
  trip_usefulness_score       integer NOT NULL DEFAULT 0,
  reasoning                   text,
  risks                       jsonb NOT NULL DEFAULT '[]',
  size_notes                  text,
  wardrobe_matches            jsonb NOT NULL DEFAULT '[]',
  outfit_ideas                jsonb NOT NULL DEFAULT '[]',
  missing_gap_match           jsonb NOT NULL DEFAULT '{}',
  alternatives                jsonb NOT NULL DEFAULT '[]',
  ai_enhanced                 boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_recommendations' AND policyname = 'shopping_rec_select_own'
  ) THEN
    CREATE POLICY shopping_rec_select_own
      ON public.shopping_recommendations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_recommendations' AND policyname = 'shopping_rec_insert_own'
  ) THEN
    CREATE POLICY shopping_rec_insert_own
      ON public.shopping_recommendations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shopping_recommendations' AND policyname = 'shopping_rec_delete_own'
  ) THEN
    CREATE POLICY shopping_rec_delete_own
      ON public.shopping_recommendations FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
