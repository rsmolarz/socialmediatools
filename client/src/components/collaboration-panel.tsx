import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Share2,
  Link2,
  Copy,
  MessageCircle,
  Check,
  CheckCircle,
  Circle,
  Trash2,
  Loader2,
  Send,
  Eye,
  Edit,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import type { Collaboration, Comment } from "@shared/schema";

interface CollaborationPanelProps {
  thumbnailId?: number;
  userId?: string;
}

export function CollaborationPanel({ thumbnailId, userId = "default" }: CollaborationPanelProps) {
  const { toast } = useToast();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "edit" | "comment">("view");
  const [newComment, setNewComment] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  const { data: collaborations = [], isLoading: loadingCollabs } = useQuery<Collaboration[]>({
    queryKey: [`/api/collaborations/thumbnail/${thumbnailId}`],
    enabled: !!thumbnailId,
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery<Comment[]>({
    queryKey: [`/api/comments/thumbnail/${thumbnailId}`],
    enabled: !!thumbnailId,
  });

  const createCollabMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/collaborations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collaborations/thumbnail/${thumbnailId}`] });
      setShowShareDialog(false);
      setShareEmail("");
      toast({ title: "Shared", description: "Thumbnail has been shared" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to share", variant: "destructive" });
    },
  });

  const deleteCollabMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/collaborations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/collaborations/thumbnail/${thumbnailId}`] });
      toast({ title: "Access revoked" });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/comments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments/thumbnail/${thumbnailId}`] });
      setNewComment("");
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async ({ id, resolved }: { id: number; resolved: boolean }) => {
      return apiRequest(`/api/comments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ resolved }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments/thumbnail/${thumbnailId}`] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments/thumbnail/${thumbnailId}`] });
    },
  });

  const handleShare = () => {
    if (!shareEmail || !thumbnailId) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    createCollabMutation.mutate({
      thumbnailId,
      sharedWith: shareEmail,
      permission: sharePermission,
    });
  };

  const handleCopyLink = async (token?: string | null) => {
    if (!token) return;
    
    const link = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied!" });
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !thumbnailId) return;

    createCommentMutation.mutate({
      thumbnailId,
      userId,
      content: newComment.trim(),
    });
  };

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(" ");
      
      if (!hasSpaceAfterAt && textAfterAt.length <= 20) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (email: string) => {
    const lastAtIndex = newComment.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const beforeAt = newComment.slice(0, lastAtIndex);
      setNewComment(`${beforeAt}@${email} `);
    }
    setShowMentions(false);
  };

  const filteredCollaborators = collaborations.filter(c => 
    c.sharedWith.toLowerCase().includes(mentionFilter)
  );

  const renderCommentWithMentions = (content: string) => {
    const mentionRegex = /@([\w@.-]+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const permissionIcons = {
    view: Eye,
    edit: Edit,
    comment: MessageSquare,
  };

  const permissionColors = {
    view: "bg-blue-500",
    edit: "bg-green-500",
    comment: "bg-yellow-500",
  };

  if (!thumbnailId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a thumbnail to collaborate</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaborators
              </CardTitle>
              <CardDescription>Share and manage access to this thumbnail</CardDescription>
            </div>
            <Button onClick={() => setShowShareDialog(true)} data-testid="button-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCollabs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : collaborations.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No one else has access yet
            </p>
          ) : (
            <div className="space-y-3">
              {collaborations.map((collab) => {
                const PermIcon = permissionIcons[collab.permission as keyof typeof permissionIcons] || Eye;
                return (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`collaborator-${collab.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {collab.sharedWith.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{collab.sharedWith}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <PermIcon className="w-3 h-3" />
                          <span className="capitalize">{collab.permission}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyLink(collab.shareToken)}
                        data-testid={`copy-link-${collab.id}`}
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCollabMutation.mutate(collab.id)}
                        data-testid={`revoke-${collab.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments
          </CardTitle>
          <CardDescription>Feedback and discussion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="Add a comment... (use @ to mention collaborators)"
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-comment"
            />
            {showMentions && filteredCollaborators.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredCollaborators.map((collab) => (
                  <button
                    key={collab.id}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted transition-colors text-left"
                    onClick={() => insertMention(collab.sharedWith)}
                    data-testid={`mention-${collab.id}`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {collab.sharedWith.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{collab.sharedWith}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            onClick={handleAddComment}
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="w-full"
            data-testid="button-add-comment"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Add Comment
          </Button>

          <div className="space-y-3 pt-4 border-t">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No comments yet
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border ${comment.resolved ? "bg-muted/50" : ""}`}
                  data-testid={`comment-${comment.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {comment.userId.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{comment.userId}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => resolveCommentMutation.mutate({ 
                          id: comment.id, 
                          resolved: !comment.resolved 
                        })}
                        data-testid={`resolve-${comment.id}`}
                      >
                        {comment.resolved ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        data-testid={`delete-comment-${comment.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className={`mt-2 text-sm ${comment.resolved ? "text-muted-foreground line-through" : ""}`}>
                    {renderCommentWithMentions(comment.content)}
                  </p>
                  {comment.resolved && (
                    <Badge variant="secondary" className="mt-2 text-xs">Resolved</Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Thumbnail</DialogTitle>
            <DialogDescription>Invite someone to collaborate on this design</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email or Username</Label>
              <Input
                placeholder="colleague@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                data-testid="input-share-email"
              />
            </div>
            <div>
              <Label>Permission Level</Label>
              <Select value={sharePermission} onValueChange={(v: any) => setSharePermission(v)}>
                <SelectTrigger data-testid="select-permission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>View only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Can comment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      <span>Can edit</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare}
              disabled={createCollabMutation.isPending}
              data-testid="button-send-invite"
            >
              {createCollabMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
