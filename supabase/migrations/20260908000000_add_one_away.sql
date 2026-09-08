-- One Away round: prize table, state storage, stage values
-- Includes catch-up for missed 20260513000000_add_showcase_is_used.sql

ALTER TABLE showcases ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS one_away_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  actual_price DECIMAL(10,2) NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE one_away_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view one away prizes" ON one_away_prizes FOR SELECT USING (true);

ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS one_away_state JSONB;

-- Extend allowed game_stage values for One Away
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_game_stage_check;
ALTER TABLE game_state ADD CONSTRAINT game_state_game_stage_check
  CHECK (game_stage IN ('waiting', 'guessing', 'revealed', 'showcase', 'showcase_revealed', 'one_away', 'one_away_reveal', 'one_away_complete'));
