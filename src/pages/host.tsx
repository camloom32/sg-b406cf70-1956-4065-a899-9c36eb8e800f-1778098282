import { useEffect, useState, useCallback, useRef } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getGameState, 
  subscribeToGameState, 
  startNewRound,
  submitGuesses,
  revealResults,
  resetScores,
  resetAllProducts,
  importProductsFromCSV,
  exportProductsToCSV,
  getRemainingProductsCount,
  updateTeamNames,
  startShowcaseRound,
  submitShowcaseGuesses,
  revealShowcaseResults,
  skipCurrentProduct,
  startOneAwayRound,
  setOneAwayGuesses,
  revealOneAway,
  nextOneAwayTurn,
  endOneAwayRound,
  parseOneAwayState,
  type GameStateWithProduct 
} from "@/services/gameService";
import { 
  Play, 
  Eye, 
  RotateCcw, 
  Upload, 
  Download,
  Trophy,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Package,
  SkipForward,
  ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HostController() {
  const [gameState, setGameState] = useState<GameStateWithProduct | null>(null);
  const [team1Guess, setTeam1Guess] = useState("");
  const [team2Guess, setTeam2Guess] = useState("");
  const [team3Guess, setTeam3Guess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingProducts, setRemainingProducts] = useState(0);
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [team3Name, setTeam3Name] = useState("");
  const [team1ShowcaseGuess, setTeam1ShowcaseGuess] = useState("");
  const [team2ShowcaseGuess, setTeam2ShowcaseGuess] = useState("");
  const [team3ShowcaseGuess, setTeam3ShowcaseGuess] = useState("");
  const [oaDirections, setOaDirections] = useState<(string | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadGameState = useCallback(async () => {
    const state = await getGameState();
    setGameState(state);
    const count = await getRemainingProductsCount();
    setRemainingProducts(count);
  }, []);

  useEffect(() => {
    loadGameState();
    const unsubscribe = subscribeToGameState((newState) => {
      setGameState(newState);
      if (newState) {
        setTeam1Name(newState.team_1_name || "Team 1");
        setTeam2Name(newState.team_2_name || "Team 2");
        setTeam3Name(newState.team_3_name || "Team 3");
      }
    });
    return () => unsubscribe();
  }, [loadGameState]);

  const handleStartRound = async () => {
    setIsLoading(true);
    const success = await startNewRound();
    if (success) {
      setTeam1Guess("");
      setTeam2Guess("");
      setTeam3Guess("");
      const count = await getRemainingProductsCount();
      setRemainingProducts(count);
      toast({
        title: "New Round Started!",
        description: "A new product is now displayed on the TV.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "No Products Available",
        description: "All products have been used. Reset products to continue.",
      });
    }
    setIsLoading(false);
  };

  const handleSubmitGuesses = async () => {
    const guess1 = parseFloat(team1Guess);
    const guess2 = parseFloat(team2Guess);
    const guess3 = parseFloat(team3Guess);

    if (isNaN(guess1) || isNaN(guess2) || isNaN(guess3)) {
      toast({
        variant: "destructive",
        title: "Invalid Guesses",
        description: "Please enter valid numbers for all teams.",
      });
      return;
    }

    setIsLoading(true);
    await submitGuesses(guess1, guess2, guess3);
    toast({
      title: "Guesses Submitted",
      description: "All team guesses have been recorded.",
    });
    setIsLoading(false);
  };

  const handleReveal = async () => {
    if (!gameState?.team_1_guess || !gameState?.team_2_guess || !gameState?.team_3_guess) {
      toast({
        variant: "destructive",
        title: "Missing Guesses",
        description: "Please submit guesses for all teams first.",
      });
      return;
    }

    setIsLoading(true);
    await revealResults();
    setIsLoading(false);
  };

  const handleResetScores = async () => {
    setIsLoading(true);
    await resetScores();
    setTeam1Guess("");
    setTeam2Guess("");
    setTeam3Guess("");
    toast({
      title: "Scores Reset",
      description: "All scores have been reset to zero.",
    });
    setIsLoading(false);
  };

  const handleResetProducts = async () => {
    setIsLoading(true);
    await resetAllProducts();
    const count = await getRemainingProductsCount();
    setRemainingProducts(count);
    toast({
      title: "Products Reset",
      description: "All products are now available again.",
    });
    setIsLoading(false);
  };

  const handleUpdateTeamNames = async () => {
    setIsLoading(true);
    const success = await updateTeamNames(team1Name, team2Name, team3Name);
    if (success) {
      toast({
        title: "Team Names Updated",
        description: "Team names have been saved.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update team names.",
      });
    }
    setIsLoading(false);
  };

  const handleStartShowcase = async () => {
    setIsLoading(true);
    const success = await startShowcaseRound();
    if (success) {
      setTeam1ShowcaseGuess("");
      setTeam2ShowcaseGuess("");
      setTeam3ShowcaseGuess("");
      toast({
        title: "Showcase Round Started!",
        description: "The showcase packages are now displayed on the TV.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start showcase round.",
      });
    }
    setIsLoading(false);
  };

  const handleSubmitShowcaseGuesses = async () => {
    const guess1 = parseFloat(team1ShowcaseGuess);
    const guess2 = parseFloat(team2ShowcaseGuess);
    const guess3 = parseFloat(team3ShowcaseGuess);

    if (isNaN(guess1) || isNaN(guess2) || isNaN(guess3)) {
      toast({
        variant: "destructive",
        title: "Invalid Guesses",
        description: "Please enter valid numbers for all teams.",
      });
      return;
    }

    setIsLoading(true);
    await submitShowcaseGuesses(guess1, guess2, guess3);
    toast({
      title: "Showcase Guesses Submitted",
      description: "All team guesses have been recorded.",
    });
    setIsLoading(false);
  };

  const handleRevealShowcase = async () => {
    if (!gameState?.team_1_showcase_guess || !gameState?.team_2_showcase_guess || !gameState?.team_3_showcase_guess) {
      toast({
        variant: "destructive",
        title: "Missing Guesses",
        description: "Please submit showcase guesses for all teams first.",
      });
      return;
    }

    setIsLoading(true);
    await revealShowcaseResults();
    setIsLoading(false);
  };

  const handleSkipProduct = async () => {
    setIsLoading(true);
    const success = await skipCurrentProduct();
    if (success) {
      const count = await getRemainingProductsCount();
      setRemainingProducts(count);
      toast({
        title: "Product Skipped",
        description: "The current product has been skipped.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Skip Failed",
        description: "Could not skip the current product.",
      });
    }
    setIsLoading(false);
  };

  // One Away derived state
  const oneAway = parseOneAwayState(gameState?.one_away_state);
  const oneAwayTurn = oneAway?.turn ?? 0;
  const oaPrize = oneAway?.prizes[oneAwayTurn - 1] ?? null;
  const oaTeamName = oneAwayTurn === 1
    ? gameState?.team_1_name || "Team 1"
    : oneAwayTurn === 2
    ? gameState?.team_2_name || "Team 2"
    : gameState?.team_3_name || "Team 3";
  const oaLastResult = oneAway?.results[oneAway.results.length - 1] ?? null;

  // Sync local digit calls when a new turn starts
  useEffect(() => {
    if (gameState?.game_stage === "one_away" && oneAway) {
      setOaDirections(oneAway.guesses[oneAway.turn - 1] ?? []);
    }
  }, [gameState?.game_stage, oneAwayTurn]);

  const handleStartOneAway = async () => {
    setIsLoading(true);
    const success = await startOneAwayRound();
    if (success) {
      toast({
        title: "One Away Round Started!",
        description: "Each team gets their own prize. All digits right wins 3 points.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start One Away. Need at least 3 vehicle prizes.",
      });
    }
    setIsLoading(false);
  };

  const handleOaToggle = (digitIndex: number, dir: "H" | "L") => {
    const next = [...oaDirections];
    next[digitIndex] = next[digitIndex] === dir ? null : dir;
    setOaDirections(next);
    setOneAwayGuesses(next);
  };

  const handleRevealOneAway = async () => {
    setIsLoading(true);
    const result = await revealOneAway();
    if (!result) {
      toast({
        variant: "destructive",
        title: "Missing Calls",
        description: "Set higher or lower for every digit first.",
      });
    }
    setIsLoading(false);
  };

  const handleNextOneAway = async () => {
    setIsLoading(true);
    await nextOneAwayTurn();
    setIsLoading(false);
  };

  const handleEndOneAway = async () => {
    setIsLoading(true);
    await endOneAwayRound();
    toast({
      title: "One Away Complete",
      description: "Back to the regular game.",
    });
    setIsLoading(false);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
        
        const nameIdx = headers.findIndex(h => h === "name");
        const priceIdx = headers.findIndex(h => h === "actual_price" || h === "price");
        const imageIdx = headers.findIndex(h => h === "image_url" || h === "image");

        if (nameIdx === -1 || priceIdx === -1 || imageIdx === -1) {
          toast({
            variant: "destructive",
            title: "Invalid CSV Format",
            description: "CSV must have columns: name, actual_price, image_url",
          });
          setIsLoading(false);
          return;
        }

        const products = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          return {
            name: values[nameIdx],
            actual_price: parseFloat(values[priceIdx]),
            image_url: values[imageIdx],
          };
        }).filter(p => p.name && !isNaN(p.actual_price) && p.image_url);

        const result = await importProductsFromCSV(products);
        
        if (result.success) {
          const count = await getRemainingProductsCount();
          setRemainingProducts(count);
          toast({
            title: "Import Successful!",
            description: `${result.count} products have been imported.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: "There was an error importing the products.",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Parse Error",
          description: "Could not parse the CSV file.",
        });
      }
      setIsLoading(false);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    const csvData = await exportProductsToCSV();
    
    if (csvData) {
      // Create blob and download
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful!",
        description: "Products have been exported to CSV.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not export products.",
      });
    }
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <>
      <SEO title="Host Controller - The Price is Right" />
      <div className="min-h-screen bg-background p-4 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Header */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="font-bold">HOST CONTROLLER</span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">
              The Price is Right
            </h1>
            <p className="text-sm font-semibold text-gold">
              190 Access Edition
            </p>
          </div>

          {/* Team Names Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Names</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-team1">Team 1 Name</label>
                <Input
                  type="text"
                  placeholder="Team 1"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-team2">Team 2 Name</label>
                <Input
                  type="text"
                  placeholder="Team 2"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-team3">Team 3 Name</label>
                <Input
                  type="text"
                  placeholder="Team 3"
                  value={team3Name}
                  onChange={(e) => setTeam3Name(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button 
                onClick={handleUpdateTeamNames} 
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Team Names
              </Button>
            </CardContent>
          </Card>

          {/* Scores Display */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-2 border-team1">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground truncate">
                  {gameState?.team_1_name || "Team 1"}
                </p>
                <p className="text-3xl font-extrabold text-team1">
                  {gameState?.team_1_score || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-team2">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground truncate">
                  {gameState?.team_2_name || "Team 2"}
                </p>
                <p className="text-3xl font-extrabold text-team2">
                  {gameState?.team_2_score || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-team3">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground truncate">
                  {gameState?.team_3_name || "Team 3"}
                </p>
                <p className="text-3xl font-extrabold text-team3">
                  {gameState?.team_3_score || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Products Remaining */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Products Remaining</span>
              </div>
              <span className="text-2xl font-bold text-primary">{remainingProducts}</span>
            </CardContent>
          </Card>

          {/* Current Product Info */}
          {gameState?.product && (
            <Card className="border-2 border-gold bg-gold/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold" />
                  Current Product
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-bold text-lg">{gameState.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Actual Price: <span className="font-mono">{formatPrice(gameState.product.actual_price)}</span>
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Stage:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    gameState.game_stage === "waiting" ? "bg-muted text-muted-foreground" :
                    gameState.game_stage === "guessing" ? "bg-primary text-primary-foreground" :
                    "bg-winner text-white"
                  }`}>
                    {gameState.game_stage.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start New Round */}
              <Button 
                onClick={handleStartRound} 
                disabled={isLoading || gameState?.game_stage === "guessing"}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Next Round
              </Button>

              {/* Skip Product Button */}
              {gameState?.game_stage === "guessing" && (
                <Button 
                  onClick={handleSkipProduct} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip This Product
                </Button>
              )}

              {/* Guess Inputs */}
              {gameState?.game_stage === "guessing" && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team1">
                      {gameState?.team_1_name || "Team 1"} Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_1_name || "Team 1"}'s guess`}
                      value={team1Guess}
                      onChange={(e) => setTeam1Guess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team2">
                      {gameState?.team_2_name || "Team 2"} Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_2_name || "Team 2"}'s guess`}
                      value={team2Guess}
                      onChange={(e) => setTeam2Guess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team3">
                      {gameState?.team_3_name || "Team 3"} Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_3_name || "Team 3"}'s guess`}
                      value={team3Guess}
                      onChange={(e) => setTeam3Guess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitGuesses} 
                    disabled={isLoading || !team1Guess || !team2Guess || !team3Guess}
                    className="w-full h-12"
                    variant="secondary"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Guesses
                  </Button>
                </div>
              )}

              {/* Reveal Button */}
              <Button 
                onClick={handleReveal} 
                disabled={isLoading || gameState?.game_stage !== "guessing" || !gameState?.team_1_guess}
                className="w-full h-14 text-lg font-bold bg-gold hover:bg-gold/90 text-foreground"
                size="lg"
              >
                <Eye className="w-6 h-6 mr-2" />
                REVEAL PRICE!
              </Button>
            </CardContent>
          </Card>

          {/* One Away Round */}
          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-primary" />
                One Away Round (3 Points!)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start One Away Button */}
              <Button 
                onClick={handleStartOneAway} 
                disabled={isLoading || 
                  gameState?.game_stage === "guessing" || 
                  gameState?.game_stage === "showcase" || 
                  gameState?.game_stage === "showcase_revealed" ||
                  gameState?.game_stage === "one_away" ||
                  gameState?.game_stage === "one_away_reveal" ||
                  gameState?.game_stage === "one_away_complete"}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                <ArrowUpDown className="w-6 h-6 mr-2" />
                Start One Away Round
              </Button>

              {/* Current Turn: digit calls */}
              {gameState?.game_stage === "one_away" && oaPrize && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <p className={`text-sm font-bold ${
                    oneAwayTurn === 1 ? "text-team1" : oneAwayTurn === 2 ? "text-team2" : "text-team3"
                  }`}>
                    {oaTeamName}'s Turn (Team {oneAwayTurn} of 3)
                  </p>
                  <p className="font-bold text-lg">{oaPrize.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Price shown: <span className="font-mono font-bold text-foreground">
                      ${Number(oaPrize.fake_price).toLocaleString("en-US")}
                    </span> (every digit is one away!)
                  </p>
                  <div className="space-y-2">
                    {oaPrize.fake_price.split("").map((digit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-10 text-center text-lg font-mono font-extrabold bg-background rounded-md py-1 border">
                          {digit}
                        </span>
                        <Button
                          variant={oaDirections[i] === "H" ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-10"
                          onClick={() => handleOaToggle(i, "H")}
                        >
                          ▲ Higher
                        </Button>
                        <Button
                          variant={oaDirections[i] === "L" ? "default" : "outline"}
                          size="sm"
                          className="flex-1 h-10"
                          onClick={() => handleOaToggle(i, "L")}
                        >
                          ▼ Lower
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={handleRevealOneAway} 
                    disabled={isLoading || !oaPrize.fake_price.split("").every((_, i) => oaDirections[i] === "H" || oaDirections[i] === "L")}
                    className="w-full h-12 font-bold bg-gold hover:bg-gold/90 text-foreground"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    REVEAL!
                  </Button>
                </div>
              )}

              {/* Turn Result */}
              {gameState?.game_stage === "one_away_reveal" && oaLastResult && (
                <div className="space-y-3 p-4 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">
                    {oaLastResult.correct} of {oaLastResult.total} digits right
                  </p>
                  <p className={`text-2xl font-extrabold ${oaLastResult.points > 0 ? "text-primary" : "text-destructive"}`}>
                    {oaLastResult.points > 0 ? "+3 POINTS!" : "No points"}
                  </p>
                  <Button 
                    onClick={handleNextOneAway} 
                    disabled={isLoading}
                    className="w-full h-12 font-bold"
                  >
                    {oneAwayTurn >= 3 ? "Finish One Away" : "Next Team's Turn"}
                  </Button>
                </div>
              )}

              {/* Round Summary */}
              {gameState?.game_stage === "one_away_complete" && oneAway && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  {oneAway.results.map((r) => (
                    <p key={r.team} className="text-sm font-semibold text-center">
                      {r.team === 1 ? gameState?.team_1_name || "Team 1" : r.team === 2 ? gameState?.team_2_name || "Team 2" : gameState?.team_3_name || "Team 3"}:{" "}
                      {r.correct}/{r.total} right — {r.points > 0 ? "+3" : "0"} pts
                    </p>
                  ))}
                  <Button 
                    onClick={handleEndOneAway} 
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full h-12 font-bold"
                  >
                    End One Away Round
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Showcase Round */}
          <Card className="border-2 border-gold bg-gold/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" />
                Showcase Round (5 Points!)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start Showcase Button */}
              <Button 
                onClick={handleStartShowcase} 
                disabled={isLoading || gameState?.game_stage === "showcase" || gameState?.game_stage === "showcase_revealed" || gameState?.game_stage === "one_away" || gameState?.game_stage === "one_away_reveal" || gameState?.game_stage === "one_away_complete"}
                className="w-full h-14 text-lg font-bold bg-gold hover:bg-gold/90 text-foreground"
                size="lg"
              >
                <Trophy className="w-6 h-6 mr-2" />
                Start Showcase Round
              </Button>

              {/* Showcase Guess Inputs */}
              {gameState?.game_stage === "showcase" && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team1">
                      {gameState?.team_1_name || "Team 1"} Showcase Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_1_name || "Team 1"}'s showcase guess`}
                      value={team1ShowcaseGuess}
                      onChange={(e) => setTeam1ShowcaseGuess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team2">
                      {gameState?.team_2_name || "Team 2"} Showcase Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_2_name || "Team 2"}'s showcase guess`}
                      value={team2ShowcaseGuess}
                      onChange={(e) => setTeam2ShowcaseGuess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team3">
                      {gameState?.team_3_name || "Team 3"} Showcase Guess ($)
                    </label>
                    <Input
                      type="number"
                      placeholder={`Enter ${gameState?.team_3_name || "Team 3"}'s showcase guess`}
                      value={team3ShowcaseGuess}
                      onChange={(e) => setTeam3ShowcaseGuess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitShowcaseGuesses} 
                    disabled={isLoading || !team1ShowcaseGuess || !team2ShowcaseGuess || !team3ShowcaseGuess}
                    className="w-full h-12"
                    variant="secondary"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Showcase Guesses
                  </Button>
                </div>
              )}

              {/* Reveal Showcase Button */}
              <Button 
                onClick={handleRevealShowcase} 
                disabled={isLoading || gameState?.game_stage !== "showcase" || !gameState?.team_1_showcase_guess}
                className="w-full h-14 text-lg font-bold bg-winner hover:bg-winner/90 text-white"
                size="lg"
              >
                <Eye className="w-6 h-6 mr-2" />
                REVEAL SHOWCASE!
              </Button>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleResetScores} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Scores
              </Button>
              
              <Button 
                onClick={handleResetProducts} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Package className="w-4 h-4 mr-2" />
                Reset All Products
              </Button>

              <div className="pt-2 border-t">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Products (CSV)
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  CSV format: name, actual_price, image_url
                </p>
              </div>

              <Button 
                onClick={handleExportCSV}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Products (CSV)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}