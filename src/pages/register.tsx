import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);
        // Redirect to admin page after 2 seconds
        setTimeout(() => {
          router.push("/admin");
        }, 2000);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Register - Admin Account" 
        description="Create an admin account for The Price is Right game"
      />
      <div className="min-h-screen bg-gradient-to-br from-primary via-blue-600 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-white/80 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="border-2 border-white/20 shadow-2xl">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-gold rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-foreground" />
              </div>
              <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
              <CardDescription className="text-base">
                Register for admin access to manage the game
              </CardDescription>
            </CardHeader>

            <CardContent>
              {success ? (
                <Alert className="bg-winner/10 border-winner">
                  <CheckCircle2 className="h-4 w-4 text-winner" />
                  <AlertDescription className="text-winner font-medium">
                    Account created successfully! Redirecting to admin panel...
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="h-12 text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/admin" className="text-primary hover:underline font-medium">
                      Login here
                    </Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}