import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface Collaborator {
  userId: string;
  username: string;
  color: string;
}

interface PresenceIndicatorProps {
  collaborators: Collaborator[];
  connected: boolean;
  maxVisible?: number;
}

export function PresenceIndicator({ 
  collaborators, 
  connected, 
  maxVisible = 4 
}: PresenceIndicatorProps) {
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = collaborators.length - maxVisible;
  
  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" data-testid="presence-disconnected">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <div className="flex -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <Tooltip key={collaborator.userId}>
            <TooltipTrigger asChild>
              <Avatar 
                className="w-7 h-7 border-2 border-background cursor-pointer hover-elevate"
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
            </TooltipTrigger>
            <TooltipContent>
              <p>{collaborator.username}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar 
                className="w-7 h-7 border-2 border-background cursor-pointer"
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
      
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Users className="w-3 h-3" />
        {collaborators.length + 1}
      </span>
    </div>
  );
}
