"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  RefreshCwIcon,
  SquareIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const statusMeta = {
  running: { label: "Running", color: "text-violet-300", lightColor: "text-violet-700", dot: "bg-violet-400" },
  queued: { label: "Queued", color: "text-cyan-300", lightColor: "text-cyan-700", dot: "bg-cyan-400" },
  success: { label: "Complete", color: "text-emerald-300", lightColor: "text-emerald-700", dot: "bg-emerald-400" },
  error: { label: "Failed", color: "text-red-300", lightColor: "text-red-600", dot: "bg-red-400" },
  canceled: { label: "Canceled", color: "text-amber-300", lightColor: "text-amber-700", dot: "bg-amber-400" },
};

const logLevelMeta = {
  info: { dotLight: "bg-gray-300", dotDark: "bg-gray-600", textLight: "text-gray-700", textDark: "text-gray-300" },
  success: { dotLight: "bg-emerald-400", dotDark: "bg-emerald-500", textLight: "text-emerald-700", textDark: "text-emerald-300" },
  warning: { dotLight: "bg-amber-400", dotDark: "bg-amber-500", textLight: "text-amber-700", textDark: "text-amber-300" },
  error: { dotLight: "bg-red-400", dotDark: "bg-red-500", textLight: "text-red-600", textDark: "text-red-300" },
  api: { dotLight: "bg-cyan-400", dotDark: "bg-cyan-500", textLight: "text-cyan-700", textDark: "text-cyan-300" },
};

