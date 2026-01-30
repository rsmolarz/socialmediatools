import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import type { ThumbnailConfig, TextOverlay } from "@shared/schema";

interface ThumbnailCanvasProps {
  config: ThumbnailConfig;
  onTextSelect?: (id: string | null) => void;
  selectedTextId?: string | null;
  onTextMove?: (id: string, x: number, y: number) => void;
}

export interface ThumbnailCanvasRef {
  downloadImage: () => void;
  getDataUrl: () => string | null;
}

export const ThumbnailCanvas = forwardRef<ThumbnailCanvasRef, ThumbnailCanvasProps>(
  ({ config, onTextSelect, selectedTextId, onTextMove }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragTextId = useRef<string | null>(null);

    const parseGradient = (gradientStr: string, ctx: CanvasRenderingContext2D): CanvasGradient | null => {
      // Parse linear-gradient(angle, color1, color2)
      const linearMatch = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
      if (linearMatch) {
        const angle = parseInt(linearMatch[1]);
        const colorStops = linearMatch[2].split(/,\s*(?=[#\w])/);
        
        // Convert angle to start/end points
        const angleRad = (angle - 90) * (Math.PI / 180);
        const centerX = config.width / 2;
        const centerY = config.height / 2;
        const length = Math.sqrt(config.width * config.width + config.height * config.height) / 2;
        
        const x1 = centerX - Math.cos(angleRad) * length;
        const y1 = centerY - Math.sin(angleRad) * length;
        const x2 = centerX + Math.cos(angleRad) * length;
        const y2 = centerY + Math.sin(angleRad) * length;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        
        colorStops.forEach((stop, index) => {
          const parts = stop.trim().split(/\s+/);
          const color = parts[0];
          const position = parts[1] ? parseInt(parts[1]) / 100 : index / (colorStops.length - 1);
          try {
            gradient.addColorStop(position, color);
          } catch (e) {
            // Invalid color, skip
          }
        });
        
        return gradient;
      }
      return null;
    };

    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, config.width, config.height);

      // Draw background
      if (config.backgroundImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, config.width, config.height);
          drawOverlays(ctx);
        };
        img.onerror = () => {
          // Fallback to background color if image fails
          drawBackgroundColor(ctx);
          drawOverlays(ctx);
        };
        img.src = config.backgroundImage;
      } else {
        drawBackgroundColor(ctx);
        drawOverlays(ctx);
      }
    };

    const drawBackgroundColor = (ctx: CanvasRenderingContext2D) => {
      if (config.backgroundColor.includes("gradient")) {
        const gradient = parseGradient(config.backgroundColor, ctx);
        if (gradient) {
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = "#1a1a2e"; // Fallback
        }
      } else {
        ctx.fillStyle = config.backgroundColor;
      }
      ctx.fillRect(0, 0, config.width, config.height);
    };

    const drawOverlays = (ctx: CanvasRenderingContext2D) => {
      config.overlays.forEach((overlay) => {
        drawTextOverlay(ctx, overlay, overlay.id === selectedTextId);
      });
    };

    const drawTextOverlay = (ctx: CanvasRenderingContext2D, overlay: TextOverlay, isSelected: boolean) => {
      ctx.save();

      const fontWeight = overlay.fontWeight === "normal" ? "400" : overlay.fontWeight;
      ctx.font = `${fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.textAlign = overlay.textAlign as CanvasTextAlign;
      ctx.textBaseline = "top";

      // Calculate text position based on alignment
      let x = overlay.x;
      if (overlay.textAlign === "center") {
        x = overlay.x;
      } else if (overlay.textAlign === "right") {
        x = overlay.x;
      }

      // Draw text shadow if enabled
      if (overlay.shadow) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
      }

      // Draw outline if enabled
      if (overlay.outline) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = overlay.fontSize / 15;
        ctx.lineJoin = "round";
        ctx.strokeText(overlay.text, x, overlay.y);
      }

      // Draw main text
      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, x, overlay.y);

      // Draw selection indicator
      if (isSelected) {
        const metrics = ctx.measureText(overlay.text);
        const textWidth = metrics.width;
        const textHeight = overlay.fontSize;
        
        let boxX = x;
        if (overlay.textAlign === "center") {
          boxX = x - textWidth / 2;
        } else if (overlay.textAlign === "right") {
          boxX = x - textWidth;
        }

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "hsl(262, 83%, 58%)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(boxX - 8, overlay.y - 8, textWidth + 16, textHeight + 16);
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    const getCanvasCoordinates = (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = config.width / rect.width;
      const scaleY = config.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const findTextAtPosition = (x: number, y: number): TextOverlay | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Check overlays in reverse order (top-most first)
      for (let i = config.overlays.length - 1; i >= 0; i--) {
        const overlay = config.overlays[i];
        const fontWeight = overlay.fontWeight === "normal" ? "400" : overlay.fontWeight;
        ctx.font = `${fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
        
        const metrics = ctx.measureText(overlay.text);
        const textWidth = metrics.width;
        const textHeight = overlay.fontSize;

        let boxX = overlay.x;
        if (overlay.textAlign === "center") {
          boxX = overlay.x - textWidth / 2;
        } else if (overlay.textAlign === "right") {
          boxX = overlay.x - textWidth;
        }

        if (
          x >= boxX - 8 &&
          x <= boxX + textWidth + 8 &&
          y >= overlay.y - 8 &&
          y <= overlay.y + textHeight + 8
        ) {
          return overlay;
        }
      }

      return null;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      const coords = getCanvasCoordinates(e);
      const text = findTextAtPosition(coords.x, coords.y);

      if (text) {
        onTextSelect?.(text.id);
        isDragging.current = true;
        dragStartPos.current = { x: coords.x - text.x, y: coords.y - text.y };
        dragTextId.current = text.id;
      } else {
        onTextSelect?.(null);
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging.current || !dragTextId.current) return;

      const coords = getCanvasCoordinates(e);
      const newX = coords.x - dragStartPos.current.x;
      const newY = coords.y - dragStartPos.current.y;

      onTextMove?.(dragTextId.current, newX, newY);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      dragTextId.current = null;
    };

    useImperativeHandle(ref, () => ({
      downloadImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a temporary canvas without selection indicators
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = config.width;
        tempCanvas.height = config.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;

        // Helper function for download background
        const drawDownloadBackground = () => {
          if (config.backgroundColor.includes("gradient")) {
            const gradient = parseGradient(config.backgroundColor, tempCtx);
            if (gradient) {
              tempCtx.fillStyle = gradient;
            } else {
              tempCtx.fillStyle = "#1a1a2e";
            }
          } else {
            tempCtx.fillStyle = config.backgroundColor;
          }
          tempCtx.fillRect(0, 0, config.width, config.height);
        };

        // Draw background
        if (config.backgroundImage) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            tempCtx.drawImage(img, 0, 0, config.width, config.height);
            config.overlays.forEach((overlay) => {
              drawTextOverlay(tempCtx, overlay, false);
            });
            downloadFromCanvas(tempCanvas);
          };
          img.onerror = () => {
            drawDownloadBackground();
            config.overlays.forEach((overlay) => {
              drawTextOverlay(tempCtx, overlay, false);
            });
            downloadFromCanvas(tempCanvas);
          };
          img.src = config.backgroundImage;
        } else {
          drawDownloadBackground();
          config.overlays.forEach((overlay) => {
            drawTextOverlay(tempCtx, overlay, false);
          });
          downloadFromCanvas(tempCanvas);
        }
      },
      getDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    const downloadFromCanvas = (canvas: HTMLCanvasElement) => {
      const link = document.createElement("a");
      link.download = "thumbnail.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    useEffect(() => {
      drawCanvas();
    }, [config, selectedTextId]);

    return (
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border"
        data-testid="thumbnail-canvas-container"
      >
        <canvas
          ref={canvasRef}
          width={config.width}
          height={config.height}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-testid="thumbnail-canvas"
        />
      </div>
    );
  }
);

ThumbnailCanvas.displayName = "ThumbnailCanvas";
