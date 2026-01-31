import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Collaborator {
  userId: string;
  username: string;
  color: string;
  status?: "online" | "away" | "busy";
}

interface PresenceIndicatorProps {
  collaborators: Collaborator[];
  connected: boolean;
  maxVisible?: number;
  onChatClick?: () => void;
  hasUnread?: boolean;
}

export function PresenceIndicator({ 
  collaborators, 
  connected, 
  maxVisible = 4,
  onChatClick,
  hasUnread
}: PresenceIndicatorProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = collaborators.length - maxVisible;
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-green-500";
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" data-testid="presence-disconnected">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm">Reconnecting...</span>
      </div>
    );
  }
  
  if (collaborators.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" data-testid="presence-solo">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm">Editing solo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" data-testid="presence-indicator">
      <div className="flex -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <Tooltip key={collaborator.userId}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar 
                  className="w-8 h-8 border-2 border-background cursor-pointer hover-elevate"
                  style={{ borderColor: collaborator.color }}
                  data-testid={`presence-avatar-${collaborator.userId}`}
                >
                  <AvatarFallback 
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                  getStatusColor(collaborator.status)
                )} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{collaborator.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{collaborator.status || "online"}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar 
                className="w-8 h-8 border-2 border-background cursor-pointer"
                data-testid="presence-more"
              >
                <AvatarFallback className="text-xs bg-muted">
                  +{hiddenCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hiddenCount} more collaborator{hiddenCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      <div className="h-4 w-[1px] bg-border mx-1" />
      
      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full">
        <Users className="w-3 h-3" />
        {collaborators.length + 1}
      </span>

      {onChatClick && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 relative ml-1 hover-elevate active-elevate-2" 
          onClick={onChatClick}
          data-testid="button-open-chat"
        >
          <MessageSquare className="w-4 h-4" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-background" />
          )}
        </Button>
      )}
    </div>
  );
}
