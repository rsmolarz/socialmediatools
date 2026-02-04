import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Youtube, 
  Sparkles, 
  TrendingUp, 
  Share2, 
  Image,
  Palette,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  DollarSign
} from "lucide-react";

export default function LandingPage() {
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
    { name: "Google", icon: "🔍" },
    { name: "Apple", icon: "🍎" },
    { name: "GitHub", icon: "💻" },
    { name: "Email", icon: "✉️" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Stethoscope className="h-6 w-6 text-primary" />
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-lg hidden sm:block">Medicine & Money Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="/api/login">Sign In</a>
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
                  <a href="/api/login" className="gap-2">
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
            <div className="lg:pl-8">
              <Card className="w-full max-w-md mx-auto border-2">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Stethoscope className="h-10 w-10 text-primary" />
                    <DollarSign className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your content creation dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full h-12 text-base" 
                    size="lg" 
                    asChild
                    data-testid="button-signin-main"
                  >
                    <a href="/api/login">
                      <Users className="w-5 h-5 mr-2" />
                      Sign in with Replit
                    </a>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Supports Google, Apple, GitHub, and email login
                  </p>
                  <div className="flex justify-center gap-4 pt-2">
                    {authProviders.map((provider) => (
                      <div 
                        key={provider.name}
                        className="flex flex-col items-center gap-1 text-muted-foreground"
                      >
                        <span className="text-xl">{provider.icon}</span>
                        <span className="text-xs">{provider.name}</span>
                      </div>
                    ))}
                  </div>
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
              <a href="/api/login" className="gap-2">
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
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
