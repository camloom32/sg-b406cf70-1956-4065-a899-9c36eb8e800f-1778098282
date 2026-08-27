-- Drop the old CHECK constraint and add a new one with showcase stages
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_game_stage_check;

ALTER TABLE game_state ADD CONSTRAINT game_state_game_stage_check 
CHECK (game_stage IN ('waiting', 'guessing', 'revealed', 'showcase', 'showcase_revealed'));