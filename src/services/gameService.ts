import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/database.types";

export type Product = Tables<"products">;
export type GameState = Tables<"game_state">;

export interface GameStateWithProduct extends GameState {
  product?: Product | null;
}

export type TeamId = "team1" | "team2" | "team3";

const TEAM_KEYS = ["team_1", "team_2", "team_3"] as const;

// Fetch the current game state
export async function getGameState(): Promise<GameStateWithProduct | null> {
  const { data, error } = await supabase
    .from("game_state")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching game state:", error);
    return null;
  }

  // If there's a current product, fetch it
  if (data?.current_product_id) {
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.current_product_id)
      .single();
    
    return { ...data, product };
  }

  return { ...data, product: null };
}

// Get a random unused product
export async function getRandomProduct(): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_used", false)
    .limit(100);

  if (error || !data || data.length === 0) {
    console.error("Error fetching products or no unused products:", error);
    return null;
  }

  // Pick a random product from the unused ones
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

// Start a new round with a fresh product
export async function startNewRound(): Promise<boolean> {
  const product = await getRandomProduct();
  
  if (!product) {
    console.error("No unused products available");
    return false;
  }

  // Mark product as used
  const { error: productError } = await supabase
    .from("products")
    .update({ is_used: true })
    .eq("id", product.id);

  if (productError) {
    console.error("Error marking product as used:", productError);
    return false;
  }

  // Update game state
  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      current_product_id: product.id,
      team_1_guess: null,
      team_2_guess: null,
      team_3_guess: null,
      one_away_state: null,
      wheel_state: null,
      game_stage: "guessing",
    })
    .not("id", "is", null);

  if (stateError) {
    console.error("Error updating game state:", stateError);
    return false;
  }

  return true;
}

// Submit team guesses
export async function submitGuesses(team1Guess: number, team2Guess: number, team3Guess: number): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_guess: team1Guess,
      team_2_guess: team2Guess,
      team_3_guess: team3Guess,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error submitting guesses:", error);
    return false;
  }

  return true;
}

// Calculate winner and reveal results
export async function revealResults(): Promise<{ winner: TeamId | "none" | null }> {
  const gameState = await getGameState();
  
  if (!gameState || !gameState.product) {
    return { winner: null };
  }

  const actualPrice = gameState.product.actual_price;
  const team1Guess = gameState.team_1_guess;
  const team2Guess = gameState.team_2_guess;
  const team3Guess = gameState.team_3_guess;

  if (team1Guess === null || team2Guess === null || team3Guess === null) {
    return { winner: null };
  }

  const guesses: Record<TeamId, number> = {
    team1: team1Guess,
    team2: team2Guess,
    team3: team3Guess,
  };

  const diffs: Record<TeamId, number> = {
    team1: actualPrice - team1Guess,
    team2: actualPrice - team2Guess,
    team3: actualPrice - team3Guess,
  };

  const scores: Record<TeamId, number> = {
    team1: gameState.team_1_score ?? 0,
    team2: gameState.team_2_score ?? 0,
    team3: gameState.team_3_score ?? 0,
  };

  // Check which teams went over
  const teamsOver = (Object.keys(diffs) as TeamId[]).filter(t => diffs[t] < 0);
  const teamsUnder = (Object.keys(diffs) as TeamId[]).filter(t => diffs[t] >= 0);

  let winner: TeamId | "none";

  if (teamsUnder.length === 0) {
    // All teams went over
    winner = "none";
  } else if (teamsUnder.length === 1) {
    // Only one team under
    winner = teamsUnder[0];
    scores[winner] += 1;
  } else {
    // Multiple teams under: closest wins
    let closestTeam = teamsUnder[0];
    let closestDiff = diffs[teamsUnder[0]];
    for (let i = 1; i < teamsUnder.length; i++) {
      if (diffs[teamsUnder[i]] < closestDiff) {
        closestTeam = teamsUnder[i];
        closestDiff = diffs[teamsUnder[i]];
      } else if (diffs[teamsUnder[i]] === closestDiff) {
        // Tie: earlier team wins
      }
    }
    winner = closestTeam;
    scores[winner] += 1;
  }

  // Update game state with new scores and revealed stage
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_score: scores.team1,
      team_2_score: scores.team2,
      team_3_score: scores.team3,
      game_stage: "revealed",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error revealing results:", error);
    return { winner: null };
  }

  return { winner };
}

