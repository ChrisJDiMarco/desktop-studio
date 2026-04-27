"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BookmarkIcon, PlusIcon, TrashIcon, XIcon, CheckIcon, EditIcon } from "lucide-react";

const STARTER_RULES = [
  "Always use semantic HTML (header, nav, main, section, article, footer) instead of generic divs.",
  "Never invent fake data when the prompt is ambiguous — ask the user to clarify in the response.",
  "Avoid generic AI-design tropes: purple gradients, glassmorphism, fake browser chrome, lorem ipsum.",
  "Use Inter or system fonts for all UI text unless the design system specifies otherwise.",
  "All interactive elements must have :hover and :focus-visible states.",
];

export function ProjectRulesModal({
  rules,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
  onClose,
  desktopLightMode,
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const dark = !desktopLightMode;
  const enabledCount = rules.filter((r) => r.enabled).length;

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setEditingText(rule.text);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const text = editingText.trim();
    if (text) onUpdate(editingId, { text });
    setEditingId(null);
    setEditingText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[99999] flex items-center justify-center"
      style={{ background: dark ? "rgba(0,0,0,0.6)" : "rgba(20,20,30,0.4)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-[640px] max-w-[94vw] max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          dark ? "bg-gray-950 border-white/12" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0 ${
            dark ? "border-white/8 bg-amber-500/8" : "border-gray-100 bg-amber-50/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookmarkIcon className={`w-4 h-4 ${dark ? "text-amber-300" : "text-amber-600"}`} />
            <div>
              <div className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Project Rules</div>
              <div className={`text-[10px] ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Hard requirements layered onto every AI call · {enabledCount}/{rules.length} active
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className={`p-4 border-b flex-shrink-0 ${dark ? "border-white/8 bg-white/[0.02]" : "border-gray-100 bg-gray-50/60"}`}>
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder='Add a new rule. e.g. "Always include a clear primary CTA above the fold"'
              rows={2}
              className={`flex-1 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none transition-colors ${
                dark
                  ? "bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:border-amber-500/50"
                  : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-500"
              }`}
            />
            <button
              onClick={handleAdd}
              disabled={!draft.trim()}
              className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 self-stretch disabled:opacity-40 ${
                dark
                  ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
              title="Add rule (⌘+Enter)"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          <div className={`mt-1.5 text-[10px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
            ⌘/Ctrl+Enter to add · Each rule is treated as a hard requirement by every AI call.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rules.length === 0 ? (
            <div className="px-6 py-8">
              <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                Try a starter rule
              </div>
              <div className="space-y-1.5">
                {STARTER_RULES.map((text) => (
                  <button
                    key={text}
                    onClick={() => onAdd(text)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[11px] leading-snug transition-all ${
                      dark
                        ? "bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 border border-white/[0.04]"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100"
                    }`}
                  >
                    + {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {rules.map((rule, idx) => {
                const isEditing = editingId === rule.id;
                return (
                  <div
                    key={rule.id}
                    className={`group flex items-start gap-3 px-4 py-2.5 transition-colors ${
                      rule.enabled
                        ? dark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"
                        : dark ? "hover:bg-white/[0.02] opacity-60" : "hover:bg-gray-50 opacity-50"
                    }`}
                  >
                    <button
                      onClick={() => onToggle(rule.id)}
                      className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        rule.enabled
                          ? dark ? "bg-amber-500 border-amber-500" : "bg-amber-500 border-amber-500"
                          : dark ? "border-white/20 hover:border-amber-400" : "border-gray-300 hover:border-amber-500"
                      }`}
                      title={rule.enabled ? "Disable rule" : "Enable rule"}
                    >
                      {rule.enabled && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                        Rule {idx + 1}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitEdit(); }
                            if (e.key === "Escape") { e.preventDefault(); setEditingId(null); setEditingText(""); }
                          }}
                          rows={2}
                          autoFocus
                          className={`w-full text-[11px] leading-snug resize-none px-2 py-1 rounded-md focus:outline-none ${
                            dark ? "bg-black/40 border border-amber-400/40 text-white" : "bg-white border border-amber-500 text-gray-900"
                          }`}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(rule)}
                          className={`text-[11px] leading-snug cursor-text ${dark ? "text-gray-200" : "text-gray-800"}`}
                        >
                          {rule.text}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(rule)}
                          className={`p-1 rounded transition-colors ${dark ? "text-gray-500 hover:text-amber-300 hover:bg-white/5" : "text-gray-400 hover:text-amber-600 hover:bg-gray-100"}`}
                          title="Edit"
                        >
                          <EditIcon className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(rule.id)}
                        className={`p-1 rounded transition-colors ${dark ? "text-gray-500 hover:text-red-300 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                        title="Delete rule"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={`px-5 py-3 border-t flex justify-between items-center gap-2 flex-shrink-0 ${
            dark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50/60"
          }`}
        >
          <div className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
            Auto-saved · Combined with the Brand Prompt and Design System on every AI call.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
