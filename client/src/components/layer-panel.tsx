import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Eye,
  EyeOff,
  GripVertical,
  Type,
  Image,
  Square,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { ThumbnailConfig, TextOverlay } from "@shared/schema";

interface LayerItem {
  id: string;
  type: "overlay" | "image" | "background" | "highlight";
  name: string;
  visible: boolean;
  zIndex: number;
}

interface LayerPanelProps {
  config: ThumbnailConfig;
  onConfigChange: (config: ThumbnailConfig) => void;
  selectedLayerId: string | null;
  onLayerSelect: (id: string | null) => void;
}

export function LayerPanel({
  config,
  onConfigChange,
  selectedLayerId,
  onLayerSelect,
}: LayerPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const getLayers = useCallback((): LayerItem[] => {
    const layers: LayerItem[] = [];
    
    layers.push({
      id: "background",
      type: "background",
      name: "Background",
      visible: true,
      zIndex: 0,
    });

    if (config.showHighlight) {
      layers.push({
        id: "highlight",
        type: "highlight",
        name: "Text Highlight",
        visible: config.showHighlight,
        zIndex: 1,
      });
    }

    if (config.overlays && config.overlays.length > 0) {
      config.overlays.forEach((overlay, index) => {
        layers.push({
          id: overlay.id,
          type: "overlay",
          name: `Text: ${overlay.text.substring(0, 15)}${overlay.text.length > 15 ? "..." : ""}`,
          visible: true,
          zIndex: 10 + index,
        });
      });
    }

    if (config.personImage) {
      layers.push({
        id: "person-image",
        type: "image",
        name: "Person Image",
        visible: true,
        zIndex: 100,
      });
    }

    return layers.reverse();
  }, [config]);

  const layers = getLayers();

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedId(layerId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", layerId);
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== layerId) {
      setDragOverId(layerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedLayer = layers.find(l => l.id === draggedId);
    const targetLayer = layers.find(l => l.id === targetId);

    if (draggedLayer?.type === "overlay" && targetLayer?.type === "overlay") {
      const overlays = [...(config.overlays || [])];
      const draggedIndex = overlays.findIndex(o => o.id === draggedId);
      const targetIndex = overlays.findIndex(o => o.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = overlays.splice(draggedIndex, 1);
        overlays.splice(targetIndex, 0, removed);
        onConfigChange({ ...config, overlays });
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const moveLayer = (layerId: string, direction: "up" | "down") => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type !== "overlay") return;

    const overlays = [...(config.overlays || [])];
    const index = overlays.findIndex(o => o.id === layerId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= overlays.length) return;

    const [removed] = overlays.splice(index, 1);
    overlays.splice(newIndex, 0, removed);
    onConfigChange({ ...config, overlays });
  };

  const toggleLayerVisibility = (layerId: string) => {
    if (layerId === "highlight") {
      onConfigChange({
        ...config,
        showHighlight: !config.showHighlight,
      });
    }
  };

  const deleteLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    switch (layer.type) {
      case "overlay":
        const overlays = (config.overlays || []).filter(o => o.id !== layerId);
        onConfigChange({ ...config, overlays });
        if (selectedLayerId === layerId) {
          onLayerSelect(null);
        }
        break;
      case "image":
        onConfigChange({ ...config, personImage: undefined });
        break;
      case "highlight":
        onConfigChange({ ...config, showHighlight: false });
        break;
    }
  };

  const getLayerIcon = (type: LayerItem["type"]) => {
    switch (type) {
      case "overlay":
        return <Type className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "background":
        return <Square className="h-4 w-4" />;
      case "highlight":
        return <Square className="h-4 w-4 fill-current" />;
    }
  };

  const canMoveUp = (layerId: string, index: number): boolean => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type !== "overlay") return false;
    const overlayLayers = layers.filter(l => l.type === "overlay");
    const overlayIndex = overlayLayers.findIndex(l => l.id === layerId);
    return overlayIndex > 0;
  };

  const canMoveDown = (layerId: string, index: number): boolean => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type !== "overlay") return false;
    const overlayLayers = layers.filter(l => l.type === "overlay");
    const overlayIndex = overlayLayers.findIndex(l => l.id === layerId);
    return overlayIndex < overlayLayers.length - 1;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Layers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {layers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No layers yet
          </p>
        ) : (
          layers.map((layer, index) => (
            <div
              key={layer.id}
              draggable={layer.type === "overlay"}
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={(e) => handleDragOver(e, layer.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (layer.type === "overlay") {
                  onLayerSelect(layer.id);
                } else {
                  onLayerSelect(null);
                }
              }}
              className={`
                flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all
                ${selectedLayerId === layer.id ? "bg-primary/10 ring-1 ring-primary" : "hover-elevate"}
                ${dragOverId === layer.id ? "border-2 border-primary border-dashed" : ""}
                ${draggedId === layer.id ? "opacity-50" : ""}
              `}
              data-testid={`layer-item-${layer.id}`}
            >
              {layer.type === "overlay" && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              )}
              {layer.type !== "overlay" && (
                <div className="w-4" />
              )}
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getLayerIcon(layer.type)}
                <span className="text-sm truncate">{layer.name}</span>
              </div>

              <div className="flex items-center gap-1">
                {layer.type === "highlight" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    data-testid={`layer-visibility-${layer.id}`}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                )}

                {layer.type === "overlay" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "up");
                      }}
                      disabled={!canMoveUp(layer.id, index)}
                      data-testid={`layer-up-${layer.id}`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "down");
                      }}
                      disabled={!canMoveDown(layer.id, index)}
                      data-testid={`layer-down-${layer.id}`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </>
                )}

                {layer.type !== "background" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    data-testid={`layer-delete-${layer.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        <div className="pt-3 border-t mt-3">
          <p className="text-xs text-muted-foreground">
            Drag text layers to reorder. Click to select.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
