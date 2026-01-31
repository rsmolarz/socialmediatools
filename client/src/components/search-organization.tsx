import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Folder,
  FolderPlus,
  Tag,
  Plus,
  X,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit2,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Thumbnail, ThumbnailFolder, ThumbnailTag } from "@shared/schema";

const FOLDER_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6",
];

export function SearchOrganization() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[4]);
  const [newTag, setNewTag] = useState("");

  const { data: thumbnails = [] } = useQuery<Thumbnail[]>({
    queryKey: ["/api/thumbnails"],
  });

  const { data: folders = [] } = useQuery<ThumbnailFolder[]>({
    queryKey: ["/api/thumbnail-folders"],
  });

  const { data: allTags = [] } = useQuery<ThumbnailTag[]>({
    queryKey: ["/api/thumbnail-tags"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest("/api/thumbnail-folders", {
        method: "POST",
        body: JSON.stringify({ ...data, userId: "default" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnail-folders"] });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/thumbnail-folders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnail-folders"] });
      if (selectedFolder) setSelectedFolder(null);
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (data: { thumbnailId: string; tag: string }) => {
      return apiRequest("/api/thumbnail-tags", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnail-tags"] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/thumbnail-tags/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnail-tags"] });
    },
  });

  const uniqueTags = [...new Set(allTags.map(t => t.tag))];

  const filteredThumbnails = thumbnails
    .filter(thumb => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!thumb.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    })
    .filter(thumb => {
      if (selectedTags.length > 0) {
        const thumbTags = allTags.filter(t => t.thumbnailId === thumb.id).map(t => t.tag);
        if (!selectedTags.some(tag => thumbTags.includes(tag))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc"
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
    });

  const handleAddTag = (thumbnailId: string) => {
    if (!newTag.trim()) return;
    addTagMutation.mutate({ thumbnailId, tag: newTag.trim() });
    setNewTag("");
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Search & Organization
          </h2>
          <p className="text-muted-foreground">
            Find and organize your thumbnails with full-text search, tags, and folders
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Folders
                </CardTitle>
                <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Folder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Folder Name</Label>
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="My Folder"
                          data-testid="input-folder-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 flex-wrap">
                          {FOLDER_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewFolderColor(color)}
                              className={`w-8 h-8 rounded-full ${
                                newFolderColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                              }`}
                              style={{ backgroundColor: color }}
                              data-testid={`color-${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => createFolderMutation.mutate({ name: newFolderName, color: newFolderColor })}
                        disabled={!newFolderName || createFolderMutation.isPending}
                        className="w-full"
                        data-testid="button-create-folder"
                      >
                        Create Folder
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-all ${
                  selectedFolder === null ? "bg-primary/10 text-primary" : "hover-elevate"
                }`}
                data-testid="folder-all"
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1">All Thumbnails</span>
                <Badge variant="secondary">{thumbnails.length}</Badge>
              </button>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`flex items-center gap-2 p-2 rounded-md transition-all ${
                    selectedFolder === folder.id ? "bg-primary/10" : "hover-elevate"
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                    data-testid={`folder-${folder.id}`}
                  >
                    <Folder className="h-4 w-4" style={{ color: folder.color || "#6B7280" }} />
                    <span className="flex-1 truncate">{folder.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => deleteFolderMutation.mutate(folder.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uniqueTags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No tags yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTagFilter(tag)}
                      data-testid={`tag-filter-${tag}`}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search thumbnails..."
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    {sortOrder === "desc" ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("desc"); }}>
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("asc"); }}>
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>
                    Name A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("desc"); }}>
                    Name Z-A
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                data-testid="button-toggle-view"
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtered by:</span>
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => toggleTagFilter(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>
                Clear all
              </Button>
            </div>
          )}

          {filteredThumbnails.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Thumbnails Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedTags.length > 0
                    ? "Try adjusting your search or filters"
                    : "Create your first thumbnail to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
              {filteredThumbnails.map((thumb) => {
                const thumbTags = allTags.filter(t => t.thumbnailId === thumb.id);
                return viewMode === "grid" ? (
                  <Card key={thumb.id} className="overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5" />
                    <CardContent className="p-3 space-y-2">
                      <h4 className="font-medium truncate">{thumb.title}</h4>
                      <div className="flex flex-wrap gap-1">
                        {thumbTags.map((t) => (
                          <Badge key={t.id} variant="outline" className="text-xs gap-1">
                            {t.tag}
                            <button
                              onClick={() => removeTagMutation.mutate(t.id)}
                              className="hover:text-destructive"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </Badge>
                        ))}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 px-1">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Tag</DialogTitle>
                            </DialogHeader>
                            <div className="flex gap-2 py-4">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Enter tag"
                                onKeyDown={(e) => e.key === "Enter" && handleAddTag(thumb.id)}
                                data-testid="input-new-tag"
                              />
                              <Button onClick={() => handleAddTag(thumb.id)}>Add</Button>
                            </div>
                            {uniqueTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-muted-foreground w-full">Quick add:</span>
                                {uniqueTags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => addTagMutation.mutate({ thumbnailId: thumb.id, tag })}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(thumb.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card key={thumb.id}>
                    <CardContent className="p-3 flex items-center gap-4">
                      <div className="w-24 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{thumb.title}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {thumbTags.map((t) => (
                            <Badge key={t.id} variant="outline" className="text-xs">
                              {t.tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(thumb.createdAt).toLocaleDateString()}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
