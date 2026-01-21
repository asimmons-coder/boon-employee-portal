-- Create checkpoints table for SCALE post-session check-ins
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  checkpoint_number INTEGER NOT NULL,
  session_count_at_checkpoint INTEGER NOT NULL,

  -- Store ratings and scores as JSONB
  competency_scores JSONB DEFAULT '{}'::jsonb,

  -- Text feedback fields
  reflection_text TEXT,
  focus_area TEXT,

  -- NPS and testimonial
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  testimonial_consent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate checkpoints for same user/checkpoint number
  UNIQUE(email, checkpoint_number)
);

-- Index for looking up checkpoints by email
CREATE INDEX IF NOT EXISTS idx_checkpoints_email ON checkpoints(email);

-- Enable RLS
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own checkpoints
CREATE POLICY "Users can read own checkpoints"
  ON checkpoints FOR SELECT
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Policy: Users can insert their own checkpoints
CREATE POLICY "Users can insert own checkpoints"
  ON checkpoints FOR INSERT
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Policy: Service role can do everything
CREATE POLICY "Service role full access"
  ON checkpoints FOR ALL
  USING (auth.role() = 'service_role');
