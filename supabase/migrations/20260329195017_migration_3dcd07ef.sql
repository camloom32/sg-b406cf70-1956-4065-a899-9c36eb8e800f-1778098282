-- Add team name columns to game_state table
ALTER TABLE game_state 
ADD COLUMN team_1_name TEXT DEFAULT 'Team 1',
ADD COLUMN team_2_name TEXT DEFAULT 'Team 2';

-- Update the existing row with default names
UPDATE game_state 
SET team_1_name = 'Team 1', team_2_name = 'Team 2'
WHERE id = (SELECT id FROM game_state LIMIT 1);