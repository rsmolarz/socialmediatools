import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, "action">[] = [
  { key: "e", ctrl: true, description: "Export thumbnail" },
  { key: "s", ctrl: true, description: "Save thumbnail" },
  { key: "z", ctrl: true, description: "Undo" },
  { key: "y", ctrl: true, description: "Redo" },
  { key: "z", ctrl: true, shift: true, description: "Redo (alternate)" },
  { key: "d", ctrl: true, description: "Duplicate" },
  { key: "n", ctrl: true, description: "New thumbnail" },
  { key: "r", ctrl: true, description: "Reset to default" },
  { key: "t", ctrl: true, description: "Toggle theme" },
  { key: "?", ctrl: false, shift: true, description: "Show shortcuts help" },
];

interface UseKeyboardShortcutsOptions {
  onExport?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onNew?: () => void;
  onReset?: () => void;
  onToggleTheme?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    onExport,
    onSave,
    onUndo,
    onRedo,
    onDuplicate,
    onNew,
    onReset,
    onToggleTheme,
    onShowHelp,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable;

      if (isInputField && !event.ctrlKey && !event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      if (ctrl && key === "e") {
        event.preventDefault();
        onExport?.();
        return;
      }

      if (ctrl && key === "s") {
        event.preventDefault();
        onSave?.();
        return;
      }

      if (ctrl && key === "z" && !shift) {
        event.preventDefault();
        onUndo?.();
        return;
      }

      if ((ctrl && key === "y") || (ctrl && shift && key === "z")) {
        event.preventDefault();
        onRedo?.();
        return;
      }

      if (ctrl && key === "d") {
        event.preventDefault();
        onDuplicate?.();
        return;
      }

      if (ctrl && key === "n") {
        event.preventDefault();
        onNew?.();
        return;
      }

      if (ctrl && key === "r") {
        event.preventDefault();
        onReset?.();
        return;
      }

      if (ctrl && key === "t") {
        event.preventDefault();
        onToggleTheme?.();
        return;
      }

      if (shift && key === "?") {
        event.preventDefault();
        onShowHelp?.();
        return;
      }
    },
    [enabled, onExport, onSave, onUndo, onRedo, onDuplicate, onNew, onReset, onToggleTheme, onShowHelp]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: DEFAULT_SHORTCUTS,
  };
}

export function getShortcutDisplay(shortcut: Omit<KeyboardShortcut, "action">) {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
}