function formatAge(ts) {
  if (!ts) return "";
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function JobLogDrawer({ job, desktopLightMode }) {
  const logs = Array.isArray(job?.logs) ? job.logs : [];
  const scrollRef = useRef(null);
  const isRunning = job?.status === "running" || job?.status === "queued";

  // Auto-scroll to the newest entry while the job is still streaming, but
  // only when the user is already near the bottom — never yank them away
  // from a line they're reading.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isRunning) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (distanceFromBottom < 64) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs.length, isRunning]);

  return (
    <div
      className={`border-t ${
        desktopLightMode
          ? "border-gray-100 bg-gradient-to-b from-violet-50/30 to-transparent"
          : "border-white/[0.08] bg-gradient-to-b from-violet-500/5 to-transparent"
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest font-bold ${
          desktopLightMode ? "text-gray-400" : "text-gray-500"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <ActivityIcon className="w-3 h-3" />
          Live Log
          {isRunning && (
            <span className={`ml-1 inline-flex items-center gap-1 normal-case tracking-normal text-[9px] font-semibold ${desktopLightMode ? "text-violet-600" : "text-violet-300"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              streaming
            </span>
          )}
        </span>
        <span className={`text-[9px] font-medium normal-case tracking-normal ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
          {logs.length} entr{logs.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {/* Job metadata strip */}
      <div className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        {job?.provider && (
          <span className={`${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
            <span className={`font-semibold ${desktopLightMode ? "text-gray-700" : "text-gray-400"}`}>provider</span>{" "}{job.provider}
          </span>
        )}
        {job?.model && (
          <span className={`${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
            <span className={`font-semibold ${desktopLightMode ? "text-gray-700" : "text-gray-400"}`}>model</span>{" "}{job.model}
          </span>
        )}
        {job?.kind && (
          <span className={`${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
            <span className={`font-semibold ${desktopLightMode ? "text-gray-700" : "text-gray-400"}`}>kind</span>{" "}{job.kind}
          </span>
        )}
        {job?.estimatedCost && (
          <span className={`${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
            <span className={`font-semibold ${desktopLightMode ? "text-gray-700" : "text-gray-400"}`}>cost</span>{" "}{job.estimatedCost}
          </span>
        )}
        {typeof job?.progress === "number" && (
          <span className={`${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
            <span className={`font-semibold ${desktopLightMode ? "text-gray-700" : "text-gray-400"}`}>progress</span>{" "}{Math.round(job.progress)}%
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className={`px-4 py-6 text-center text-[10px] ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
          No log entries yet.
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-72 overflow-y-auto px-4 pb-3 space-y-1.5 font-mono"
        >
          {logs.map((entry, idx) => {
            const meta = logLevelMeta[entry.level] || logLevelMeta.info;
            return (
              <div key={`${entry.at || idx}-${idx}`} className="flex items-start gap-2 text-[10px] leading-relaxed">
                <span
                  className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    desktopLightMode ? meta.dotLight : meta.dotDark
                  }`}
                />
                <span className={`flex-shrink-0 tabular-nums ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
                  {formatTimestamp(entry.at)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`${desktopLightMode ? meta.textLight : meta.textDark} break-words`}>
                    {entry.message || "(empty)"}
                  </div>
                  {entry.details && (
                    <pre
                      className={`mt-1 px-2 py-1 rounded text-[9px] overflow-x-auto whitespace-pre-wrap break-words ${
                        desktopLightMode
                          ? "bg-white/80 border border-gray-100 text-gray-600"
                          : "bg-black/30 border border-white/5 text-gray-400"
                      }`}
                    >
                      {typeof entry.details === "string"
                        ? entry.details
                        : (() => { try { return JSON.stringify(entry.details, null, 2); } catch { return String(entry.details); } })()}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {job?.error && (
        <div
          className={`mx-4 mb-3 flex items-start gap-2 px-3 py-2 rounded-lg text-[10px] ${
            desktopLightMode ? "bg-red-50 border border-red-100 text-red-700" : "bg-red-500/10 border border-red-500/20 text-red-300"
          }`}
        >
          <AlertTriangleIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1 break-words">
            <div className="font-semibold mb-0.5">Error</div>
            <div className="font-mono">{job.error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function JobCenterPanel({
  jobs,
  isOpen,
  onClose,
  onCancel,
  onClear,
  desktopLightMode,
}) {
  const runningCount = jobs.filter((job) => job.status === "running" || job.status === "queued").length;
  const [expandedJobId, setExpandedJobId] = useState(null);
  const expandedJob = expandedJobId ? jobs.find((job) => job.id === expandedJobId) || null : null;
  // Derive the "actually expanded" id from the resolved job — if the user's
  // selection disappears (e.g. Clear finished), the drawer closes naturally
  // without needing an effect to sync state.
  const effectiveExpandedId = expandedJob?.id || null;

  // The panel grows wider when a job is expanded so the log drawer has room
  // to breathe — closes back to the standard width when no job is selected.
  const panelWidthClass = effectiveExpandedId ? "w-[36rem]" : "w-[28rem]";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="job-center"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-14 right-3 ${panelWidthClass} max-w-[calc(100vw-1.5rem)] rounded-[24px] border backdrop-blur-2xl shadow-2xl overflow-hidden ${
            desktopLightMode ? "border-white/75 bg-white/[0.96] text-slate-950 shadow-slate-900/20" : "border-white/[0.10] bg-slate-950/[0.90] text-white shadow-black/40"
          }`}
          style={{ zIndex: 99999 }}
        >
          <div className={`flex items-center justify-between px-4 py-3.5 border-b ${
            desktopLightMode
              ? "border-slate-200/70 bg-gradient-to-r from-white via-violet-50/80 to-cyan-50/50"
              : "border-white/[0.08] bg-gradient-to-r from-white/[0.07] via-violet-400/[0.06] to-cyan-400/[0.05]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${desktopLightMode ? "bg-violet-100 text-violet-700" : "bg-violet-400/[0.14] text-violet-200"}`}>
                <ActivityIcon className="w-4 h-4" />
              </div>
              <div>
                <div className={`text-sm font-semibold ${desktopLightMode ? "text-slate-950" : "text-white"}`}>Job Center</div>
                <div className={`text-[11px] ${desktopLightMode ? "text-slate-500" : "text-white/[0.44]"}`}>{runningCount} active · {jobs.length} total</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {jobs.length > 0 && (
                <button
                  onClick={onClear}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${desktopLightMode ? "bg-white text-slate-500 hover:text-red-500 shadow-sm" : "bg-white/[0.06] text-white/[0.44] hover:text-red-300"}`}
                >
                  Clear finished
                </button>
              )}
              <button onClick={onClose} className={`rounded-full p-1.5 transition-colors ${desktopLightMode ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700" : "text-white/40 hover:bg-white/[0.08] hover:text-white"}`}>
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className={`px-4 py-8 text-center ${desktopLightMode ? "text-gray-400" : "text-gray-500"}`}>
              <ClockIcon className="w-7 h-7 mx-auto mb-2 opacity-40" />
              <div className="text-xs font-medium">No generation jobs yet</div>
              <div className="text-[10px] mt-1">New prompts, images, videos, research, and CRISPR edits will appear here.</div>
            </div>
          ) : (
            <div className="overflow-y-auto p-2.5 space-y-1" style={{ maxHeight: effectiveExpandedId ? "28rem" : "25rem" }}>
              {jobs.map((job) => {
                const meta = statusMeta[job.status] || statusMeta.running;
                const canCancel = job.status === "running" || job.status === "queued";
                const isExpanded = effectiveExpandedId === job.id;
                return (
                  <div key={job.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedJobId((prev) => (prev === job.id ? null : job.id))}
                      className={`w-full rounded-2xl border text-left px-3 py-3 transition-colors ${
                        isExpanded
                          ? desktopLightMode
                            ? "border-violet-100 bg-violet-50/80"
                            : "border-violet-300/14 bg-violet-400/10"
                          : desktopLightMode
                            ? "border-transparent hover:border-slate-200 hover:bg-slate-50"
                            : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.045]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${meta.dot} ${canCancel ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold truncate ${desktopLightMode ? "text-gray-800" : "text-gray-200"}`}>{job.title || "Untitled job"}</span>
                            <span className={`text-[9px] font-bold uppercase ${desktopLightMode ? meta.lightColor : meta.color}`}>{meta.label}</span>
                          </div>
                          <div className={`mt-0.5 text-[10px] leading-relaxed ${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>
                            {job.phase || job.kind || "Working"}{job.model ? ` · ${job.model}` : ""}{job.provider ? ` · ${job.provider}` : ""}
                          </div>
                          {job.error && !isExpanded && (
                            <div className="mt-1 flex items-start gap-1.5 text-[10px] text-red-400">
                              <AlertTriangleIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{job.error}</span>
                            </div>
                          )}
                          <div className={`mt-2 h-1 rounded-full overflow-hidden ${desktopLightMode ? "bg-gray-100" : "bg-white/10"}`}>
                            <div
                              className={`h-full rounded-full ${job.status === "error" ? "bg-red-500" : job.status === "success" ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`}
                              style={{ width: `${Math.max(4, Math.min(100, job.progress || 8))}%` }}
                            />
                          </div>
                          <div className={`mt-1.5 flex items-center justify-between text-[9px] ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
                            <span>{formatAge(job.updatedAt || job.createdAt)}</span>
                            <span className="flex items-center gap-1.5">
                              {Array.isArray(job.logs) && job.logs.length > 0 && (
                                <span className={`${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
                                  {job.logs.length} log{job.logs.length === 1 ? "" : "s"}
                                </span>
                              )}
                              {job.estimatedCost && <span>{job.estimatedCost}</span>}
                              <ChevronDownIcon
                                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""} ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}
                              />
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {canCancel ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); onCancel(job.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-500 hover:text-red-300 hover:bg-red-500/10"}`}
                              title="Cancel job"
                            >
                              <SquareIcon className="w-3 h-3 fill-current" />
                            </button>
                          ) : job.status === "success" ? (
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400 mt-1" />
                          ) : (
                            <RefreshCwIcon className="w-3.5 h-3.5 text-gray-500 mt-1" />
                          )}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`drawer-${job.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <JobLogDrawer job={job} desktopLightMode={desktopLightMode} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`flex items-center gap-2 px-4 py-2 border-t ${desktopLightMode ? "border-slate-200/70 bg-slate-50/70" : "border-white/[0.06] bg-white/[0.02]"}`}>
            <TrashIcon className={`w-3 h-3 ${desktopLightMode ? "text-gray-300" : "text-gray-700"}`} />
            <span className={`text-[9px] ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>
              {effectiveExpandedId ? "Click a job again to collapse the log drawer." : "Click any job to see the live log timeline."}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
