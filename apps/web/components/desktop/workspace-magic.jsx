"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ActivityIcon,
  BookmarkIcon,
  CheckCircleIcon,
  ClockIcon,
  FocusIcon,
  ImageIcon,
  LayoutIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";

export function MagicSuggestions({ isVisible, suggestions, onClose, desktopLightMode }) {
  if (!suggestions?.length) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className={`absolute left-1/2 top-full z-[120] mt-3 w-[min(660px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl ${
            desktopLightMode
              ? "border-gray-200 bg-white/95 shadow-black/15"
              : "border-white/12 bg-gray-950/92 shadow-black/60"
          }`}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {suggestions.slice(0, 6).map((suggestion) => {
              const Icon = suggestion.icon || SparklesIcon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    suggestion.run?.();
                    onClose?.();
                  }}
                  className={`group flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    desktopLightMode
                      ? "border-gray-100 bg-gray-50/80 text-gray-700 hover:border-violet-200 hover:bg-violet-50"
                      : "border-white/8 bg-white/[0.045] text-white/75 hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
                  }`}
                >
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                    desktopLightMode ? "bg-white text-violet-500 shadow-sm" : "bg-white/8 text-violet-300"
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">{suggestion.label}</span>
                    {suggestion.detail && (
                      <span className={`mt-0.5 block truncate text-[9px] ${
                        desktopLightMode ? "text-gray-400" : "text-white/35"
                      }`}>
                        {suggestion.detail}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ArtifactSwitcher({
  isOpen,
  artifacts,
  onClose,
  onFocus,
  onToggleMinimize,
  onSnapshot,
  onOpenVersions,
  onCloseArtifact,
  desktopLightMode,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...(artifacts || [])].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    if (!q) return sorted;
    return sorted.filter((artifact) => {
      const haystack = `${artifact.title || ""} ${artifact.type || ""} ${artifact.language || ""} ${(artifact.content || "").slice(0, 300)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [artifacts, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="artifact-switcher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-start justify-center bg-black/45 px-4 pt-[11vh] backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl ${
              desktopLightMode ? "border-gray-200 bg-white shadow-black/20" : "border-white/12 bg-gray-950/98 shadow-black/70"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 border-b px-4 py-3 ${desktopLightMode ? "border-gray-100" : "border-white/8"}`}>
              <SearchIcon className={`h-4 w-4 ${desktopLightMode ? "text-gray-400" : "text-white/40"}`} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "Enter" && filtered[0]) {
                    onFocus(filtered[0].id);
                    onClose();
                  }
                }}
                placeholder="Find an artifact"
                className={`flex-1 border-none bg-transparent text-sm outline-none ${
                  desktopLightMode ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-white/35"
                }`}
              />
              <button onClick={onClose} className={`rounded-md p-1 transition-colors ${desktopLightMode ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/40 hover:bg-white/10 hover:text-white"}`}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className={`px-4 py-10 text-center text-xs ${desktopLightMode ? "text-gray-400" : "text-gray-500"}`}>No artifacts found</div>
              ) : (
                filtered.map((artifact) => {
                  const Icon = artifact.type === "image" ? ImageIcon : artifact.isMinimized ? MinimizeIcon : LayoutIcon;
                  return (
                    <div
                      key={artifact.id}
                      className={`group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        desktopLightMode ? "hover:bg-gray-50" : "hover:bg-white/[0.055]"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onFocus(artifact.id);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          desktopLightMode ? "bg-gray-100 text-gray-500" : "bg-white/8 text-white/55"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs font-semibold ${desktopLightMode ? "text-gray-800" : "text-gray-200"}`}>
                            {artifact.title || "Untitled"}
                          </span>
                          <span className={`mt-0.5 block truncate text-[10px] ${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
                            {artifact.isMinimized ? "Minimized" : `${Math.round(artifact.width || 0)}x${Math.round(artifact.height || 0)}`} - {(artifact.snapshots || []).length} versions
                          </span>
                        </span>
                      </button>
                      <div className="flex flex-shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        <IconButton title={artifact.isMinimized ? "Restore" : "Minimize"} onClick={() => onToggleMinimize(artifact.id)} desktopLightMode={desktopLightMode}>
                          {artifact.isMinimized ? <MaximizeIcon className="h-3.5 w-3.5" /> : <MinimizeIcon className="h-3.5 w-3.5" />}
                        </IconButton>
                        <IconButton title="Snapshot" onClick={() => onSnapshot(artifact.id)} desktopLightMode={desktopLightMode}>
                          <BookmarkIcon className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton title="Versions" onClick={() => onOpenVersions(artifact.id)} desktopLightMode={desktopLightMode}>
                          <ClockIcon className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton title="Close" onClick={() => onCloseArtifact(artifact.id)} danger desktopLightMode={desktopLightMode}>
                          <XIcon className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function WorkspaceSnapshotsPanel({
  isOpen,
  snapshots,
  isBusy,
  onClose,
  onCreate,
  onRestore,
  onDelete,
  desktopLightMode,
}) {
  const [name, setName] = useState("");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="workspace-snapshots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-start justify-end bg-black/35 backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`w-full max-w-md border-l shadow-2xl backdrop-blur-2xl ${
              desktopLightMode ? "border-gray-200 text-gray-900" : "border-white/12 text-white"
            }`}
            style={{
              // Inline everything — height, layout, and opaque background.
              // Earlier versions used Tailwind's `h-full` + `flex flex-col`
              // which collapsed the panel to just-the-header on some
              // viewport/browser combinations because `h-full` against a
              // `fixed inset-0 items-start` parent didn't resolve to the
              // viewport height. Inline `100vh` + `display:flex` is
              // bullet-proof regardless of Tailwind's flex layout pass.
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              background: desktopLightMode ? "rgba(255,255,255,0.97)" : "rgba(10,12,16,0.97)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${desktopLightMode ? "border-gray-100" : "border-white/8"}`} style={{ flexShrink: 0 }}>
              <div>
                <div className="text-sm font-bold">Workspace Snapshots</div>
                <div className={`mt-0.5 text-[10px] ${desktopLightMode ? "text-gray-500" : "text-white/40"}`}>{snapshots.length} saved restore points</div>
              </div>
              <button onClick={onClose} className={`rounded-lg p-1.5 ${desktopLightMode ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/40 hover:bg-white/10 hover:text-white"}`}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ flex: "1 1 auto", minHeight: 0 }}>
              <div className={`rounded-2xl border p-2 ${desktopLightMode ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/[0.05]"}`}>
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onCreate(name);
                        setName("");
                      }
                    }}
                    placeholder="Snapshot name"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${
                      desktopLightMode ? "border-gray-200 bg-white text-gray-900 placeholder-gray-400" : "border-white/10 bg-black/30 text-white placeholder-white/30"
                    }`}
                  />
                  <button
                    onClick={() => {
                      onCreate(name);
                      setName("");
                    }}
                    disabled={isBusy}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
                      desktopLightMode ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-violet-500 text-white hover:bg-violet-400"
                    }`}
                    title="Save workspace snapshot"
                  >
                    {isBusy ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : <BookmarkIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {snapshots.length === 0 ? (
                  <div className={`rounded-2xl border px-4 py-10 text-center text-xs ${desktopLightMode ? "border-gray-200 text-gray-400" : "border-white/10 text-white/35"}`}>
                    No snapshots yet
                  </div>
                ) : (
                  snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className={`rounded-2xl border p-3 ${
                        desktopLightMode
                          ? "border-gray-200 bg-white"
                          : "border-white/10 bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold">{snapshot.name || "Workspace"}</div>
                          <div className={`mt-1 flex items-center gap-2 text-[10px] ${desktopLightMode ? "text-gray-500" : "text-white/45"}`}>
                            <span>{snapshot.artifacts?.length || 0} artifacts</span>
                            <span>{formatRelativeTime(snapshot.createdAt)}</span>
                            {snapshot.kind === "auto" && <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-cyan-400">auto</span>}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <IconButton title="Restore" onClick={() => onRestore(snapshot.id)} desktopLightMode={desktopLightMode}>
                            <RefreshCwIcon className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton title="Delete" onClick={() => onDelete(snapshot.id)} danger desktopLightMode={desktopLightMode}>
                            <TrashIcon className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function WorkspaceHealthPanel({ isOpen, items, onClose, onHeal, desktopLightMode }) {
  const hasIssues = items.some((item) => item.severity !== "ok");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="workspace-health"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-start justify-end bg-black/35 backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`w-full max-w-sm border-l shadow-2xl backdrop-blur-2xl ${
              desktopLightMode ? "border-gray-200 text-gray-900" : "border-white/12 text-white"
            }`}
            style={{
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              background: desktopLightMode ? "rgba(255,255,255,0.97)" : "rgba(10,12,16,0.97)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${desktopLightMode ? "border-gray-100" : "border-white/8"}`} style={{ flexShrink: 0 }}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${hasIssues ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                  {hasIssues ? <ActivityIcon className="h-4 w-4" /> : <ShieldCheckIcon className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold">Workspace Health</div>
                  <div className={`mt-0.5 text-[10px] ${desktopLightMode ? "text-gray-500" : "text-white/40"}`}>{hasIssues ? "Attention suggested" : "All clear"}</div>
                </div>
              </div>
              <button onClick={onClose} className={`rounded-lg p-1.5 ${desktopLightMode ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/40 hover:bg-white/10 hover:text-white"}`}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ flex: "1 1 auto", minHeight: 0 }}>
              <button
                onClick={onHeal}
                className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
                  desktopLightMode ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-white text-gray-950 hover:bg-white/90"
                }`}
              >
                <SparklesIcon className="h-3.5 w-3.5" />
                Heal Workspace
              </button>

              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon || CheckCircleIcon;
                  const toneClass = item.severity === "ok"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : item.severity === "warn"
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-rose-500/15 text-rose-400";
                  return (
                    <div key={item.id} className={`rounded-2xl border p-3 ${desktopLightMode ? "border-gray-200 bg-white" : "border-white/10 bg-white/[0.06]"}`}>
                      <div className="flex gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold">{item.title}</div>
                          <div className={`mt-1 text-[10px] leading-relaxed ${desktopLightMode ? "text-gray-500" : "text-white/45"}`}>{item.detail}</div>
                          {item.action && (
                            <button
                              onClick={item.action}
                              className={`mt-2 rounded-lg px-2 py-1 text-[10px] font-semibold ${
                                desktopLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white"
                              }`}
                            >
                              {item.actionLabel || "Fix"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FocusModeBadge({ artifact, onExit, desktopLightMode }) {
  if (!artifact) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`absolute left-1/2 top-12 z-[90000] flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 shadow-xl backdrop-blur-xl ${
        desktopLightMode ? "border-gray-200 bg-white/90 text-gray-700" : "border-white/12 bg-gray-950/80 text-white/75"
      }`}
    >
      <FocusIcon className="h-3.5 w-3.5 text-cyan-400" />
      <span className="max-w-[260px] truncate text-[11px] font-semibold">{artifact.title || "Focus Mode"}</span>
      <button onClick={onExit} className={`rounded-full p-0.5 ${desktopLightMode ? "hover:bg-gray-100" : "hover:bg-white/10"}`} title="Exit focus mode">
        <XIcon className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

function IconButton({ title, onClick, children, danger, desktopLightMode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        danger
          ? desktopLightMode ? "text-red-400 hover:bg-red-50 hover:text-red-600" : "text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
          : desktopLightMode ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700" : "text-white/35 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