// Reset scores
export async function resetScores(): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_score: 0,
      team_2_score: 0,
      team_3_score: 0,
      current_product_id: null,
      team_1_guess: null,
      team_2_guess: null,
      team_3_guess: null,
      one_away_state: null,
      wheel_state: null,
      game_stage: "waiting",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error resetting scores:", error);
    return false;
  }

  return true;
}

// Reset all products to unused
export async function resetAllProducts(): Promise<boolean> {
  const { error } = await supabase
    .from("products")
    .update({ is_used: false })
    .not("id", "is", null);

  if (error) {
    console.error("Error resetting products:", error);
    return false;
  }

  return true;
}

// Import products from CSV data
export async function importProductsFromCSV(
  products: Array<{ name: string; actual_price: number; image_url: string }>
): Promise<{ success: boolean; count: number }> {
  const { data, error } = await supabase
    .from("products")
    .insert(products.map(p => ({ ...p, is_used: false })))
    .select();

  if (error) {
    console.error("Error importing products:", error);
    return { success: false, count: 0 };
  }

  return { success: true, count: data?.length || 0 };
}

// Export products to CSV
export async function exportProductsToCSV(): Promise<string | null> {
  const { data, error } = await supabase
    .from("products")
    .select("name, actual_price, image_url, is_used")
    .order("id");

  if (error) {
    console.error("Error exporting products:", error);
    return null;
  }

  // Create CSV header
  const header = "name,actual_price,image_url,is_used\n";
  
  // Create CSV rows
  const rows = data.map(product => {
    const name = `"${product.name.replace(/"/g, '""')}"`;
    const price = product.actual_price;
    const imageUrl = `"${product.image_url.replace(/"/g, '""')}"`;
    const isUsed = product.is_used;
    return `${name},${price},${imageUrl},${isUsed}`;
  }).join("\n");

  return header + rows;
}

// Subscribe to game state changes
export function subscribeToGameState(
  callback: (state: GameStateWithProduct) => void
) {
  const channel = supabase
    .channel("game_state_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_state",
      },
      async () => {
        const state = await getGameState();
        if (state) {
          callback(state);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get count of remaining products
export async function getRemainingProductsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_used", false);

  if (error) {
    console.error("Error getting remaining products:", error);
    return 0;
  }

  return count || 0;
}

// Update team names
export async function updateTeamNames(team1Name: string, team2Name: string, team3Name: string): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_name: team1Name || "Team 1",
      team_2_name: team2Name || "Team 2",
      team_3_name: team3Name || "Team 3",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error updating team names:", error);
    return false;
  }

  return true;
}

// Skip current product without scoring
export async function skipCurrentProduct(): Promise<boolean> {
  const gameState = await getGameState();
  
  if (!gameState?.current_product_id) {
    return false;
  }

  // Mark current product as used
  const { error: productError } = await supabase
    .from("products")
    .update({ is_used: true })
    .eq("id", gameState.current_product_id);

  if (productError) {
    console.error("Error marking product as used:", productError);
    return false;
  }

  // Reset game state to waiting
  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      current_product_id: null,
      team_1_guess: null,
      team_2_guess: null,
      team_3_guess: null,
      game_stage: "waiting",
    })
    .not("id", "is", null);

  if (stateError) {
    console.error("Error resetting game state:", stateError);
    return false;
  }

  return true;
}

// Showcase Round Functions

export type ShowcaseItem = Tables<"showcases">;

export interface ShowcasePackage {
  showcase_id: number;
  items: ShowcaseItem[];
  total_price: number;
}

