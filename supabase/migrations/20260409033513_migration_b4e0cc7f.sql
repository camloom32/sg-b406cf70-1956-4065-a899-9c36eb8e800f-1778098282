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
ALTER TABLE showcases ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "public_read" ON showcases FOR SELECT USING (true);

-- Insert showcase data from CSV
INSERT INTO showcases (showcase_id, item_type, item_name, description, price_cad) VALUES
(1, 'Vacation', 'Tokyo & Osaka', '10-day luxury excursion for two with business class flights and 5-star hotels.', 14200),
(1, 'Appliance', 'Samsung Bespoke Suite', '4-piece Matte Black kitchen set including AI refrigerator and induction range.', 8800),
(1, 'Vehicle', '2026 Mini Cooper SE', 'All-electric icon with panoramic sunroof and Harman Kardon audio.', 49500),
(2, 'Vacation', 'Yukon Wilderness Retreat', '7 nights at an eco-lodge with dog-sledding and Northern Lights tours.', 11500),
(2, 'Appliance', 'Backyard Oasis', 'Napoleon Prestige PRO Grill and wood-fired outdoor pizza oven.', 6400),
(2, 'Vehicle', '2026 Ford F-150 Lightning', 'Electric truck with Extended Range Battery and BlueCruise driving.', 88200);

-- Add showcase columns to game_state
ALTER TABLE game_state
ADD COLUMN showcase_active BOOLEAN DEFAULT false,
ADD COLUMN team_1_showcase_id INTEGER,
ADD COLUMN team_2_showcase_id INTEGER,
ADD COLUMN team_1_showcase_guess DECIMAL(10,2),
ADD COLUMN team_2_showcase_guess DECIMAL(10,2);