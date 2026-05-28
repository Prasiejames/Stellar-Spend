"use client";

import { useEffect, useState } from "react";
import type { Shortcut } from "@/hooks/useKeyboardShortcuts";
import { saveShortcutOverride, resetShortcutOverrides } from "@/hooks/useKeyboardShortcuts";

interface Props {
  open: boolean;
  shortcuts: Shortcut[];
  onClose: () => void;
}

function isMac() {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toUpperCase().includes("MAC");
}

function formatKey(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push(isMac() ? "⌘" : "Ctrl");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
}

function shortcutId(s: Shortcut) {
  return s.key + String(s.ctrl) + String(s.shift);
}

export function KeyboardShortcutsModal({ open, shortcuts, onClose }: Props) {
  const [customizing, setCustomizing] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCustomizing(null); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleCapture = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (e.key === "Escape") { setCustomizing(null); return; }
    if (e.key === "Enter") {
      if (pendingKey) {
        saveShortcutOverride(id, { key: pendingKey, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
        setCustomizing(null);
        setPendingKey("");
      }
      return;
    }
    setPendingKey(e.key);
  };

  const handleReset = () => {
    resetShortcutOverrides();
    setCustomizing(null);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm border border-[#333] bg-[#111] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium text-sm">Keyboard shortcuts</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleReset}
              className="text-[#555] hover:text-[#888] text-xs transition-colors"
              title="Reset all to defaults"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              aria-label="Close shortcuts modal"
              className="text-[#555] hover:text-[#888] transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {shortcuts.map((s) => {
            const id = shortcutId(s);
            const isCustomizing = customizing === id;
            return (
              <li key={id} className="flex items-center justify-between gap-4">
                <span className="text-[#aaa] text-sm">{s.description}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {isCustomizing ? (
                    <input
                      autoFocus
                      placeholder="Press key…"
                      value={pendingKey}
                      onKeyDown={(e) => handleCapture(e, id)}
                      onChange={() => {}}
                      className="w-24 px-2 py-0.5 text-xs bg-[#222] border border-[#555] text-white font-mono outline-none"
                    />
                  ) : (
                    <>
                      <kbd
                        className="px-2 py-0.5 text-xs border border-[#333] text-[#888] font-mono cursor-pointer hover:border-[#555]"
                        title={s.hint ?? formatKey(s)}
                        onClick={() => { setCustomizing(id); setPendingKey(""); }}
                      >
                        {formatKey(s)}
                      </kbd>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-[#555] text-xs">
          Click a shortcut key to customize it. Shortcuts are disabled when a form field is focused.
        </p>
      </div>
    </div>
  );
}
