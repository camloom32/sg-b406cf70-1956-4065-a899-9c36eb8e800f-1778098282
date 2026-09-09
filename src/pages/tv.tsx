import { useEffect, useState, useCallback, useRef } from "react";
import { SEO } from "@/components/SEO";
import { 
  getGameState, 
  subscribeToGameState,
  getShowcasePackages,
  parseOneAwayState,
  parseWheelState,
  type GameStateWithProduct,
  type ShowcasePackage,
  type TeamId,
  type WheelState 
} from "@/services/gameService";
import { WheelDisplay, formatWheelLabel } from "@/components/WheelDisplay";
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

      if (newState.game_stage === "one_away_reveal" && gameState?.game_stage === "one_away") {
        const oa = parseOneAwayState(newState.one_away_state);
        const last = oa?.results[oa.results.length - 1];
        if (last && last.points > 0) {
          setWinner(`team${last.team}` as TeamId);
          playThemeSong();
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        } else {
          setWinner(null);
        }
      }

      // Wheel celebrations (diff wheel state through a ref to avoid stale closures)
      const newWheelState = parseWheelState(newState.wheel_state);
      const prevWheelState = prevWheelRef.current;
      prevWheelRef.current = newWheelState;
      if (newWheelState && newState.game_stage === "wheel") {
        if (newWheelState.dollarTeams.length > (prevWheelState?.dollarTeams.length ?? 0)) {
          const t = newWheelState.dollarTeams[newWheelState.dollarTeams.length - 1];
          setWinner(`team${t}` as TeamId);
          playThemeSong();
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        } else if (
          newWheelState.phase === "bonus_done" &&
          prevWheelState?.phase !== "bonus_done" &&
          newWheelState.bonusSpin &&
          (newWheelState.bonusSpin.value === 100 ||
            newWheelState.bonusSpin.value === 5 ||
            newWheelState.bonusSpin.value === 15)
        ) {
          if (newWheelState.bonusActiveTeam) setWinner(`team${newWheelState.bonusActiveTeam}` as TeamId);
          playThemeSong();
          setShowWinnerAnimation(true);
          setTimeout(() => setShowWinnerAnimation(false), 5000);
        }
      }
      if (
        newState.game_stage === "wheel_complete" &&
        gameState?.game_stage === "wheel" &&
        newWheelState &&
        newWheelState.winners.length > 0
      ) {
        setWinner(`team${newWheelState.winners[0]}` as TeamId);
        playThemeSong();
        setShowWinnerAnimation(true);
        setTimeout(() => setShowWinnerAnimation(false), 5000);
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

  // One Away derived state
  const oneAway = parseOneAwayState(gameState?.one_away_state);
  const oaTurn = oneAway?.turn ?? 0;
  const oaPrize = oneAway?.prizes[oaTurn - 1] ?? null;
  const oaGuess = oneAway?.guesses[oaTurn - 1] ?? [];
  const oaLastResult = oneAway?.results[oneAway.results.length - 1] ?? null;
  const oaTeamId = `team${oaTurn}` as TeamId;
  const oaTeamName = oaTurn === 1
    ? gameState?.team_1_name || "Team 1"
    : oaTurn === 2
    ? gameState?.team_2_name || "Team 2"
    : gameState?.team_3_name || "Team 3";
  const oaActualDigits = oaPrize ? String(Math.round(oaPrize.actual_price)).split("") : [];
  const oaFakeDigits = oaPrize ? oaPrize.fake_price.split("") : [];

  // The Wheel (Showcase Showdown) derived state
  const wheel = parseWheelState(gameState?.wheel_state);
  const wheelTeamName = (n: number) =>
    n === 1 ? gameState?.team_1_name || "Team 1" : n === 2 ? gameState?.team_2_name || "Team 2" : gameState?.team_3_name || "Team 3";
  const wheelSpinning = wheel?.phase === "spinning" || wheel?.phase === "bonus_spinning" || wheel?.phase === "spinoff_spinning";
  const wheelActiveSpin = wheel
    ? wheel.phase === "bonus" || wheel.phase === "bonus_spinning" || wheel.phase === "bonus_done"
      ? wheel.bonusSpin
      : wheel.currentSpin
    : null;
  const wheelActiveTeam = !wheel
    ? null
    : wheel.phase === "bonus" || wheel.phase === "bonus_spinning" || wheel.phase === "bonus_done"
    ? wheel.bonusActiveTeam
    : wheel.phase === "spinoff" || wheel.phase === "spinoff_spinning"
    ? wheel.spinoff?.order[wheel.spinoff.idx] ?? null
    : wheel.turn;
  const prevWheelRef = useRef<WheelState | null>(null);

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

          {/* One Away Round Display */}
          {(gameState?.game_stage === "one_away" || gameState?.game_stage === "one_away_reveal") && oneAway && oaPrize && (
            <div className="w-full max-w-[1400px] flex flex-col justify-center animate-scale-in">
              <h2 className="text-6xl font-extrabold text-center mb-4 text-shadow-lg">
                ONE AWAY!
              </h2>
              <div className={`${teamColorClass(oaTeamId)} rounded-2xl p-6 shadow-2xl`}>
                <p className="text-3xl font-extrabold text-center mb-1">
                  {oaTeamName.toUpperCase()}
                </p>
                <p className="text-xl text-center mb-4 opacity-90">
                  {oaPrize.name}
                </p>

                {oaPrize.image_url && (
                  <div className="h-[260px] bg-white/90 rounded-xl overflow-hidden shadow-lg flex items-center justify-center mb-4">
                    <img
                      src={oaPrize.image_url}
                      alt={oaPrize.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <p className="text-lg font-semibold text-center mb-3">
                  {gameState.game_stage === "one_away" ? "EVERY DIGIT IS ONE AWAY..." : "THE ACTUAL RETAIL PRICE"}
                </p>

                {/* Digit cards */}
                <div className="flex justify-center gap-3 mb-4 flex-wrap">
                  {oaFakeDigits.map((digit, i) => {
                    const revealed = gameState.game_stage === "one_away_reveal";
                    const isCorrect = revealed && oaActualDigits[i]
                      ? oaGuess[i] === (Number(oaActualDigits[i]) > Number(digit) ? "H" : "L")
                      : false;
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className={`w-24 h-28 rounded-xl flex items-center justify-center text-6xl font-extrabold font-mono shadow-lg ${
                          revealed
                            ? isCorrect
                              ? "bg-winner text-white"
                              : "bg-destructive text-white"
                            : "bg-white text-foreground"
                        }`}>
                          {revealed ? oaActualDigits[i] : digit}
                        </div>
                        {!revealed && oaGuess[i] && (
                          <div className="mt-2 text-xl font-extrabold bg-white/20 rounded-lg px-3 py-1">
                            {oaGuess[i] === "H" ? "▲ HIGHER" : "▼ LOWER"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reveal banner */}
                {gameState.game_stage === "one_away_reveal" && oaLastResult && (
                  <div className={`rounded-xl p-4 text-center animate-slide-up ${
                    oaLastResult.points > 0 ? "bg-gold text-foreground" : "bg-white/15"
                  }`}>
                    {oaLastResult.points > 0 ? (
                      <>
                        <p className="text-3xl font-extrabold">PERFECT! +3 POINTS!</p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold">
                        {oaLastResult.correct} of {oaLastResult.total} right — no points
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* One Away Complete Summary */}
          {gameState?.game_stage === "one_away_complete" && oneAway && (
            <div className="w-full max-w-[900px] flex flex-col justify-center animate-scale-in">
              <h2 className="text-6xl font-extrabold text-center mb-6 text-shadow-lg">
                ONE AWAY COMPLETE!
              </h2>
              <div className="space-y-3">
                {oneAway.results.map((r) => {
                  const teamId = `team${r.team}` as TeamId;
                  const name = r.team === 1 ? gameState.team_1_name || "Team 1" : r.team === 2 ? gameState.team_2_name || "Team 2" : gameState.team_3_name || "Team 3";
                  return (
                    <div key={r.team} className={`${teamColorClass(teamId)} rounded-xl p-4 flex items-center justify-between shadow-xl`}>
                      <span className="text-2xl font-extrabold">{name.toUpperCase()}</span>
                      <span className="text-2xl font-extrabold">
                        {r.correct}/{r.total} {r.points > 0 ? "— +3 POINTS!" : "— 0 POINTS"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* The Wheel (Showcase Showdown) Display */}
          {gameState?.game_stage === "wheel" && wheel && (
            <div className="w-full max-w-[1700px] flex flex-wrap items-center justify-center gap-12 animate-scale-in">
              <WheelDisplay size={660} baseRotation={wheel.baseRotation} spin={wheelActiveSpin} sound />
              <div className="flex-1 min-w-[440px] max-w-[820px] space-y-4">
                <h2 className="text-6xl font-extrabold text-center text-shadow-lg">
                  SHOWCASE SHOWDOWN!
                </h2>
                <div className={`${wheelActiveTeam ? teamColorClass(`team${wheelActiveTeam}` as TeamId) : "bg-white/15"} rounded-2xl p-5 shadow-2xl text-center`}>
                  {wheel.phase === "spin" && (
                    <>
                      <p className="text-4xl font-extrabold">{wheelTeamName(wheel.turn).toUpperCase()} - SPIN THE WHEEL!</p>
                      <p className="text-xl mt-2 opacity-90">Closest to $1.00 without going over wins 3 points</p>
                    </>
                  )}
                  {wheel.phase === "spinning" && <p className="text-4xl font-extrabold animate-pulse">SPINNING...</p>}
                  {wheel.phase === "choose" && (
                    <>
                      <p className="text-4xl font-extrabold">SPIN AGAIN OR STAY?</p>
                      <p className="text-xl mt-2 opacity-90">
                        {wheelTeamName(wheel.turn).toUpperCase()} sits at {formatWheelLabel(wheel.teams[wheel.turn - 1]?.total ?? 0)}
                      </p>
                    </>
                  )}
                  {wheel.phase === "turn_end" && wheel.spinoff && wheel.spinoff.idx >= wheel.spinoff.order.length ? (
                    <p className="text-4xl font-extrabold">SPIN-OFF COMPLETE!</p>
                  ) : wheel.phase === "turn_end" ? (
                    <>
                      {wheel.teams[wheel.turn - 1]?.status === "dollar" ? (
                        <>
                          <p className="text-4xl font-extrabold">EXACTLY $1.00!</p>
                          <p className="text-2xl mt-2 font-bold">+3 POINTS AND A BONUS SPIN!</p>
                        </>
                      ) : wheel.teams[wheel.turn - 1]?.status === "bust" ? (
                        <p className="text-4xl font-extrabold">OVER $1.00 - BUST!</p>
                      ) : (
                        <p className="text-4xl font-extrabold">{formatWheelLabel(wheel.teams[wheel.turn - 1]?.total ?? 0)}</p>
                      )}
                    </>
                  ) : null}
                  {wheel.phase === "bonus" && (
                    <>
                      <p className="text-4xl font-extrabold">{wheelTeamName(wheel.bonusActiveTeam ?? 0).toUpperCase()} - BONUS SPIN!</p>
                      <p className="text-xl mt-2 opacity-90">Land $1.00 for $25,000. 5¢ or 15¢ pays $10,000</p>
                    </>
                  )}
                  {wheel.phase === "bonus_spinning" && <p className="text-4xl font-extrabold animate-pulse">BONUS SPIN...</p>}
                  {wheel.phase === "bonus_done" && wheel.bonusSpin && (
                    <>
                      {wheel.bonusSpin.value === 100 ? (
                        <p className="text-4xl font-extrabold">$1.00 - $25,000!!!</p>
                      ) : wheel.bonusSpin.value === 5 || wheel.bonusSpin.value === 15 ? (
                        <p className="text-4xl font-extrabold">{formatWheelLabel(wheel.bonusSpin.value)} - $10,000!!!</p>
                      ) : (
                        <p className="text-4xl font-extrabold">{formatWheelLabel(wheel.bonusSpin.value)} - no bonus cash</p>
                      )}
                    </>
                  )}
                  {(wheel.phase === "spinoff" || wheel.phase === "spinoff_spinning") && wheel.spinoff && (
                    <>
                      <p className="text-4xl font-extrabold">
                        {wheel.phase === "spinoff"
                          ? `SPIN-OFF! ${wheelTeamName(wheel.spinoff.order[wheel.spinoff.idx] ?? 0).toUpperCase()} - ONE SPIN!`
                          : "SPIN-OFF SPIN..."}
                      </p>
                      {wheel.spinoff.spins.length > 0 && (
                        <p className="text-xl mt-2 opacity-90">
                          {wheel.spinoff.spins.map((s) => `${wheelTeamName(s.team)}: ${formatWheelLabel(s.spin.value)}`).join(", ")}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {wheel.teams.map((t) => {
                    const teamId = `team${t.team}` as TeamId;
                    const isActive = wheelActiveTeam === t.team;
                    return (
                      <div key={t.team} className={`${teamColorClass(teamId)} rounded-xl p-3 flex items-center justify-between shadow-xl ${isActive ? "ring-4 ring-gold" : "opacity-80"}`}>
                        <span className="text-2xl font-extrabold truncate mr-4">{wheelTeamName(t.team).toUpperCase()}</span>
                        <span className="text-2xl font-extrabold whitespace-nowrap">
                          {t.status === "bust" ? (
                            <span className="line-through">{formatWheelLabel(t.total)}</span>
                          ) : t.status === "dollar" ? (
                            "$1.00!"
                          ) : t.spins.length === 0 ? (
                            "-"
                          ) : (
                            `${t.spins.map(formatWheelLabel).join(" + ")} = ${formatWheelLabel(t.total)}`
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Wheel Complete Summary */}
          {gameState?.game_stage === "wheel_complete" && wheel && (
            <div className="w-full max-w-[1000px] flex flex-col justify-center animate-scale-in">
              <h2 className="text-6xl font-extrabold text-center mb-6 text-shadow-lg">
                SHOWCASE SHOWDOWN COMPLETE!
              </h2>
              <div className="space-y-3">
                {wheel.teams.map((t) => {
                  const teamId = `team${t.team}` as TeamId;
                  const isWinner = wheel.winners.includes(t.team);
                  return (
                    <div key={t.team} className={`${teamColorClass(teamId)} rounded-xl p-4 flex items-center justify-between shadow-xl ${isWinner ? "ring-4 ring-gold animate-winner-pulse" : "opacity-80"}`}>
                      <span className="text-2xl font-extrabold">{wheelTeamName(t.team).toUpperCase()}</span>
                      <span className="text-2xl font-extrabold">
                        {t.status === "bust"
                          ? `${formatWheelLabel(t.total)} - BUST`
                          : `${formatWheelLabel(t.total)}${isWinner ? " - +3 POINTS!" : ""}${t.status === "dollar" ? " + BONUS SPIN" : ""}`}
                      </span>
                    </div>
                  );
                })}
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