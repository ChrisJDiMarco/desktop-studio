"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  Code2Icon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { downloadProjectZip } from "@/lib/project-zip";

function buildTree(files) {
  const root = { name: "", path: "", type: "dir", children: new Map() };
  for (const file of files || []) {
    const path = String(file?.path || "").replace(/^\/+/, "");
    if (!path) continue;
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const childPath = parts.slice(0, index + 1).join("/");
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: childPath,
          type: isFile ? "file" : "dir",
          children: new Map(),
        });
      }
      node = node.children.get(part);
    });
  }
  const sortNode = (node) => ({
    ...node,
    children: Array.from(node.children.values())
      .map(sortNode)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
  });
  return sortNode(root);
}

function TreeNode({ node, depth, selectedPath, onSelect, desktopLightMode }) {
  const isFile = node.type === "file";
  const selected = isFile && node.path === selectedPath;
  const Icon = isFile ? FileTextIcon : FolderIcon;

  return (
    <div>
      {node.name && (
        <button
          type="button"
          onClick={() => isFile && onSelect(node.path)}
          className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
            selected
              ? desktopLightMode
                ? "bg-blue-50 text-blue-700"
                : "bg-cyan-400/12 text-cyan-200"
              : desktopLightMode
                ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                : "text-white/58 hover:bg-white/8 hover:text-white"
          }`}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isFile ? "opacity-70" : desktopLightMode ? "text-amber-500" : "text-amber-300"}`} />
          <span className="truncate">{node.name}</span>
        </button>
      )}
      {!isFile && node.children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={node.name ? depth + 1 : depth}
          selectedPath={selectedPath}
          onSelect={onSelect}
          desktopLightMode={desktopLightMode}
        />
      ))}
    </div>
  );
}

