import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateLibrary } from "@/components/template-library";
import { BatchExport } from "@/components/batch-export";
import { SchedulingCalendar } from "@/components/scheduling-calendar";
import { FontManagement } from "@/components/font-management";
import { CollaborationPanel } from "@/components/collaboration-panel";
import { CollectionsPanel } from "@/components/collections-panel";
import { VideoSeoOptimizer } from "@/components/video-seo-optimizer";
import { TrendAnalysis } from "@/components/trend-analysis";
import { ViralHookGenerator } from "@/components/viral-hook-generator";
import { BrandKitManagement } from "@/components/brand-kit-management";
import { AdvancedImageEditor } from "@/components/advanced-image-editor";
import { BackgroundRemover } from "@/components/background-remover";
import { StockImageBrowser } from "@/components/stock-image-browser";
import { ExportOptimizer } from "@/components/export-optimizer";
import { ABTestingPanel } from "@/components/ab-testing-panel";
import { ImageFiltersPanel } from "@/components/image-filters-panel";
import { SearchOrganization } from "@/components/search-organization";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  LayoutTemplate, 
  Download, 
  Calendar, 
  Type, 
  Users, 
  Folder,
  Sparkles,
  ArrowLeft,
  Youtube,
  TrendingUp,
  Zap,
  Palette,
  SlidersHorizontal,
  Eraser,
  ImagePlus,
  Settings2,
  FlaskConical,
  Search
} from "lucide-react";

const TOOLS = [
  { id: "templates", name: "Templates", icon: LayoutTemplate, description: "Pre-made thumbnail designs" },
  { id: "export", name: "Batch Export", icon: Download, description: "Export multiple thumbnails" },
  { id: "schedule", name: "Schedule", icon: Calendar, description: "Content calendar" },
  { id: "fonts", name: "Typography", icon: Type, description: "Font management" },
  { id: "collaborate", name: "Collaborate", icon: Users, description: "Share & comment" },
  { id: "collections", name: "Collections", icon: Folder, description: "Organize thumbnails" },
  { id: "youtube", name: "YouTube Upgrade", icon: Youtube, description: "Optimize & update videos" },
  { id: "trends", name: "Trends", icon: TrendingUp, description: "Trending topics & styles" },
  { id: "hooks", name: "Viral Hooks", icon: Zap, description: "Generate attention-grabbing hooks" },
  { id: "brand", name: "Brand Kit", icon: Palette, description: "Colors, fonts & logos" },
  { id: "editor", name: "Image Editor", icon: SlidersHorizontal, description: "Crop, filters & overlays" },
  { id: "bgremove", name: "BG Remover", icon: Eraser, description: "Remove or blur backgrounds" },
  { id: "stock", name: "Stock Images", icon: ImagePlus, description: "Browse stock photo library" },
  { id: "optimize", name: "Export Options", icon: Settings2, description: "WebP, AVIF & optimization" },
  { id: "abtest", name: "A/B Testing", icon: FlaskConical, description: "Test thumbnail variants" },
  { id: "filters", name: "Filters", icon: Sparkles, description: "Instagram-style image filters" },
  { id: "search", name: "Search & Organize", icon: Search, description: "Full-text search, tags & folders" },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedThumbnailId, setSelectedThumbnailId] = useState<number | undefined>();
  const [selectedStockImage, setSelectedStockImage] = useState<string | undefined>();

  const handleApplyTemplate = (config: any) => {
    console.log("Apply template config:", config);
  };

  const handleStockImageSelect = (imageUrl: string) => {
    setSelectedStockImage(imageUrl);
    console.log("Selected stock image:", imageUrl);
  };

  const handleExportOptimized = (settings: any) => {
    console.log("Export settings:", settings);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">Tools & Features</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Powerful tools to create better thumbnails faster
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            {TOOLS.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex items-center gap-2 px-4"
                data-testid={`tab-${tool.id}`}
              >
                <tool.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tool.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="templates" className="mt-0">
            <TemplateLibrary onApplyTemplate={handleApplyTemplate} />
          </TabsContent>

          <TabsContent value="export" className="mt-0">
            <BatchExport />
          </TabsContent>

          <TabsContent value="schedule" className="mt-0">
            <SchedulingCalendar />
          </TabsContent>

          <TabsContent value="fonts" className="mt-0">
            <FontManagement previewText="THE MEDICINE & MONEY SHOW" />
          </TabsContent>

          <TabsContent value="collaborate" className="mt-0">
            <CollaborationPanel thumbnailId={selectedThumbnailId} />
          </TabsContent>

          <TabsContent value="collections" className="mt-0">
            <CollectionsPanel />
          </TabsContent>

          <TabsContent value="youtube" className="mt-0">
            <VideoSeoOptimizer />
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            <TrendAnalysis niche="Medicine & Money" />
          </TabsContent>

          <TabsContent value="hooks" className="mt-0">
            <ViralHookGenerator />
          </TabsContent>

          <TabsContent value="brand" className="mt-0">
            <BrandKitManagement />
          </TabsContent>

          <TabsContent value="editor" className="mt-0">
            <AdvancedImageEditor />
          </TabsContent>

          <TabsContent value="bgremove" className="mt-0">
            <BackgroundRemover />
          </TabsContent>

          <TabsContent value="stock" className="mt-0">
            <StockImageBrowser onSelectImage={handleStockImageSelect} />
          </TabsContent>

          <TabsContent value="optimize" className="mt-0">
            <ExportOptimizer onExport={handleExportOptimized} thumbnailDataUrl={selectedStockImage} />
          </TabsContent>

          <TabsContent value="abtest" className="mt-0">
            <ABTestingPanel />
          </TabsContent>

          <TabsContent value="filters" className="mt-0">
            <ImageFiltersPanel />
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            <SearchOrganization />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
