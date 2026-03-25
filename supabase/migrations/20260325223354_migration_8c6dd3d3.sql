-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  actual_price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_state table (single row for current game)
CREATE TABLE game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_1_score INTEGER DEFAULT 0,
  team_2_score INTEGER DEFAULT 0,
  current_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  team_1_guess DECIMAL(10, 2) NULL,
  team_2_guess DECIMAL(10, 2) NULL,
  game_stage TEXT DEFAULT 'waiting' CHECK (game_stage IN ('waiting', 'guessing', 'revealed')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, authenticated write)
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products" ON products FOR DELETE USING (true);

-- Game state policies (public access for real-time sync)
CREATE POLICY "Anyone can view game state" ON game_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game state" ON game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game state" ON game_state FOR UPDATE USING (true);

-- Enable realtime for game_state
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;

-- Insert 5 dummy products for testing
INSERT INTO products (name, actual_price, image_url) VALUES
  ('Sony 65" 4K Smart TV', 799.99, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'),
  ('KitchenAid Stand Mixer', 349.99, 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800'),
  ('Apple iPad Pro 12.9"', 1099.00, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'),
  ('Dyson V15 Vacuum', 749.99, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800'),
  ('Nintendo Switch OLED', 349.99, 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800');

-- Insert initial game state row
INSERT INTO game_state (team_1_score, team_2_score, game_stage) VALUES (0, 0, 'waiting');