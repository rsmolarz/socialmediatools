import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["Ctrl", "S"], description: "Save thumbnail" },
  { keys: ["Ctrl", "E"], description: "Export thumbnail" },
  { keys: ["Ctrl", "Z"], description: "Undo last action" },
  { keys: ["Ctrl", "Y"], description: "Redo action" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo action (alternate)" },
  { keys: ["Ctrl", "N"], description: "New thumbnail" },
  { keys: ["Ctrl", "R"], description: "Reset to default" },
  { keys: ["Ctrl", "T"], description: "Toggle dark/light mode" },
  { keys: ["Shift", "?"], description: "Show this help" },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="keyboard-shortcuts-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b last:border-0"
              data-testid={`shortcut-item-${index}`}
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center">
                    <Badge variant="outline" className="text-xs font-mono px-2">
                      {key}
                    </Badge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Press <Badge variant="outline" className="text-xs font-mono mx-1">Shift</Badge> + 
          <Badge variant="outline" className="text-xs font-mono mx-1">?</Badge> anytime to show this help
        </p>
      </DialogContent>
    </Dialog>
  );
}
