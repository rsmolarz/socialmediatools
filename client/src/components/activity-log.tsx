import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";

interface ActivityItem {
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}

interface ActivityLogProps {
  activities: ActivityItem[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
  return (
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden" data-testid="activity-log">
      <div className="p-3 border-b bg-muted/50 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Activity Log</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs italic">
              No recent activity
            </div>
          ) : (
            activities.slice().reverse().map((activity, i) => (
              <div key={`${activity.timestamp}-${i}`} className="flex gap-3 text-sm">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="leading-none text-xs">
                    <span className="font-bold">{activity.username}</span>
                    {" "}{activity.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(activity.timestamp), "h:mm:ss a")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
