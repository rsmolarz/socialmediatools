import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FlaskConical,
  Plus,
  Copy,
  Trophy,
  BarChart3,
  Play,
  Pause,
  Trash2,
  Eye,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Thumbnail, ThumbnailConfig } from "@shared/schema";

interface ABTestVariant {
  id: string;
  name: string;
  config: ThumbnailConfig;
}

interface ABTest {
  id: number;
  name: string;
  description: string | null;
  originalThumbnailId: string;
  variants: ABTestVariant[];
  status: string;
  winner: string | null;
  createdAt: string;
}

export function ABTestingPanel() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [selectedThumbnailId, setSelectedThumbnailId] = useState<string>("");
  const [variants, setVariants] = useState<ABTestVariant[]>([]);

  const { data: thumbnails = [] } = useQuery<Thumbnail[]>({
    queryKey: ["/api/thumbnails"],
  });

  const { data: abTests = [], isLoading } = useQuery<ABTest[]>({
    queryKey: ["/api/ab-tests"],
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; originalThumbnailId: string; variants: ABTestVariant[] }) => {
      return apiRequest("/api/ab-tests", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/ab-tests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
    },
  });

  const setWinnerMutation = useMutation({
    mutationFn: async ({ id, winner }: { id: number; winner: string }) => {
      return apiRequest(`/api/ab-tests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ winner, status: "completed" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/ab-tests/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
    },
  });

  const resetForm = () => {
    setTestName("");
    setTestDescription("");
    setSelectedThumbnailId("");
    setVariants([]);
  };

  const handleSelectThumbnail = (thumbnail: Thumbnail) => {
    setSelectedThumbnailId(thumbnail.id);
    const baseVariant: ABTestVariant = {
      id: `variant-a-${Date.now()}`,
      name: "Variant A (Original)",
      config: thumbnail.config,
    };
    const variantB: ABTestVariant = {
      id: `variant-b-${Date.now()}`,
      name: "Variant B",
      config: { ...thumbnail.config },
    };
    setVariants([baseVariant, variantB]);
  };

  const addVariant = () => {
    if (variants.length >= 5) return;
    const letters = ["C", "D", "E"];
    const letterIndex = variants.length - 2;
    const newVariant: ABTestVariant = {
      id: `variant-${letters[letterIndex]?.toLowerCase() || "x"}-${Date.now()}`,
      name: `Variant ${letters[letterIndex] || "X"}`,
      config: { ...variants[0]?.config } as ThumbnailConfig,
    };
    setVariants([...variants, newVariant]);
  };

  const updateVariantName = (id: string, name: string) => {
    setVariants(variants.map(v => v.id === id ? { ...v, name } : v));
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) return;
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleCreateTest = () => {
    if (!testName || !selectedThumbnailId || variants.length < 2) return;
    createTestMutation.mutate({
      name: testName,
      description: testDescription,
      originalThumbnailId: selectedThumbnailId,
      variants,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            A/B Testing
          </h2>
          <p className="text-muted-foreground">
            Test different thumbnail variants to find what works best
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-ab-test">
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Thumbnail Color Test"
                  data-testid="input-test-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="What are you testing?"
                  data-testid="input-test-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Select Base Thumbnail</Label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {thumbnails.map((thumb) => (
                    <div
                      key={thumb.id}
                      onClick={() => handleSelectThumbnail(thumb)}
                      className={`border rounded-md p-2 cursor-pointer transition-all ${
                        selectedThumbnailId === thumb.id
                          ? "ring-2 ring-primary bg-primary/10"
                          : "hover-elevate"
                      }`}
                      data-testid={`thumb-select-${thumb.id}`}
                    >
                      <p className="text-xs truncate">{thumb.title}</p>
                    </div>
                  ))}
                  {thumbnails.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-3 text-center py-4">
                      No saved thumbnails yet. Save a thumbnail first.
                    </p>
                  )}
                </div>
              </div>

              {variants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Variants ({variants.length})</Label>
                    {variants.length < 5 && (
                      <Button variant="outline" size="sm" onClick={addVariant}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Variant
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        className="flex items-center gap-2 p-2 border rounded-md"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariantName(variant.id, e.target.value)}
                          className="flex-1"
                          data-testid={`input-variant-name-${index}`}
                        />
                        {index > 0 && variants.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(variant.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreateTest}
                disabled={!testName || variants.length < 2 || createTestMutation.isPending}
                className="w-full"
                data-testid="button-submit-test"
              >
                {createTestMutation.isPending ? "Creating..." : "Create A/B Test"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
      ) : abTests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No A/B Tests Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first A/B test to compare thumbnail variants
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {abTests.map((test) => (
            <Card key={test.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    {test.description && (
                      <CardDescription>{test.description}</CardDescription>
                    )}
                  </div>
                  <Badge className={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {test.variants.length} variants
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {test.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                          test.winner === variant.id
                            ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                            : "bg-muted"
                        }`}
                      >
                        {test.winner === variant.id && (
                          <Trophy className="h-3 w-3" />
                        )}
                        {variant.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {test.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: test.id, status: "active" })}
                      data-testid={`button-start-test-${test.id}`}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {test.status === "active" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: test.id, status: "draft" })}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Trophy className="h-4 w-4 mr-1" />
                            Pick Winner
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Select Winning Variant</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 py-4">
                            {test.variants.map((variant) => (
                              <Button
                                key={variant.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setWinnerMutation.mutate({ id: test.id, winner: variant.id })}
                              >
                                <Trophy className="h-4 w-4 mr-2" />
                                {variant.name}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteTestMutation.mutate(test.id)}
                    data-testid={`button-delete-test-${test.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
