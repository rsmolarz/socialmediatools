import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Copy,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  Share2,
  Palette,
  Youtube,
  Mic,
  Globe,
  Image,
  BarChart3,
  Sparkles,
  Shield,
  Users,
  Calendar,
  Layers,
  type LucideIcon,
  Send,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FeatureSection {
  title: string;
  content: string;
}

interface FeatureVersion {
  version: string;
  date: string;
  summary: string;
  status: "complete" | "partial" | "planned";
  sections: FeatureSection[];
  files: { path: string; purpose: string }[];
  apiRoutes: { method: string; path: string; description: string }[];
  dependencies: string[];
}

interface FeatureDoc {
  id: string;
  name: string;
  icon: LucideIcon;
  versions: FeatureVersion[];
}

const featureDocs: FeatureDoc[] = [
  {
    id: "thumbnail-editor",
    name: "Thumbnail Editor & Canvas",
    icon: Image,
    versions: [
      {
        version: "3.0",
        date: "March 2026",
        summary: "Advanced canvas-based thumbnail editor with AI background generation, smart layouts, layer management, text overlays with highlighting, host/guest photos, vignettes, and real-time preview. Supports undo/redo, auto-save, and high-quality PNG export.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "The thumbnail editor is the core feature of the platform. It provides a 1280x720 canvas for designing YouTube thumbnails with real-time preview. Users can add text overlays with custom fonts, colors, and highlighting; upload host and guest photos; apply AI-generated or solid/gradient backgrounds; add vignette and overlay effects; and manage layers with drag-and-drop reordering."
          },
          {
            title: "Architecture",
            content: "Built as a React component using HTML5 Canvas API. The canvas renders at 1280x720 (standard YouTube thumbnail size). State is managed locally with useState and a custom history stack for undo/redo. Auto-save debounces changes and persists to the database via REST API. The editor supports multiple text lines, each with independent positioning, font, size, color, stroke, and highlighting options."
          },
          {
            title: "AI Integration",
            content: "The editor integrates with OpenAI for: 1) Background generation from text prompts or transcript analysis, 2) Smart layout suggestions that automatically position elements for visual impact, 3) Thumbnail scoring that evaluates the design and suggests improvements."
          }
        ],
        files: [
          { path: "client/src/pages/home.tsx", purpose: "Main editor page with canvas, controls, and sidebar panels" },
          { path: "client/src/components/thumbnail-canvas.tsx", purpose: "Canvas rendering component" },
          { path: "client/src/components/ai-smart-layouts.tsx", purpose: "AI-powered layout suggestions" },
          { path: "client/src/components/thumbnail-scorer.tsx", purpose: "AI thumbnail quality scoring" },
          { path: "server/routes.ts", purpose: "API endpoints for thumbnail CRUD and AI features" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/thumbnails", description: "List all thumbnails for the user" },
          { method: "POST", path: "/api/thumbnails", description: "Create a new thumbnail" },
          { method: "PATCH", path: "/api/thumbnails/:id", description: "Update thumbnail configuration" },
          { method: "POST", path: "/api/ai/score-thumbnail", description: "AI-powered thumbnail scoring" },
          { method: "POST", path: "/api/ai/generate-background", description: "Generate AI background image" }
        ],
        dependencies: ["openai", "canvas API", "react", "tanstack-query"]
      }
    ]
  },
  {
    id: "ai-thumbnail-scorer",
    name: "AI Thumbnail Scorer",
    icon: Sparkles,
    versions: [
      {
        version: "2.0",
        date: "March 2026",
        summary: "AI-powered thumbnail scoring system that evaluates designs across multiple categories (composition, text readability, color impact, emotional appeal, click-worthiness) and provides specific improvement suggestions with auto-optimize capability.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "The scorer analyzes a thumbnail canvas capture and returns a score from 0-100 across five categories. It provides specific, actionable suggestions for improvement. The auto-optimize feature can apply AI suggestions directly to the thumbnail configuration."
          },
          {
            title: "Validation & Safety",
            content: "Strict overlay validation: fontSize range 8-200, strokeWidth range 0-20, fontWeight whitelist (normal, bold, 100-900), type checks for colors. AccentColor validated against known values. This prevents AI-generated configurations from crashing the editor."
          }
        ],
        files: [
          { path: "client/src/components/thumbnail-scorer.tsx", purpose: "Scorer UI with score display, breakdown, and suggestions" },
          { path: "server/routes.ts", purpose: "POST /api/ai/score-thumbnail endpoint" }
        ],
        apiRoutes: [
          { method: "POST", path: "/api/ai/score-thumbnail", description: "Score a thumbnail design using OpenAI vision" }
        ],
        dependencies: ["openai"]
      }
    ]
  },
  {
    id: "site-evaluator",
    name: "Website Copy & SEO Evaluator",
    icon: Globe,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "AI-powered website evaluation tool that analyzes copy against the 15 P's of Compelling Copy (Brand Builders Group framework), audits SEO factors, and evaluates graphics/design quality. Supports URL input or pasted content.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Evaluates websites across three dimensions: 1) Copy quality using the 15 P's framework (Problem, Promise, Picture, Proof, Proposition, Price, Push, Pull-Back, Purpose, Personality, Proximity, Positioning, Platform, Progression, Prestige), 2) SEO audit (title, meta, headings, images, links, mobile, schema, keywords), 3) Graphics quality (visual hierarchy, color scheme, typography, imagery, whitespace, consistency, CTAs)."
          },
          {
            title: "Architecture",
            content: "Available both as a standalone page (/site-evaluator) and as a tab within the Tools page. The SiteEvaluatorPanel component is the reusable core. The backend fetches URLs with SSRF protection (blocks private IPs, localhost, etc.) and passes content to OpenAI for analysis."
          }
        ],
        files: [
          { path: "client/src/pages/site-evaluator.tsx", purpose: "Standalone page and reusable SiteEvaluatorPanel component" },
          { path: "client/src/pages/tools.tsx", purpose: "Tools page embedding the evaluator as a tab" },
          { path: "server/routes.ts", purpose: "POST /api/site-evaluator/evaluate endpoint" }
        ],
        apiRoutes: [
          { method: "POST", path: "/api/site-evaluator/evaluate", description: "Evaluate a website's copy, SEO, and graphics" }
        ],
        dependencies: ["openai", "axios"]
      }
    ]
  },
  {
    id: "speaker-kit",
    name: "Speaker Kit Builder",
    icon: Mic,
    versions: [
      {
        version: "2.0",
        date: "March 2026",
        summary: "Comprehensive speaker profile builder with bio, programs, topics, testimonials, brand colors, brand kit integration, and AI-powered document upload (PDF/DOCX/TXT) to auto-populate fields. Includes opportunity finder with AI auto-fill for applications.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Creates a professional speaker kit with: personal bio, speaking programs, topic expertise, testimonials, brand colors, and media assets. The brand kit integration allows importing colors from saved brand kits. The document upload feature uses AI to parse speaker one-sheets, CVs, or bios and auto-populate all form fields."
          },
          {
            title: "Opportunity Finder",
            content: "AI-powered search for speaking engagements. Finds conferences, podcasts, summits, and other speaking opportunities. The AI auto-fill feature drafts personalized applications using the speaker's kit data."
          }
        ],
        files: [
          { path: "client/src/pages/speaker-kit.tsx", purpose: "Speaker kit builder and opportunity finder page" },
          { path: "server/routes.ts", purpose: "Speaker kit CRUD and opportunity search endpoints" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/speaker-kit", description: "Get the user's speaker kit" },
          { method: "POST", path: "/api/speaker-kit", description: "Save speaker kit data" },
          { method: "POST", path: "/api/speaker-opportunities/search", description: "AI search for speaking opportunities" },
          { method: "POST", path: "/api/speaker-kit/parse-document", description: "AI parse uploaded document" }
        ],
        dependencies: ["openai", "multer"]
      }
    ]
  },
  {
    id: "social-media-suite",
    name: "Social Media Content Suite",
    icon: Share2,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "AI-powered social media content generation with viral topic discovery, multi-platform content creation, content queue management, virality scoring, photo upload with background removal, post previews, and logo overlays.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Discovers trending viral topics in the medicine and money niche. Generates platform-specific content (Twitter/X, LinkedIn, Instagram, Facebook) with optimized hashtags, CTAs, and formatting. Provides virality scoring to predict content performance. Supports custom photo uploads with AI background removal."
          }
        ],
        files: [
          { path: "client/src/pages/social-media.tsx", purpose: "Social media dashboard and content creation" },
          { path: "server/routes.ts", purpose: "Viral topic discovery and content generation endpoints" },
          { path: "server/lib/viral-analyzer.ts", purpose: "Viral topic analysis engine" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/viral-topics", description: "Get trending viral topics" },
          { method: "POST", path: "/api/social-posts/generate", description: "Generate platform-specific content" },
          { method: "POST", path: "/api/social-posts/queue", description: "Queue content for posting" }
        ],
        dependencies: ["openai", "@imgly/background-removal"]
      }
    ]
  },
  {
    id: "youtube-seo",
    name: "YouTube SEO Optimizer",
    icon: Youtube,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "View channel videos, AI-powered SEO optimization for descriptions and tags, direct YouTube metadata updates, and bulk optimization capabilities.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Fetches the user's YouTube channel videos via the YouTube Data API. Provides AI-powered optimization for video titles, descriptions, and tags. Supports direct metadata updates back to YouTube. The admin section includes bulk optimization for processing multiple videos at once."
          }
        ],
        files: [
          { path: "client/src/pages/admin.tsx", purpose: "Bulk YouTube optimization tab" },
          { path: "server/routes.ts", purpose: "YouTube API integration and optimization endpoints" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/youtube/videos", description: "Fetch channel videos" },
          { method: "POST", path: "/api/youtube/optimize", description: "AI-optimize video metadata" },
          { method: "POST", path: "/api/admin/youtube/bulk-optimize", description: "Bulk optimize all videos" }
        ],
        dependencies: ["youtube integration", "openai"]
      }
    ]
  },
  {
    id: "tools-suite",
    name: "Tools & Workflow Suite",
    icon: Layers,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "Comprehensive tools page with template library, batch export, content scheduling, font management, collaboration panel, collections, A/B testing, filters, search & organization, analytics dashboard, color palette generator, and site evaluator.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "A tabbed interface providing access to: pre-made thumbnail templates, batch export with format optimization (WebP, AVIF), content scheduling calendar, font management, real-time collaboration with live cursors and presence, collection/folder management, A/B testing for thumbnail variants, Instagram-style filters, full-text search with tag filtering, performance analytics with charts, color palette generation, and website evaluation."
          }
        ],
        files: [
          { path: "client/src/pages/tools.tsx", purpose: "Main tools page with tabbed interface" },
          { path: "client/src/components/analytics-dashboard.tsx", purpose: "Analytics and performance tracking" },
          { path: "client/src/components/color-palette-generator.tsx", purpose: "Color palette generation tool" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/templates", description: "List available templates" },
          { method: "GET", path: "/api/analytics", description: "Get analytics data" },
          { method: "GET", path: "/api/collections", description: "List collections/folders" }
        ],
        dependencies: ["recharts", "date-fns"]
      }
    ]
  },
  {
    id: "auth-system",
    name: "Authentication System",
    icon: Shield,
    versions: [
      {
        version: "2.0",
        date: "March 2026",
        summary: "Multi-provider authentication with demo login (username/password), Google OAuth, Facebook OAuth, GitHub OAuth, and Apple Sign-In. Session management with express-session and PostgreSQL store.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Supports five authentication methods: 1) Demo login with username 'demo' and password 'demo1234', 2) Google OAuth via passport-google-oauth20, 3) Facebook OAuth, 4) GitHub OAuth, 5) Apple Sign-In (manual JWT implementation). Sessions are stored in PostgreSQL via connect-pg-simple."
          },
          {
            title: "Architecture",
            content: "OAuth providers are configured in server/auth/oauth-config.ts. Login routes are in server/auth/oauth-routes.ts. The demo account is auto-created on server startup. Session middleware is configured with a PostgreSQL session store for persistence across deployments."
          }
        ],
        files: [
          { path: "client/src/pages/login.tsx", purpose: "Login page with all auth options" },
          { path: "server/auth/oauth-config.ts", purpose: "OAuth provider configuration" },
          { path: "server/auth/oauth-routes.ts", purpose: "OAuth callback routes" },
          { path: "server/routes.ts", purpose: "Demo login endpoint" }
        ],
        apiRoutes: [
          { method: "POST", path: "/api/login", description: "Demo username/password login" },
          { method: "GET", path: "/api/auth/google", description: "Initiate Google OAuth" },
          { method: "GET", path: "/api/auth/facebook", description: "Initiate Facebook OAuth" },
          { method: "GET", path: "/api/auth/github", description: "Initiate GitHub OAuth" },
          { method: "POST", path: "/api/auth/apple/callback", description: "Apple Sign-In callback" }
        ],
        dependencies: ["passport", "passport-google-oauth20", "passport-local", "express-session", "connect-pg-simple"]
      }
    ]
  },
  {
    id: "admin-dashboard",
    name: "Admin Dashboard",
    icon: Shield,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "System administration panel with Code Guardian (security/quality scanning), Code Upgrade (improvement suggestions), Feature Ideas, YouTube bulk optimizer, and Feature Documentation (this system).",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Provides admin-level tools: Code Guardian scans for errors, security issues, and best practices. Code Upgrade suggests improvements and optimizations. Feature Ideas displays AI-generated feature recommendations. YouTube Optimizer handles bulk metadata optimization. Feature Docs documents all platform features with versioning and export."
          }
        ],
        files: [
          { path: "client/src/pages/admin.tsx", purpose: "Admin dashboard with tabbed interface" },
          { path: "client/src/components/feature-docs.tsx", purpose: "Feature documentation system" },
          { path: "server/routes.ts", purpose: "Admin API endpoints for scans and optimizations" }
        ],
        apiRoutes: [
          { method: "GET", path: "/api/admin/agent-logs", description: "Fetch guardian/upgrade logs" },
          { method: "POST", path: "/api/admin/run-guardian", description: "Run code security scan" },
          { method: "POST", path: "/api/admin/run-upgrade", description: "Run code improvement analysis" }
        ],
        dependencies: ["openai"]
      }
    ]
  },
  {
    id: "deployment-architecture",
    name: "Deployment & Production Setup",
    icon: ExternalLink,
    versions: [
      {
        version: "2.0",
        date: "March 2026",
        summary: "Production deployment with split startup architecture for fast health checks. Tiny startup script (807 bytes) binds to port instantly, then asynchronously loads the 1.8MB application bundle. Deployed on Replit autoscale.",
        status: "complete",
        sections: [
          {
            title: "Architecture",
            content: "The production build creates two files: dist/index.cjs (tiny startup, ~800 bytes) and dist/app.cjs (full application, ~1.8MB). The startup script immediately creates an Express server, binds to port 5000, and responds to health checks with 200. After a 100ms delay (to allow the event loop to process initial health checks), it loads the main application bundle asynchronously."
          },
          {
            title: "Why This Architecture",
            content: "Replit's autoscale deployment checks health on '/' immediately after startup. Node.js takes several seconds to parse and execute the large application bundle, causing health checks to fail. By splitting the startup into a tiny script that listens instantly and defers heavy loading, health checks pass within milliseconds."
          }
        ],
        files: [
          { path: "server/startup.ts", purpose: "Tiny production startup script" },
          { path: "server/index.ts", purpose: "Main application initialization (exports initApp)" },
          { path: "script/build.ts", purpose: "Build script creating split bundles" },
          { path: ".replit", purpose: "Deployment configuration" }
        ],
        apiRoutes: [],
        dependencies: ["esbuild", "vite"]
      }
    ]
  },
  {
    id: "feature-docs",
    name: "Feature Documentation System",
    icon: FileText,
    versions: [
      {
        version: "1.0",
        date: "March 2026",
        summary: "Self-contained, versioned knowledge base documenting every platform feature. Includes search, version switching, Markdown export, and sharing capabilities for sending feature docs to other Replit apps or external teams.",
        status: "complete",
        sections: [
          {
            title: "What It Does",
            content: "Documents every major feature with: summary, architecture details, involved files, API routes, and dependencies. Supports version history, full-text search, Markdown export (individual or all), and a sharing dialog for sending docs to external URLs or copying for other Replit projects."
          },
          {
            title: "Why No Database",
            content: "Feature docs are code, not user data. They change when the codebase changes, so they belong in source control. This ensures documentation is always in sync with the actual implementation."
          }
        ],
        files: [
          { path: "client/src/components/feature-docs.tsx", purpose: "Complete feature documentation system" },
          { path: "client/src/pages/admin.tsx", purpose: "Admin page hosting the feature docs tab" }
        ],
        apiRoutes: [],
        dependencies: ["lucide-react", "shadcn/ui"]
      }
    ]
  }
];

