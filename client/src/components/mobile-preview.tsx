import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

interface MobilePreviewProps {
  canvasDataUrl: string | null;
}

export function MobilePreview({ canvasDataUrl }: MobilePreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Mobile Feed Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div 
            className="relative bg-muted rounded-lg overflow-hidden"
            style={{ width: "180px", height: "320px" }}
            data-testid="container-mobile-preview"
          >
            <div className="absolute inset-x-0 top-0 h-6 bg-background/80 flex items-center justify-center">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            <div className="p-2 pt-8 space-y-2">
              <div className="aspect-video rounded overflow-hidden bg-background border">
                {canvasDataUrl ? (
                  <img 
                    src={canvasDataUrl} 
                    alt="Mobile preview" 
                    className="w-full h-full object-cover"
                    data-testid="img-mobile-preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No preview
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="h-2 bg-muted-foreground/20 rounded w-full" />
                <div className="h-2 bg-muted-foreground/10 rounded w-3/4" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="w-5 h-5 bg-muted-foreground/20 rounded-full" />
                <div className="h-2 bg-muted-foreground/15 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          How your thumbnail appears in mobile feeds
        </p>
      </CardContent>
    </Card>
  );
}