function fallbackPreview(project) {
  const files = Array.isArray(project?.files) ? project.files : [];
  const list = files.map((file) => `<li>${String(file.path || "").replace(/</g, "&lt;")}</li>`).join("");
  const title = String(project?.title || "Generated App").replace(/</g, "&lt;");
  const description = String(project?.description || "Next.js project generated from a desktop artifact.").replace(/</g, "&lt;");
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; display: grid; place-items: center; }
      main { width: min(720px, calc(100vw - 48px)); border: 1px solid rgba(148, 163, 184, .24); border-radius: 18px; background: rgba(15, 23, 42, .82); padding: 32px; box-shadow: 0 24px 90px rgba(0, 0, 0, .35); }
      h1 { margin: 0 0 10px; font-size: 34px; letter-spacing: -0.02em; }
      p { margin: 0 0 24px; color: #94a3b8; line-height: 1.6; }
      ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; padding: 0; list-style: none; }
      li { border: 1px solid rgba(148, 163, 184, .18); border-radius: 10px; padding: 10px 12px; color: #bae6fd; background: rgba(14, 165, 233, .08); font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${description}</p>
      <ul>${list}</ul>
    </main>
  </body>
</html>`;
}

export function AppProjectModal({
  project,
  isOpen,
  onClose,
  desktopLightMode = false,
}) {
  const files = useMemo(() => Array.isArray(project?.files) ? project.files : [], [project]);
  const tree = useMemo(() => buildTree(files), [files]);
  const initialPath = project?.entryPath || project?.entry || files[0]?.path || "";
  const [selected, setSelected] = useState({ projectId: null, path: "" });
  const selectedPath = selected.projectId === project?.id && selected.path ? selected.path : initialPath;
  const [tab, setTab] = useState("code");
  const [copied, setCopied] = useState(false);

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) || files[0] || null,
    [files, selectedPath]
  );
  const previewHtml = project?.previewHtml || fallbackPreview(project);

  const copySelectedFile = async () => {
    if (!selectedFile?.content) return;
    await navigator.clipboard?.writeText(selectedFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/58 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border shadow-2xl ${
              desktopLightMode
                ? "border-gray-200 bg-white text-gray-900"
                : "border-white/12 bg-gray-950 text-white"
            }`}
            style={{
              width: "90vw",
              height: "90vh",
              maxWidth: "90vw",
              maxHeight: "90vh",
            }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              desktopLightMode ? "border-gray-200 bg-gray-50" : "border-white/10 bg-white/[0.035]"
            }`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    desktopLightMode ? "bg-blue-100 text-blue-700" : "bg-cyan-400/12 text-cyan-300"
                  }`}>
                    <Code2Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold">{project?.title || "Generated App"}</h2>
                    <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${desktopLightMode ? "text-gray-500" : "text-white/42"}`}>
                      <span>{files.length} files</span>
                      <span>{project?.slug || "next-app"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("code")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    tab === "code"
                      ? desktopLightMode ? "bg-gray-900 text-white" : "bg-white text-gray-950"
                      : desktopLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/55 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Code2Icon className="h-3.5 w-3.5" />
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    tab === "preview"
                      ? desktopLightMode ? "bg-gray-900 text-white" : "bg-white text-gray-950"
                      : desktopLightMode ? "text-gray-500 hover:bg-gray-100" : "text-white/55 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => downloadProjectZip(project)}
                  disabled={!files.length}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-45 ${
                    desktopLightMode
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-cyan-500 text-gray-950 hover:bg-cyan-400"
                  }`}
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Download ZIP
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-lg p-2 transition-colors ${
                    desktopLightMode ? "text-gray-500 hover:bg-gray-100 hover:text-gray-900" : "text-white/45 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!project ? (
              <div className="flex flex-1 items-center justify-center">
                <div className={`flex items-center gap-2 text-sm ${desktopLightMode ? "text-gray-500" : "text-white/45"}`}>
                  <RefreshCwIcon className="h-4 w-4 animate-spin" />
                  Loading app project
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
                <aside className={`min-h-0 overflow-y-auto border-r p-3 ${desktopLightMode ? "border-gray-200 bg-gray-50/65" : "border-white/10 bg-black/20"}`}>
                  <div className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-widest ${desktopLightMode ? "text-gray-400" : "text-white/28"}`}>
                    Files
                  </div>
                  <TreeNode
                    node={tree}
                    depth={0}
                    selectedPath={selectedFile?.path || ""}
                    onSelect={(path) => {
                      setSelected({ projectId: project?.id || null, path });
                      setTab("code");
                      setCopied(false);
                    }}
                    desktopLightMode={desktopLightMode}
                  />
                </aside>

                <main className="grid min-h-0 min-w-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]">
                  <section className={`min-h-0 min-w-0 border-r ${tab === "preview" ? "hidden xl:block" : "block"} ${desktopLightMode ? "border-gray-200" : "border-white/10"}`}>
                    <div className={`flex h-11 items-center justify-between border-b px-4 ${desktopLightMode ? "border-gray-200 bg-white" : "border-white/10 bg-gray-950"}`}>
                      <div className="min-w-0">
                        <div className={`truncate font-mono text-xs ${desktopLightMode ? "text-gray-700" : "text-white/72"}`}>
                          {selectedFile?.path || "No file selected"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={copySelectedFile}
                        disabled={!selectedFile}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                          desktopLightMode ? "text-gray-500 hover:bg-gray-100 hover:text-gray-900" : "text-white/45 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        {copied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className={`h-[calc(100%-44px)] overflow-auto p-4 text-[12px] leading-6 ${
                      desktopLightMode ? "bg-white text-gray-800" : "bg-[#05070b] text-slate-200"
                    }`}>
                      <code>{selectedFile?.content || ""}</code>
                    </pre>
                  </section>

                  <section className={`min-h-0 min-w-0 ${tab === "code" ? "hidden xl:block" : "block"}`}>
                    <div className={`flex h-11 items-center justify-between border-b px-4 ${desktopLightMode ? "border-gray-200 bg-white" : "border-white/10 bg-gray-950"}`}>
                      <div className={`flex items-center gap-2 text-xs font-semibold ${desktopLightMode ? "text-gray-700" : "text-white/72"}`}>
                        <EyeIcon className="h-3.5 w-3.5" />
                        Preview
                      </div>
                    </div>
                    <iframe
                      title={`${project?.title || "Generated App"} preview`}
                      srcDoc={previewHtml}
                      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                      className="h-[calc(100%-44px)] w-full border-0 bg-white"
                    />
                  </section>
                </main>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