function generateExportMarkdown(doc: FeatureDoc, version: FeatureVersion): string {
  let md = `# ${doc.name} (v${version.version} — ${version.date})\n\n`;
  md += `**Status:** ${version.status}\n\n`;
  md += `## Summary\n${version.summary}\n\n`;

  for (const section of version.sections) {
    md += `## ${section.title}\n${section.content}\n\n`;
  }

  if (version.files.length > 0) {
    md += `## Files\n`;
    for (const f of version.files) {
      md += `- \`${f.path}\` — ${f.purpose}\n`;
    }
    md += "\n";
  }

  if (version.apiRoutes.length > 0) {
    md += `## API Routes\n`;
    md += `| Method | Path | Description |\n|--------|------|-------------|\n`;
    for (const r of version.apiRoutes) {
      md += `| ${r.method} | ${r.path} | ${r.description} |\n`;
    }
    md += "\n";
  }

  if (version.dependencies.length > 0) {
    md += `## Dependencies\n`;
    for (const d of version.dependencies) {
      md += `- ${d}\n`;
    }
    md += "\n";
  }

  return md;
}

function generateAllExportMarkdown(): string {
  let md = `# Feature Documentation — Medicine & Money Show Platform\n\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `## Table of Contents\n`;
  for (const doc of featureDocs) {
    md += `- [${doc.name}](#${doc.id})\n`;
  }
  md += "\n---\n\n";

  for (const doc of featureDocs) {
    const latest = doc.versions[doc.versions.length - 1];
    md += generateExportMarkdown(doc, latest);
    md += "---\n\n";
  }

  return md;
}

