import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Folder, 
  FolderPlus,
  MoreVertical,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Star,
  Heart,
  Briefcase,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Collection } from "@shared/schema";

const COLLECTION_ICONS = [
  { name: "Folder", icon: Folder, color: "bg-gray-500" },
  { name: "Star", icon: Star, color: "bg-yellow-500" },
  { name: "Heart", icon: Heart, color: "bg-red-500" },
  { name: "Work", icon: Briefcase, color: "bg-blue-500" },
  { name: "Ideas", icon: Lightbulb, color: "bg-amber-500" },
  { name: "Featured", icon: Sparkles, color: "bg-purple-500" },
];

const COLLECTION_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"
];

interface CollectionsPanelProps {
  userId?: string;
  onSelectCollection?: (collection: Collection) => void;
}

export function CollectionsPanel({ userId = "default", onSelectCollection }: CollectionsPanelProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: COLLECTION_COLORS[0],
    icon: "Folder",
    isPrivate: false,
  });

  const { data: collections = [], isLoading } = useQuery<Collection[]>({
    queryKey: [`/api/collections?userId=${userId}`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/collections", { ...data, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collections?userId=${userId}`] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Collection created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create collection", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/collections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collections?userId=${userId}`] });
      setEditingCollection(null);
      resetForm();
      toast({ title: "Collection updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collections?userId=${userId}`] });
      toast({ title: "Collection deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: COLLECTION_COLORS[0],
      icon: "Folder",
      isPrivate: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingCollection) return;
    updateMutation.mutate({ id: editingCollection.id, data: formData });
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || "",
      color: collection.color || COLLECTION_COLORS[0],
      icon: collection.icon || "Folder",
      isPrivate: collection.isPrivate || false,
    });
  };

  const getIconComponent = (iconName: string) => {
    const found = COLLECTION_ICONS.find(i => i.name === iconName);
    return found?.icon || Folder;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Collections
              </CardTitle>
              <CardDescription>Organize your thumbnails into folders</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-collection">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No collections yet</p>
              <p className="text-sm">Create a collection to organize your thumbnails</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection) => {
                const IconComponent = getIconComponent(collection.icon || "Folder");
                return (
                  <Card
                    key={collection.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => onSelectCollection?.(collection)}
                    data-testid={`collection-${collection.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: collection.color || COLLECTION_COLORS[0] }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{collection.name}</h4>
                              {collection.isPrivate && (
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            {collection.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {collection.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(collection); }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(collection.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog || !!editingCollection} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingCollection(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Edit Collection" : "Create Collection"}</DialogTitle>
            <DialogDescription>
              {editingCollection ? "Update your collection details" : "Create a new folder to organize your thumbnails"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Collection"
                data-testid="input-collection-name"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's this collection for?"
                data-testid="input-collection-description"
              />
            </div>
            <div>
              <Label className="mb-2 block">Icon</Label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_ICONS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      formData.icon === item.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setFormData({ ...formData, icon: item.name })}
                    data-testid={`icon-${item.name.toLowerCase()}`}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      formData.color === color ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    data-testid={`color-${color.replace("#", "")}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={formData.isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                data-testid="toggle-private"
              >
                {formData.isPrivate ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Private
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Public
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingCollection(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingCollection ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-collection"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingCollection ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
