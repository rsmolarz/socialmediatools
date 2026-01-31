import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Loader2,
  Youtube,
  Instagram
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { ScheduledContent } from "@shared/schema";

const PLATFORMS = [
  { id: "youtube", name: "YouTube", icon: Youtube, color: "bg-red-500" },
  { id: "tiktok", name: "TikTok", icon: SiTiktok, color: "bg-black" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { id: "twitter", name: "Twitter/X", icon: CalendarIcon, color: "bg-sky-500" },
  { id: "facebook", name: "Facebook", icon: CalendarIcon, color: "bg-blue-600" },
];

const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

interface SchedulingCalendarProps {
  onScheduleContent?: (date: Date) => void;
}

export function SchedulingCalendar({ onScheduleContent }: SchedulingCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    time: "09:00",
    platforms: [] as string[],
    thumbnailId: "",
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: scheduledContent = [], isLoading } = useQuery<ScheduledContent[]>({
    queryKey: ["/api/schedule"],
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/schedule", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      setShowCreateDialog(false);
      setNewSchedule({ time: "09:00", platforms: [], thumbnailId: "" });
      toast({ title: "Content scheduled", description: "Your content has been scheduled" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule content", variant: "destructive" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/schedule/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({ title: "Removed", description: "Scheduled content removed" });
    },
  });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getScheduledForDay = (date: Date) => {
    return scheduledContent.filter(item => 
      isSameDay(new Date(item.scheduledTime), date)
    );
  };

  const togglePlatform = (platformId: string) => {
    setNewSchedule(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const handleCreateSchedule = () => {
    if (!selectedDate || newSchedule.platforms.length === 0) {
      toast({ 
        title: "Missing information", 
        description: "Please select at least one platform", 
        variant: "destructive" 
      });
      return;
    }

    const [hours, minutes] = newSchedule.time.split(":").map(Number);
    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(hours, minutes, 0, 0);

    createScheduleMutation.mutate({
      scheduledTime: scheduledTime.toISOString(),
      platforms: newSchedule.platforms,
      thumbnailId: newSchedule.thumbnailId ? parseInt(newSchedule.thumbnailId) : null,
      status: "pending",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    scheduled: "bg-blue-500",
    published: "bg-green-500",
    failed: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Schedule your content across platforms
                <span className="ml-2 text-xs text-muted-foreground">
                  (Timezone: {getUserTimezone()})
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const scheduled = getScheduledForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-colors ${
                      isCurrentMonth 
                        ? "bg-card hover:bg-accent/50" 
                        : "bg-muted/30 text-muted-foreground"
                    } ${isToday ? "ring-2 ring-primary" : ""}`}
                    onClick={() => {
                      setSelectedDate(day);
                      setShowCreateDialog(true);
                    }}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className="font-medium text-sm mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {scheduled.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="text-xs p-1 rounded bg-primary/10 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(item.scheduledTime), "HH:mm")}</span>
                          <div className={`w-2 h-2 rounded-full ml-auto ${statusColors[item.status || "pending"]}`} />
                        </div>
                      ))}
                      {scheduled.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{scheduled.length - 3} more
                        </div>
                      )}
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
          <CardTitle>Upcoming Scheduled</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledContent.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No content scheduled yet. Click on a day to schedule content.
            </p>
          ) : (
            <div className="space-y-2">
              {scheduledContent.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`scheduled-item-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {format(new Date(item.scheduledTime), "d")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.scheduledTime), "MMM")}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-sm">
                          {format(new Date(item.scheduledTime), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {item.platforms?.map((platform) => {
                          const p = PLATFORMS.find(p => p.id === platform);
                          return p ? (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              {p.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={`${statusColors[item.status || "pending"]} text-white border-0`}
                    >
                      {item.status || "pending"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteScheduleMutation.mutate(item.id)}
                      data-testid={`button-delete-schedule-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Content</DialogTitle>
            <DialogDescription>
              {selectedDate && `Schedule for ${format(selectedDate, "MMMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                data-testid="input-schedule-time"
              />
            </div>

            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <div
                    key={platform.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      newSchedule.platforms.includes(platform.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                    data-testid={`platform-${platform.id}`}
                  >
                    <Checkbox
                      checked={newSchedule.platforms.includes(platform.id)}
                      className="pointer-events-none"
                    />
                    <platform.icon className="w-4 h-4" />
                    <span className="text-sm">{platform.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={createScheduleMutation.isPending}
              data-testid="button-create-schedule"
            >
              {createScheduleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
