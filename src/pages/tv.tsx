import { useEffect, useState, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { 
  getGameState, 
  subscribeToGameState, 
  type GameStateWithProduct 
} from "@/services/gameService";
import { Trophy, DollarSign, Users } from "lucide-react";

export default function TVDisplay() {
  const [gameState, setGameState] = useState<GameStateWithProduct | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<"team1" | "team2" | "none" | null>(null);

  const loadGameState = useCallback(async () => {
    const state = await getGameState();
    setGameState(state);
  }, []);

  useEffect(() => {
    loadGameState();

    const unsubscribe = subscribeToGameState((newState) => {
      // Check if we just transitioned to revealed
      if (newState.game_stage === "revealed" && gameState?.game_stage !== "revealed") {
        // Determine winner for animation
        if (newState.product && newState.team_1_guess !== null && newState.team_2_guess !== null) {
          const actualPrice = newState.product.actual_price;
          const team1Diff = actualPrice - newState.team_1_guess;
          const team2Diff = actualPrice - newState.team_2_guess;

          if (team1Diff < 0 && team2Diff < 0) {
            setWinner("none");
          } else if (team1Diff < 0) {
            setWinner("team2");
          } else if (team2Diff < 0) {
            setWinner("team1");
          } else if (team1Diff <= team2Diff) {
            setWinner("team1");
          } else {
            setWinner("team2");
          }
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        }
      }
      setGameState(newState);
    });

    return () => unsubscribe();
  }, [loadGameState, gameState?.game_stage]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <>
      <SEO title="The Price is Right - TV Display" />
      <div className="min-h-screen h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-800 text-white overflow-hidden flex flex-col">
        {/* Confetti Animation */}
        {showWinnerAnimation && winner !== "none" && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: "100%",
                  width: "10px",
                  height: "10px",
                  backgroundColor: ["#fbbf24", "#f97316", "#22c55e", "#3b82f6", "#ec4899"][
                    Math.floor(Math.random() * 5)
                  ],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Header with Scores - Optimized for 16:9 */}
        <header className="px-8 py-6">
          <div className="flex items-center justify-between gap-8 max-w-[1920px] mx-auto">
            {/* Team 1 Score */}
            <div className="flex-1 max-w-md">
              <div className={`bg-team1 rounded-2xl p-6 shadow-2xl transform transition-all duration-300 ${
                showWinnerAnimation && winner === "team1" ? "animate-winner-pulse ring-4 ring-gold" : ""
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8" />
                  <span className="text-2xl font-bold truncate">
                    {gameState?.team_1_name?.toUpperCase() || "TEAM 1"}
                  </span>
                </div>
                <div className="text-7xl font-extrabold">
                  {gameState?.team_1_score || 0}
                </div>
              </div>
            </div>

            {/* Center Logo */}
            <div className="flex-shrink-0 text-center">
              <div className="bg-gold text-foreground rounded-full p-5 shadow-2xl animate-glow inline-block">
                <DollarSign className="w-14 h-14" />
              </div>
              <h1 className="text-3xl font-extrabold mt-3 text-shadow-lg whitespace-nowrap">
                THE PRICE IS RIGHT
              </h1>
              <p className="text-sm font-semibold text-gold mt-1">
                190 Access Edition
              </p>
            </div>

            {/* Team 2 Score */}
            <div className="flex-1 max-w-md">
              <div className={`bg-team2 rounded-2xl p-6 shadow-2xl transform transition-all duration-300 ${
                showWinnerAnimation && winner === "team2" ? "animate-winner-pulse ring-4 ring-gold" : ""
              }`}>
                <div className="flex items-center justify-end gap-3 mb-2">
                  <span className="text-2xl font-bold truncate">
                    {gameState?.team_2_name?.toUpperCase() || "TEAM 2"}
                  </span>
                  <Users className="w-8 h-8" />
                </div>
                <div className="text-7xl font-extrabold text-right">
                  {gameState?.team_2_score || 0}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - Optimized for 16:9 */}
        <main className="flex-1 flex items-center justify-center px-8 pb-8 overflow-hidden">
          {gameState?.game_stage === "waiting" && (
            <div className="text-center animate-scale-in">
              <Trophy className="w-28 h-28 mx-auto mb-6 text-gold animate-pulse" />
              <h2 className="text-6xl font-extrabold text-shadow-lg">
                GET READY!
              </h2>
              <p className="text-3xl mt-4 opacity-90">
                Waiting for the next round...
              </p>
            </div>
          )}

          {(gameState?.game_stage === "guessing" || gameState?.game_stage === "revealed") && gameState?.product && (
            <div className="w-full max-w-[1600px] h-full flex flex-col justify-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
                {/* Product Image - Fixed size container */}
                <div className="relative mb-6">
                  <div className="h-[400px] bg-white rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
                    <img
                      src={gameState.product.image_url}
                      alt={gameState.product.name}
                      className="max-w-full max-h-full object-contain p-6"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <h2 className="text-5xl font-extrabold text-center mb-6 text-shadow-lg line-clamp-2">
                  {gameState.product.name}
                </h2>

                {/* Guesses Display */}
                {gameState.game_stage === "guessing" && gameState.team_1_guess !== null && (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-team1 rounded-2xl p-6 text-center">
                      <p className="text-xl font-semibold mb-2 truncate">
                        {gameState.team_1_name || "Team 1"} Guess
                      </p>
                      <p className="text-5xl font-extrabold">
                        {formatPrice(gameState.team_1_guess)}
                      </p>
                    </div>
                    <div className="bg-team2 rounded-2xl p-6 text-center">
                      <p className="text-xl font-semibold mb-2 truncate">
                        {gameState.team_2_name || "Team 2"} Guess
                      </p>
                      <p className="text-5xl font-extrabold">
                        {formatPrice(gameState.team_2_guess || 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Revealed State */}
                {gameState.game_stage === "revealed" && (
                  <div className="space-y-6 animate-scale-in">
                    {/* Actual Price */}
                    <div className="bg-gold text-foreground rounded-2xl p-8 text-center shadow-2xl animate-glow">
                      <p className="text-2xl font-semibold mb-2">THE ACTUAL PRICE IS</p>
                      <p className="text-7xl font-extrabold">
                        {formatPrice(gameState.product.actual_price)}
                      </p>
                    </div>

                    {/* Guesses Comparison */}
                    <div className="grid grid-cols-2 gap-8">
                      <div className={`rounded-2xl p-6 text-center transition-all ${
                        winner === "team1" ? "bg-winner ring-4 ring-gold" : "bg-team1/50"
                      }`}>
                        <p className="text-xl font-semibold mb-2 truncate">
                          {gameState.team_1_name || "Team 1"}
                        </p>
                        <p className="text-4xl font-extrabold">
                          {formatPrice(gameState.team_1_guess || 0)}
                        </p>
                        {winner === "team1" && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Trophy className="w-8 h-8 text-gold" />
                            <span className="text-2xl font-bold">WINNER!</span>
                          </div>
                        )}
                      </div>
                      <div className={`rounded-2xl p-6 text-center transition-all ${
                        winner === "team2" ? "bg-winner ring-4 ring-gold" : "bg-team2/50"
                      }`}>
                        <p className="text-xl font-semibold mb-2 truncate">
                          {gameState.team_2_name || "Team 2"}
                        </p>
                        <p className="text-4xl font-extrabold">
                          {formatPrice(gameState.team_2_guess || 0)}
                        </p>
                        {winner === "team2" && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Trophy className="w-8 h-8 text-gold" />
                            <span className="text-2xl font-bold">WINNER!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Both Over Message */}
                    {winner === "none" && (
                      <div className="bg-destructive/80 rounded-2xl p-6 text-center animate-slide-up">
                        <p className="text-2xl font-bold">
                          Both teams went over! No points awarded.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}