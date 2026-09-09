-- The Wheel (Showcase Showdown): state storage + stage values

ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS wheel_state JSONB;

-- Extend allowed game_stage values for The Wheel
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_game_stage_check;
ALTER TABLE game_state ADD CONSTRAINT game_state_game_stage_check
  CHECK (game_stage IN ('waiting', 'guessing', 'revealed', 'showcase', 'showcase_revealed', 'one_away', 'one_away_reveal', 'one_away_complete', 'wheel', 'wheel_complete'));
