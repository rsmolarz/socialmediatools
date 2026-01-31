import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";
import {
  Upload,
  Download,
  Loader2,
  Eraser,
  Image as ImageIcon,
  Droplet,
  RefreshCw,
  Check,
  Layers
} from "lucide-react";

interface BackgroundRemoverProps {
  onProcessed?: (dataUrl: string) => void;
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

const BLUR_PRESETS = [
  { name: "Light", value: 5 },
  { name: "Medium", value: 15 },
  { name: "Heavy", value: 30 },
  { name: "Extreme", value: 50 },
];

const BG_COLORS = [
  { name: "Transparent", value: "transparent" },
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#000000" },
  { name: "Blue", value: "#0066CC" },
  { name: "Green", value: "#22C55E" },
  { name: "Red", value: "#EF4444" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Gold", value: "#D4AF37" },
];

export function BackgroundRemover({ onProcessed }: BackgroundRemoverProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("remove");
  const [blurAmount, setBlurAmount] = useState(15);
  const [bgColor, setBgColor] = useState("transparent");
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setOriginalImage(url);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 500);

      const result = await removeBackground(originalImage);
      
      clearInterval(interval);
      setProgress(100);
      setProcessedImage(result);
      onProcessed?.(result);
      
      toast({ title: "Background Removed", description: "Your image has been processed successfully" });
    } catch (error) {
      console.error("Background removal failed:", error);
      toast({ title: "Processing Failed", description: "Could not remove background", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleBlurBackground = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = originalImage;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0);

      const blurredBg = canvas.toDataURL("image/png");
      
      const removedBgBlob = await imglyRemoveBackground(originalImage);
      const removedBgUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(removedBgBlob);
      });

      const fgImg = new Image();
      await new Promise<void>((resolve, reject) => {
        fgImg.onload = () => resolve();
        fgImg.onerror = reject;
        fgImg.src = removedBgUrl;
      });

      ctx.filter = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const blurredImg = new Image();
      await new Promise<void>((resolve, reject) => {
        blurredImg.onload = () => resolve();
        blurredImg.onerror = reject;
        blurredImg.src = blurredBg;
      });
      
      ctx.drawImage(blurredImg, 0, 0);
      ctx.drawImage(fgImg, 0, 0);

      const result = canvas.toDataURL("image/png");
      setProcessedImage(result);
      onProcessed?.(result);
      
      toast({ title: "Background Blurred", description: "Your image has been processed successfully" });
    } catch (error) {
      console.error("Background blur failed:", error);
      toast({ title: "Processing Failed", description: "Could not blur background", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplaceBackground = async () => {
    if (!originalImage || bgColor === "transparent") {
      if (bgColor === "transparent") {
        handleRemoveBackground();
      }
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const removedBgBlob = await imglyRemoveBackground(originalImage);
      const removedBgUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(removedBgBlob);
      });

      const fgImg = new Image();
      await new Promise<void>((resolve, reject) => {
        fgImg.onload = () => resolve();
        fgImg.onerror = reject;
        fgImg.src = removedBgUrl;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      canvas.width = fgImg.width;
      canvas.height = fgImg.height;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fgImg, 0, 0);

      const result = canvas.toDataURL("image/png");
      setProcessedImage(result);
      onProcessed?.(result);
      
      toast({ title: "Background Replaced", description: "Your image has been processed successfully" });
    } catch (error) {
      console.error("Background replace failed:", error);
      toast({ title: "Processing Failed", description: "Could not replace background", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!processedImage) return;
    
    const link = document.createElement("a");
    link.download = "processed-image.png";
    link.href = processedImage;
    link.click();
    
    toast({ title: "Image Exported" });
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setBlurAmount(15);
    setBgColor("transparent");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eraser className="w-5 h-5" />
                Background Remover
              </CardTitle>
              <CardDescription>Remove, blur, or replace image backgrounds</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button onClick={handleExport} disabled={!processedImage}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[300px]">
                {originalImage ? (
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-full max-h-[300px] rounded-lg shadow-lg object-contain"
                    data-testid="original-image"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Upload an image to start</p>
                  </div>
                )}
              </div>
              {originalImage && (
                <p className="text-center text-sm text-muted-foreground">Original Image</p>
              )}
            </div>

            <div className="space-y-4">
              <div 
                className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[300px]"
                style={{ 
                  backgroundImage: processedImage && bgColor === "transparent" 
                    ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                    : undefined,
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                }}
              >
                {processedImage ? (
                  <img
                    src={processedImage}
                    alt="Processed"
                    className="max-w-full max-h-[300px] rounded-lg shadow-lg object-contain"
                    data-testid="processed-image"
                  />
                ) : isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Processing... {progress}%</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Processed result will appear here</p>
                  </div>
                )}
              </div>
              {processedImage && (
                <p className="text-center text-sm text-muted-foreground">Processed Image</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="remove" className="flex-1">
                  <Eraser className="w-4 h-4 mr-2" />
                  Remove
                </TabsTrigger>
                <TabsTrigger value="blur" className="flex-1">
                  <Droplet className="w-4 h-4 mr-2" />
                  Blur
                </TabsTrigger>
                <TabsTrigger value="replace" className="flex-1">
                  <Layers className="w-4 h-4 mr-2" />
                  Replace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="remove" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Completely remove the background from your image, leaving only the subject with a transparent background.
                  </p>
                  <Button 
                    onClick={handleRemoveBackground} 
                    disabled={!originalImage || isProcessing}
                    className="w-full"
                    data-testid="button-remove-bg"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eraser className="w-4 h-4 mr-2" />
                    )}
                    Remove Background
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="blur" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Keep the subject sharp while blurring the background for a professional depth effect.
                  </p>
                  
                  <div>
                    <Label className="mb-2">Blur Amount: {blurAmount}px</Label>
                    <Slider
                      value={[blurAmount]}
                      onValueChange={([v]) => setBlurAmount(v)}
                      min={1}
                      max={50}
                    />
                  </div>

                  <div className="flex gap-2">
                    {BLUR_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant={blurAmount === preset.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBlurAmount(preset.value)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>

                  <Button 
                    onClick={handleBlurBackground} 
                    disabled={!originalImage || isProcessing}
                    className="w-full"
                    data-testid="button-blur-bg"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Droplet className="w-4 h-4 mr-2" />
                    )}
                    Blur Background
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="replace" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Replace the background with a solid color of your choice.
                  </p>

                  <div>
                    <Label className="mb-2">Background Color</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {BG_COLORS.map((color) => (
                        <Button
                          key={color.name}
                          variant={bgColor === color.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBgColor(color.value)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ 
                              backgroundColor: color.value === "transparent" ? "#fff" : color.value,
                              backgroundImage: color.value === "transparent" 
                                ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                                : undefined,
                              backgroundSize: "8px 8px"
                            }}
                          />
                          {color.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleReplaceBackground} 
                    disabled={!originalImage || isProcessing}
                    className="w-full"
                    data-testid="button-replace-bg"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Layers className="w-4 h-4 mr-2" />
                    )}
                    Replace Background
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {(originalImage || processedImage) && (
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
