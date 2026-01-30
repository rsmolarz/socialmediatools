import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Camera, X, User, Users, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

export interface PhotoConfig {
  url: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface PhotoControlsProps {
  hostPhoto: PhotoConfig;
  guestPhoto: PhotoConfig;
  onHostPhotoChange: (photo: PhotoConfig) => void;
  onGuestPhotoChange: (photo: PhotoConfig) => void;
}

async function removeBackground(imageData: string): Promise<string> {
  // Use client-side background removal library
  const blob = await imglyRemoveBackground(imageData, {
    progress: (key, current, total) => {
      console.log(`Background removal progress: ${key} - ${current}/${total}`);
    },
  });
  
  // Convert blob to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function PhotoControls({
  hostPhoto,
  guestPhoto,
  onHostPhotoChange,
  onGuestPhotoChange,
}: PhotoControlsProps) {
  const hostInputRef = useRef<HTMLInputElement>(null);
  const guestInputRef = useRef<HTMLInputElement>(null);
  const [hostProcessing, setHostProcessing] = useState(false);
  const [guestProcessing, setGuestProcessing] = useState(false);
  const { toast } = useToast();

  const handleHostUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalUrl = event.target?.result as string;
        
        // Set the original photo first
        onHostPhotoChange({
          ...hostPhoto,
          url: originalUrl,
        });
        
        // Then process for background removal
        setHostProcessing(true);
        try {
          const processedUrl = await removeBackground(originalUrl);
          onHostPhotoChange({
            ...hostPhoto,
            url: processedUrl,
          });
          toast({
            title: "Background removed",
            description: "Your photo has been processed successfully.",
          });
        } catch (error) {
          console.error("Background removal failed:", error);
          toast({
            title: "Background removal failed",
            description: "Using original photo. You can try again later.",
            variant: "destructive",
          });
        } finally {
          setHostProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalUrl = event.target?.result as string;
        
        // Set the original photo first
        onGuestPhotoChange({
          ...guestPhoto,
          url: originalUrl,
        });
        
        // Then process for background removal
        setGuestProcessing(true);
        try {
          const processedUrl = await removeBackground(originalUrl);
          onGuestPhotoChange({
            ...guestPhoto,
            url: processedUrl,
          });
          toast({
            title: "Background removed",
            description: "Guest photo has been processed successfully.",
          });
        } catch (error) {
          console.error("Background removal failed:", error);
          toast({
            title: "Background removal failed",
            description: "Using original photo. You can try again later.",
            variant: "destructive",
          });
        } finally {
          setGuestProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearHostPhoto = () => {
    onHostPhotoChange({ url: null, scale: 100, offsetX: 0, offsetY: 0 });
    if (hostInputRef.current) hostInputRef.current.value = "";
  };

  const clearGuestPhoto = () => {
    onGuestPhotoChange({ url: null, scale: 100, offsetX: 0, offsetY: 0 });
    if (guestInputRef.current) guestInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Photo Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <User className="h-3 w-3" />
            Your Photo (Host)
          </Label>
          <input
            ref={hostInputRef}
            type="file"
            accept="image/*"
            onChange={handleHostUpload}
            className="hidden"
            data-testid="input-host-photo"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => hostInputRef.current?.click()}
              disabled={hostProcessing}
              data-testid="button-upload-host"
            >
              {hostProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {hostProcessing ? "Removing background..." : "Upload Your Photo"}
            </Button>
            {hostPhoto.url && (
              <Button
                variant="destructive"
                size="icon"
                onClick={clearHostPhoto}
                disabled={hostProcessing}
                data-testid="button-clear-host"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {hostPhoto.url && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img
                    src={hostPhoto.url}
                    alt="Host"
                    className={`w-12 h-12 object-cover rounded-lg border-2 border-primary ${hostProcessing ? "opacity-50" : ""}`}
                  />
                  {hostProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {hostProcessing ? "Processing..." : "Photo uploaded"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Scale</Label>
                  <span className="text-xs text-muted-foreground">{hostPhoto.scale}%</span>
                </div>
                <Slider
                  value={[hostPhoto.scale]}
                  onValueChange={([v]) => onHostPhotoChange({ ...hostPhoto, scale: v })}
                  min={50}
                  max={200}
                  step={5}
                  data-testid="slider-host-scale"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Offset X</Label>
                  <span className="text-xs text-muted-foreground">{hostPhoto.offsetX}</span>
                </div>
                <Slider
                  value={[hostPhoto.offsetX]}
                  onValueChange={([v]) => onHostPhotoChange({ ...hostPhoto, offsetX: v })}
                  min={-200}
                  max={200}
                  step={5}
                  data-testid="slider-host-offsetx"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Offset Y</Label>
                  <span className="text-xs text-muted-foreground">{hostPhoto.offsetY}</span>
                </div>
                <Slider
                  value={[hostPhoto.offsetY]}
                  onValueChange={([v]) => onHostPhotoChange({ ...hostPhoto, offsetY: v })}
                  min={-200}
                  max={200}
                  step={5}
                  data-testid="slider-host-offsety"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Users className="h-3 w-3" />
            Guest Photo
          </Label>
          <input
            ref={guestInputRef}
            type="file"
            accept="image/*"
            onChange={handleGuestUpload}
            className="hidden"
            data-testid="input-guest-photo"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => guestInputRef.current?.click()}
              disabled={guestProcessing}
              data-testid="button-upload-guest"
            >
              {guestProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {guestProcessing ? "Removing background..." : "Upload Guest Photo"}
            </Button>
            {guestPhoto.url && (
              <Button
                variant="destructive"
                size="icon"
                onClick={clearGuestPhoto}
                disabled={guestProcessing}
                data-testid="button-clear-guest"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {guestPhoto.url && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img
                    src={guestPhoto.url}
                    alt="Guest"
                    className={`w-12 h-12 object-cover rounded-lg border-2 border-cyan-500 ${guestProcessing ? "opacity-50" : ""}`}
                  />
                  {guestProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {guestProcessing ? "Processing..." : "Photo uploaded"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Scale</Label>
                  <span className="text-xs text-muted-foreground">{guestPhoto.scale}%</span>
                </div>
                <Slider
                  value={[guestPhoto.scale]}
                  onValueChange={([v]) => onGuestPhotoChange({ ...guestPhoto, scale: v })}
                  min={50}
                  max={200}
                  step={5}
                  data-testid="slider-guest-scale"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Offset X</Label>
                  <span className="text-xs text-muted-foreground">{guestPhoto.offsetX}</span>
                </div>
                <Slider
                  value={[guestPhoto.offsetX]}
                  onValueChange={([v]) => onGuestPhotoChange({ ...guestPhoto, offsetX: v })}
                  min={-200}
                  max={200}
                  step={5}
                  data-testid="slider-guest-offsetx"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Offset Y</Label>
                  <span className="text-xs text-muted-foreground">{guestPhoto.offsetY}</span>
                </div>
                <Slider
                  value={[guestPhoto.offsetY]}
                  onValueChange={([v]) => onGuestPhotoChange({ ...guestPhoto, offsetY: v })}
                  min={-200}
                  max={200}
                  step={5}
                  data-testid="slider-guest-offsety"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
