"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import PromptVault from "@/components/desktop-mode";
import { applyOperation, type TQLOperation } from "@/lib/tql";

const STORAGE_KEY = "desktop-studio-content";

function loadContent(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Track whether we've already warned the user about a quota issue this
// session — we don't want to spam the console on every save while storage
// is full. The flag resets on page reload.
let warnedAboutQuota = false;

function saveContent(content: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return;
  } catch (err) {
    // Quota hit — try to make room without losing the user's current work.
    // Strategy: drop the oldest workspace snapshots first (they're the
    // largest single cost in the blob), then retry. If even that fails,
    // drop the prompt history. As a last resort, write a minimal payload
    // so the active artifacts at least make it to disk.
    const isQuotaErr = err instanceof DOMException && (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22
    );
    if (!isQuotaErr) {
      // Non-quota write failure — log once and bail; we don't want to
      // mutate the in-memory copy in unpredictable ways.
      if (!warnedAboutQuota) {
        console.warn("[desktop-studio] saveContent failed", err);
        warnedAboutQuota = true;
      }
      return;
    }

    const trimmed = { ...content };
    // Drop older workspace snapshots (keep the 2 most recent).
    if (Array.isArray(trimmed.workspaceSnapshots) && trimmed.workspaceSnapshots.length > 2) {
      trimmed.workspaceSnapshots = (trimmed.workspaceSnapshots as Array<unknown>).slice(0, 2);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      if (!warnedAboutQuota) {
        console.warn("[desktop-studio] localStorage quota hit — older workspace snapshots evicted to make room");
        warnedAboutQuota = true;
      }
      return;
    } catch (_err2) {
      // Still no room. Drop prompt history too.
    }

    if (Array.isArray(trimmed.thinkletPromptVault)) {
      trimmed.thinkletPromptVault = (trimmed.thinkletPromptVault as Array<unknown>).slice(0, 10);
    }
    if (Array.isArray(trimmed.workspaceSnapshots)) {
      trimmed.workspaceSnapshots = [];
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      console.warn("[desktop-studio] localStorage quota hit — snapshots and prompt history pruned");
      warnedAboutQuota = true;
      return;
    } catch (_err3) {
      // Last resort: fail visibly so the user knows something is wrong.
      console.error("[desktop-studio] localStorage is full — your work may not be saved. Free space in your browser settings.");
    }
  }
}

export default function Home() {
  const [content, setContent] = useState<Record<string, unknown>>({});
  const contentRef = useRef<Record<string, unknown>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const loaded = loadContent();
      contentRef.current = loaded;
      setContent(loaded);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const updateContent = useCallback((operation: TQLOperation) => {
    const next = applyOperation(contentRef.current, operation);
    contentRef.current = next;
    saveContent(next);
    queueMicrotask(() => {
      setContent(contentRef.current);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-pulse text-gray-400 text-lg">Loading Desktop Studio...</div>
      </div>
    );
  }

  return (
    <PromptVault
      content={content}
      updateContent={updateContent}
      initialDesktopMode={true}
    />
  );
}
