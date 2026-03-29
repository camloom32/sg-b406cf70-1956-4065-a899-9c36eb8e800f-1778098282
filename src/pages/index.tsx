import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Smartphone, DollarSign, Trophy, Users } from "lucide-react";

export default function Home() {
  return (
    <>
      <SEO 
        title="The Price is Right - Game Show" 
        description="An interactive Price is Right game for disability services day programs"
      />
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Logo & Title */}
          <div className="text-center text-white space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gold rounded-full shadow-2xl animate-glow">
              <DollarSign className="w-14 h-14 text-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-shadow-lg">
              THE PRICE IS RIGHT
            </h1>
            <div className="inline-block bg-gold/20 backdrop-blur-sm border-2 border-gold rounded-full px-6 py-2">
              <p className="text-lg md:text-xl font-bold text-gold">
                190 Access Edition
              </p>
            </div>
            <p className="text-xl md:text-2xl opacity-90">
              Interactive Game Show Experience
            </p>
          </div>

          {/* Feature Icons */}
          <div className="flex justify-center gap-8 text-white/80">
            <div className="text-center">
              <Trophy className="w-10 h-10 mx-auto mb-2" />
              <span className="text-sm font-medium">Compete</span>
            </div>
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-2" />
              <span className="text-sm font-medium">Team Play</span>
            </div>
            <div className="text-center">
              <DollarSign className="w-10 h-10 mx-auto mb-2" />
              <span className="text-sm font-medium">Guess Prices</span>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/tv" className="block">
              <Card className="h-full hover:shadow-2xl transition-all hover:scale-105 border-2 border-team1 bg-white/95">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 bg-team1 rounded-full flex items-center justify-center mb-3">
                    <Monitor className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">TV Display</CardTitle>
                  <CardDescription className="text-base">
                    Main game screen for players
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button className="w-full" size="lg">
                    Open TV Display
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/host" className="block">
              <Card className="h-full hover:shadow-2xl transition-all hover:scale-105 border-2 border-team2 bg-white/95">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 bg-team2 rounded-full flex items-center justify-center mb-3">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Host Controller</CardTitle>
                  <CardDescription className="text-base">
                    Mobile-friendly game controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="w-full border-team2 text-team2 hover:bg-team2 hover:text-white" size="lg">
                    Open Controller
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Instructions */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-3">How to Play:</h3>
              <ol className="space-y-2 text-white/90">
                <li className="flex gap-3">
                  <span className="bg-gold text-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                  <span>Open the <strong>TV Display</strong> on a large screen for all players to see</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-gold text-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                  <span>Open the <strong>Host Controller</strong> on your phone or tablet</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-gold text-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                  <span>Start a round, enter team guesses, and reveal the price!</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-gold text-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
                  <span>Closest guess without going over wins a point!</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-white/60 text-sm">
            © 2026 The Price is Right Game · Built for accessibility & fun
          </p>
        </div>
      </div>
    </>
  );
}