import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Radio, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStudioSessions, useCreateSession } from "@/hooks/useStudio";

const STATUS_COLORS: Record<string, string> = {
  waiting:    "bg-yellow-100 text-yellow-800",
  live:       "bg-red-100 text-red-800",
  processing: "bg-blue-100 text-blue-800",
  ready:      "bg-green-100 text-green-800",
  failed:     "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  waiting:    <Clock className="w-3 h-3" />,
  live:       <Radio className="w-3 h-3" />,
  processing: <Clock className="w-3 h-3" />,
  ready:      <CheckCircle className="w-3 h-3" />,
};

export default function StudioPage() {
  const [, navigate] = useLocation();
  const { data: sessions = [], isLoading } = useStudioSessions();
  const createSession = useCreateSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const result = await createSession.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
    setOpen(false);
    setTitle("");
    setDescription("");
    navigate(`/studio/${result.session.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Studio</h1>
          <p className="text-muted-foreground text-sm mt-1">Record, edit, and publish your content</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />New session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create recording session</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input
                  placeholder="e.g. Episode 42  Building in public"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                <Textarea
                  placeholder="What's this session about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || createSession.isPending}>
                {createSession.isPending ? "Creating..." : "Create & enter studio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Radio className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No sessions yet</p>
          <p className="text-sm mt-1">Create your first recording session to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s: any) => (
            <Card
              key={s.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/studio/${s.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium leading-snug">{s.title}</CardTitle>
                  <Badge className={`shrink-0 text-xs flex items-center gap-1 ${STATUS_COLORS[s.status] || ""}`}>
                    {STATUS_ICONS[s.status]}
                    {s.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                <p className="text-xs text-muted-foreground mt-3">
                  {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