// Get showcase packages (prefers 7, 8, 9 when available)
export async function getShowcasePackages(): Promise<{
  showcase1: ShowcasePackage | null;
  showcase2: ShowcasePackage | null;
  showcase3: ShowcasePackage | null;
}> {
  const { data, error } = await supabase
    .from("showcases")
    .select("*")
    .order("showcase_id");

  if (error) {
    console.error("Error fetching showcases:", error);
    return { showcase1: null, showcase2: null, showcase3: null };
  }

  // Group by showcase_id
  const showcaseGroups = data.reduce((acc, item) => {
    if (!acc[item.showcase_id]) {
      acc[item.showcase_id] = [];
    }
    acc[item.showcase_id].push(item);
    return acc;
  }, {} as Record<number, ShowcaseItem[]>);

  const availableShowcaseIds = Object.keys(showcaseGroups).map(Number).sort((a, b) => a - b);
  const preferredShowcaseIds = [7, 8, 9].filter((id) => showcaseGroups[id]?.length);
  const selectedShowcaseIds = preferredShowcaseIds.length === 3
    ? preferredShowcaseIds
    : availableShowcaseIds.slice(0, 3);

  const getPackage = (index: number): ShowcasePackage | null => {
    const id = selectedShowcaseIds[index];
    const items = id ? showcaseGroups[id] : [];
    return items.length > 0 ? {
      showcase_id: id,
      items,
      total_price: items.reduce((sum, item) => sum + item.price_cad, 0)
    } : null;
  };

  return {
    showcase1: getPackage(0),
    showcase2: getPackage(1),
    showcase3: getPackage(2),
  };
}

// Start showcase round
export async function startShowcaseRound(): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      game_stage: "showcase",
      one_away_state: null,
      wheel_state: null,
      team_1_showcase_guess: null,
      team_2_showcase_guess: null,
      team_3_showcase_guess: null,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error starting showcase round:", error);
    return false;
  }

  return true;
}

// Submit showcase guesses
export async function submitShowcaseGuesses(team1Guess: number, team2Guess: number, team3Guess: number): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_showcase_guess: team1Guess,
      team_2_showcase_guess: team2Guess,
      team_3_showcase_guess: team3Guess,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error submitting showcase guesses:", error);
    return false;
  }

  return true;
}

// Reveal showcase results
export async function revealShowcaseResults(): Promise<{ winner: TeamId | "none" | null }> {
  const gameState = await getGameState();
  const { showcase1, showcase2, showcase3 } = await getShowcasePackages();

  if (!gameState || !showcase1 || !showcase2 || !showcase3) {
    return { winner: null };
  }

  const team1Guess = gameState.team_1_showcase_guess;
  const team2Guess = gameState.team_2_showcase_guess;
  const team3Guess = gameState.team_3_showcase_guess;

  if (team1Guess === null || team2Guess === null || team3Guess === null) {
    return { winner: null };
  }

  // Team 1 gets showcase 1, Team 2 gets showcase 2, Team 3 gets showcase 3
  const showcasePrices = [showcase1.total_price, showcase2.total_price, showcase3.total_price];
  const guesses = [team1Guess, team2Guess, team3Guess];
  const teams: TeamId[] = ["team1", "team2", "team3"];

  const diffs = guesses.map((g, i) => showcasePrices[i] - g);
  const scores: Record<TeamId, number> = {
    team1: gameState.team_1_score ?? 0,
    team2: gameState.team_2_score ?? 0,
    team3: gameState.team_3_score ?? 0,
  };

  const teamsUnder = teams.filter((_, i) => diffs[i] >= 0);

  let winner: TeamId | "none";

  if (teamsUnder.length === 0) {
    winner = "none";
  } else if (teamsUnder.length === 1) {
    winner = teamsUnder[0];
    scores[winner] += 5;
  } else {
    let closestIdx = teamsUnder[0];
    let closestDiff = diffs[teams.indexOf(teamsUnder[0])];
    for (let i = 1; i < teamsUnder.length; i++) {
      const idx = teams.indexOf(teamsUnder[i]);
      if (diffs[idx] < closestDiff) {
        closestIdx = teamsUnder[i];
        closestDiff = diffs[idx];
      }
    }
    winner = closestIdx;
    scores[winner] += 5;
  }

  // Update game state with new scores and revealed stage
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_score: scores.team1,
      team_2_score: scores.team2,
      team_3_score: scores.team3,
      game_stage: "showcase_revealed",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error revealing showcase results:", error);
    return { winner: null };
  }

  return { winner };
}

