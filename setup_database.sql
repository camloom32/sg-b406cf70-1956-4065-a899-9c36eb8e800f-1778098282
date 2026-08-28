-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  actual_price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_state table (3 teams)
CREATE TABLE game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_1_score INTEGER DEFAULT 0,
  team_2_score INTEGER DEFAULT 0,
  team_3_score INTEGER DEFAULT 0,
  current_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  team_1_guess DECIMAL(10, 2) NULL,
  team_2_guess DECIMAL(10, 2) NULL,
  team_3_guess DECIMAL(10, 2) NULL,
  game_stage TEXT DEFAULT 'waiting' CHECK (game_stage IN ('waiting', 'guessing', 'revealed', 'showcase', 'showcase_revealed')),
  team_1_name TEXT DEFAULT 'Team 1',
  team_2_name TEXT DEFAULT 'Team 2',
  team_3_name TEXT DEFAULT 'Team 3',
  showcase_active BOOLEAN DEFAULT false,
  team_1_showcase_id INTEGER,
  team_2_showcase_id INTEGER,
  team_3_showcase_id INTEGER,
  team_1_showcase_guess DECIMAL(10, 2),
  team_2_showcase_guess DECIMAL(10, 2),
  team_3_showcase_guess DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create showcases table
CREATE TABLE showcases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  showcase_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  price_cad DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcases ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true);

-- Game state policies
CREATE POLICY "Anyone can view game state" ON game_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game state" ON game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game state" ON game_state FOR UPDATE USING (true);

-- Showcase policies
CREATE POLICY "public_read" ON showcases FOR SELECT USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;

-- Insert sample products
INSERT INTO products (name, actual_price, image_url) VALUES
  ('Sony 65" 4K Smart TV', 799.99, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'),
  ('KitchenAid Stand Mixer', 349.99, 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800'),
  ('Apple iPad Pro 12.9"', 1099.00, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'),
  ('Dyson V15 Vacuum', 749.99, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800'),
  ('Nintendo Switch OLED', 349.99, 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800');

-- Insert initial game state
INSERT INTO game_state (team_1_score, team_2_score, team_3_score, game_stage) VALUES (0, 0, 0, 'waiting');

-- Insert showcases (3 packages)
INSERT INTO showcases (showcase_id, item_type, item_name, description, price_cad) VALUES
  (1, 'Vacation', 'Tokyo & Osaka', '10-day luxury excursion for two with business class flights and 5-star hotels.', 14200),
  (1, 'Appliance', 'Samsung Bespoke Suite', '4-piece Matte Black kitchen set including AI refrigerator and induction range.', 8800),
  (1, 'Vehicle', '2026 Mini Cooper SE', 'All-electric icon with panoramic sunroof and Harman Kardon audio.', 49500),
  (2, 'Vacation', 'Yukon Wilderness Retreat', '7 nights at an eco-lodge with dog-sledding and Northern Lights tours.', 11500),
  (2, 'Appliance', 'Backyard Oasis', 'Napoleon Prestige PRO Grill and wood-fired outdoor pizza oven.', 6400),
  (2, 'Vehicle', '2026 Ford F-150 Lightning', 'Electric truck with Extended Range Battery and BlueCruise driving.', 88200),
  (3, 'Vacation', 'Mediterranean Cruise', '10-night Mediterranean cruise visiting Rome, Santorini, and Barcelona with balcony stateroom', 8500),
  (3, 'Appliance', 'Kitchen Renovation Package', 'Professional-grade gas range, French door refrigerator, dishwasher, and wine cooler by KitchenAid', 12500),
  (3, 'Vehicle', 'Tesla Model Y Long Range', '2025 Tesla Model Y Long Range with full self-driving capability and premium interior', 62990);