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
  getRemainingProductsCount,
  type GameStateWithProduct 
} from "@/services/gameService";
import { 
  Play, 
  Eye, 
  RotateCcw, 
  Upload, 
  Trophy,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HostController() {
  const [gameState, setGameState] = useState<GameStateWithProduct | null>(null);
  const [team1Guess, setTeam1Guess] = useState("");
  const [team2Guess, setTeam2Guess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingProducts, setRemainingProducts] = useState(0);
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
    });
    return () => unsubscribe();
  }, [loadGameState]);

  const handleStartRound = async () => {
    setIsLoading(true);
    const success = await startNewRound();
    if (success) {
      setTeam1Guess("");
      setTeam2Guess("");
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

    if (isNaN(guess1) || isNaN(guess2)) {
      toast({
        variant: "destructive",
        title: "Invalid Guesses",
        description: "Please enter valid numbers for both teams.",
      });
      return;
    }

    setIsLoading(true);
    await submitGuesses(guess1, guess2);
    toast({
      title: "Guesses Submitted",
      description: "Both team guesses have been recorded.",
    });
    setIsLoading(false);
  };

  const handleReveal = async () => {
    if (!gameState?.team_1_guess || !gameState?.team_2_guess) {
      toast({
        variant: "destructive",
        title: "Missing Guesses",
        description: "Please submit guesses for both teams first.",
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

          {/* Scores Display */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-team1">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Team 1</p>
                <p className="text-4xl font-extrabold text-team1">
                  {gameState?.team_1_score || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-team2">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-semibold text-muted-foreground">Team 2</p>
                <p className="text-4xl font-extrabold text-team2">
                  {gameState?.team_2_score || 0}
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

              {/* Guess Inputs */}
              {gameState?.game_stage === "guessing" && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team1">Team 1 Guess ($)</label>
                    <Input
                      type="number"
                      placeholder="Enter Team 1's guess"
                      value={team1Guess}
                      onChange={(e) => setTeam1Guess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-team2">Team 2 Guess ($)</label>
                    <Input
                      type="number"
                      placeholder="Enter Team 2's guess"
                      value={team2Guess}
                      onChange={(e) => setTeam2Guess(e.target.value)}
                      className="h-12 text-lg font-mono"
                      step="0.01"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitGuesses} 
                    disabled={isLoading || !team1Guess || !team2Guess}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}