// One Away Round Functions

export interface OneAwayPrize {
  name: string;
  image_url: string | null;
  actual_price: number;
  fake_price: string;
}

export interface OneAwayResult {
  team: number;
  correct: number;
  total: number;
  points: number;
}

export interface OneAwayState {
  turn: number;
  prizes: (OneAwayPrize | null)[];
  guesses: (string | null)[][];
  results: OneAwayResult[];
}

export function parseOneAwayState(raw: Json | null | undefined): OneAwayState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as unknown as OneAwayState;
  if (typeof s.turn !== "number" || !Array.isArray(s.prizes) || !Array.isArray(s.guesses) || !Array.isArray(s.results)) {
    return null;
  }
  return s;
}

// Each fake digit is exactly one higher or one lower than the actual digit.
// Digits 0 and 9 only have one valid direction. No leading zero.
function generateFakePrice(actualPrice: number): string {
  const digits = String(Math.round(actualPrice)).split("");
  return digits
    .map((d, i) => {
      const n = parseInt(d, 10);
      let options: number[];
      if (n === 0) options = [1];
      else if (n === 9) options = [8];
      else options = [n - 1, n + 1];
      if (i === 0) options = options.filter((o) => o !== 0);
      if (options.length === 0) options = [n + 1];
      return String(options[Math.floor(Math.random() * options.length)]);
    })
    .join("");
}

export type OneAwayPrizeRow = Tables<"one_away_prizes">;

// Start One Away: assign a distinct vehicle prize to each team with a fake price
export async function startOneAwayRound(): Promise<boolean> {
  const { data, error } = await supabase.from("one_away_prizes").select("*");
  if (error || !data) {
    console.error("Error fetching One Away prizes:", error?.message);
    return false;
  }

  const unused = data.filter((p) => !p.is_used);
  const pool = unused.length >= 3 ? unused : data;
  if (pool.length < 3) {
    console.error("Not enough vehicle prizes for One Away");
    return false;
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const prizes: OneAwayPrize[] = pool.slice(0, 3).map((v) => ({
    name: v.name,
    image_url: v.image_url,
    actual_price: Number(v.actual_price),
    fake_price: generateFakePrice(Number(v.actual_price)),
  }));

  const state: OneAwayState = {
    turn: 1,
    prizes,
    guesses: prizes.map((p) => Array(p.fake_price.length).fill(null)),
    results: [],
  };

  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      game_stage: "one_away",
      one_away_state: state as unknown as Json,
      wheel_state: null,
    })
    .not("id", "is", null);

  if (stateError) {
    console.error("Error starting One Away round:", stateError.message);
    return false;
  }

  return true;
}

// Write the current team's digit calls (live-updates the TV arrows)
export async function setOneAwayGuesses(directions: (string | null)[]): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseOneAwayState(gameState?.one_away_state);
  if (!gameState || !state) return false;

  const guesses = [...state.guesses];
  guesses[state.turn - 1] = directions;

  const { error } = await supabase
    .from("game_state")
    .update({ one_away_state: { ...state, guesses } as unknown as Json })
    .not("id", "is", null);

  if (error) {
    console.error("Error saving One Away guesses:", error.message);
    return false;
  }

  return true;
}

