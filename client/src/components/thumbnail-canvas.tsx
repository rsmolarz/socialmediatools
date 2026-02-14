import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import type { ThumbnailConfig, TextOverlay, TextLine, BackgroundEffects, PhotoConfig } from "@shared/schema";

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

const ACCENT_COLORS = {
  orange: "#f97316",
  blue: "#22d3ee", 
  purple: "#9333ea",
};

const TINT_COLORS = {
  none: null,
  purple: "rgba(147, 51, 234, 0.3)",
  blue: "rgba(34, 211, 238, 0.3)",
  orange: "rgba(249, 115, 22, 0.3)",
};

export const ThumbnailCanvas = forwardRef<ThumbnailCanvasRef, ThumbnailCanvasProps>(
  ({ config, onTextSelect, selectedTextId, onTextMove }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const dragTextId = useRef<string | null>(null);
    
    // Cache for loaded images with URL tracking to prevent stale callbacks
    const hostImageRef = useRef<HTMLImageElement | null>(null);
    const guestImageRef = useRef<HTMLImageElement | null>(null);
    const hostUrlRef = useRef<string | null>(null);
    const guestUrlRef = useRef<string | null>(null);
    const [imagesLoaded, setImagesLoaded] = useState(0);

    // Preload and cache host photo with URL tracking
    useEffect(() => {
      const url = config.hostPhoto?.url || null;
      hostUrlRef.current = url;
      
      if (url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Only update if URL hasn't changed since we started loading
          if (hostUrlRef.current === url) {
            hostImageRef.current = img;
            setImagesLoaded((n) => n + 1);
          }
        };
        img.src = url;
      } else {
        hostImageRef.current = null;
      }
    }, [config.hostPhoto?.url]);

    // Preload and cache guest photo with URL tracking
    useEffect(() => {
      const url = config.guestPhoto?.url || null;
      guestUrlRef.current = url;
      
      if (url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Only update if URL hasn't changed since we started loading
          if (guestUrlRef.current === url) {
            guestImageRef.current = img;
            setImagesLoaded((n) => n + 1);
          }
        };
        img.src = url;
      } else {
        guestImageRef.current = null;
      }
    }, [config.guestPhoto?.url]);

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
        // First fill with black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, config.width, config.height);
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Apply background opacity
          const bgOpacity = (config.backgroundOpacity ?? 50) / 100;
          ctx.globalAlpha = bgOpacity;
          ctx.drawImage(img, 0, 0, config.width, config.height);
          ctx.globalAlpha = 1.0; // Reset alpha
          drawBackgroundEffects(ctx);
          drawOverlays(ctx);
        };
        img.onerror = () => {
          // Fallback to background color if image fails
          drawBackgroundColor(ctx);
          drawBackgroundEffects(ctx);
          drawOverlays(ctx);
        };
        img.src = config.backgroundImage;
      } else {
        drawBackgroundColor(ctx);
        drawBackgroundEffects(ctx);
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

    const drawBackgroundEffects = (ctx: CanvasRenderingContext2D) => {
      const effects = config.backgroundEffects;
      if (!effects) return;

      // Dark overlay
      if (effects.darkOverlay > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${effects.darkOverlay / 100})`;
        ctx.fillRect(0, 0, config.width, config.height);
      }

      // Color tint
      const tintColor = TINT_COLORS[effects.colorTint];
      if (tintColor) {
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, config.width, config.height);
      }

      // Vignette effect
      if (effects.vignetteIntensity > 0) {
        const centerX = config.width / 2;
        const centerY = config.height / 2;
        const radius = Math.max(config.width, config.height) * 0.8;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(1, `rgba(0, 0, 0, ${effects.vignetteIntensity / 100})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, config.height);
      }
    };

    const drawTextLines = (ctx: CanvasRenderingContext2D) => {
      const lines = config.textLines;
      if (!lines || lines.length === 0) return;

      const accentColor = ACCENT_COLORS[config.accentColor || "orange"];
      const fontSize = 80;
      const lineHeight = fontSize * 1.4;
      const padding = 12;

      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "middle";

      // Calculate total height for centering
      const totalHeight = lines.length * lineHeight;
      let startY = (config.height - totalHeight) / 2 + lineHeight / 2;

      // Normalize legacy layout values and adjust based on layout
      let textAlign: CanvasTextAlign = "center";
      let startX = config.width / 2;
      const normalizedLayout = config.layout === "left-aligned" ? "soloLeft" 
        : config.layout === "stacked" ? "centered" 
        : config.layout;

      if (normalizedLayout === "centered") {
        textAlign = "center";
        startX = config.width / 2;
      } else if (normalizedLayout === "twoFace") {
        textAlign = "center";
        startX = config.width / 2;
      } else if (normalizedLayout === "soloLeft") {
        textAlign = "left";
        startX = config.width * 0.55;
      } else if (normalizedLayout === "soloRight") {
        textAlign = "right";
        startX = config.width * 0.45;
      }

      ctx.textAlign = textAlign;

      lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
        const metrics = ctx.measureText(line.text);
        const textWidth = metrics.width;

        // Draw highlight background if enabled
        if (line.highlight) {
          let boxX = startX;
          if (textAlign === "center") {
            boxX = startX - textWidth / 2 - padding;
          } else if (textAlign === "left") {
            boxX = startX - padding;
          } else if (textAlign === "right") {
            boxX = startX - textWidth - padding;
          }

          // Apply element opacity to highlight background
          const opacity = (config.elementOpacity ?? 70) / 100;
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.fillStyle = accentColor;
          ctx.fillRect(boxX, y - fontSize / 2 - padding / 2, textWidth + padding * 2, fontSize + padding);
          ctx.restore();
        }

        // Draw text
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(line.text, startX, y);
        ctx.shadowColor = "transparent";
      });
    };

    const drawPhotos = (ctx: CanvasRenderingContext2D) => {
      const normalizedLayout = config.layout === "left-aligned" ? "soloLeft" 
        : config.layout === "stacked" ? "centered" 
        : config.layout;

      const hostPhoto = config.hostPhoto;
      const guestPhoto = config.guestPhoto;

      // Draw photo using cached image with proper aspect ratio (cover style)
      const drawPhoto = (photo: PhotoConfig | undefined, cachedImg: HTMLImageElement | null, side: "left" | "right") => {
        if (!photo?.url || !cachedImg) return;

        const scale = (photo.scale || 100) / 100;
        const targetWidth = config.width * 0.3 * scale;
        const targetHeight = config.height * 0.8 * scale;
        
        let x = side === "left" 
          ? config.width * 0.08 + (photo.offsetX || 0)
          : config.width * 0.92 - targetWidth + (photo.offsetX || 0);
        let y = config.height - targetHeight + (photo.offsetY || 0);

        ctx.save();
        
        // Create rounded top rectangle clip for photo
        const radius = targetWidth * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y + targetHeight);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.arcTo(x + targetWidth, y, x + targetWidth, y + radius, radius);
        ctx.lineTo(x + targetWidth, y + targetHeight);
        ctx.closePath();
        ctx.clip();
        
        // Calculate "cover" style dimensions to maintain aspect ratio
        const imgWidth = cachedImg.naturalWidth;
        const imgHeight = cachedImg.naturalHeight;
        const imgAspect = imgWidth / imgHeight;
        const targetAspect = targetWidth / targetHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > targetAspect) {
          // Image is wider - fit by height, crop sides
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgAspect;
          drawX = x - (drawWidth - targetWidth) / 2;
          drawY = y;
        } else {
          // Image is taller - fit by width, crop top/bottom
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgAspect;
          drawX = x;
          drawY = y - (drawHeight - targetHeight) / 2;
        }
        
        ctx.drawImage(cachedImg, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      };

      if (normalizedLayout === "twoFace") {
        drawPhoto(hostPhoto, hostImageRef.current, "left");
        drawPhoto(guestPhoto, guestImageRef.current, "right");
      } else if (normalizedLayout === "soloLeft") {
        drawPhoto(hostPhoto, hostImageRef.current, "right");
      } else if (normalizedLayout === "soloRight") {
        drawPhoto(hostPhoto, hostImageRef.current, "left");
      } else if (normalizedLayout === "centered") {
        // In centered layout, draw host photo centered at bottom
        if (hostPhoto?.url && hostImageRef.current) {
          const scale = (hostPhoto.scale || 100) / 100;
          const targetWidth = config.width * 0.35 * scale;
          const targetHeight = config.height * 0.85 * scale;
          const x = (config.width - targetWidth) / 2 + (hostPhoto.offsetX || 0);
          const y = config.height - targetHeight + (hostPhoto.offsetY || 0);

          ctx.save();
          ctx.drawImage(hostImageRef.current, x, y, targetWidth, targetHeight);
          ctx.restore();
        }
        // Draw guest photo on the right side if present
        if (guestPhoto?.url && guestImageRef.current) {
          const scale = (guestPhoto.scale || 100) / 100;
          const targetWidth = config.width * 0.3 * scale;
          const targetHeight = config.height * 0.8 * scale;
          const x = config.width * 0.65 + (guestPhoto.offsetX || 0);
          const y = config.height - targetHeight + (guestPhoto.offsetY || 0);

          ctx.save();
          ctx.drawImage(guestImageRef.current, x, y, targetWidth, targetHeight);
          ctx.restore();
        }
      }
    };

    const drawOverlays = (ctx: CanvasRenderingContext2D) => {
      // Draw photos first (behind text)
      drawPhotos(ctx);
      
      // Draw text lines (new format)
      drawTextLines(ctx);
      
      // Then draw legacy overlays
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
          // First fill with black background
          tempCtx.fillStyle = "#000000";
          tempCtx.fillRect(0, 0, config.width, config.height);
          
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            // Apply background opacity
            const bgOpacity = (config.backgroundOpacity ?? 50) / 100;
            tempCtx.globalAlpha = bgOpacity;
            tempCtx.drawImage(img, 0, 0, config.width, config.height);
            tempCtx.globalAlpha = 1.0; // Reset alpha
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
    }, [config, selectedTextId, imagesLoaded]);

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
