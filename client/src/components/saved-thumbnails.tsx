import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit, Clock } from "lucide-react";
import type { Thumbnail } from "@shared/schema";

interface SavedThumbnailsProps {
  thumbnails: Thumbnail[];
  isLoading: boolean;
  onLoad: (thumbnail: Thumbnail) => void;
  onDelete: (id: string) => void;
}

export function SavedThumbnails({ thumbnails, isLoading, onLoad, onDelete }: SavedThumbnailsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="saved-thumbnails-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (thumbnails.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="saved-thumbnails-empty">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No saved thumbnails yet</p>
        <p className="text-xs mt-1">Create and save your first thumbnail!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="saved-thumbnails-list">
      {thumbnails.map((thumbnail) => (
        <Card
          key={thumbnail.id}
          className="p-3 hover-elevate cursor-pointer"
          onClick={() => onLoad(thumbnail)}
          data-testid={`thumbnail-item-${thumbnail.id}`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-12 rounded-md flex-shrink-0 border"
              style={{
                background: thumbnail.config.backgroundImage
                  ? `url(${thumbnail.config.backgroundImage}) center/cover`
                  : thumbnail.config.backgroundColor,
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{thumbnail.title}</p>
              <p className="text-xs text-muted-foreground">
                {thumbnail.config.overlays.length} text layer{thumbnail.config.overlays.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoad(thumbnail);
                }}
                data-testid={`button-edit-thumbnail-${thumbnail.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(thumbnail.id);
                }}
                data-testid={`button-delete-thumbnail-${thumbnail.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