// Reveal the current team's turn: score it, award 3 points if perfect
export async function revealOneAway(): Promise<OneAwayResult | null> {
  const gameState = await getGameState();
  const state = parseOneAwayState(gameState?.one_away_state);
  if (!gameState || !state) return null;

  const team = state.turn;
  const prize = state.prizes[team - 1];
  const guess = state.guesses[team - 1];
  if (!prize || !guess || guess.some((g) => g !== "H" && g !== "L")) return null;

  const actualDigits = String(Math.round(prize.actual_price)).split("");
  const fakeDigits = prize.fake_price.split("");
  const correct = actualDigits.reduce((count, d, i) => {
    const answer = Number(d) > Number(fakeDigits[i]) ? "H" : "L";
    return count + (guess[i] === answer ? 1 : 0);
  }, 0);
  const points = correct === actualDigits.length ? 3 : 0;

  const result: OneAwayResult = { team, correct, total: actualDigits.length, points };
  const results = [...state.results, result];

  const newScore = (gameState[`team_${team}_score` as keyof GameState] as number | null ?? 0) + points;
  const scoreUpdate =
    team === 1 ? { team_1_score: newScore } : team === 2 ? { team_2_score: newScore } : { team_3_score: newScore };

  const { error } = await supabase
    .from("game_state")
    .update({
      ...scoreUpdate,
      one_away_state: { ...state, results } as unknown as Json,
      game_stage: "one_away_reveal",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error revealing One Away:", error.message);
    return null;
  }

  return result;
}

// Advance to the next team's turn, or complete the round
export async function nextOneAwayTurn(): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseOneAwayState(gameState?.one_away_state);
  if (!gameState || !state) return false;

  if (state.turn >= 3) {
    const { error } = await supabase
      .from("game_state")
      .update({ game_stage: "one_away_complete" })
      .not("id", "is", null);
    if (error) {
      console.error("Error completing One Away:", error.message);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from("game_state")
    .update({
      game_stage: "one_away",
      one_away_state: { ...state, turn: state.turn + 1 } as unknown as Json,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error advancing One Away turn:", error.message);
    return false;
  }

  return true;
}

// End the round and return to the waiting stage
export async function endOneAwayRound(): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      game_stage: "waiting",
      one_away_state: null,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error ending One Away round:", error.message);
    return false;
  }

  return true;
}

// ===================== THE WHEEL (Showcase Showdown) =====================

// Real Big Wheel layout: 20 sections in clockwise order. $1.00 sits at index 0
// (top) flanked by 5c and 15c, the sections that pay on a bonus spin.
export const WHEEL_SECTIONS: number[] = [100, 15, 80, 35, 60, 20, 40, 75, 55, 95, 85, 45, 65, 70, 10, 90, 50, 25, 30, 5];

export interface WheelSpin {
  value: number; // cents
  fromRotation: number; // cumulative degrees before the spin
  toRotation: number; // cumulative degrees after the spin
  durationMs: number;
  at: number; // epoch ms when the spin started
}

export type WheelTeamStatus = "waiting" | "spun" | "done" | "bust" | "dollar";

export interface WheelTeamState {
  team: number;
  spins: number[];
  total: number;
  status: WheelTeamStatus;
}

export interface WheelSpinoffState {
  round: number;
  order: number[]; // team numbers still tied
  idx: number; // whose swipe is next
  spins: { team: number; spin: WheelSpin }[];
}

export type WheelPhase =
  | "spin"
  | "spinning"
  | "choose"
  | "turn_end"
  | "bonus"
  | "bonus_spinning"
  | "bonus_done"
  | "spinoff"
  | "spinoff_spinning";

export interface WheelState {
  turn: number; // active team 1-3 during the main turns
  phase: WheelPhase;
  teams: WheelTeamState[];
  baseRotation: number; // wheel's settled cumulative rotation
  currentSpin: WheelSpin | null;
  bonusGiven: number[]; // teams that already took their bonus spin
  bonusActiveTeam: number | null;
  bonusSpin: WheelSpin | null;
  spinoff: WheelSpinoffState | null;
  winners: number[];
  dollarTeams: number[];
}

export function parseWheelState(raw: Json | null | undefined): WheelState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.turn !== "number" || typeof s.phase !== "string" || !Array.isArray(s.teams)) return null;
  return {
    turn: s.turn,
    phase: s.phase as WheelPhase,
    teams: s.teams as unknown as WheelTeamState[],
    baseRotation: typeof s.baseRotation === "number" ? s.baseRotation : 0,
    currentSpin: (s.currentSpin as WheelSpin | null) ?? null,
    bonusGiven: Array.isArray(s.bonusGiven) ? (s.bonusGiven as number[]) : [],
    bonusActiveTeam: (s.bonusActiveTeam as number | null) ?? null,
    bonusSpin: (s.bonusSpin as WheelSpin | null) ?? null,
    spinoff: (s.spinoff as WheelSpinoffState | null) ?? null,
    winners: Array.isArray(s.winners) ? (s.winners as number[]) : [],
    dollarTeams: Array.isArray(s.dollarTeams) ? (s.dollarTeams as number[]) : [],
  };
}

