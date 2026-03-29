import { useEffect, useState, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { 
  getGameState, 
  subscribeToGameState, 
  type GameStateWithProduct 
} from "@/services/gameService";
import { Trophy, DollarSign, Users, Sparkles } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-800 text-white overflow-hidden">
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

        {/* Header with Scores */}
        <header className="p-6 lg:p-8">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Team 1 Score */}
            <div className="flex-1">
              <div className={`bg-team1 rounded-2xl p-6 lg:p-8 shadow-2xl transform transition-all duration-300 ${
                showWinnerAnimation && winner === "team1" ? "animate-winner-pulse ring-4 ring-gold" : ""
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8 lg:w-10 lg:h-10" />
                  <span className="text-2xl lg:text-3xl font-bold">TEAM 1</span>
                </div>
                <div className="text-6xl lg:text-8xl font-extrabold">
                  {gameState?.team_1_score || 0}
                </div>
              </div>
            </div>

            {/* Center Logo */}
            <div className="flex-shrink-0 mx-6 lg:mx-12 text-center">
              <div className="bg-gold text-foreground rounded-full p-4 lg:p-6 shadow-2xl animate-glow">
                <DollarSign className="w-12 h-12 lg:w-16 lg:h-16" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold mt-4 text-shadow-lg">
                THE PRICE IS RIGHT
              </h1>
              <p className="text-sm lg:text-base font-semibold text-gold mt-1">
                190 Access Edition
              </p>
            </div>

            {/* Team 2 Score */}
            <div className="flex-1">
              <div className={`bg-team2 rounded-2xl p-6 lg:p-8 shadow-2xl transform transition-all duration-300 ${
                showWinnerAnimation && winner === "team2" ? "animate-winner-pulse ring-4 ring-gold" : ""
              }`}>
                <div className="flex items-center justify-end gap-3 mb-2">
                  <span className="text-2xl lg:text-3xl font-bold">TEAM 2</span>
                  <Users className="w-8 h-8 lg:w-10 lg:h-10" />
                </div>
                <div className="text-6xl lg:text-8xl font-extrabold text-right">
                  {gameState?.team_2_score || 0}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
          {gameState?.game_stage === "waiting" && (
            <div className="text-center animate-scale-in">
              <Sparkles className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 text-gold animate-pulse" />
              <h2 className="text-4xl lg:text-6xl font-extrabold text-shadow-lg">
                GET READY!
              </h2>
              <p className="text-2xl lg:text-3xl mt-4 opacity-90">
                Waiting for the next round...
              </p>
            </div>
          )}

          {(gameState?.game_stage === "guessing" || gameState?.game_stage === "revealed") && gameState?.product && (
            <div className="w-full max-w-5xl">
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 lg:p-12 shadow-2xl">
                {/* Product Image */}
                <div className="relative mb-8">
                  <div className="aspect-video bg-white rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src={gameState.product.image_url}
                      alt={gameState.product.name}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                </div>

                {/* Product Name */}
                <h2 className="text-4xl lg:text-6xl font-extrabold text-center mb-8 text-shadow-lg">
                  {gameState.product.name}
                </h2>

                {/* Guesses Display */}
                {gameState.game_stage === "guessing" && gameState.team_1_guess !== null && (
                  <div className="grid grid-cols-2 gap-6 lg:gap-12">
                    <div className="bg-team1 rounded-2xl p-6 lg:p-8 text-center">
                      <p className="text-xl lg:text-2xl font-semibold mb-2">Team 1 Guess</p>
                      <p className="text-4xl lg:text-5xl font-extrabold">
                        {formatPrice(gameState.team_1_guess)}
                      </p>
                    </div>
                    <div className="bg-team2 rounded-2xl p-6 lg:p-8 text-center">
                      <p className="text-xl lg:text-2xl font-semibold mb-2">Team 2 Guess</p>
                      <p className="text-4xl lg:text-5xl font-extrabold">
                        {formatPrice(gameState.team_2_guess || 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Revealed State */}
                {gameState.game_stage === "revealed" && (
                  <div className="space-y-8 animate-scale-in">
                    {/* Actual Price */}
                    <div className="bg-gold text-foreground rounded-2xl p-8 text-center shadow-2xl animate-glow">
                      <p className="text-2xl lg:text-3xl font-semibold mb-2">THE ACTUAL PRICE IS</p>
                      <p className="text-6xl lg:text-8xl font-extrabold">
                        {formatPrice(gameState.product.actual_price)}
                      </p>
                    </div>

                    {/* Guesses Comparison */}
                    <div className="grid grid-cols-2 gap-6 lg:gap-12">
                      <div className={`rounded-2xl p-6 lg:p-8 text-center transition-all ${
                        winner === "team1" ? "bg-winner ring-4 ring-gold" : "bg-team1/50"
                      }`}>
                        <p className="text-xl lg:text-2xl font-semibold mb-2">Team 1</p>
                        <p className="text-3xl lg:text-4xl font-extrabold">
                          {formatPrice(gameState.team_1_guess || 0)}
                        </p>
                        {winner === "team1" && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <Trophy className="w-8 h-8 text-gold" />
                            <span className="text-2xl font-bold">WINNER!</span>
                          </div>
                        )}
                      </div>
                      <div className={`rounded-2xl p-6 lg:p-8 text-center transition-all ${
                        winner === "team2" ? "bg-winner ring-4 ring-gold" : "bg-team2/50"
                      }`}>
                        <p className="text-xl lg:text-2xl font-semibold mb-2">Team 2</p>
                        <p className="text-3xl lg:text-4xl font-extrabold">
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
                        <p className="text-2xl lg:text-3xl font-bold">
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