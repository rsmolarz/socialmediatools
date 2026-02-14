import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Camera, X, User, Users, Loader2, Save, Trash2, ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  backgroundOpacity?: number;
  onHostPhotoChange: (photo: PhotoConfig) => void;
  onGuestPhotoChange: (photo: PhotoConfig) => void;
  onBackgroundOpacityChange?: (opacity: number) => void;
  onUseAsBackground?: (imageUrl: string) => void;
}

async function removeBackground(imageData: string): Promise<string> {
  const blob = await imglyRemoveBackground(imageData, {
    progress: (key, current, total) => {
      console.log(`Background removal progress: ${key} - ${current}/${total}`);
    },
  });
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface SavedPhotoItem {
  id: string;
  name: string;
  createdAt: string;
}

export function PhotoControls({
  hostPhoto,
  guestPhoto,
  backgroundOpacity = 50,
  onHostPhotoChange,
  onGuestPhotoChange,
  onBackgroundOpacityChange,
  onUseAsBackground,
}: PhotoControlsProps) {
  const hostInputRef = useRef<HTMLInputElement>(null);
  const guestInputRef = useRef<HTMLInputElement>(null);
  const [hostProcessing, setHostProcessing] = useState(false);
  const [guestProcessing, setGuestProcessing] = useState(false);
  const [savingHost, setSavingHost] = useState(false);
  const [savingGuest, setSavingGuest] = useState(false);
  const { toast } = useToast();

  const { data: savedPhotos = [], isLoading: loadingSaved } = useQuery<SavedPhotoItem[]>({
    queryKey: ["/api/saved-photos"],
  });

  const savePhotoMutation = useMutation({
    mutationFn: async ({ name, imageData }: { name: string; imageData: string }) => {
      const res = await apiRequest("POST", "/api/saved-photos", { name, imageData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-photos"] });
      toast({ title: "Photo saved", description: "Your photo has been saved to the library." });
    },
    onError: (error: Error) => {
      console.error("Save photo error:", error);
      toast({ title: "Save failed", description: "Could not save photo. The image may be too large.", variant: "destructive" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-photos"] });
      toast({ title: "Photo deleted" });
    },
  });

  const handleHostUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalUrl = event.target?.result as string;
        onHostPhotoChange({ ...hostPhoto, url: originalUrl });
        
        setHostProcessing(true);
        try {
          const processedUrl = await removeBackground(originalUrl);
          onHostPhotoChange({ ...hostPhoto, url: processedUrl });
          toast({ title: "Background removed", description: "Your photo has been processed successfully." });
        } catch (error) {
          console.error("Background removal failed:", error);
          toast({ title: "Background removal failed", description: "Using original photo.", variant: "destructive" });
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
        onGuestPhotoChange({ ...guestPhoto, url: originalUrl });
        
        setGuestProcessing(true);
        try {
          const processedUrl = await removeBackground(originalUrl);
          onGuestPhotoChange({ ...guestPhoto, url: processedUrl });
          toast({ title: "Background removed", description: "Guest photo has been processed successfully." });
        } catch (error) {
          console.error("Background removal failed:", error);
          toast({ title: "Background removal failed", description: "Using original photo.", variant: "destructive" });
        } finally {
          setGuestProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveHostPhoto = async () => {
    if (!hostPhoto.url) return;
    setSavingHost(true);
    try {
      const name = `Host Photo ${new Date().toLocaleDateString()}`;
      await savePhotoMutation.mutateAsync({ name, imageData: hostPhoto.url });
    } finally {
      setSavingHost(false);
    }
  };

  const saveGuestPhoto = async () => {
    if (!guestPhoto.url) return;
    setSavingGuest(true);
    try {
      const name = `Guest Photo ${new Date().toLocaleDateString()}`;
      await savePhotoMutation.mutateAsync({ name, imageData: guestPhoto.url });
    } finally {
      setSavingGuest(false);
    }
  };

  const loadSavedPhoto = (id: string, target: "host" | "guest") => {
    const imageUrl = `/api/saved-photos/${id}/image`;
    if (target === "host") {
      onHostPhotoChange({ ...hostPhoto, url: imageUrl });
    } else {
      onGuestPhotoChange({ ...guestPhoto, url: imageUrl });
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photo Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Opacity Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Background Opacity</Label>
              <span className="text-xs text-muted-foreground">{backgroundOpacity}%</span>
            </div>
            <Slider
              value={[backgroundOpacity]}
              onValueChange={([v]) => onBackgroundOpacityChange?.(v)}
              min={0}
              max={100}
              step={5}
              data-testid="slider-background-opacity"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
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
                  {!hostProcessing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveHostPhoto}
                      disabled={savingHost}
                      data-testid="button-save-host-photo"
                    >
                      {savingHost ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                  )}
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
                    min={-640}
                    max={640}
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
                    min={-400}
                    max={400}
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
                  {!guestProcessing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveGuestPhoto}
                      disabled={savingGuest}
                      data-testid="button-save-guest-photo"
                    >
                      {savingGuest ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                  )}
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
                    min={-640}
                    max={640}
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
                    min={-400}
                    max={400}
                    step={5}
                    data-testid="slider-guest-offsety"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Photos Library */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Saved Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSaved ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedPhotos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No saved photos yet. Upload and save a photo to see it here.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {savedPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={`/api/saved-photos/${photo.id}/image`}
                    alt={photo.name}
                    className="w-full aspect-square object-cover rounded-md border cursor-pointer"
                    data-testid={`saved-photo-${photo.id}`}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex flex-col items-center justify-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => loadSavedPhoto(photo.id, "host")}
                      data-testid={`load-saved-host-${photo.id}`}
                    >
                      Use as Host
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => loadSavedPhoto(photo.id, "guest")}
                      data-testid={`load-saved-guest-${photo.id}`}
                    >
                      Use as Guest
                    </Button>
                    {onUseAsBackground && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUseAsBackground(`/api/saved-photos/${photo.id}/image`)}
                        data-testid={`load-saved-bg-${photo.id}`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        BG
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deletePhotoMutation.mutate(photo.id)}
                      data-testid={`delete-saved-${photo.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">{photo.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
