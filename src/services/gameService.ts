import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type GameState = Tables<"game_state">;

export interface GameStateWithProduct extends GameState {
  product?: Product | null;
}

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
export async function submitGuesses(team1Guess: number, team2Guess: number): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_guess: team1Guess,
      team_2_guess: team2Guess,
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error submitting guesses:", error);
    return false;
  }

  return true;
}

// Calculate winner and reveal results
export async function revealResults(): Promise<{ winner: "team1" | "team2" | "none" | null }> {
  const gameState = await getGameState();
  
  if (!gameState || !gameState.product) {
    return { winner: null };
  }

  const actualPrice = gameState.product.actual_price;
  const team1Guess = gameState.team_1_guess;
  const team2Guess = gameState.team_2_guess;

  if (team1Guess === null || team2Guess === null) {
    return { winner: null };
  }

  // Calculate differences (negative if over)
  const team1Diff = actualPrice - team1Guess;
  const team2Diff = actualPrice - team2Guess;

  let winner: "team1" | "team2" | "none";
  let newTeam1Score = gameState.team_1_score;
  let newTeam2Score = gameState.team_2_score;

  // Both went over - no points
  if (team1Diff < 0 && team2Diff < 0) {
    winner = "none";
  }
  // Team 1 went over, Team 2 didn't
  else if (team1Diff < 0) {
    winner = "team2";
    newTeam2Score += 1;
  }
  // Team 2 went over, Team 1 didn't
  else if (team2Diff < 0) {
    winner = "team1";
    newTeam1Score += 1;
  }
  // Neither went over - closest wins
  else if (team1Diff <= team2Diff) {
    winner = "team1";
    newTeam1Score += 1;
  } else {
    winner = "team2";
    newTeam2Score += 1;
  }

  // Update game state with new scores and revealed stage
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_score: newTeam1Score,
      team_2_score: newTeam2Score,
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
      current_product_id: null,
      team_1_guess: null,
      team_2_guess: null,
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
export async function updateTeamNames(team1Name: string, team2Name: string): Promise<boolean> {
  const { error } = await supabase
    .from("game_state")
    .update({
      team_1_name: team1Name || "Team 1",
      team_2_name: team2Name || "Team 2",
    })
    .not("id", "is", null);

  if (error) {
    console.error("Error updating team names:", error);
    return false;
  }

  return true;
}