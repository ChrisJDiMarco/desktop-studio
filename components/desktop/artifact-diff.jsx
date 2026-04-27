"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GitBranchIcon, RotateCcwIcon, XIcon } from "lucide-react";

// Standard LCS-based line diff. O(m*n) time / memory; fine for the artifact
// payloads we deal with here (typical ≤ 5k lines). For HTML/JSX the contents
// are expected to be reasonably small (stripped image tokens already happen
// upstream in extractHtmlImageDataUrls / buildThinkletHtml).
function diffLines(a, b) {
  const aLines = (a || "").split(/\r?\n/);
  const bLines = (b || "").split(/\r?\n/);
  const m = aLines.length;
  const n = bLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      out.push({ kind: "same", text: aLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: aLines[i] });
      i++;
    } else {
      out.push({ kind: "add", text: bLines[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: "del", text: aLines[i++] });
  }
  while (j < n) {
    out.push({ kind: "add", text: bLines[j++] });
  }
  return out;
}

function summarize(rows) {
  let added = 0;
  let removed = 0;
  for (const r of rows) {
    if (r.kind === "add") added++;
    else if (r.kind === "del") removed++;
  }
  return { added, removed, total: rows.length };
}

export function ArtifactDiffModal({
  isOpen,
  onClose,
  snapshot,
  current,
  onRestore,
  onFork,
  desktopLightMode,
}) {
  const rows = useMemo(() => {
    if (!isOpen || !snapshot || !current) return [];
    return diffLines(snapshot.content || "", current.content || "");
  }, [isOpen, snapshot, current]);

  const summary = useMemo(() => summarize(rows), [rows]);

  const dark = !desktopLightMode;

  return (
    <AnimatePresence>
      {isOpen && snapshot && current && (
        <motion.div
          key="artifact-diff-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center"
          style={{ background: dark ? "rgba(0,0,0,0.65)" : "rgba(20,20,30,0.4)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 16, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className={`relative w-[min(1100px,94vw)] h-[min(720px,86vh)] rounded-2xl overflow-hidden border shadow-2xl ${
              dark ? "bg-gray-950 border-white/10" : "bg-white border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-3 border-b ${
                dark ? "border-white/8 bg-white/[0.02]" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    dark ? "bg-cyan-500/15 text-cyan-300" : "bg-cyan-50 text-cyan-600"
                  }`}
                >
                  <GitBranchIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold tracking-wide uppercase ${dark ? "text-cyan-300" : "text-cyan-700"}`}>
                    Compare
                  </div>
                  <div className={`text-[11px] truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>
                    <span className="font-semibold">{snapshot.name}</span>
                    <span className="mx-1.5 opacity-50">→</span>
                    <span>Current</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className={`px-1.5 py-0.5 rounded ${dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                    +{summary.added}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${dark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
                    −{summary.removed}
                  </span>
                </div>
                {onFork && (
                  <button
                    onClick={() => onFork(snapshot.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      dark
                        ? "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
                        : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                    }`}
                    title="Create a new artifact from this version"
                  >
                    <GitBranchIcon className="w-3 h-3" />
                    Fork
                  </button>
                )}
                {onRestore && (
                  <button
                    onClick={() => onRestore(snapshot.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      dark
                        ? "bg-cyan-500 text-black hover:bg-cyan-400"
                        : "bg-cyan-500 text-white hover:bg-cyan-600"
                    }`}
                  >
                    <RotateCcwIcon className="w-3 h-3" />
                    Restore
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded-lg transition-colors ${
                    dark ? "text-gray-500 hover:text-white hover:bg-white/5" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`overflow-y-auto h-[calc(100%-49px)] font-mono text-[11px] leading-[1.55] ${
                dark ? "bg-gray-950 text-gray-300" : "bg-white text-gray-800"
              }`}
            >
              {rows.length === 0 && (
                <div className={`px-6 py-12 text-center text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  No content to compare.
                </div>
              )}
              {rows.map((row, idx) => {
                const base = "flex items-start px-4 py-0.5 whitespace-pre-wrap break-words";
                if (row.kind === "add") {
                  return (
                    <div
                      key={idx}
                      className={`${base} ${dark ? "bg-emerald-500/[0.06]" : "bg-emerald-50/60"}`}
                    >
                      <span className={`flex-shrink-0 w-6 select-none ${dark ? "text-emerald-400/70" : "text-emerald-600/70"}`}>+</span>
                      <span className={dark ? "text-emerald-200" : "text-emerald-900"}>{row.text || " "}</span>
                    </div>
                  );
                }
                if (row.kind === "del") {
                  return (
                    <div
                      key={idx}
                      className={`${base} ${dark ? "bg-rose-500/[0.06]" : "bg-rose-50/60"}`}
                    >
                      <span className={`flex-shrink-0 w-6 select-none ${dark ? "text-rose-400/70" : "text-rose-600/70"}`}>−</span>
                      <span className={dark ? "text-rose-200" : "text-rose-900"}>{row.text || " "}</span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className={base}>
                    <span className={`flex-shrink-0 w-6 select-none ${dark ? "text-gray-700" : "text-gray-300"}`}> </span>
                    <span className={dark ? "text-gray-500" : "text-gray-500"}>{row.text || " "}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
