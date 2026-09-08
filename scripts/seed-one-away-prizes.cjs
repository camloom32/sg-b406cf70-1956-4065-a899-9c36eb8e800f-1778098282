const fs = require("fs");
const { createClient } = require("../node_modules/@supabase/supabase-js");

const env = fs.readFileSync(__dirname + "/../.env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const supabase = createClient(url, key);

// 6 confirmed from showcases_1_2_3/4_5_6 backups, 4 with ballpark 2025 MSRPs (edit in dashboard as needed)
const PRIZES = [
  { name: "2025 Honda CR-V Hybrid AWD", image_url: "/showcase/p1-vehicle-cr-v.jpg", actual_price: 48500 },
  { name: "2025 Mazda CX-50 Turbo Premium Plus", image_url: "/showcase/p2-vehicle-mazda-cx50.jpg", actual_price: 47000 },
  { name: "2025 Volkswagen ID.4 Pro S", image_url: "/showcase/p3-vehicle-vw-id4.jpg", actual_price: 52000 },
  { name: "2025 Toyota RAV4 Hybrid XSE", image_url: "/showcase/p4-vehicle-rav4.jpg", actual_price: 44500 },
  { name: "2025 Subaru Outback Wilderness", image_url: "/showcase/p5-vehicle-outback.jpg", actual_price: 44000 },
  { name: "2025 MINI Cooper SE All Electric", image_url: "/showcase/p6-vehicle-mini-cooper.jpg", actual_price: 39500 },
  { name: "2025 Kia EV9 Land AWD", image_url: "/showcase/p9-vehicle-kia-ev9.jpg", actual_price: 62900 },
  { name: "2025 Chevrolet Equinox EV LT", image_url: "/showcase/p10-vehicle-equinox-ev.jpg", actual_price: 46199 },
  { name: "2025 Jeep Wrangler 4xe Rubicon X", image_url: "/showcase/p11-vehicle-jeep-wrangler.jpg", actual_price: 85790 },
  { name: "2025 Tesla Model Y Long Range AWD", image_url: "/showcase/p12-vehicle-tesla-model-y.jpg", actual_price: 56990 },
];

(async () => {
  const { count, error: countError } = await supabase
    .from("one_away_prizes")
    .select("id", { count: "exact", head: true });
  if (countError) {
    console.error("Cannot read one_away_prizes (run the migration first):", countError.message);
    process.exit(1);
  }
  if (count && count > 0) {
    console.log(`Table already has ${count} prizes. Delete them first if you want to reseed.`);
    process.exit(0);
  }

  const { error } = await supabase.from("one_away_prizes").insert(PRIZES.map((p) => ({ ...p, is_used: false })));
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log("Seeded " + PRIZES.length + " One Away prizes");
})();
