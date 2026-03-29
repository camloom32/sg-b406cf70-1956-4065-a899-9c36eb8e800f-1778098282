import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, XCircle, AlertCircle, LogOut, Database } from "lucide-react";

interface ParsedProduct {
  name: string;
  actual_price: number;
  image_url: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  added: number;
  duplicates: number;
  errors: string[];
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [existingProductCount, setExistingProductCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
    loadExistingProductCount();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setLoading(false);
  }

  async function loadExistingProductCount() {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    setExistingProductCount(count || 0);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
    } else {
      setUser(data.user);
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function parseCSV(text: string): ParsedProduct[] {
    const lines = text.split("\n").filter(line => line.trim());
    const products: ParsedProduct[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quotes
      const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
      if (!matches || matches.length < 3) continue;

      const cleanValue = (val: string) => {
        return val.replace(/^,?"?|"?$/g, "").replace(/""/g, '"').trim();
      };

      const name = cleanValue(matches[0]);
      const priceStr = cleanValue(matches[1]);
      const imageUrl = cleanValue(matches[2]);

      const price = parseFloat(priceStr);
      
      if (name && !isNaN(price) && imageUrl) {
        products.push({
          name,
          actual_price: price,
          image_url: imageUrl,
        });
      }
    }

    return products;
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const parsedProducts = parseCSV(text);

      if (parsedProducts.length === 0) {
        setUploadResult({
          success: false,
          message: "No valid products found in CSV",
          added: 0,
          duplicates: 0,
          errors: ["CSV format should be: name,actual_price,image_url"],
        });
        setUploading(false);
        return;
      }

      // Get existing product names for deduplication
      const { data: existingProducts } = await supabase
        .from("products")
        .select("name");

      const existingNames = new Set(
        (existingProducts || []).map(p => p.name.toLowerCase())
      );

      const newProducts = parsedProducts.filter(
        p => !existingNames.has(p.name.toLowerCase())
      );

      const duplicateCount = parsedProducts.length - newProducts.length;

      // Insert new products
      if (newProducts.length > 0) {
        const { error } = await supabase
          .from("products")
          .insert(newProducts);

        if (error) {
          setUploadResult({
            success: false,
            message: "Database error",
            added: 0,
            duplicates: duplicateCount,
            errors: [error.message],
          });
        } else {
          setUploadResult({
            success: true,
            message: "Products uploaded successfully",
            added: newProducts.length,
            duplicates: duplicateCount,
            errors: [],
          });
          await loadExistingProductCount();
        }
      } else {
        setUploadResult({
          success: false,
          message: "All products already exist",
          added: 0,
          duplicates: duplicateCount,
          errors: [],
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: "Failed to process file",
        added: 0,
        duplicates: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }

    setUploading(false);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <SEO title="Admin Login - The Price is Right" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-blue-600 to-blue-800 p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Admin Login</CardTitle>
              <CardDescription>Enter your credentials to access the admin panel</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {authError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" size="lg">
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Admin - CSV Upload - The Price is Right" />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Upload and manage game products</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Database Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {existingProductCount} products
              </div>
              <p className="text-sm text-muted-foreground">Total products in database</p>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Products CSV</CardTitle>
              <CardDescription>
                CSV format: name, actual_price, image_url (duplicate names will be skipped)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drag and drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Choose File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <Alert
                  className="mt-4"
                  variant={uploadResult.success ? "default" : "destructive"}
                >
                  {uploadResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <p className="font-medium">{uploadResult.message}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>✅ Added: {uploadResult.added} products</p>
                      {uploadResult.duplicates > 0 && (
                        <p>⏭️ Skipped duplicates: {uploadResult.duplicates}</p>
                      )}
                      {uploadResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside">
                            {uploadResult.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* CSV Format Example */}
          <Card>
            <CardHeader>
              <CardTitle>CSV Format Example</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`name,actual_price,image_url
"Coffee Maker",49.99,https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6
"Air Fryer",129.99,https://images.unsplash.com/photo-1585515320310-259814833e62
"Vacuum Cleaner",199.99,https://images.unsplash.com/photo-1558317374-067fb5f30001`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}