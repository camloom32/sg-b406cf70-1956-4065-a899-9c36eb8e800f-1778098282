import { useEffect, useState, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { 
  getGameState, 
  subscribeToGameState,
  getShowcasePackages,
  type GameStateWithProduct,
  type ShowcasePackage,
  type TeamId 
} from "@/services/gameService";
import { Trophy, DollarSign, Users } from "lucide-react";

export default function TVDisplay() {
  const [gameState, setGameState] = useState<GameStateWithProduct | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<TeamId | "none" | null>(null);
  const [showcase1, setShowcase1] = useState<ShowcasePackage | null>(null);
  const [showcase2, setShowcase2] = useState<ShowcasePackage | null>(null);
  const [showcase3, setShowcase3] = useState<ShowcasePackage | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const playThemeSong = useCallback(() => {
    const audio = new Audio("https://archive.org/download/tvtunes_31262/The%20Price%20is%20Right%20-%20Main.mp3");
    audio.volume = 0.3;
    audio.loop = true;
    audio.play().catch(() => {});
    setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 15000);
  }, []);

  const determineWinner = useCallback((
    actualPrice: number,
    guesses: Record<TeamId, number | null>
  ): TeamId | "none" => {
    const validTeams = (Object.entries(guesses) as [TeamId, number | null][])
      .filter(([, g]) => g !== null)
      .map(([team, g]) => ({ team, diff: actualPrice - g! }));

    const underTeams = validTeams.filter(t => t.diff >= 0);

    if (underTeams.length === 0) return "none";

    let closest = underTeams[0];
    for (let i = 1; i < underTeams.length; i++) {
      if (underTeams[i].diff < closest.diff) {
        closest = underTeams[i];
      }
    }
    return closest.team;
  }, []);

  const loadGameState = useCallback(async () => {
    const state = await getGameState();
    setGameState(state);
  }, []);

  useEffect(() => {
    loadGameState();

    const unsubscribe = subscribeToGameState((newState) => {
      if (newState.game_stage === "revealed" && gameState?.game_stage !== "revealed") {
        if (newState.product && newState.team_1_guess !== null && newState.team_2_guess !== null && newState.team_3_guess !== null) {
          const w = determineWinner(newState.product.actual_price, {
            team1: newState.team_1_guess,
            team2: newState.team_2_guess,
            team3: newState.team_3_guess,
          });
          setWinner(w);
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        }
      }

      if ((newState.game_stage === "showcase" || newState.game_stage === "showcase_revealed") && 
          (gameState?.game_stage !== "showcase" && gameState?.game_stage !== "showcase_revealed")) {
        getShowcasePackages().then(({ showcase1, showcase2, showcase3 }) => {
          setShowcase1(showcase1);
          setShowcase2(showcase2);
          setShowcase3(showcase3);
        });
      }

      if (newState.game_stage === "showcase_revealed" && gameState?.game_stage === "showcase") {
        if (showcase1 && showcase2 && showcase3 && newState.team_1_showcase_guess !== null && newState.team_2_showcase_guess !== null && newState.team_3_showcase_guess !== null) {
          const w = determineWinner(showcase1.total_price, {
            team1: newState.team_1_showcase_guess,
            team2: newState.team_2_showcase_guess,
            team3: newState.team_3_showcase_guess,
          });
          // For showcase, each team compares against their own showcase
          const showcasePrices: Record<TeamId, number> = {
            team1: showcase1.total_price,
            team2: showcase2.total_price,
            team3: showcase3.total_price,
          };
          const diffs: Record<TeamId, number> = {
            team1: showcase1.total_price - newState.team_1_showcase_guess,
            team2: showcase2.total_price - newState.team_2_showcase_guess,
            team3: showcase3.total_price - newState.team_3_showcase_guess,
          };
          const teams: TeamId[] = ["team1", "team2", "team3"];
          const underTeams = teams.filter(t => diffs[t] >= 0);

          let showcaseWinner: TeamId | "none" = "none";
          if (underTeams.length === 0) {
            showcaseWinner = "none";
          } else {
            let closest = underTeams[0];
            for (let i = 1; i < underTeams.length; i++) {
              // Compare as percentage difference for fairness across different showcasess
              const closestPct = Math.abs(diffs[closest]) / showcasePrices[closest];
              const currentPct = Math.abs(diffs[underTeams[i]]) / showcasePrices[underTeams[i]];
              if (currentPct < closestPct) {
                closest = underTeams[i];
              }
            }
            showcaseWinner = closest;
          }

          setWinner(showcaseWinner);
          
          if (showcaseWinner !== "none") {
            playThemeSong();
          }
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        }
      }

      setGameState(newState);
    });

    return () => unsubscribe();
  }, [loadGameState, gameState?.game_stage, showcase1, showcase2, showcase3, determineWinner, playThemeSong]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const teamColorClass = (team: TeamId) => {
    switch (team) {
      case "team1": return "bg-team1";
      case "team2": return "bg-team2";
      case "team3": return "bg-team3";
    }
  };

  const teamFadedClass = (team: TeamId) => {
    switch (team) {
      case "team1": return "bg-team1/50";
      case "team2": return "bg-team2/50";
      case "team3": return "bg-team3/50";
    }
  };

  const teamBorderClass = (team: TeamId, isActive: boolean) => {
    if (!isActive) return teamFadedClass(team);
    return teamColorClass(team);
  };

  const isShowcase = gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed";

  useEffect(() => {
    if (!isShowcase) { setSlideIndex(0); return; }
    const timer = setInterval(() => setSlideIndex(i => (i + 1) % 3), 5000);
    return () => clearInterval(timer);
  }, [isShowcase]);

  return (
    <>
      <SEO title="The Price is Right - TV Display" />

      <div className="min-h-screen h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-800 text-white overflow-hidden flex flex-col">
        {/* Fullscreen Button */}
        <button
          onClick={() => { document.documentElement.requestFullscreen().catch(() => {}); }}
          className="fixed top-3 right-3 z-50 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-2 shadow-lg transition-all"
          aria-label="Toggle Fullscreen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
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

        {/* Header with Scores - Compact for 3 teams */}
        <header className="px-4 py-2">
          <div className="flex items-center justify-between gap-2 max-w-[1920px] mx-auto">
            {(["team1", "team2", "team3"] as TeamId[]).map((team) => {
              const num = team === "team1" ? "1" : team === "team2" ? "2" : "3";
              const score = gameState?.[`team_${num}_score` as keyof GameStateWithProduct] as number || 0;
              const name = gameState?.[`team_${num}_name` as keyof GameStateWithProduct] as string || `Team ${num}`;
              const colorClass = team === "team1" ? "bg-team1" : team === "team2" ? "bg-team2" : "bg-team3";
              return (
                <div key={team} className="flex-1">
                  <div className={`${colorClass} rounded-xl p-2 shadow-lg ${showWinnerAnimation && winner === team ? "animate-winner-pulse ring-4 ring-gold" : ""}`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Users className="w-3 h-3" />
                      <span className="font-bold truncate text-sm">{name.toUpperCase()}</span>
                    </div>
                    <div className="font-extrabold text-3xl">{score}</div>
                  </div>
                </div>
              );
            })}
            <div className="flex-shrink-0 text-center px-1">
              <div className="bg-gold text-foreground rounded-full shadow-xl animate-glow inline-block p-1.5">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
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
            <div className="w-full max-w-[1400px] flex flex-col justify-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-2xl">
                {/* Product Image - Only show during guessing */}
                {gameState.game_stage === "guessing" && (
                  <div className="relative mb-3">
                    <div className="h-[280px] bg-white rounded-xl overflow-hidden shadow-lg flex items-center justify-center">
                      <img
                        src={gameState.product.image_url}
                        alt={gameState.product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Product Name */}
                <h2 className="text-3xl font-extrabold text-center mb-4 text-shadow-lg line-clamp-2">
                  {gameState.product.name}
                </h2>

                {/* Guesses Display */}
                {gameState.game_stage === "guessing" && gameState.team_1_guess !== null && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-team1 rounded-xl p-3 text-center">
                      <p className="text-sm font-semibold mb-1 truncate">
                        {gameState.team_1_name || "Team 1"} Guess
                      </p>
                      <p className="text-2xl font-extrabold">
                        {formatPrice(gameState.team_1_guess)}
                      </p>
                    </div>
                    <div className="bg-team2 rounded-xl p-3 text-center">
                      <p className="text-sm font-semibold mb-1 truncate">
                        {gameState.team_2_name || "Team 2"} Guess
                      </p>
                      <p className="text-2xl font-extrabold">
                        {formatPrice(gameState.team_2_guess || 0)}
                      </p>
                    </div>
                    <div className="bg-team3 rounded-xl p-3 text-center">
                      <p className="text-sm font-semibold mb-1 truncate">
                        {gameState.team_3_name || "Team 3"} Guess
                      </p>
                      <p className="text-2xl font-extrabold">
                        {formatPrice(gameState.team_3_guess || 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Revealed State */}
                {gameState.game_stage === "revealed" && (
                  <div className="space-y-4 animate-scale-in">
                    {/* Actual Price */}
                    <div className="bg-gold text-foreground rounded-xl p-4 text-center shadow-xl animate-glow">
                      <p className="text-lg font-semibold mb-1">THE ACTUAL PRICE IS</p>
                      <p className="text-5xl font-extrabold">
                        {formatPrice(gameState.product.actual_price)}
                      </p>
                    </div>

                    {/* Guesses Comparison */}
                    <div className="grid grid-cols-3 gap-3">
                      {(["team1", "team2", "team3"] as TeamId[]).map((team) => {
                        const teamNum = team.replace("team", "") as "1" | "2" | "3";
                        const name = gameState[`team_${teamNum}_name` as keyof GameStateWithProduct] as string || `Team ${teamNum}`;
                        const guess = gameState[`team_${teamNum}_guess` as keyof GameStateWithProduct] as number | null;
                        return (
                          <div key={team} className={`rounded-xl p-3 text-center transition-all ${
                            winner === team ? "bg-winner ring-4 ring-gold" : teamFadedClass(team)
                          }`}>
                            <p className="text-base font-semibold mb-1 truncate">
                              {name}
                            </p>
                            <p className="text-2xl font-extrabold">
                              {formatPrice(guess || 0)}
                            </p>
                            {winner === team && (
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <Trophy className="w-5 h-5 text-gold" />
                                <span className="text-lg font-bold">WINNER!</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* All Over Message */}
                    {winner === "none" && (
                      <div className="bg-destructive/80 rounded-xl p-3 text-center animate-slide-up">
                        <p className="text-lg font-bold">
                          All teams went over! No points awarded.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Showcase Round Display */}
          {(gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed") && showcase1 && showcase2 && showcase3 && (
            <div className="w-full max-w-[1800px] flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-3">
                {/* Team 1 Showcase */}
                <div className={`bg-team1 rounded-xl p-3 shadow-xl ${
                  gameState.game_stage === "showcase_revealed" && winner === "team1" ? "ring-4 ring-gold animate-winner-pulse" : ""
                }`}>
                  <h3 className="text-base font-extrabold mb-1 text-center">
                    {gameState.team_1_name || "Team 1"}'s Showcase
                  </h3>
                  
                  <div className="mb-2">
                    <div className="h-[140px] bg-white rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
                      {showcase1.items[0]?.image_url ? (
                        <img 
                          src={showcase1.items[slideIndex]?.image_url || showcase1.items[0]?.image_url} 
                          alt={`Showcase 1 - ${showcase1.items[slideIndex]?.item_name || ''}`}
                          className="w-full h-full object-cover transition-opacity duration-700"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-2">
                          <p className="text-sm font-semibold">Showcase Image</p>
                          <p className="text-xs">Pending Upload</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    {showcase1.items.map((item, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg p-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1">
                            <p className="text-sm font-bold">{item.item_name}</p>
                            <p className="text-xs opacity-90 line-clamp-1">{item.description}</p>
                          </div>
                          {gameState.game_stage === "showcase_revealed" && (
                            <p className="text-sm font-mono font-extrabold">
                              {formatPrice(item.price_cad)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {gameState.team_1_showcase_guess !== null && (
                    <div className="bg-white/20 rounded-lg p-1.5 text-center mb-2">
                      <p className="text-xs font-semibold">Team Guess</p>
                      <p className="text-lg font-extrabold font-mono">
                        {formatPrice(gameState.team_1_showcase_guess)}
                      </p>
                    </div>
                  )}

                  {gameState.game_stage === "showcase_revealed" && (
                    <div className="bg-gold text-foreground rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold">ACTUAL PRICE</p>
                      <p className="text-2xl font-extrabold font-mono">
                        {formatPrice(showcase1.total_price)}
                      </p>
                      {winner === "team1" && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm font-bold">+5 POINTS!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Team 2 Showcase */}
                <div className={`bg-team2 rounded-xl p-3 shadow-xl ${
                  gameState.game_stage === "showcase_revealed" && winner === "team2" ? "ring-4 ring-gold animate-winner-pulse" : ""
                }`}>
                  <h3 className="text-base font-extrabold mb-1 text-center">
                    {gameState.team_2_name || "Team 2"}'s Showcase
                  </h3>
                  
                  <div className="mb-2">
                    <div className="h-[140px] bg-white rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
                      {showcase2.items[0]?.image_url ? (
                        <img 
                          src={showcase2.items[slideIndex]?.image_url || showcase2.items[0]?.image_url} 
                          alt={`Showcase 2 - ${showcase2.items[slideIndex]?.item_name || ''}`}
                          className="w-full h-full object-cover transition-opacity duration-700"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-2">
                          <p className="text-sm font-semibold">Showcase Image</p>
                          <p className="text-xs">Pending Upload</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    {showcase2.items.map((item, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg p-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1">
                            <p className="text-sm font-bold">{item.item_name}</p>
                            <p className="text-xs opacity-90 line-clamp-1">{item.description}</p>
                          </div>
                          {gameState.game_stage === "showcase_revealed" && (
                            <p className="text-sm font-mono font-extrabold">
                              {formatPrice(item.price_cad)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {gameState.team_2_showcase_guess !== null && (
                    <div className="bg-white/20 rounded-lg p-1.5 text-center mb-2">
                      <p className="text-xs font-semibold">Team Guess</p>
                      <p className="text-lg font-extrabold font-mono">
                        {formatPrice(gameState.team_2_showcase_guess)}
                      </p>
                    </div>
                  )}

                  {gameState.game_stage === "showcase_revealed" && (
                    <div className="bg-gold text-foreground rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold">ACTUAL PRICE</p>
                      <p className="text-2xl font-extrabold font-mono">
                        {formatPrice(showcase2.total_price)}
                      </p>
                      {winner === "team2" && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm font-bold">+5 POINTS!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Team 3 Showcase */}
                <div className={`bg-team3 rounded-xl p-3 shadow-xl ${
                  gameState.game_stage === "showcase_revealed" && winner === "team3" ? "ring-4 ring-gold animate-winner-pulse" : ""
                }`}>
                  <h3 className="text-base font-extrabold mb-1 text-center">
                    {gameState.team_3_name || "Team 3"}'s Showcase
                  </h3>
                  
                  <div className="mb-2">
                    <div className="h-[140px] bg-white rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
                      {showcase3.items[0]?.image_url ? (
                        <img 
                          src={showcase3.items[slideIndex]?.image_url || showcase3.items[0]?.image_url} 
                          alt={`Showcase 3 - ${showcase3.items[slideIndex]?.item_name || ''}`}
                          className="w-full h-full object-cover transition-opacity duration-700"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-2">
                          <p className="text-sm font-semibold">Showcase Image</p>
                          <p className="text-xs">Pending Upload</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    {showcase3.items.map((item, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg p-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1">
                            <p className="text-sm font-bold">{item.item_name}</p>
                            <p className="text-xs opacity-90 line-clamp-1">{item.description}</p>
                          </div>
                          {gameState.game_stage === "showcase_revealed" && (
                            <p className="text-sm font-mono font-extrabold">
                              {formatPrice(item.price_cad)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {gameState.team_3_showcase_guess !== null && (
                    <div className="bg-white/20 rounded-lg p-1.5 text-center mb-2">
                      <p className="text-xs font-semibold">Team Guess</p>
                      <p className="text-lg font-extrabold font-mono">
                        {formatPrice(gameState.team_3_showcase_guess)}
                      </p>
                    </div>
                  )}

                  {gameState.game_stage === "showcase_revealed" && (
                    <div className="bg-gold text-foreground rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold">ACTUAL PRICE</p>
                      <p className="text-2xl font-extrabold font-mono">
                        {formatPrice(showcase3.total_price)}
                      </p>
                      {winner === "team3" && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm font-bold">+5 POINTS!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* All Teams Over Message */}
              {gameState.game_stage === "showcase_revealed" && winner === "none" && (
                <div className="mt-2 bg-destructive/80 rounded-lg p-3 text-center animate-slide-up">
                  <p className="text-lg font-bold">
                    All teams went over! No bonus points awarded.
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