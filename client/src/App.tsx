import { Router, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import Home from "@/pages/home";
import Tools from "@/pages/tools";
import Admin from "@/pages/admin";
import Landing from "@/pages/landing";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import SpeakerKit from "@/pages/speaker-kit";
import SiteEvaluator, { ProofViewer } from "@/pages/site-evaluator";
import YouTubeAnalytics from "@/pages/youtube-analytics";
import InstagramPlanner from "@/pages/instagram-planner";
import TikTokOptimizer from "@/pages/tiktok-optimizer";
import LinkedInSuite from "@/pages/linkedin-suite";
import PodcastTools from "@/pages/podcast-tools";
import SocialCommandCenter from "@/pages/social-command-center";
import AiContentTeam from "@/pages/ai-content-team";
import TwitterSuite from "@/pages/twitter-suite";
import ContentRepurposer from "@/pages/content-repurposer";
import ABTester from "@/pages/ab-tester";
import CollabFinder from "@/pages/collab-finder";
import ViralAnalyzer from "@/pages/viral-analyzer";
import FunnelBuilder from "@/pages/funnel-builder";
import NotFound from "@/pages/not-found";
import BotsPage from "@/pages/bots";
import { Loader2 } from "lucide-react";
import StudioPage from "@/pages/studio";
import EditorPage from "@/pages/editor";

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tools" component={Tools} />
      <Route path="/speaker-kit" component={SpeakerKit} />
      <Route path="/site-evaluator" component={SiteEvaluator} />
      <Route path="/youtube-analytics" component={YouTubeAnalytics} />
      <Route path="/instagram-planner" component={InstagramPlanner} />
      <Route path="/tiktok-optimizer" component={TikTokOptimizer} />
      <Route path="/linkedin-suite" component={LinkedInSuite} />
      <Route path="/podcast-tools" component={PodcastTools} />
      <Route path="/social-command-center" component={SocialCommandCenter} />
      <Route path="/ai-team" component={AiContentTeam} />
      <Route path="/twitter-suite" component={TwitterSuite} />
      <Route path="/content-repurposer" component={ContentRepurposer} />
      <Route path="/ab-tester" component={ABTester} />
      <Route path="/collab-finder" component={CollabFinder} />
      <Route path="/viral-analyzer" component={ViralAnalyzer} />
      <Route path="/funnel-builder" component={FunnelBuilder} />
      <Route path="/bots" component={BotsPage} />
      <Route path="/admin" component={Admin} />
      <Route path="/studio" component={StudioPage} />
        <Route path="/studio/:id/edit" component={EditorPage} />
      <Route path="/studio/:id" component={StudioPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Switch>
              <Route path="/privacy" component={PrivacyPolicy} />
              <Route path="/terms" component={TermsOfService} />
              <Route path="/site-evaluator/proof/:proofId">
                {(params) => <ProofViewer proofId={params.proofId} />}
              </Route>
              <Route>
                <AuthenticatedRouter />
              </Route>
            </Switch>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
