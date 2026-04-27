"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkIcon, GitBranchIcon, GitCompareIcon, RotateCcwIcon, SparklesIcon, TrashIcon, XIcon } from "lucide-react";
import { ArtifactDiffModal } from "./artifact-diff";

function formatSnapshotTime(ts) {
  if (!ts) return "Unknown time";
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ArtifactVersionsPanel({
  artifact,
  isOpen,
  onClose,
  onSnapshot,
  onRestore,
  onDelete,
  onFork,
  desktopLightMode,
}) {
  const [name, setName] = useState("");
  const [diffSnapshotId, setDiffSnapshotId] = useState(null);
  const snapshots = artifact?.snapshots || [];
  const diffSnapshot = diffSnapshotId ? snapshots.find((s) => s.id === diffSnapshotId) : null;

  return (
    <AnimatePresence>
      {isOpen && artifact && (
        <motion.div
          key="artifact-versions"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-10 right-2 w-96 rounded-xl border shadow-2xl overflow-hidden ${
            desktopLightMode ? "border-gray-200 bg-white" : "border-white/10 bg-gray-950/98 backdrop-blur-xl"
          }`}
          style={{ zIndex: 99999, boxShadow: desktopLightMode ? "0 8px 40px rgba(0,0,0,0.14)" : "0 0 0 1px rgba(34,211,238,0.18), 0 8px 40px rgba(0,0,0,0.55)" }}
        >
          <div className={`flex items-center justify-between px-4 py-2.5 border-b ${desktopLightMode ? "border-gray-100 bg-cyan-50/70" : "border-white/8 bg-cyan-500/10"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <BookmarkIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className={`text-[11px] font-semibold tracking-wide uppercase ${desktopLightMode ? "text-cyan-700" : "text-cyan-300"}`}>Versions</span>
              <span className={`text-[10px] truncate ${desktopLightMode ? "text-gray-400" : "text-gray-500"}`}>{artifact.title}</span>
            </div>
            <button onClick={onClose} className={`transition-colors ${desktopLightMode ? "text-gray-400 hover:text-gray-700" : "text-gray-500 hover:text-gray-300"}`}>
              <XIcon className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 border-b border-white/5">
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSnapshot(name.trim());
                    setName("");
                  }
                }}
                placeholder="Snapshot name"
                className={`flex-1 rounded-lg px-3 py-2 text-xs border outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                  desktopLightMode ? "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400" : "bg-black/30 border-white/10 text-white placeholder-gray-500"
                }`}
              />
              <button
                onClick={() => {
                  onSnapshot(name.trim());
                  setName("");
                }}
                className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {snapshots.length === 0 ? (
            <div className={`px-4 py-8 text-center text-xs ${desktopLightMode ? "text-gray-400" : "text-gray-500"}`}>No named versions yet.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {snapshots.map((snapshot) => {
                const isAuto = !!snapshot.auto;
                return (
                  <div key={snapshot.id} className={`group flex items-start gap-3 px-4 py-3 ${desktopLightMode ? "hover:bg-gray-50" : "hover:bg-white/[0.03]"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isAuto
                        ? desktopLightMode ? "bg-amber-50 text-amber-600" : "bg-amber-500/12 text-amber-300"
                        : desktopLightMode ? "bg-cyan-50 text-cyan-600" : "bg-cyan-500/12 text-cyan-300"
                    }`}>
                      {isAuto ? <SparklesIcon className="w-3.5 h-3.5" /> : <BookmarkIcon className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`text-xs font-semibold truncate ${desktopLightMode ? "text-gray-800" : "text-gray-200"}`}>{snapshot.name}</div>
                        {isAuto && (
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-1 py-px rounded ${
                            desktopLightMode ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-300"
                          }`}>auto</span>
                        )}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>{formatSnapshotTime(snapshot.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setDiffSnapshotId(snapshot.id)}
                        className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50" : "text-gray-500 hover:text-blue-300 hover:bg-blue-500/10"}`}
                        title="Compare with current"
                      >
                        <GitCompareIcon className="w-3 h-3" />
                      </button>
                      {onFork && (
                        <button
                          onClick={() => onFork(snapshot.id)}
                          className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? "text-gray-400 hover:text-violet-600 hover:bg-violet-50" : "text-gray-500 hover:text-violet-300 hover:bg-violet-500/10"}`}
                          title="Fork to new artifact"
                        >
                          <GitBranchIcon className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onRestore(snapshot.id)}
                        className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? "text-gray-400 hover:text-cyan-600 hover:bg-cyan-50" : "text-gray-500 hover:text-cyan-300 hover:bg-cyan-500/10"}`}
                        title="Restore version"
                      >
                        <RotateCcwIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDelete(snapshot.id)}
                        className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-500 hover:text-red-300 hover:bg-red-500/10"}`}
                        title="Delete version"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <ArtifactDiffModal
            isOpen={!!diffSnapshot}
            onClose={() => setDiffSnapshotId(null)}
            snapshot={diffSnapshot}
            current={artifact}
            desktopLightMode={desktopLightMode}
            onRestore={(id) => { onRestore(id); setDiffSnapshotId(null); }}
            onFork={onFork ? (id) => { onFork(id); setDiffSnapshotId(null); } : undefined}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