const statusColors: Record<string, string> = {
  complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function FeatureDocs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [shareFeatureName, setShareFeatureName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isSending, setIsSending] = useState(false);

  const filteredDocs = featureDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDoc = (id: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getSelectedVersion = (doc: FeatureDoc): FeatureVersion => {
    const selectedVer = selectedVersions[doc.id];
    if (selectedVer) {
      const found = doc.versions.find((v) => v.version === selectedVer);
      if (found) return found;
    }
    return doc.versions[doc.versions.length - 1];
  };

  const copyMarkdown = (doc: FeatureDoc) => {
    const version = getSelectedVersion(doc);
    const md = generateExportMarkdown(doc, version);
    navigator.clipboard.writeText(md).then(
      () => toast({ title: "Copied to clipboard", description: `${doc.name} v${version.version} documentation copied as Markdown` }),
      () => {
        const textarea = document.createElement("textarea");
        textarea.value = md;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        toast({ title: "Copied to clipboard" });
      }
    );
  };

  const downloadMarkdown = (doc: FeatureDoc) => {
    const version = getSelectedVersion(doc);
    const md = generateExportMarkdown(doc, version);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.id}-v${version.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `${doc.name} v${version.version}.md` });
  };

  const exportAll = () => {
    const md = generateAllExportMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feature-docs-all.md";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "All docs exported", description: `${featureDocs.length} features exported as Markdown` });
  };

  const copyAll = () => {
    const md = generateAllExportMarkdown();
    navigator.clipboard.writeText(md).then(
      () => toast({ title: "All docs copied", description: `${featureDocs.length} features copied as Markdown` }),
      () => toast({ title: "Copy failed", variant: "destructive" })
    );
  };

  const openShareDialog = (doc: FeatureDoc) => {
    const version = getSelectedVersion(doc);
    const md = generateExportMarkdown(doc, version);
    setShareContent(md);
    setShareFeatureName(doc.name);
    setShareUrl("");
    setShareDialogOpen(true);
  };

  const openShareAllDialog = () => {
    const md = generateAllExportMarkdown();
    setShareContent(md);
    setShareFeatureName("All Features");
    setShareUrl("");
    setShareDialogOpen(true);
  };

  const sendToUrl = async () => {
    if (!shareUrl.trim()) {
      toast({ title: "Enter a URL", description: "Provide the URL to send the documentation to.", variant: "destructive" });
      return;
    }

    if (!shareUrl.trim().startsWith("https://")) {
      toast({ title: "HTTPS required", description: "For security, only HTTPS URLs are accepted.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(shareUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feature-documentation",
          source: "medicine-money-show",
          name: shareFeatureName,
          content: shareContent,
          sentAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast({ title: "Sent successfully", description: `Documentation sent to ${shareUrl}` });
        setShareDialogOpen(false);
      } else {
        toast({ title: "Send failed", description: `Server responded with ${res.status}`, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message || "Could not connect to the URL", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const copyShareContent = () => {
    navigator.clipboard.writeText(shareContent).then(
      () => toast({ title: "Copied", description: "Documentation copied to clipboard for sharing" }),
      () => toast({ title: "Copy failed", variant: "destructive" })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-feature-search"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyAll} data-testid="button-copy-all-docs">
            <Copy className="h-4 w-4 mr-1" />
            Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={exportAll} data-testid="button-export-all-docs">
            <Download className="h-4 w-4 mr-1" />
            Export All
          </Button>
          <Button variant="outline" size="sm" onClick={openShareAllDialog} data-testid="button-share-all-docs">
            <Send className="h-4 w-4 mr-1" />
            Share All
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredDocs.length} feature{filteredDocs.length !== 1 ? "s" : ""} documented. Click a feature to expand its details. Use Share to send docs to other Replit apps or teams.
      </p>

      <ScrollArea className="h-auto">
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const isExpanded = expandedDocs.has(doc.id);
            const version = getSelectedVersion(doc);
            const Icon = doc.icon;

            return (
              <Card key={doc.id} data-testid={`card-feature-${doc.id}`}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleDoc(doc.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{doc.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{version.version}</Badge>
                      <Badge className={statusColors[version.status] || ""}>
                        {version.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">{version.summary}</p>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.versions.length > 1 && (
                        <Select
                          value={selectedVersions[doc.id] || version.version}
                          onValueChange={(val) =>
                            setSelectedVersions((prev) => ({ ...prev, [doc.id]: val }))
                          }
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-version-${doc.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {doc.versions.map((v) => (
                              <SelectItem key={v.version} value={v.version}>
                                v{v.version} ({v.date})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); copyMarkdown(doc); }}
                          data-testid={`button-copy-${doc.id}`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); downloadMarkdown(doc); }}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openShareDialog(doc); }}
                          data-testid={`button-share-${doc.id}`}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {version.sections.map((section, idx) => {
                      const sectionKey = `${doc.id}-${idx}`;
                      const isSectionExpanded = expandedSections.has(sectionKey);
                      return (
                        <div key={idx} className="border rounded-lg">
                          <button
                            className="w-full flex items-center gap-2 p-3 text-left"
                            onClick={() => toggleSection(sectionKey)}
                            data-testid={`button-section-${doc.id}-${idx}`}
                          >
                            {isSectionExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">{section.title}</span>
                          </button>
                          {isSectionExpanded && (
                            <div className="px-3 pb-3">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {section.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {version.files.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Files</h4>
                        <div className="space-y-1">
                          {version.files.map((f, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs shrink-0">{f.path}</code>
                              <span className="text-muted-foreground">{f.purpose}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {version.apiRoutes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">API Routes</h4>
                        <div className="space-y-1">
                          {version.apiRoutes.map((r, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{r.method}</Badge>
                              <code className="bg-muted px-1.5 py-0.5 rounded">{r.path}</code>
                              <span className="text-muted-foreground">{r.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {version.dependencies.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Dependencies</h4>
                        <div className="flex flex-wrap gap-1">
                          {version.dependencies.map((d, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{d}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Share: {shareFeatureName}
            </DialogTitle>
            <DialogDescription>
              Send this feature documentation to another Replit app or copy it for sharing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Send to URL (another Replit app or webhook)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://your-app.replit.app/api/receive-docs"
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  data-testid="input-share-url"
                />
                <Button onClick={sendToUrl} disabled={isSending} data-testid="button-send-to-url">
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The receiving app should accept a POST request with JSON body containing type, source, name, content, and sentAt fields.
              </p>
            </div>

            <div className="border-t pt-4">
              <Label>Or copy the Markdown content</Label>
              <Textarea
                value={shareContent}
                readOnly
                rows={8}
                className="mt-1 font-mono text-xs"
                data-testid="textarea-share-content"
              />
              <Button variant="outline" className="w-full mt-2" onClick={copyShareContent} data-testid="button-copy-share">
                <Copy className="h-4 w-4 mr-1" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
