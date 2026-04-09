import { useEffect, useState, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { 
  getGameState, 
  subscribeToGameState,
  getShowcasePackages,
  type GameStateWithProduct,
  type ShowcasePackage 
} from "@/services/gameService";
import { Trophy, DollarSign, Users, Maximize } from "lucide-react";

export default function TVDisplay() {
  const [gameState, setGameState] = useState<GameStateWithProduct | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<"team1" | "team2" | "none" | null>(null);
  const [showcase1, setShowcase1] = useState<ShowcasePackage | null>(null);
  const [showcase2, setShowcase2] = useState<ShowcasePackage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadGameState = useCallback(async () => {
    const state = await getGameState();
    setGameState(state);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

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

      // Load showcase packages when showcase round starts
      if ((newState.game_stage === "showcase" || newState.game_stage === "showcase_revealed") && 
          (gameState?.game_stage !== "showcase" && gameState?.game_stage !== "showcase_revealed")) {
        getShowcasePackages().then(({ showcase1, showcase2 }) => {
          setShowcase1(showcase1);
          setShowcase2(showcase2);
        });
      }

      // Handle showcase reveal animation
      if (newState.game_stage === "showcase_revealed" && gameState?.game_stage === "showcase") {
        if (showcase1 && showcase2 && newState.team_1_showcase_guess !== null && newState.team_2_showcase_guess !== null) {
          const team1Diff = showcase1.total_price - newState.team_1_showcase_guess;
          const team2Diff = showcase2.total_price - newState.team_2_showcase_guess;

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
  }, [loadGameState, gameState?.game_stage, showcase1, showcase2]);

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
        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 shadow-lg transition-all"
          aria-label="Toggle Fullscreen"
        >
          <Maximize className="w-6 h-6" />
        </button>

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
        <header className={gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "px-8 py-3" : "px-8 py-6"}>
          <div className="flex items-center justify-between gap-8 max-w-[1920px] mx-auto">
            {/* Team 1 Score */}
            <div className="flex-1 max-w-md">
              <div className={`bg-team1 rounded-2xl shadow-2xl transform transition-all duration-300 ${
                gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "p-3" : "p-6"
              } ${showWinnerAnimation && winner === "team1" ? "animate-winner-pulse ring-4 ring-gold" : ""}`}>
                <div className={`flex items-center gap-3 ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "mb-1" : "mb-2"}`}>
                  <Users className={gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "w-5 h-5" : "w-8 h-8"} />
                  <span className={`font-bold truncate ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "text-lg" : "text-2xl"}`}>
                    {gameState?.team_1_name?.toUpperCase() || "TEAM 1"}
                  </span>
                </div>
                <div className={`font-extrabold ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "text-4xl" : "text-7xl"}`}>
                  {gameState?.team_1_score || 0}
                </div>
              </div>
            </div>

            {/* Center Logo */}
            <div className="flex-shrink-0 text-center">
              <div className={`bg-gold text-foreground rounded-full shadow-2xl animate-glow inline-block ${
                gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "p-2" : "p-5"
              }`}>
                <DollarSign className={gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "w-8 h-8" : "w-14 h-14"} />
              </div>
              <h1 className={`font-extrabold text-shadow-lg whitespace-nowrap ${
                gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "text-xl mt-1" : "text-3xl mt-3"
              }`}>
                THE PRICE IS RIGHT
              </h1>
              {!(gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed") && (
                <p className="text-sm font-semibold text-gold mt-1">
                  190 Access Edition
                </p>
              )}
            </div>

            {/* Team 2 Score */}
            <div className="flex-1 max-w-md">
              <div className={`bg-team2 rounded-2xl shadow-2xl transform transition-all duration-300 ${
                gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "p-3" : "p-6"
              } ${showWinnerAnimation && winner === "team2" ? "animate-winner-pulse ring-4 ring-gold" : ""}`}>
                <div className={`flex items-center justify-end gap-3 ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "mb-1" : "mb-2"}`}>
                  <span className={`font-bold truncate ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "text-lg" : "text-2xl"}`}>
                    {gameState?.team_2_name?.toUpperCase() || "TEAM 2"}
                  </span>
                  <Users className={gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "w-5 h-5" : "w-8 h-8"} />
                </div>
                <div className={`font-extrabold text-right ${gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" ? "text-4xl" : "text-7xl"}`}>
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
                {/* Product Image - Only show during guessing */}
                {gameState.game_stage === "guessing" && (
                  <div className="relative mb-6">
                    <div className="h-[400px] bg-white rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
                      <img
                        src={gameState.product.image_url}
                        alt={gameState.product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

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

          {/* Showcase Round Display */}
          {(gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed") && showcase1 && showcase2 && (
            <div className="w-full max-w-[1800px] h-full flex flex-col justify-center">
              <div className="mb-3 text-center">
                <h2 className="text-3xl font-extrabold text-gold text-shadow-lg mb-1">
                  SHOWCASE SHOWDOWN
                </h2>
                <p className="text-lg opacity-90">5 Bonus Points!</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Team 1 Showcase */}
                <div className={`bg-team1 rounded-3xl p-4 shadow-2xl ${
                  gameState.game_stage === "showcase_revealed" && winner === "team1" ? "ring-4 ring-gold animate-winner-pulse" : ""
                }`}>
                  <h3 className="text-2xl font-extrabold mb-3 text-center">
                    {gameState.team_1_name || "Team 1"}'s Showcase
                  </h3>
                  
                  {/* Large Showcase Image */}
                  <div className="mb-3">
                    <div className="h-[280px] bg-white rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
                      {showcase1.items[0]?.image_url ? (
                        <img 
                          src={showcase1.items[0].image_url} 
                          alt="Showcase 1" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-6">
                          <p className="text-xl font-semibold">Showcase Image</p>
                          <p className="text-sm">Pending Upload</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Showcase Items List */}
                  <div className="space-y-2 mb-3">
                    {showcase1.items.map((item, idx) => (
                      <div key={idx} className="bg-white/10 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-lg font-bold mb-0.5">{item.item_name}</p>
                            <p className="text-xs opacity-90 line-clamp-1">{item.description}</p>
                          </div>
                          {gameState.game_stage === "showcase_revealed" && (
                            <div className="text-right">
                              <p className="text-xl font-mono font-extrabold">
                                {formatPrice(item.price_cad)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Guess Display */}
                  {gameState.team_1_showcase_guess !== null && (
                    <div className="bg-white/20 rounded-2xl p-3 text-center mb-3">
                      <p className="text-sm font-semibold mb-1">Team Guess</p>
                      <p className="text-2xl font-extrabold font-mono">
                        {formatPrice(gameState.team_1_showcase_guess)}
                      </p>
                    </div>
                  )}

                  {/* Actual Price */}
                  {gameState.game_stage === "showcase_revealed" && (
                    <div className="bg-gold text-foreground rounded-2xl p-4 text-center">
                      <p className="text-lg font-semibold mb-1">ACTUAL PRICE</p>
                      <p className="text-4xl font-extrabold font-mono">
                        {formatPrice(showcase1.total_price)}
                      </p>
                      {winner === "team1" && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Trophy className="w-6 h-6" />
                          <span className="text-xl font-bold">+5 POINTS!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Team 2 Showcase */}
                <div className={`bg-team2 rounded-3xl p-4 shadow-2xl ${
                  gameState.game_stage === "showcase_revealed" && winner === "team2" ? "ring-4 ring-gold animate-winner-pulse" : ""
                }`}>
                  <h3 className="text-2xl font-extrabold mb-3 text-center">
                    {gameState.team_2_name || "Team 2"}'s Showcase
                  </h3>
                  
                  {/* Large Showcase Image */}
                  <div className="mb-3">
                    <div className="h-[280px] bg-white rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
                      {showcase2.items[0]?.image_url ? (
                        <img 
                          src={showcase2.items[0].image_url} 
                          alt="Showcase 2" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-6">
                          <p className="text-xl font-semibold">Showcase Image</p>
                          <p className="text-sm">Pending Upload</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Showcase Items List */}
                  <div className="space-y-2 mb-3">
                    {showcase2.items.map((item, idx) => (
                      <div key={idx} className="bg-white/10 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-lg font-bold mb-0.5">{item.item_name}</p>
                            <p className="text-xs opacity-90 line-clamp-1">{item.description}</p>
                          </div>
                          {gameState.game_stage === "showcase_revealed" && (
                            <div className="text-right">
                              <p className="text-xl font-mono font-extrabold">
                                {formatPrice(item.price_cad)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Guess Display */}
                  {gameState.team_2_showcase_guess !== null && (
                    <div className="bg-white/20 rounded-2xl p-3 text-center mb-3">
                      <p className="text-sm font-semibold mb-1">Team Guess</p>
                      <p className="text-2xl font-extrabold font-mono">
                        {formatPrice(gameState.team_2_showcase_guess)}
                      </p>
                    </div>
                  )}

                  {/* Actual Price */}
                  {gameState.game_stage === "showcase_revealed" && (
                    <div className="bg-gold text-foreground rounded-2xl p-4 text-center">
                      <p className="text-lg font-semibold mb-1">ACTUAL PRICE</p>
                      <p className="text-4xl font-extrabold font-mono">
                        {formatPrice(showcase2.total_price)}
                      </p>
                      {winner === "team2" && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Trophy className="w-6 h-6" />
                          <span className="text-xl font-bold">+5 POINTS!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Both Teams Over Message */}
              {gameState.game_stage === "showcase_revealed" && winner === "none" && (
                <div className="mt-4 bg-destructive/80 rounded-2xl p-4 text-center animate-slide-up">
                  <p className="text-2xl font-bold">
                    Both teams went over! No bonus points awarded.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}