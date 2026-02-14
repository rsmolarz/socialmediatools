import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Youtube, 
  Sparkles, 
  TrendingUp, 
  Share2, 
  Image,
  Palette,
  BarChart3,
  Zap,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  DollarSign,
  LogIn,
  Loader2
} from "lucide-react";
import { SiGoogle, SiFacebook, SiGithub, SiApple } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import showLogo from "@assets/image_1770482566548.png";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: any) => void;
        signIn: () => Promise<any>;
      };
    };
  }
}

export default function LandingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [demoUsername, setDemoUsername] = useState("demo");
  const [demoPassword, setDemoPassword] = useState("demo1234");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleScriptLoaded, setAppleScriptLoaded] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const { data: providersData } = useQuery<{ providers: string[] }>({
    queryKey: ["/api/auth/providers"],
  });

  const { data: appleConfig } = useQuery<{ clientId: string; redirectUri: string }>({
    queryKey: ["/api/auth/apple/config"],
  });

  const configuredProviders = providersData?.providers || [];

  useEffect(() => {
    if (!appleConfig?.clientId || appleScriptLoaded) return;
    const existing = document.querySelector('script[src*="appleid.auth"]');
    if (existing) {
      setAppleScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.onload = () => setAppleScriptLoaded(true);
    document.head.appendChild(script);
  }, [appleConfig?.clientId, appleScriptLoaded]);

  const handleAppleLogin = useCallback(async () => {
    if (!appleConfig?.clientId) return;
    setAppleLoading(true);
    try {
      if (window.AppleID) {
        window.AppleID.auth.init({
          clientId: appleConfig.clientId,
          scope: "name email",
          redirectURI: appleConfig.redirectUri,
          usePopup: true,
        });
        const response = await window.AppleID.auth.signIn();
        console.log("[apple] JS SDK response:", response);
        const tokenRes = await fetch("/api/auth/apple/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: response?.authorization?.code,
            id_token: response?.authorization?.id_token,
            user: response?.user ? JSON.stringify(response.user) : undefined,
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.success) {
          window.location.href = tokenData.redirectUrl || "/";
        } else {
          window.location.href = `/?error=apple_auth_failed&message=${encodeURIComponent(tokenData.error || "login_failed")}`;
        }
      } else {
        window.location.href = "/api/auth/apple";
      }
    } catch (err: any) {
      console.error("[apple] JS SDK error:", err);
      if (err?.error === "popup_closed_by_user") {
        setAppleLoading(false);
        return;
      }
      window.location.href = "/api/auth/apple";
    } finally {
      setAppleLoading(false);
    }
  }, [appleConfig]);

  const urlParams = new URLSearchParams(window.location.search);
  const authError = urlParams.get("error");
  const authMessage = urlParams.get("message");
  const accessDenied = urlParams.get("access") === "denied";

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError("");
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: demoUsername, password: demoPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = "/";
      } else {
        setDemoError(data.message || "Login failed");
      }
    } catch {
      setDemoError("Connection error. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI-Powered Thumbnails",
      description: "Generate stunning YouTube thumbnails with AI backgrounds and viral titles"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Viral Content Engine",
      description: "Discover trending topics and create content optimized for maximum engagement"
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "Multi-Platform Posting",
      description: "Post directly to YouTube, Instagram, TikTok, and more from one dashboard"
    },
    {
      icon: <Youtube className="w-6 h-6" />,
      title: "YouTube SEO Optimizer",
      description: "Bulk optimize video titles, descriptions, and tags for better discoverability"
    },
    {
      icon: <Image className="w-6 h-6" />,
      title: "Background Remover",
      description: "Remove, blur, or replace backgrounds with one click"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance Analytics",
      description: "Track impressions, clicks, and engagement across all your content"
    }
  ];

  const authProviders = [
    { 
      id: "google", 
      name: "Google", 
      icon: <SiGoogle className="w-5 h-5" />,
      href: "/api/auth/google",
      color: "hover:bg-red-500/10 hover:border-red-500/50"
    },
    { 
      id: "facebook", 
      name: "Facebook", 
      icon: <SiFacebook className="w-5 h-5" />,
      href: "/api/auth/facebook",
      color: "hover:bg-blue-500/10 hover:border-blue-500/50"
    },
    { 
      id: "github", 
      name: "GitHub", 
      icon: <SiGithub className="w-5 h-5" />,
      href: "/api/auth/github",
      color: "hover:bg-gray-500/10 hover:border-gray-500/50"
    },
    { 
      id: "apple", 
      name: "Apple", 
      icon: <SiApple className="w-5 h-5" />,
      href: "/api/auth/apple",
      color: "hover:bg-gray-500/10 hover:border-gray-500/50"
    }
  ];

  const isProviderConfigured = (providerId: string) => {
    return configuredProviders.includes(providerId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={showLogo} alt="The Medicine and Money Show" className="h-10 w-10 object-contain" data-testid="img-header-logo" />
            <span className="font-bold text-lg hidden sm:block">Medicine & Money Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="#login-section">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="w-4 h-4" />
                Powered by AI
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Create Viral Content for{" "}
                <span className="text-primary">Medicine & Money</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                The all-in-one content creation platform for podcasters. Generate thumbnails, 
                optimize SEO, and post across platforms - all powered by AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild data-testid="button-hero-get-started">
                  <a href="#login-section" className="gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-hero-demo">
                  <a href="#features">See Features</a>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Free forever plan
                </div>
              </div>
            </div>

            {/* Right Column - Auth Card */}
            <div id="login-section" className="lg:pl-8">
              <Card className="w-full max-w-md mx-auto border-2">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <img src={showLogo} alt="The Medicine and Money Show" className="h-24 w-24 object-contain" data-testid="img-login-logo" />
                  </div>
                  <CardTitle className="text-2xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in with your preferred social account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {accessDenied && (
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm text-center" data-testid="text-access-denied">
                      <p className="font-semibold mb-1">Access Denied</p>
                      <p>You are not on the whitelist. Please contact the administrator to request access.</p>
                    </div>
                  )}
                  {authError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center" data-testid="text-auth-error">
                      Login failed: {authMessage || authError.replace(/_/g, ' ')}
                    </div>
                  )}
                  {user && !isAuthenticated && (
                    <div className="p-3 rounded-lg bg-muted text-sm text-center" data-testid="text-user-info">
                      Logged in as: <strong>{user.email}</strong>
                    </div>
                  )}
                  {authProviders.map((provider) => {
                    const isConfigured = isProviderConfigured(provider.id);
                    const isApple = provider.id === "apple";
                    const isAppleReady = isApple && isConfigured && appleScriptLoaded;
                    return (
                      <Button 
                        key={provider.id}
                        className={`w-full h-12 text-base justify-start gap-3 ${provider.color}`}
                        variant="outline"
                        size="lg" 
                        disabled={!isConfigured || (isApple && appleLoading)}
                        onClick={() => {
                          if (!isConfigured) return;
                          if (isApple) {
                            handleAppleLogin();
                            return;
                          }
                          let inIframe = false;
                          try { inIframe = window.self !== window.top; } catch { inIframe = true; }
                          if (inIframe) {
                            window.open(provider.href, "_blank");
                          } else {
                            window.location.href = provider.href;
                          }
                        }}
                        data-testid={`button-signin-${provider.id}`}
                      >
                        {isConfigured ? (
                          <span className="flex items-center gap-3">
                            {isApple && appleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : provider.icon}
                            Continue with {provider.name}
                          </span>
                        ) : (
                          <span className="flex items-center gap-3 opacity-50">
                            {provider.icon}
                            {provider.name} (Not Configured)
                          </span>
                        )}
                      </Button>
                    );
                  })}
                  
                  {configuredProviders.length === 0 && (
                    <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      No OAuth providers configured yet. Please add your OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.) to enable login.
                    </p>
                  )}

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or use demo account</span>
                    </div>
                  </div>

                  <form onSubmit={handleDemoLogin} className="space-y-3" data-testid="form-demo-login">
                    {demoError && (
                      <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm text-center" data-testid="text-demo-error">
                        {demoError}
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="demo-username" className="text-xs">Username</Label>
                      <Input
                        id="demo-username"
                        value={demoUsername}
                        onChange={(e) => setDemoUsername(e.target.value)}
                        placeholder="demo"
                        data-testid="input-demo-username"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="demo-password" className="text-xs">Password</Label>
                      <Input
                        id="demo-password"
                        type="password"
                        value={demoPassword}
                        onChange={(e) => setDemoPassword(e.target.value)}
                        placeholder="demo1234"
                        data-testid="input-demo-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={demoLoading} data-testid="button-demo-login">
                      {demoLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    By signing in, you agree to our{" "}
                    <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Create Viral Content
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From thumbnail creation to social media posting, we've got you covered
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-elevate transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="p-8 md:p-12 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border">
            <Palette className="w-12 h-12 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Amazing Content?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of content creators using AI to boost their engagement and grow their audience.
            </p>
            <Button size="lg" asChild data-testid="button-cta-start">
              <a href="#login-section" className="gap-2">
                Start Creating Now
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Stethoscope className="h-5 w-5 text-primary" />
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Medicine & Money Show
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