// Map swipe velocity (px/ms) to wheel travel in degrees.
// The wheel must complete at least one full revolution for the spin to count.
// Tuned per Cam: the wheel should spin a lot more (1.2 to 16 revolutions).
export function wheelTravelForVelocity(velocity: number): number {
  return Math.min(16 * 360, Math.max(1.2 * 360, velocity * 1000));
}

// Section under the top pointer when the wheel sits at `rotation` degrees (clockwise).
// Section i is centered at wheel-local angle i*18; the pointer sits at global angle 0.
export function wheelSectionAtRotation(rotation: number): number {
  const norm = ((360 - (rotation % 360)) % 360 + 360) % 360;
  return Math.round(norm / 18) % 20;
}

function buildWheelSpin(baseRotation: number, velocity: number): WheelSpin {
  const travel = wheelTravelForVelocity(velocity);
  const toRotation = baseRotation + travel;
  const value = WHEEL_SECTIONS[wheelSectionAtRotation(toRotation)];
  const durationMs = Math.round(Math.min(8500, Math.max(2800, (travel / 360) * 900)));
  return { value, fromRotation: baseRotation, toRotation, durationMs, at: Date.now() };
}

function wheelScoreUpdate(gameState: GameStateWithProduct, team: number, points: number) {
  const newScore = ((gameState[`team_${team}_score` as keyof GameState] as number | null) ?? 0) + points;
  return team === 1 ? { team_1_score: newScore } : team === 2 ? { team_2_score: newScore } : { team_3_score: newScore };
}

async function writeWheelState(patch: Record<string, unknown>, state: WheelState): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({ ...patch, wheel_state: state as unknown as Json })
    .not("id", "is", null);
  if (error) {
    console.error("Error updating wheel state:", error.message);
    return false;
  }
  return true;
}

