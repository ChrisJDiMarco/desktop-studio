"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SearchIcon, XIcon } from "lucide-react";

export function CommandPalette({ isOpen, onClose, commands, desktopLightMode }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const haystack = `${cmd.title} ${cmd.subtitle || ""} ${cmd.group || ""} ${(cmd.keywords || []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="command-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-start justify-center bg-black/45 backdrop-blur-sm px-4 pt-[12vh]"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
              desktopLightMode ? "bg-white border-gray-200 shadow-black/20" : "bg-gray-950/98 border-white/12 shadow-black/70"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${desktopLightMode ? "border-gray-100" : "border-white/8"}`}>
              <SearchIcon className={`w-4 h-4 flex-shrink-0 ${desktopLightMode ? "text-gray-400" : "text-white/40"}`} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "Enter" && filtered[0] && !filtered[0].disabled) {
                    filtered[0].run();
                    onClose();
                  }
                }}
                placeholder="Search commands, panels, layouts, and workflows"
                className={`flex-1 bg-transparent border-none outline-none text-sm ${desktopLightMode ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-white/35"}`}
              />
              <button onClick={onClose} className={`p-1 rounded-md transition-colors ${desktopLightMode ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100" : "text-white/40 hover:text-white hover:bg-white/10"}`}>
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className={`px-4 py-8 text-center text-xs ${desktopLightMode ? "text-gray-400" : "text-gray-500"}`}>No matching commands</div>
              ) : (
                filtered.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      disabled={cmd.disabled}
                      onClick={() => {
                        cmd.run();
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        desktopLightMode ? "hover:bg-gray-50 text-gray-800" : "hover:bg-white/[0.06] text-gray-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${desktopLightMode ? "bg-gray-100 text-gray-500" : "bg-white/8 text-white/55"}`}>
                        {Icon ? <Icon className="w-4 h-4" /> : <SearchIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{cmd.title}</span>
                          {cmd.group && <span className={`text-[9px] uppercase tracking-wider ${desktopLightMode ? "text-gray-400" : "text-gray-600"}`}>{cmd.group}</span>}
                        </div>
                        {cmd.subtitle && (
                          <div className={`mt-0.5 text-[10px] truncate ${desktopLightMode ? "text-gray-500" : "text-gray-500"}`}>{cmd.subtitle}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${desktopLightMode ? "bg-gray-100 text-gray-400" : "bg-white/8 text-gray-500"}`}>{cmd.shortcut}</span>
                      )}
                    </button>
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
