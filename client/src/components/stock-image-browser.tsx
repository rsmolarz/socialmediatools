import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, ImagePlus, Download, Heart, Loader2, Grid, List } from "lucide-react";

interface StockImage {
  id: string;
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  source: "unsplash" | "pexels";
  width: number;
  height: number;
}

const CURATED_COLLECTIONS = {
  medical: [
    { id: "med1", url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=300&h=200&fit=crop", photographer: "National Cancer Institute", photographerUrl: "#", alt: "Medical professional with stethoscope", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "med2", url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&h=200&fit=crop", photographer: "CDC", photographerUrl: "#", alt: "Laboratory research", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "med3", url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=200&fit=crop", photographer: "Online Marketing", photographerUrl: "#", alt: "Doctor consultation", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "med4", url: "https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=300&h=200&fit=crop", photographer: "Hush Naidoo", photographerUrl: "#", alt: "Healthcare setting", source: "unsplash" as const, width: 1280, height: 720 },
  ],
  finance: [
    { id: "fin1", url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=200&fit=crop", photographer: "Maxim Hopman", photographerUrl: "#", alt: "Stock market trading", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "fin2", url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=200&fit=crop", photographer: "Towfiqu barbhuiya", photographerUrl: "#", alt: "Financial documents", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "fin3", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop", photographer: "Carlos Muza", photographerUrl: "#", alt: "Analytics dashboard", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "fin4", url: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=300&h=200&fit=crop", photographer: "Josh Appel", photographerUrl: "#", alt: "Currency and money", source: "unsplash" as const, width: 1280, height: 720 },
  ],
  podcast: [
    { id: "pod1", url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&h=200&fit=crop", photographer: "Will Francis", photographerUrl: "#", alt: "Podcast microphone setup", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "pod2", url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&h=200&fit=crop", photographer: "Jonathan Velasquez", photographerUrl: "#", alt: "Recording studio", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "pod3", url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=200&fit=crop", photographer: "CoWomen", photographerUrl: "#", alt: "Interview setting", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "pod4", url: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=200&fit=crop", photographer: "Kelly Sikkema", photographerUrl: "#", alt: "Audio equipment", source: "unsplash" as const, width: 1280, height: 720 },
  ],
  abstract: [
    { id: "abs1", url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&h=200&fit=crop", photographer: "Pawel Czerwinski", photographerUrl: "#", alt: "Purple gradient", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "abs2", url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=300&h=200&fit=crop", photographer: "Pawel Czerwinski", photographerUrl: "#", alt: "Abstract waves", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "abs3", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop", photographer: "Milad Fakurian", photographerUrl: "#", alt: "Colorful abstract", source: "unsplash" as const, width: 1280, height: 720 },
    { id: "abs4", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1280&h=720&fit=crop", thumbUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=200&fit=crop", photographer: "Gradienta", photographerUrl: "#", alt: "Gradient background", source: "unsplash" as const, width: 1280, height: 720 },
  ],
};

interface StockImageBrowserProps {
  onSelectImage: (imageUrl: string) => void;
}

export function StockImageBrowser({ onSelectImage }: StockImageBrowserProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<keyof typeof CURATED_COLLECTIONS>("medical");
  const [searchResults, setSearchResults] = useState<StockImage[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Enter a search term", variant: "destructive" });
      return;
    }
    
    setIsSearching(true);
    
    // Simulate search with curated images based on keywords
    setTimeout(() => {
      const allImages = Object.values(CURATED_COLLECTIONS).flat();
      const filtered = allImages.filter(img => 
        img.alt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery.toLowerCase().includes("medical") ||
        searchQuery.toLowerCase().includes("finance") ||
        searchQuery.toLowerCase().includes("podcast")
      );
      
      setSearchResults(filtered.length > 0 ? filtered : allImages.slice(0, 4));
      setIsSearching(false);
      
      toast({
        title: "Search complete",
        description: `Found ${filtered.length > 0 ? filtered.length : 4} images`,
      });
    }, 1000);
  };

  const toggleFavorite = (imageId: string) => {
    setFavorites(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSelectImage = (image: StockImage) => {
    onSelectImage(image.url);
    toast({
      title: "Image selected",
      description: "The stock image has been applied as your background",
    });
  };

  const currentImages = searchResults.length > 0 
    ? searchResults 
    : CURATED_COLLECTIONS[activeCollection];

  const renderImageCard = (image: StockImage) => (
    <Card 
      key={image.id} 
      className={`overflow-hidden hover-elevate cursor-pointer ${viewMode === "list" ? "flex" : ""}`}
      data-testid={`stock-image-${image.id}`}
    >
      <div className={`relative ${viewMode === "list" ? "w-48 flex-shrink-0" : ""}`}>
        <img
          src={image.thumbUrl}
          alt={image.alt}
          className={`object-cover ${viewMode === "list" ? "h-32 w-48" : "w-full h-40"}`}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(image.id);
            }}
            data-testid={`favorite-${image.id}`}
          >
            <Heart className={`h-4 w-4 ${favorites.includes(image.id) ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
        </div>
        <Badge 
          className="absolute bottom-2 left-2 text-xs"
          variant="secondary"
        >
          {image.source}
        </Badge>
      </div>
      <CardContent className={`p-3 ${viewMode === "list" ? "flex-1 flex flex-col justify-between" : ""}`}>
        <div>
          <p className="text-sm font-medium truncate">{image.alt}</p>
          <p className="text-xs text-muted-foreground">by {image.photographer}</p>
          <p className="text-xs text-muted-foreground">{image.width} x {image.height}</p>
        </div>
        <div className={`flex gap-2 ${viewMode === "list" ? "mt-2" : "mt-3"}`}>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleSelectImage(image)}
            data-testid={`select-image-${image.id}`}
          >
            <ImagePlus className="h-4 w-4 mr-1" />
            Use
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(image.url, "_blank")}
            data-testid={`download-${image.id}`}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Stock Image Library
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                data-testid="view-grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                data-testid="view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for images (e.g., medical, finance, podcast)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                data-testid="stock-search-input"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} data-testid="stock-search-button">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {searchResults.length === 0 && (
            <Tabs value={activeCollection} onValueChange={(v) => setActiveCollection(v as keyof typeof CURATED_COLLECTIONS)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="medical" data-testid="tab-medical">Medical</TabsTrigger>
                <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
                <TabsTrigger value="podcast" data-testid="tab-podcast">Podcast</TabsTrigger>
                <TabsTrigger value="abstract" data-testid="tab-abstract">Abstract</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {searchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Search results for "{searchQuery}"
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchResults([])}
                data-testid="clear-search"
              >
                Clear Search
              </Button>
            </div>
          )}

          <div className={viewMode === "grid" 
            ? "grid grid-cols-2 md:grid-cols-4 gap-3" 
            : "space-y-3"
          }>
            {currentImages.map(renderImageCard)}
          </div>

          {favorites.length > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">Favorites ({favorites.length})</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.values(CURATED_COLLECTIONS)
                  .flat()
                  .filter(img => favorites.includes(img.id))
                  .map(img => (
                    <img 
                      key={img.id}
                      src={img.thumbUrl}
                      alt={img.alt}
                      className="h-12 w-16 object-cover rounded cursor-pointer hover:ring-2 ring-primary"
                      onClick={() => handleSelectImage(img)}
                      data-testid={`favorite-thumb-${img.id}`}
                    />
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