// Start the Wheel round: team 1 up first, one spin per swipe
export async function startWheelRound(): Promise<boolean> {
  const teams: WheelTeamState[] = [1, 2, 3].map((team) => ({ team, spins: [], total: 0, status: "waiting" }));
  const state: WheelState = {
    turn: 1,
    phase: "spin",
    teams,
    baseRotation: 0,
    currentSpin: null,
    bonusGiven: [],
    bonusActiveTeam: null,
    bonusSpin: null,
    spinoff: null,
    winners: [],
    dollarTeams: [],
  };
  const { error } = await supabase
    .from("game_state")
    .update({
      game_stage: "wheel",
      one_away_state: null,
      wheel_state: state as unknown as Json,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error starting wheel round:", error.message);
    return false;
  }
  return true;
}

// Swipe the wheel. velocity is px/ms from the host device. Only records the
// spin animation (no result yet) so the TV cannot spoil the landing. The host
// calls confirmWheelSpin once its animation finishes to apply the result.
export async function spinWheel(velocity: number): Promise<WheelSpin | null> {
  const gameState = await getGameState();
  const state = parseWheelState(gameState?.wheel_state);
  if (!gameState || !state || gameState.game_stage !== "wheel") return null;

  if (state.phase === "spin") {
    const teamIdx = state.turn - 1;
    const team = state.teams[teamIdx];
    if (!team || (team.status !== "waiting" && team.status !== "spun")) return null;

    const spin = buildWheelSpin(state.baseRotation, velocity);
    const next: WheelState = {
      ...state,
      phase: "spinning",
      baseRotation: spin.toRotation,
      currentSpin: spin,
    };
    const ok = await writeWheelState({}, next);
    return ok ? spin : null;
  }

  if (state.phase === "bonus") {
    const team = state.bonusActiveTeam;
    if (!team) return null;
    const spin = buildWheelSpin(state.baseRotation, velocity);
    const next: WheelState = {
      ...state,
      phase: "bonus_spinning",
      baseRotation: spin.toRotation,
      bonusSpin: spin,
    };
    const ok = await writeWheelState({}, next);
    return ok ? spin : null;
  }

  if (state.phase === "spinoff" && state.spinoff) {
    const so = state.spinoff;
    const activeTeam = so.order[so.idx];
    if (activeTeam === undefined) return null;
    const spin = buildWheelSpin(state.baseRotation, velocity);
    const next: WheelState = {
      ...state,
      phase: "spinoff_spinning",
      baseRotation: spin.toRotation,
      currentSpin: spin,
    };
    const ok = await writeWheelState({}, next);
    return ok ? spin : null;
  }

  return null;
}

// Apply the result of a finished spin. Called by the host device after the
// wheel animation completes. Idempotent: a no-op once the phase advances.
export async function confirmWheelSpin(): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseWheelState(gameState?.wheel_state);
  if (!gameState || !state || gameState.game_stage !== "wheel") return false;

  if (state.phase === "spinning" && state.currentSpin) {
    const value = WHEEL_SECTIONS[wheelSectionAtRotation(state.currentSpin.toRotation)];
    const teamIdx = state.turn - 1;
    const team = state.teams[teamIdx];
    if (!team) return false;

    const spins = [...team.spins, value];
    const total = spins.reduce((a, b) => a + b, 0);

    let status: WheelTeamStatus;
    let phase: WheelPhase;
    let dollarTeams = state.dollarTeams;
    const patch: Record<string, unknown> = {};

    if (total === 100) {
      // Exact $1.00: 3 points right now plus a bonus spin coming up
      status = "dollar";
      phase = "turn_end";
      dollarTeams = [...dollarTeams, team.team];
      Object.assign(patch, wheelScoreUpdate(gameState, team.team, 3));
    } else if (spins.length >= 2) {
      status = total > 100 ? "bust" : "done";
      phase = "turn_end";
    } else {
      status = "spun";
      phase = "choose";
    }

    const teams = state.teams.map((t, i) => (i === teamIdx ? { ...t, spins, total, status } : t));
    const next: WheelState = { ...state, teams, phase, dollarTeams };
    return writeWheelState(patch, next);
  }

  if (state.phase === "bonus_spinning" && state.bonusSpin && state.bonusActiveTeam) {
    const next: WheelState = {
      ...state,
      phase: "bonus_done",
      bonusGiven: [...state.bonusGiven, state.bonusActiveTeam],
    };
    return writeWheelState({}, next);
  }

  if (state.phase === "spinoff_spinning" && state.spinoff && state.currentSpin) {
    const so = state.spinoff;
    const activeTeam = so.order[so.idx];
    if (activeTeam === undefined) return false;
    const spins = [...so.spins, { team: activeTeam, spin: state.currentSpin }];
    const idx = so.idx + 1;
    const next: WheelState = {
      ...state,
      phase: idx >= so.order.length ? "turn_end" : "spinoff",
      spinoff: { ...so, idx, spins },
    };
    return writeWheelState({}, next);
  }

  return false;
}

