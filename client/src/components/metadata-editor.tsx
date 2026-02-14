import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Copy, Check, X, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MetadataEditorProps {
  youtubeTitle: string;
  youtubeDescription: string;
  tags: string[];
  onYoutubeTitleChange: (title: string) => void;
  onYoutubeDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function MetadataEditor({
  youtubeTitle,
  youtubeDescription,
  tags,
  onYoutubeTitleChange,
  onYoutubeDescriptionChange,
  onTagsChange,
}: MetadataEditorProps) {
  const [newTag, setNewTag] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({ title: "Copied!", description: `${field} copied to clipboard` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Card data-testid="metadata-editor">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4" />
          YouTube Metadata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Video Title</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => copyToClipboard(youtubeTitle, "Title")}
              disabled={!youtubeTitle}
              data-testid="button-copy-meta-title"
            >
              {copiedField === "Title" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <Input
            value={youtubeTitle}
            onChange={(e) => onYoutubeTitleChange(e.target.value)}
            placeholder="Enter YouTube video title..."
            data-testid="input-youtube-title"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => copyToClipboard(youtubeDescription, "Description")}
              disabled={!youtubeDescription}
              data-testid="button-copy-meta-description"
            >
              {copiedField === "Description" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <Textarea
            value={youtubeDescription}
            onChange={(e) => onYoutubeDescriptionChange(e.target.value)}
            placeholder="Enter YouTube video description..."
            rows={4}
            className="text-sm resize-y"
            data-testid="input-youtube-description"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => copyToClipboard(tags.join(", "), "Tags")}
              disabled={tags.length === 0}
              data-testid="button-copy-meta-tags"
            >
              {copiedField === "Tags" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag..."
              className="flex-1"
              data-testid="input-new-tag"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={addTag}
              disabled={!newTag.trim()}
              data-testid="button-add-tag"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`tag-badge-${index}`}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 inline-flex items-center"
                    data-testid={`button-remove-tag-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
