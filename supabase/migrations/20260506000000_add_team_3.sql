-- Add team 3 columns to game_state
ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS team_3_name TEXT DEFAULT 'Team 3',
  ADD COLUMN IF NOT EXISTS team_3_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_3_guess DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS team_3_showcase_guess DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS team_3_showcase_id INTEGER;

-- Add showcase 3 items (European river cruise + luxury appliances + electric SUV)
INSERT INTO showcases (showcase_id, item_type, item_name, description, price_cad, image_url) VALUES
  (3, 'Vacation', 'Mediterranean Cruise', '10-night Mediterranean cruise visiting Rome, Santorini, and Barcelona with balcony stateroom', 8500.00, NULL),
  (3, 'Appliance', 'Kitchen Renovation Package', 'Professional-grade gas range, French door refrigerator, dishwasher, and wine cooler by KitchenAid', 12500.00, NULL),
  (3, 'Vehicle', 'Tesla Model Y Long Range', '2025 Tesla Model Y Long Range with full self-driving capability and premium interior', 62990.00, NULL);