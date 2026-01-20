-- Migration: Add coaching_wins table for tracking employee breakthroughs
-- Date: 2026-01-20

-- Create the coaching_wins table
CREATE TABLE IF NOT EXISTS coaching_wins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id BIGINT REFERENCES employee_manager(id) NOT NULL,
  email VARCHAR(255), -- denormalized for easier lookups
  coach_id UUID REFERENCES coaches(id),
  session_number INTEGER,
  win_text TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'check_in_survey', -- 'check_in_survey', 'manual', 'coach_logged'
  is_private BOOLEAN DEFAULT false, -- if true, exclude from anonymized reporting
  survey_response_id UUID, -- link to original survey if applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_coaching_wins_employee ON coaching_wins(employee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_wins_email ON coaching_wins(email);
CREATE INDEX IF NOT EXISTS idx_coaching_wins_created ON coaching_wins(created_at DESC);

-- Add RLS policies
ALTER TABLE coaching_wins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own wins
CREATE POLICY "Users can view own wins" ON coaching_wins
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR email ILIKE current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Policy: Users can insert their own wins
CREATE POLICY "Users can insert own wins" ON coaching_wins
  FOR INSERT
  WITH CHECK (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR email ILIKE current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_coaching_wins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaching_wins_updated_at
  BEFORE UPDATE ON coaching_wins
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_wins_updated_at();

-- Comment on table
COMMENT ON TABLE coaching_wins IS 'Tracks employee wins and breakthroughs during their coaching journey';
COMMENT ON COLUMN coaching_wins.source IS 'Origin of the win: check_in_survey, manual (employee added), or coach_logged';
COMMENT ON COLUMN coaching_wins.is_private IS 'If true, exclude from anonymized CHRO reporting';