// Lock in the first spin's total (no second spin)
export async function stayWheel(): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseWheelState(gameState?.wheel_state);
  if (!gameState || !state || gameState.game_stage !== "wheel" || state.phase !== "choose") return false;

  const teamIdx = state.turn - 1;
  const teams = state.teams.map((t, i) => (i === teamIdx ? { ...t, status: "done" as WheelTeamStatus } : t));
  return writeWheelState({}, { ...state, teams, phase: "turn_end" });
}

// Take the second spin (combined total; over $1.00 busts)
export async function spinAgainWheel(): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseWheelState(gameState?.wheel_state);
  if (!gameState || !state || gameState.game_stage !== "wheel" || state.phase !== "choose") return false;

  return writeWheelState({}, { ...state, phase: "spin" });
}

async function completeWheel(
  gameState: GameStateWithProduct,
  state: WheelState,
  winners: number[]
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (winners.length > 0) {
    Object.assign(patch, wheelScoreUpdate(gameState, winners[0], 3));
  }
  const next: WheelState = { ...state, phase: "turn_end", winners };
  const { error } = await supabase
    .from("game_state")
    .update({
      ...patch,
      game_stage: "wheel_complete",
      wheel_state: next as unknown as Json,
    })
    .not("id", "is", null);
  if (error) {
    console.error("Error completing wheel round:", error.message);
    return false;
  }
  return true;
}

// Advance the flow: next team, pending bonus spins, spin-off rounds, or finish
export async function nextWheelTurn(): Promise<boolean> {
  const gameState = await getGameState();
  const state = parseWheelState(gameState?.wheel_state);
  if (!gameState || !state || gameState.game_stage !== "wheel") return false;
  if (state.phase !== "turn_end" && state.phase !== "bonus_done") return false;

  // A finished spin-off round: crown the winner or go another round
  if (state.phase === "turn_end" && state.spinoff && state.spinoff.idx >= state.spinoff.order.length) {
    const so = state.spinoff;
    const best = Math.max(...so.spins.map((s) => s.spin.value));
    const leaders = [...new Set(so.spins.filter((s) => s.spin.value === best).map((s) => s.team))];
    if (leaders.length === 1) {
      return completeWheel(gameState, state, [leaders[0]]);
    }
    return writeWheelState(
      {},
      { ...state, phase: "spinoff", spinoff: { round: so.round + 1, order: leaders, idx: 0, spins: [] } }
    );
  }

  // Bonus spins owed to teams that hit exactly $1.00
  const nextBonus = state.dollarTeams.find((t) => !state.bonusGiven.includes(t));
  if (nextBonus !== undefined) {
    return writeWheelState({}, { ...state, phase: "bonus", bonusActiveTeam: nextBonus, bonusSpin: null });
  }

  // More teams still to spin in the main flow
  if (state.turn < 3) {
    return writeWheelState({}, { ...state, turn: state.turn + 1, phase: "spin" });
  }

  // All turns done: resolve the round. A $1.00 banks +3 on the spot but is no
  // auto win — dollar teams are simply the top totals in the pool, so only
  // another $1.00 can tie them and force a spin-off for the round's 3 points.
  const candidates = state.teams.filter((t) => t.status === "done" || t.status === "dollar");
  if (candidates.length === 0) {
    // Everyone busted: the last spinner wins by default
    return completeWheel(gameState, state, [3]);
  }

  const best = Math.max(...candidates.map((t) => t.total));
  const leaders = candidates.filter((t) => t.total === best);
  if (leaders.length === 1) {
    return completeWheel(gameState, state, [leaders[0].team]);
  }

  // Tie for the lead (including multiple $1.00s): spin-off, one spin each.
  // The spin-off winner banks the round's 3 points.
  return writeWheelState(
    {},
    { ...state, phase: "spinoff", spinoff: { round: 1, order: leaders.map((t) => t.team), idx: 0, spins: [] } }
  );
}

// End the round and return to the waiting stage
export async function endWheelRound(): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      game_stage: "waiting",
      wheel_state: null,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error ending wheel round:", error.message);
    return false;
  }

  return true;
}
