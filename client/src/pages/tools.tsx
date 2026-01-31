I need you to implement these 5 upgrades while we wait for the YouTube API quota to reset:

1. **Enhanced Viral Title Helper**
     - Add 15+ pre-made templates for medical/wellness content (e.g., "DOCTORS HATE THIS", "SURPRISING STAT", "WARNING:", "THIS SAVED MY LIFE")
     - A/B testing feature to generate multiple title variations
     - Character count validation (max 100 chars)
     - Engagement score prediction (low/medium/high) based on template
  
2. **Improve Thumbnail Text Editor**
     - Add 20+ additional font options (Google Fonts integration if possible)
     - Texs
     - Layer system with reorderable text/shape layers
   - 8-10 pre-built color schemes for wellness content
   - Auto-contrast feature that suggests best text colors for backgrounds

3. **Batch Processing**
     - Enable generating multiple thumbnails at once (up to 10)
     - Bulk export as ZIP file
        - Template application across multiple videos
        - Progress bar and status tracking
     
     4. **Local Caching/Queue System**
          - Save generated thumbnails to IndexedDB/local storage
        - Offline queue for thumbnails waiting to be uploaded
        - Auto-save drafts
        - View cached thumbnails even without connection
     
     5. **Components Library**
          - Create "Design Elements" section with reusable overlays, frames, borders
          - Save favorite design combinations as presets
          - "Design History" to quickly access recently used designs
        - Export/import custom component packs
     
     Start with the Enhanced Viral Title Helper and work through all 5 in order.: shadows, outlines, strokes, gradientimport { useState } from "react";
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
  Youtube
} from "lucide-react";

const TOOLS = [
  { id: "templates", name: "Templates", icon: LayoutTemplate, description: "Pre-made thumbnail designs" },
  { id: "export", name: "Batch Export", icon: Download, description: "Export multiple thumbnails" },
  { id: "schedule", name: "Schedule", icon: Calendar, description: "Content calendar" },
  { id: "fonts", name: "Typography", icon: Type, description: "Font management" },
  { id: "collaborate", name: "Collaborate", icon: Users, description: "Share & comment" },
  { id: "collections", name: "Collections", icon: Folder, description: "Organize thumbnails" },
  { id: "youtube", name: "YouTube Upgrade", icon: Youtube, description: "Optimize & update videos" },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedThumbnailId, setSelectedThumbnailId] = useState<number | undefined>();

  const handleApplyTemplate = (config: any) => {
    console.log("Apply template config:", config);
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
        </Tabs>
      </div>
    </div>
  );
}
