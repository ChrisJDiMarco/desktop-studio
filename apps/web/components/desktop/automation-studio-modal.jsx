"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  GitBranchIcon,
  ImageIcon,
  LayoutIcon,
  NetworkIcon,
  PlayIcon,
  PlusIcon,
  SendIcon,
  ServerIcon,
  SparklesIcon,
  SquareIcon,
  TrashIcon,
  WandIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';

const summarizePayload = (value, limit = 120) => {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  } catch {
    const text = String(value ?? '');
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  }
};

const timeAgo = (ts) => {
  if (!ts) return 'just now';
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const getDraftEdges = (draft) => {
  if (!draft) return [];
  if (Array.isArray(draft.edges)) return draft.edges;
  if (Array.isArray(draft.connections)) return draft.connections;
  if (Array.isArray(draft.automationEdges)) return draft.automationEdges;
  return [];
};

const getDraftStacks = (draft) => {
  if (!draft) return [];
  if (Array.isArray(draft.stacks)) return draft.stacks;
  if (Array.isArray(draft.suggestedStacks)) return draft.suggestedStacks;
  if (Array.isArray(draft.chains)) return draft.chains;
  return [];
};

const getDraftNotes = (draft) => {
  if (!draft) return [];
  if (Array.isArray(draft.notes)) return draft.notes;
  if (Array.isArray(draft.risks)) return draft.risks;
  if (Array.isArray(draft.assumptions)) return draft.assumptions;
  return [];
};

export function AutomationStudioModal({
  isOpen,
  onClose,
  desktopLightMode,
  artifacts,
  connections,
  stacks,
  selectedStackId,
  setSelectedStackId,
  stackAgentInput,
  setStackAgentInput,
  stackAnalysisResult,
  automationDraft,
  automationStudioTab,
  setAutomationStudioTab,
  isAnalyzingStack,
  isRunningStackAgent,
  isDesigningAutomation,
  agents,
  agentRuns,
  busKeys,
  busState,
  busMeta,
  busActivity,
  onAnalyzeWorkspace,
  onDesignAutomation,
  onApplyAutomationDraft,
  onDryRunAutomationDraft,
  onRunAutomationDraft,
  onRunAutomationChain,
  onRunStackAgent,
  onCreateStack,
  onCreateStackFromConnections,
  onDeleteStack,
  onBatchCrispr,
  onRemoveConnection,
  onRunAutomationEdge,
  onInvokeArtifactAgent,
  onFocusArtifact,
  automationRunMode,
  automationInterval,
  connectedApps,
}) {
  const [batchInputs, setBatchInputs] = useState({});
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const liveAgentIds = useMemo(() => new Set((agents || []).map(agent => agent.artifactId)), [agents]);
  const reactArtifacts = useMemo(() => artifacts.filter(a => a.language === 'react'), [artifacts]);
  const selectedStack = stacks.find(stack => stack.id === selectedStackId) || null;
  const selectedStackArtifacts = selectedStack ? artifacts.filter(a => selectedStack.artifactIds?.includes(a.id)) : [];
  const runningRuns = agentRuns.filter(run => !['success', 'error', 'skipped', 'canceled'].includes(run.status));
  const failedRuns = agentRuns.filter(run => run.status === 'error');
  const draftEdges = getDraftEdges(automationDraft);
  const draftStacks = getDraftStacks(automationDraft);
  const draftNotes = getDraftNotes(automationDraft);

  const getArtifact = (id) => artifacts.find(a => a.id === id);
  const resolveArtifact = (labelOrId) => {
    if (!labelOrId) return null;
    const raw = String(labelOrId).trim();
    const lower = raw.toLowerCase();
    return artifacts.find(a => a.id === raw) ||
      artifacts.find(a => a.title?.toLowerCase() === lower) ||
      artifacts.find(a => {
        const title = a.title?.toLowerCase();
        return title && (title.includes(lower) || lower.includes(title));
      }) ||
      null;
  };
  const getConnectionLabel = (conn) => {
    const from = getArtifact(conn.fromId);
    const to = getArtifact(conn.toId);
    return `${from?.title || 'Unknown'} -> ${to?.title || 'Unknown'}`;
  };
  const statusClass = (status) => {
    if (status === 'success') return desktopLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
    if (status === 'error') return desktopLightMode ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-500/15 text-red-300 border-red-500/25';
    if (status === 'skipped') return desktopLightMode ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/8 text-gray-400 border-white/10';
    return desktopLightMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/15 text-blue-300 border-blue-500/25';
  };

  const shellClass = desktopLightMode
    ? 'bg-white text-gray-900 border-gray-200 shadow-2xl'
    : 'bg-gray-950/98 text-white border-white/10 shadow-2xl shadow-black/60';
  const panelClass = desktopLightMode
    ? 'bg-white border-gray-200'
    : 'bg-white/[0.045] border-white/10';
  const subtlePanelClass = desktopLightMode
    ? 'bg-gray-50 border-gray-200'
    : 'bg-black/20 border-white/8';
  const labelClass = desktopLightMode
    ? 'text-gray-500'
    : 'text-gray-500';
  const bodyTextClass = desktopLightMode
    ? 'text-gray-600'
    : 'text-gray-300';
  const mutedTextClass = desktopLightMode
    ? 'text-gray-400'
    : 'text-gray-500';

  const requiredApps = Array.isArray(automationDraft?.requiredApps) ? automationDraft.requiredApps : [];
  const connectedToolkitSet = useMemo(() => {
    return new Set((connectedApps || [])
      .filter(toolkit => toolkit?.isConnected || toolkit?.connected || toolkit?.connectedAccountId)
      .flatMap(toolkit => [toolkit.slug, toolkit.toolkit, toolkit.name, toolkit.label])
      .filter(Boolean)
      .map(value => String(value).toLowerCase()));
  }, [connectedApps]);
  const missingRequiredApps = requiredApps.filter(app => {
    const toolkit = String(app.toolkit || app.slug || app.name || '').toLowerCase();
    return toolkit && !connectedToolkitSet.has(toolkit);
  });
  const firstDraftEdge = draftEdges[0] || null;
  const runNow = automationDraft?.runNow || {};
  const draftSource = resolveArtifact(
    runNow.targetId ||
    runNow.targetTitle ||
    runNow.agent ||
    firstDraftEdge?.fromId ||
    firstDraftEdge?.fromTitle ||
    firstDraftEdge?.from ||
    firstDraftEdge?.sourceTitle ||
    firstDraftEdge?.source
  );
  const unresolvedDraftEdges = automationDraft
    ? draftEdges.filter(edge => {
        const from = resolveArtifact(edge.fromId || edge.fromTitle || edge.from || edge.sourceTitle || edge.source);
        const to = resolveArtifact(edge.toId || edge.toTitle || edge.to || edge.targetTitle || edge.target);
        return !from || !to || from.id === to.id;
      })
    : [];
  const preflightItems = [
    {
      label: 'Runnable source',
      detail: automationDraft ? (draftSource ? draftSource.title : 'No source Thinklet resolved') : 'Create a draft first',
      status: automationDraft && draftSource ? 'ok' : 'warn',
    },
    {
      label: 'Edge contracts',
      detail: automationDraft ? `${Math.max(0, draftEdges.length - unresolvedDraftEdges.length)} of ${draftEdges.length} edge${draftEdges.length !== 1 ? 's' : ''} resolve cleanly` : 'No draft edges yet',
      status: automationDraft && unresolvedDraftEdges.length === 0 && draftEdges.length > 0 ? 'ok' : 'warn',
    },
    {
      label: 'Connected apps',
      detail: requiredApps.length === 0 ? 'No external app requirement detected' : missingRequiredApps.length === 0 ? `${requiredApps.length} required app${requiredApps.length !== 1 ? 's' : ''} connected` : `${missingRequiredApps.length} app${missingRequiredApps.length !== 1 ? 's' : ''} need connection`,
      status: missingRequiredApps.length === 0 ? 'ok' : 'warn',
    },
    {
      label: 'Run policy',
      detail: automationRunMode === 'interval' ? `Scheduled every ${automationInterval || 30} min` : automationRunMode === 'bus' ? 'Waits for an event trigger' : 'Runs once on demand',
      status: 'ok',
    },
  ];
  const graphArtifactIds = useMemo(() => {
    const ids = connections.length
      ? connections.flatMap(conn => [conn.fromId, conn.toId])
      : reactArtifacts.map(artifact => artifact.id);
    return [...new Set(ids)].filter(Boolean);
  }, [connections, reactArtifacts]);
  const graphLevels = useMemo(() => {
    const levels = {};
    const graphIdSet = new Set(graphArtifactIds);
    const outgoing = {};
    const incomingCount = {};
    graphArtifactIds.forEach(id => { outgoing[id] = []; incomingCount[id] = 0; });
    connections.forEach(conn => {
      if (!graphIdSet.has(conn.fromId) || !graphIdSet.has(conn.toId)) return;
      outgoing[conn.fromId]?.push(conn.toId);
      incomingCount[conn.toId] = (incomingCount[conn.toId] || 0) + 1;
    });
    const roots = graphArtifactIds.filter(id => !incomingCount[id]);
    const queue = (roots.length ? roots : graphArtifactIds.slice(0, 1)).map(id => ({ id, level: 0 }));
    const seen = new Set();
    while (queue.length) {
      const item = queue.shift();
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      levels[item.id] = Math.max(levels[item.id] || 0, item.level);
      (outgoing[item.id] || []).forEach(nextId => queue.push({ id: nextId, level: item.level + 1 }));
    }
    graphArtifactIds.forEach(id => {
      if (levels[id] === undefined) levels[id] = Math.max(0, ...Object.values(levels), 0) + 1;
    });
    return levels;
  }, [connections, graphArtifactIds]);
  const graphColumns = useMemo(() => {
    const columns = [];
    graphArtifactIds.forEach(id => {
      const artifact = artifacts.find(item => item.id === id);
      if (!artifact) return;
      const level = graphLevels[id] || 0;
      if (!columns[level]) columns[level] = [];
      columns[level].push(artifact);
    });
    return columns.filter(Boolean);
  }, [artifacts, graphArtifactIds, graphLevels]);
  const selectedEdge = connections.find(conn => conn.id === selectedEdgeId) || connections[0] || null;
  const selectedRun = agentRuns.find(run => run.id === selectedRunId) || agentRuns[0] || null;
  const getLatestRunForArtifact = (artifactId) => agentRuns.find(run => run.targetArtifactId === artifactId || run.sourceArtifactId === artifactId);

  const tabs = [
    { id: 'builder', label: 'Architect', icon: BrainIcon },
    { id: 'graph', label: 'Graph', icon: NetworkIcon },
    { id: 'runs', label: 'Runs', icon: ActivityIcon },
    { id: 'chains', label: 'Chains', icon: GitBranchIcon },
  ];

  const promptChips = [
    'Turn these Thinklets into a lead capture and follow-up workflow',
    'Create a research to dashboard automation',
    'Connect the strongest source agent to every useful downstream agent',
    'Make a review loop where one Thinklet critiques another and publishes fixes',
  ];

  const quickCrisprPresets = [
    { label: 'Dark Mode', instruction: 'Convert to a sophisticated dark mode design. Use dark backgrounds, light text, proper contrast, and update all surfaces, borders, and buttons.' },
    { label: 'Light Mode', instruction: 'Convert to a clean light mode design. Use white/off-white backgrounds, dark text, subtle borders, and restrained shadows.' },
    { label: 'Bigger Text', instruction: 'Increase font sizes and hierarchy by roughly 20%. Make headings stronger and body text easier to read.' },
    { label: 'More Spacing', instruction: 'Increase padding and margins throughout. Add better separation between sections and controls.' },
    { label: 'Polish UI', instruction: 'Improve visual polish, alignment, hover states, empty states, and content density while preserving functionality.' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="automation-studio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-[80] flex items-center justify-center p-[5vh]"
        >
          <button
            type="button"
            aria-label="Close Automation Studio"
            onClick={onClose}
            className={`absolute inset-0 ${desktopLightMode ? 'bg-gray-950/35' : 'bg-black/65'} backdrop-blur-md`}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`relative w-[90vw] h-[90vh] max-w-[1560px] rounded-2xl border overflow-hidden backdrop-blur-2xl flex flex-col ${shellClass}`}
          >
            <div className={`px-6 py-4 border-b ${desktopLightMode ? 'border-gray-100 bg-gradient-to-r from-cyan-50 via-white to-violet-50' : 'border-white/10 bg-gradient-to-r from-cyan-500/10 via-white/[0.025] to-violet-500/10'}`}>
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <BrainIcon className="w-6 h-6 text-white" />
                    <span className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-xl font-black tracking-tight ${desktopLightMode ? 'text-gray-950' : 'text-white'}`}>Automation Studio</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${desktopLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                        Agentic Ready
                      </span>
                    </div>
                    <p className={`text-xs mt-1 truncate ${labelClass}`}>
                      AI architect, directed edges, live runs, bus events, and batch CRISPR chains in one control room.
                    </p>
                  </div>
                </div>
                <div className="hidden lg:grid grid-cols-5 gap-2 min-w-[460px]">
                  {[
                    { label: 'Thinklets', value: reactArtifacts.length, icon: LayoutIcon, tone: 'cyan' },
                    { label: 'Agents', value: agents.length, icon: BrainIcon, tone: 'emerald' },
                    { label: 'Edges', value: connections.length, icon: GitBranchIcon, tone: 'blue' },
                    { label: 'Runs', value: agentRuns.length, icon: ActivityIcon, tone: 'violet' },
                    { label: 'Keys', value: busKeys.length, icon: ZapIcon, tone: 'amber' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white/85 border-white shadow-sm' : 'bg-white/[0.05] border-white/8'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] uppercase tracking-wider ${mutedTextClass}`}>{item.label}</span>
                          <Icon className={`w-3 h-3 ${item.tone === 'emerald' ? 'text-emerald-400' : item.tone === 'blue' ? 'text-blue-400' : item.tone === 'violet' ? 'text-violet-400' : item.tone === 'amber' ? 'text-amber-400' : 'text-cyan-400'}`} />
                        </div>
                        <div className={`text-lg font-black tabular-nums ${desktopLightMode ? 'text-gray-950' : 'text-white'}`}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${desktopLightMode ? 'text-gray-400 hover:text-gray-800 hover:bg-white' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}>
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4 overflow-x-auto">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = automationStudioTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAutomationStudioTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        active
                          ? desktopLightMode ? 'bg-gray-950 text-white border-gray-950 shadow-sm' : 'bg-white text-gray-950 border-white'
                          : desktopLightMode ? 'bg-white/70 text-gray-500 border-white hover:text-gray-900' : 'bg-white/5 text-gray-400 border-white/8 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`flex-1 overflow-hidden ${desktopLightMode ? 'bg-gray-50/70' : 'bg-gray-950'}`}>
              {automationStudioTab === 'builder' && (
                <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.45fr)] gap-4 p-4 overflow-y-auto xl:overflow-hidden">
                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div className="flex items-center gap-2">
                        <BrainIcon className="w-4 h-4 text-violet-400" />
                        <span className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>AI Automation Architect</span>
                      </div>
                      <p className={`text-[11px] mt-1 ${mutedTextClass}`}>Ask for an automation, then apply the directed edges and chains it proposes.</p>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                      <div className={`rounded-2xl border overflow-hidden ${desktopLightMode ? 'bg-white border-gray-200 focus-within:border-violet-300' : 'bg-black/20 border-white/10 focus-within:border-violet-400/60'}`}>
                        <textarea
                          value={stackAgentInput}
                          onChange={(e) => setStackAgentInput(e.target.value)}
                          rows={6}
                          placeholder="Describe the automation you want these Thinklets to perform together..."
                          className={`w-full bg-transparent resize-none px-4 py-3 text-sm leading-relaxed focus:outline-none ${desktopLightMode ? 'text-gray-800 placeholder-gray-400' : 'text-gray-100 placeholder-gray-600'}`}
                        />
                        <div className={`border-t px-3 py-2 flex flex-wrap items-center justify-between gap-2 ${desktopLightMode ? 'border-gray-100 bg-gray-50' : 'border-white/8 bg-white/[0.03]'}`}>
                          <span className={`text-[10px] ${mutedTextClass}`}>{reactArtifacts.length} Thinklet agents available</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onAnalyzeWorkspace(stackAgentInput)}
                              disabled={isAnalyzingStack || artifacts.length === 0}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 ${desktopLightMode ? 'bg-white text-gray-700 border border-gray-200 hover:border-cyan-300' : 'bg-white/8 text-gray-200 border border-white/10 hover:border-cyan-400/40'}`}
                            >
                              <SparklesIcon className={`w-3.5 h-3.5 ${isAnalyzingStack ? 'animate-pulse' : ''}`} />
                              Analyze
                            </button>
                            <button
                              onClick={() => onDesignAutomation(stackAgentInput)}
                              disabled={isDesigningAutomation || artifacts.length === 0}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50"
                            >
                              <BrainIcon className={`w-3.5 h-3.5 ${isDesigningAutomation ? 'animate-pulse' : ''}`} />
                              Architect
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {promptChips.map(chip => (
                          <button
                            key={chip}
                            onClick={() => setStackAgentInput(chip)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${desktopLightMode ? 'bg-white text-gray-500 border-gray-200 hover:text-violet-700 hover:border-violet-200' : 'bg-white/5 text-gray-400 border-white/8 hover:text-violet-300 hover:border-violet-400/30'}`}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>

                      <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span className={`text-[11px] font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-300'}`}>Preflight</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${automationDraft && unresolvedDraftEdges.length === 0 && draftSource ? (desktopLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25') : (desktopLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/25')}`}>
                            {automationDraft && unresolvedDraftEdges.length === 0 && draftSource ? 'Ready' : 'Needs Review'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {preflightItems.map(item => (
                            <div key={item.label} className="flex items-start gap-2">
                              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <div className="min-w-0">
                                <div className={`text-[11px] font-bold ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{item.label}</div>
                                <div className={`text-[10px] leading-relaxed ${mutedTextClass}`}>{item.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {missingRequiredApps.length > 0 && (
                          <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] leading-relaxed ${desktopLightMode ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                            Missing: {missingRequiredApps.map(app => app.name || app.toolkit || app.slug).join(', ')}
                          </div>
                        )}
                      </div>

                      {stackAnalysisResult && (
                        <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <ServerIcon className="w-4 h-4 text-cyan-400" />
                            <span className={`text-[11px] font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-300'}`}>Workspace Analysis</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${bodyTextClass}`}>{stackAnalysisResult.analysis || stackAnalysisResult.workflowIdea || 'Analysis complete.'}</p>
                          {Array.isArray(stackAnalysisResult.agentCapabilities) && stackAnalysisResult.agentCapabilities.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {stackAnalysisResult.agentCapabilities.slice(0, 4).map((capability, idx) => (
                                <div key={`${capability}-${idx}`} className={`text-[11px] flex gap-2 ${mutedTextClass}`}>
                                  <CheckIcon className="w-3 h-3 mt-0.5 text-emerald-400 flex-shrink-0" />
                                  <span>{capability}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {stackAnalysisResult.lastAgentResult && (
                            <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${desktopLightMode ? 'bg-white border-gray-100 text-gray-500' : 'bg-black/20 border-white/8 text-gray-400'}`}>
                              {stackAnalysisResult.lastAgentResult.summary || stackAnalysisResult.lastAgentResult.reasoning || 'Last stack agent run complete.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-rows-[minmax(0,1fr)_minmax(220px,0.62fr)] gap-4 overflow-hidden min-h-[760px] xl:min-h-0">
                    <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                        <div>
                          <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Automation Draft</div>
                          <div className={`text-[11px] mt-0.5 ${mutedTextClass}`}>{automationDraft ? `${draftEdges.length} edge suggestions, ${draftStacks.length} chain suggestions` : 'No draft yet'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onDryRunAutomationDraft?.(automationDraft)}
                            disabled={!automationDraft || isDesigningAutomation}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${desktopLightMode ? 'bg-white text-gray-700 border border-gray-200 hover:border-violet-300' : 'bg-white/8 text-gray-200 border border-white/10 hover:border-violet-400/40'}`}
                          >
                            <ActivityIcon className="w-3.5 h-3.5" />
                            Dry Run
                          </button>
                          <button
                            onClick={() => onRunAutomationDraft(automationDraft)}
                            disabled={!automationDraft || isDesigningAutomation}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${desktopLightMode ? 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300' : 'bg-white/8 text-gray-200 border border-white/10 hover:border-emerald-400/40'}`}
                          >
                            <PlayIcon className="w-3.5 h-3.5" />
                            Run Draft
                          </button>
                          <button
                            onClick={() => onApplyAutomationDraft(automationDraft)}
                            disabled={!automationDraft}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all disabled:opacity-40"
                          >
                            <CheckIcon className="w-3.5 h-3.5" />
                            Apply Draft
                          </button>
                        </div>
                      </div>
                      {!automationDraft ? (
                        <div className={`flex-1 flex items-center justify-center p-8 text-center ${mutedTextClass}`}>
                          <div>
                            <BrainIcon className="w-10 h-10 mx-auto mb-3 opacity-35" />
                            <p className="text-sm font-semibold">Tell the architect what you want automated.</p>
                            <p className="text-xs mt-1">The draft will become real directed Thinklet edges and reusable chains.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className={`rounded-2xl border p-4 ${desktopLightMode ? 'bg-gradient-to-br from-white to-cyan-50 border-cyan-100' : 'bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/20'}`}>
                            <div className={`text-sm font-black ${desktopLightMode ? 'text-gray-950' : 'text-white'}`}>{automationDraft.planTitle || automationDraft.title || 'Automation Plan'}</div>
                            <p className={`text-xs leading-relaxed mt-2 ${bodyTextClass}`}>{automationDraft.summary || automationDraft.analysis || 'Ready to apply.'}</p>
                            {automationDraft.confidence && (
                              <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${desktopLightMode ? 'text-cyan-700' : 'text-cyan-300'}`}>Confidence: {automationDraft.confidence}</div>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-3">
                            <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-[11px] font-black uppercase tracking-wider ${labelClass}`}>Proposed Edges</span>
                                <span className={`text-[10px] ${mutedTextClass}`}>{draftEdges.length}</span>
                              </div>
                              {draftEdges.length === 0 ? (
                                <div className={`text-xs ${mutedTextClass}`}>No edge proposals in this draft.</div>
                              ) : (
                                <div className="space-y-2">
                                  {draftEdges.map((edge, idx) => {
                                    const from = edge.fromTitle || edge.from || edge.sourceTitle || edge.source;
                                    const to = edge.toTitle || edge.to || edge.targetTitle || edge.target;
                                    return (
                                      <div key={`${from}-${to}-${idx}`} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{from || 'Source'}</span>
                                          <span className="text-cyan-400">{'->'}</span>
                                          <span className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{to || 'Target'}</span>
                                        </div>
                                        <div className={`mt-1 text-[10px] leading-relaxed ${mutedTextClass}`}>{edge.reason || edge.contract || edge.busKey || 'Pass structured output downstream.'}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-[11px] font-black uppercase tracking-wider ${labelClass}`}>Suggested Chains</span>
                                <span className={`text-[10px] ${mutedTextClass}`}>{draftStacks.length}</span>
                              </div>
                              {draftStacks.length === 0 ? (
                                <div className={`text-xs ${mutedTextClass}`}>No chain proposals in this draft.</div>
                              ) : (
                                <div className="space-y-2">
                                  {draftStacks.map((stack, idx) => (
                                    <div key={`${stack.name}-${idx}`} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                                      <div className={`text-[11px] font-bold ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{stack.name || `Chain ${idx + 1}`}</div>
                                      <div className={`mt-1 text-[10px] leading-relaxed ${mutedTextClass}`}>{stack.purpose || (stack.artifactTitles || []).join(' + ') || 'Reusable automation chain.'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {draftNotes.length > 0 && (
                            <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                              <span className={`text-[11px] font-black uppercase tracking-wider block mb-2 ${labelClass}`}>Notes</span>
                              <div className="space-y-1.5">
                                {draftNotes.slice(0, 5).map((note, idx) => (
                                  <div key={`${note}-${idx}`} className={`text-[11px] flex gap-2 ${mutedTextClass}`}>
                                    <AlertTriangleIcon className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                                    <span>{note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 overflow-hidden">
                      <div className={`rounded-2xl border p-4 overflow-y-auto ${panelClass}`}>
                        <div className={`text-[11px] font-black uppercase tracking-wider mb-3 ${labelClass}`}>Live Agents</div>
                        {reactArtifacts.length === 0 ? (
                          <p className={`text-xs ${mutedTextClass}`}>No React Thinklets yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {reactArtifacts.slice(0, 8).map(artifact => {
                              const agent = agents.find(a => a.artifactId === artifact.id);
                              return (
                                <button
                                  key={artifact.id}
                                  onClick={() => onInvokeArtifactAgent(artifact.id, stackAgentInput)}
                                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${desktopLightMode ? 'bg-white border-gray-100 hover:border-cyan-200' : 'bg-black/20 border-white/8 hover:border-cyan-400/30'}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2 h-2 rounded-full ${liveAgentIds.has(artifact.id) ? 'bg-emerald-400' : 'bg-amber-400'} flex-shrink-0`} />
                                    <span className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{agent?.manifest?.name || artifact.title}</span>
                                  </div>
                                  <div className={`mt-1 text-[9px] truncate ${mutedTextClass}`}>{(agent?.manifest?.capabilities || artifact.agentManifest?.capabilities || []).slice(0, 3).join(' · ') || 'agentic-ready by default'}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className={`rounded-2xl border p-4 overflow-y-auto ${panelClass}`}>
                        <div className={`text-[11px] font-black uppercase tracking-wider mb-3 ${labelClass}`}>Running Now</div>
                        {runningRuns.length === 0 ? (
                          <p className={`text-xs ${mutedTextClass}`}>No active runs.</p>
                        ) : (
                          <div className="space-y-2">
                            {runningRuns.slice(0, 6).map(run => (
                              <div key={run.id} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                <div className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-blue-900' : 'text-blue-200'}`}>{run.targetTitle}</div>
                                <div className={`text-[9px] mt-1 uppercase tracking-wider ${mutedTextClass}`}>{run.status} · {timeAgo(run.createdAt)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`rounded-2xl border p-4 overflow-y-auto ${panelClass}`}>
                        <div className={`text-[11px] font-black uppercase tracking-wider mb-3 ${labelClass}`}>Latest Bus Keys</div>
                        {busKeys.length === 0 ? (
                          <p className={`text-xs ${mutedTextClass}`}>No bus traffic yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {busKeys.slice(0, 7).map(key => (
                              <div key={key} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                                <div className={`text-[10px] font-mono truncate ${desktopLightMode ? 'text-violet-700' : 'text-violet-300'}`}>{key}</div>
                                <div className={`mt-1 text-[9px] font-mono truncate ${mutedTextClass}`}>{summarizePayload(busState[key], 74)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {automationStudioTab === 'graph' && (
                <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)_minmax(300px,0.8fr)] gap-4 p-4 overflow-y-auto xl:overflow-hidden">
                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Agent Inventory</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {reactArtifacts.length === 0 ? (
                        <div className={`rounded-2xl border border-dashed p-6 text-center text-xs ${desktopLightMode ? 'border-gray-200 text-gray-400' : 'border-white/10 text-gray-600'}`}>No Thinklet agents found.</div>
                      ) : reactArtifacts.map(artifact => {
                        const agent = agents.find(a => a.artifactId === artifact.id);
                        return (
                          <div key={artifact.id} className={`rounded-2xl border p-3 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full ${agent ? 'bg-emerald-400' : 'bg-amber-400'} flex-shrink-0`} />
                                  <span className={`text-xs font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{agent?.manifest?.name || artifact.title}</span>
                                </div>
                                <div className={`mt-1 text-[10px] ${mutedTextClass}`}>{agent ? 'registered live' : 'agentic-ready fallback'}</div>
                              </div>
                              <button onClick={() => onInvokeArtifactAgent(artifact.id, stackAgentInput)} className={`p-1.5 rounded-lg transition-colors ${desktopLightMode ? 'bg-gray-100 text-gray-500 hover:text-emerald-600' : 'bg-white/8 text-gray-400 hover:text-emerald-300'}`}>
                                <PlayIcon className="w-3 h-3" />
                              </button>
                            </div>
                            <div className={`mt-2 text-[10px] leading-relaxed ${mutedTextClass}`}>{(agent?.manifest?.description || artifact.agentManifest?.description || 'Can receive automation input and publish structured results through the desktop agent bridge.').slice(0, 150)}</div>
                            {(agent?.manifest?.capabilities || artifact.agentManifest?.capabilities || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(agent?.manifest?.capabilities || artifact.agentManifest?.capabilities || []).slice(0, 4).map(capability => (
                                  <span key={capability} className={`text-[9px] px-1.5 py-0.5 rounded-md ${desktopLightMode ? 'bg-cyan-50 text-cyan-700' : 'bg-cyan-500/10 text-cyan-300'}`}>{capability}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Directed Automation Graph</div>
                        <div className={`text-[11px] mt-0.5 ${mutedTextClass}`}>{connections.length} edge{connections.length !== 1 ? 's' : ''} fan out agent results and bus publishes.</div>
                      </div>
                      <button
                        onClick={onCreateStackFromConnections}
                        disabled={connections.length === 0}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${desktopLightMode ? 'bg-cyan-50 text-cyan-700 border border-cyan-100 hover:bg-cyan-100' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/25'}`}
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        Chain From Edges
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {connections.length === 0 ? (
                        <div className={`h-full rounded-2xl border border-dashed flex items-center justify-center text-center p-8 ${desktopLightMode ? 'border-gray-200 text-gray-400' : 'border-white/10 text-gray-600'}`}>
                          <div>
                            <GitBranchIcon className="w-10 h-10 mx-auto mb-3 opacity-35" />
                            <p className="text-sm font-semibold">No automation edges yet.</p>
                            <p className="text-xs mt-1">Use the architect tab or connect Thinklet windows directly.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                        <div className={`rounded-2xl border overflow-x-auto ${desktopLightMode ? 'bg-gradient-to-br from-white to-cyan-50/60 border-cyan-100' : 'bg-gradient-to-br from-cyan-500/8 to-violet-500/8 border-cyan-500/20'}`}>
                          <div className="min-w-[760px] p-5">
                            <div className="flex items-stretch gap-5">
                              {graphColumns.map((column, columnIdx) => (
                                <React.Fragment key={`column-${columnIdx}`}>
                                  <div className="min-w-[210px] flex-1 space-y-3">
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${labelClass}`}>Stage {columnIdx + 1}</div>
                                    {column.map(artifact => {
                                      const outgoingCount = connections.filter(conn => conn.fromId === artifact.id).length;
                                      const incomingCount = connections.filter(conn => conn.toId === artifact.id).length;
                                      const latestRun = getLatestRunForArtifact(artifact.id);
                                      const agent = agents.find(a => a.artifactId === artifact.id);
                                      return (
                                        <button
                                          key={artifact.id}
                                          onClick={() => onFocusArtifact?.(artifact.id)}
                                          className={`w-full text-left rounded-2xl border p-3 transition-all ${desktopLightMode ? 'bg-white/90 border-white shadow-sm hover:border-cyan-200' : 'bg-black/25 border-white/10 hover:border-cyan-400/30'}`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className={`text-xs font-black truncate ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{agent?.manifest?.name || artifact.title}</div>
                                              <div className={`mt-1 text-[9px] truncate ${mutedTextClass}`}>{agent ? 'live agent' : artifact.language === 'react' ? 'agentic-ready' : artifact.type || 'artifact'}</div>
                                            </div>
                                            <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${latestRun?.status === 'error' ? 'bg-red-400' : latestRun?.status === 'success' ? 'bg-emerald-400' : latestRun ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`} />
                                          </div>
                                          <div className={`mt-3 grid grid-cols-3 gap-1 text-center text-[9px] ${mutedTextClass}`}>
                                            <span className={`rounded-lg py-1 ${desktopLightMode ? 'bg-gray-50' : 'bg-white/5'}`}>{incomingCount} in</span>
                                            <span className={`rounded-lg py-1 ${desktopLightMode ? 'bg-gray-50' : 'bg-white/5'}`}>{outgoingCount} out</span>
                                            <span className={`rounded-lg py-1 truncate ${desktopLightMode ? 'bg-gray-50' : 'bg-white/5'}`}>{latestRun?.status || 'idle'}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {columnIdx < graphColumns.length - 1 && (
                                    <div className="flex items-center pt-7">
                                      <div className={`w-10 h-px ${desktopLightMode ? 'bg-cyan-200' : 'bg-cyan-400/35'}`} />
                                      <div className={`w-2 h-2 rotate-45 border-t border-r ${desktopLightMode ? 'border-cyan-300' : 'border-cyan-300/60'}`} />
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {connections.map(conn => {
                            const from = getArtifact(conn.fromId);
                            const to = getArtifact(conn.toId);
                            const isSelected = selectedEdge?.id === conn.id;
                            return (
                              <div key={conn.id} onClick={() => setSelectedEdgeId(conn.id)} className={`rounded-2xl border p-4 cursor-pointer transition-all ${isSelected ? (desktopLightMode ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'bg-cyan-500/12 border-cyan-500/30') : (desktopLightMode ? 'bg-white border-gray-100 hover:border-cyan-200' : 'bg-black/20 border-white/8 hover:border-cyan-400/30')}`}>
                                <div className="flex items-center gap-3">
                                  <button onClick={(e) => { e.stopPropagation(); if (from) onFocusArtifact?.(from.id); }} className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${desktopLightMode ? 'bg-gray-50 border-gray-100 hover:border-cyan-200' : 'bg-white/5 border-white/8 hover:border-cyan-400/30'}`}>
                                    <div className={`text-xs font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{from?.title || 'Missing source'}</div>
                                    <div className={`text-[9px] mt-0.5 ${mutedTextClass}`}>source agent</div>
                                  </button>
                                  <div className="flex flex-col items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); onRunAutomationEdge(conn, stackAgentInput); }} className="w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                      <PlayIcon className="w-4 h-4" />
                                    </button>
                                    <div className={`text-[8px] font-bold uppercase tracking-wider ${mutedTextClass}`}>run</div>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); if (to) onFocusArtifact?.(to.id); }} className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-left transition-colors ${desktopLightMode ? 'bg-gray-50 border-gray-100 hover:border-violet-200' : 'bg-white/5 border-white/8 hover:border-violet-400/30'}`}>
                                    <div className={`text-xs font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{to?.title || 'Missing target'}</div>
                                    <div className={`text-[9px] mt-0.5 ${mutedTextClass}`}>target agent</div>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); onRemoveConnection(conn.id); }} className={`p-2 rounded-xl transition-colors ${desktopLightMode ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-red-300 hover:bg-red-500/10'}`}>
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className={`mt-3 grid grid-cols-3 gap-2 text-[10px] ${mutedTextClass}`}>
                                  <div className={`rounded-lg px-2 py-1.5 ${desktopLightMode ? 'bg-white/70' : 'bg-white/5'}`}>mode: {conn.mode || 'directed'}</div>
                                  <div className={`rounded-lg px-2 py-1.5 truncate ${desktopLightMode ? 'bg-white/70' : 'bg-white/5'}`}>key: {conn.busKey || `agent.${conn.fromId}.result`}</div>
                                  <div className={`rounded-lg px-2 py-1.5 ${desktopLightMode ? 'bg-white/70' : 'bg-white/5'}`}>created: {timeAgo(conn.createdAt)}</div>
                                </div>
                                {conn.reason && <div className={`mt-2 text-[10px] leading-relaxed ${mutedTextClass}`}>{conn.reason}</div>}
                              </div>
                            );
                          })}
                        </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Inspector</div>
                      <div className={`text-[11px] mt-0.5 ${mutedTextClass}`}>Selected routing contract, latest run, and live payloads.</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                      <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Selected Edge</span>
                          {selectedEdge && (
                            <button onClick={() => onRunAutomationEdge(selectedEdge, stackAgentInput)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
                              <PlayIcon className="w-3 h-3" />
                              Run
                            </button>
                          )}
                        </div>
                        {!selectedEdge ? (
                          <p className={`text-xs ${mutedTextClass}`}>Select an edge in the canvas to inspect its contract.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className={`text-xs font-black ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{getConnectionLabel(selectedEdge)}</div>
                            <div className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                              <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${labelClass}`}>Bus key</div>
                              <div className={`text-[10px] font-mono break-all ${desktopLightMode ? 'text-violet-700' : 'text-violet-300'}`}>{selectedEdge.busKey || `agent.${selectedEdge.fromId}.result`}</div>
                            </div>
                            {selectedEdge.contract && (
                              <div className={`text-[10px] leading-relaxed ${bodyTextClass}`}>{selectedEdge.contract}</div>
                            )}
                            {selectedEdge.reason && (
                              <div className={`text-[10px] leading-relaxed ${mutedTextClass}`}>{selectedEdge.reason}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-wider mb-2 ${labelClass}`}>Live Keys</div>
                        {busKeys.length === 0 ? (
                          <p className={`text-xs ${mutedTextClass}`}>No bus values yet.</p>
                        ) : busKeys.slice(0, 10).map(key => (
                          <div key={key} className={`rounded-xl border px-3 py-2 mb-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                            <div className={`text-[10px] font-mono truncate ${desktopLightMode ? 'text-violet-700' : 'text-violet-300'}`}>{key}</div>
                            <div className={`mt-1 text-[9px] font-mono truncate ${mutedTextClass}`}>{summarizePayload(busState[key], 76)}</div>
                            {busMeta[key]?.fromTitle && <div className={`mt-1 text-[8px] ${mutedTextClass}`}>from {busMeta[key].fromTitle}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {automationStudioTab === 'runs' && (
                <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-4 p-4 overflow-y-auto xl:overflow-hidden">
                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Run Event Inspector</div>
                        <div className={`text-[11px] mt-0.5 ${mutedTextClass}`}>{agentRuns.length} recent runs · {failedRuns.length} errors</div>
                      </div>
                      <button onClick={() => onRunAutomationDraft(automationDraft)} disabled={!automationDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40">
                        <PlayIcon className="w-3.5 h-3.5" />
                        Run Draft
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {agentRuns.length === 0 ? (
                        <div className={`h-full rounded-2xl border border-dashed flex items-center justify-center text-center p-8 ${desktopLightMode ? 'border-gray-200 text-gray-400' : 'border-white/10 text-gray-600'}`}>
                          <div>
                            <ActivityIcon className="w-10 h-10 mx-auto mb-3 opacity-35" />
                            <p className="text-sm font-semibold">No run events yet.</p>
                            <p className="text-xs mt-1">Run an edge, draft, or agent to inspect the event trace.</p>
                          </div>
                        </div>
                      ) : agentRuns.map(run => (
                        <div
                          key={run.id}
                          onClick={() => setSelectedRunId(run.id)}
                          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                            selectedRun?.id === run.id
                              ? desktopLightMode ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-blue-500/12 border-blue-500/30'
                              : desktopLightMode ? 'bg-white border-gray-100 hover:border-blue-200' : 'bg-black/20 border-white/8 hover:border-blue-400/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${statusClass(run.status)}`}>
                              {run.status === 'success' ? <CheckIcon className="w-4 h-4" /> : run.status === 'error' ? <AlertTriangleIcon className="w-4 h-4" /> : run.status === 'skipped' ? <SquareIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm font-black truncate ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{run.sourceTitle || 'Automation'}</span>
                                <span className="text-cyan-400">{'->'}</span>
                                <span className={`text-sm font-black truncate ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{run.targetTitle}</span>
                              </div>
                              <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider ${mutedTextClass}`}>
                                <span>{run.status}</span>
                                <span>·</span>
                                <span>{run.trigger || 'automation'}</span>
                                <span>·</span>
                                <span>{timeAgo(run.createdAt)}</span>
                                {run.busKey && <span className="normal-case font-mono">{run.busKey}</span>}
                              </div>
                              {(run.input !== undefined && run.input !== null) && (
                                <div className={`mt-3 rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/8'}`}>
                                  <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${labelClass}`}>Input</div>
                                  <div className={`text-[10px] font-mono leading-relaxed ${mutedTextClass}`}>{summarizePayload(run.input, 260)}</div>
                                </div>
                              )}
                              {(run.error || run.result !== undefined && run.result !== null) && (
                                <div className={`mt-2 rounded-xl border px-3 py-2 ${run.error ? (desktopLightMode ? 'bg-red-50 border-red-100' : 'bg-red-500/10 border-red-500/20') : (desktopLightMode ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/10 border-emerald-500/20')}`}>
                                  <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${run.error ? 'text-red-400' : 'text-emerald-400'}`}>{run.error ? 'Error' : 'Result'}</div>
                                  <div className={`text-[10px] font-mono leading-relaxed ${run.error ? (desktopLightMode ? 'text-red-700' : 'text-red-300') : (desktopLightMode ? 'text-emerald-800' : 'text-emerald-300')}`}>{run.error || summarizePayload(run.result, 320)}</div>
                                </div>
                              )}
                              {Array.isArray(run.logs) && run.logs.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {run.logs.slice(-3).map((log, idx) => (
                                    <div key={`${run.id}-log-${idx}`} className={`text-[10px] ${mutedTextClass}`}>- {log.message}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-rows-[minmax(180px,0.78fr)_minmax(0,1fr)_minmax(0,0.72fr)] gap-4 overflow-hidden">
                    <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                      <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Run Detail</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3">
                        {!selectedRun ? (
                          <p className={`text-xs ${mutedTextClass}`}>Select a run to inspect its input, result, and trigger.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${statusClass(selectedRun.status)}`}>
                                {selectedRun.status === 'success' ? <CheckIcon className="w-4 h-4" /> : selectedRun.status === 'error' ? <AlertTriangleIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className={`text-sm font-black truncate ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{selectedRun.targetTitle || 'Automation'}</div>
                                <div className={`text-[10px] mt-0.5 ${mutedTextClass}`}>{selectedRun.trigger || 'automation'} · {timeAgo(selectedRun.createdAt)}</div>
                              </div>
                            </div>
                            <div className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/8'}`}>
                              <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${labelClass}`}>Why it ran</div>
                              <div className={`text-[10px] leading-relaxed ${bodyTextClass}`}>{selectedRun.busKey ? `Bus key ${selectedRun.busKey} published.` : selectedRun.sourceTitle ? `${selectedRun.sourceTitle} invoked this step.` : 'Manual or draft invocation.'}</div>
                            </div>
                            <pre className={`rounded-xl border px-3 py-2 max-h-36 overflow-auto text-[10px] font-mono whitespace-pre-wrap ${desktopLightMode ? 'bg-white border-gray-100 text-gray-600' : 'bg-black/20 border-white/8 text-gray-400'}`}>
                              {selectedRun.error || summarizePayload(selectedRun.result || selectedRun.input || {}, 900)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                      <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Event Stream</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {busActivity.length === 0 ? (
                          <p className={`text-xs ${mutedTextClass}`}>No bus events captured.</p>
                        ) : busActivity.slice(0, 18).map(event => (
                          <div key={event.id} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase ${event.dir === 'agent' ? 'text-emerald-400' : event.dir === 'sub' ? 'text-violet-400' : 'text-cyan-400'}`}>{event.dir || event.kind}</span>
                              <span className={`text-[10px] font-mono truncate flex-1 ${desktopLightMode ? 'text-gray-700' : 'text-gray-300'}`}>{event.key}</span>
                              <span className={`text-[8px] ${mutedTextClass}`}>{timeAgo(event.ts)}</span>
                            </div>
                            <div className={`mt-1 text-[9px] truncate ${mutedTextClass}`}>{event.preview || summarizePayload(event.value, 90)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                      <div className={`px-4 py-3 border-b ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Failure Watch</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {failedRuns.length === 0 ? (
                          <div className={`rounded-2xl border p-4 text-center text-xs ${desktopLightMode ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                            All recent automation runs are clear.
                          </div>
                        ) : failedRuns.slice(0, 8).map(run => (
                          <div key={run.id} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-red-50 border-red-100' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-red-800' : 'text-red-300'}`}>{run.targetTitle}</div>
                            <div className={`mt-1 text-[10px] leading-relaxed ${desktopLightMode ? 'text-red-600' : 'text-red-300/80'}`}>{run.error || 'Unknown error'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {automationStudioTab === 'chains' && (
                <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.45fr)] gap-4 p-4 overflow-y-auto xl:overflow-hidden">
                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-gray-700' : 'text-gray-200'}`}>Automation Chains</div>
                        <div className={`text-[11px] mt-0.5 ${mutedTextClass}`}>{stacks.length} saved chain{stacks.length !== 1 ? 's' : ''}</div>
                      </div>
                      <button onClick={() => onCreateStack('New Automation Chain', [])} className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {stacks.length === 0 ? (
                        <div className={`rounded-2xl border border-dashed p-6 text-center text-xs ${desktopLightMode ? 'border-gray-200 text-gray-400' : 'border-white/10 text-gray-600'}`}>
                          <GitBranchIcon className="w-9 h-9 mx-auto mb-3 opacity-35" />
                          Create a chain from connected edges or the AI architect.
                        </div>
                      ) : stacks.map(stack => {
                        const stackArtifacts = artifacts.filter(a => stack.artifactIds?.includes(a.id));
                        const isSelected = selectedStackId === stack.id;
                        return (
                          <button
                            key={stack.id}
                            onClick={() => setSelectedStackId(isSelected ? null : stack.id)}
                            className={`w-full text-left rounded-2xl border p-3 transition-all ${
                              isSelected
                                ? desktopLightMode ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'bg-cyan-500/12 border-cyan-500/30'
                                : desktopLightMode ? 'bg-white border-gray-100 hover:border-cyan-200' : 'bg-black/20 border-white/8 hover:border-cyan-400/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-black truncate ${desktopLightMode ? 'text-gray-900' : 'text-white'}`}>{stack.name}</span>
                              <ChevronDownIcon className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-180' : ''} ${mutedTextClass}`} />
                            </div>
                            <div className={`mt-1 text-[10px] ${mutedTextClass}`}>{stackArtifacts.length} member{stackArtifacts.length !== 1 ? 's' : ''}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {stackArtifacts.slice(0, 4).map(artifact => (
                                <span key={artifact.id} className={`text-[9px] px-1.5 py-0.5 rounded-md max-w-[110px] truncate ${desktopLightMode ? 'bg-gray-100 text-gray-500' : 'bg-white/8 text-gray-400'}`}>{artifact.title}</span>
                              ))}
                              {stackArtifacts.length > 4 && <span className={`text-[9px] ${mutedTextClass}`}>+{stackArtifacts.length - 4}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden flex flex-col ${panelClass}`}>
                    {!selectedStack ? (
                      <div className={`h-full flex items-center justify-center text-center p-8 ${mutedTextClass}`}>
                        <div>
                          <WandIcon className="w-11 h-11 mx-auto mb-3 opacity-35" />
                          <p className="text-sm font-semibold">Select a chain to batch edit, run, or inspect.</p>
                          <button
                            onClick={onCreateStackFromConnections}
                            disabled={connections.length === 0}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-40"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Create From Current Edges
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${desktopLightMode ? 'border-gray-100' : 'border-white/8'}`}>
                          <div className="min-w-0">
                            <div className={`text-lg font-black truncate ${desktopLightMode ? 'text-gray-950' : 'text-white'}`}>{selectedStack.name}</div>
                            <div className={`text-xs mt-1 ${mutedTextClass}`}>{selectedStackArtifacts.length} member{selectedStackArtifacts.length !== 1 ? 's' : ''} · {connections.filter(c => selectedStack.artifactIds?.includes(c.fromId) || selectedStack.artifactIds?.includes(c.toId)).length} related edge{connections.length !== 1 ? 's' : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onRunAutomationChain(selectedStack.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${desktopLightMode ? 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300' : 'bg-white/8 text-gray-200 border border-white/10 hover:border-emerald-400/40'}`}>
                              <PlayIcon className="w-3.5 h-3.5" />
                              Run Chain
                            </button>
                            <button onClick={() => onRunStackAgent(selectedStack, stackAgentInput)} disabled={isRunningStackAgent || !stackAgentInput.trim()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-40">
                              <BrainIcon className={`w-3.5 h-3.5 ${isRunningStackAgent ? 'animate-pulse' : ''}`} />
                              Stack Agent
                            </button>
                            <button onClick={() => onDeleteStack(selectedStack.id)} className={`p-2 rounded-xl transition-colors ${desktopLightMode ? 'text-red-500 hover:bg-red-50' : 'text-red-400 hover:bg-red-500/10'}`}>
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                          <div className={`rounded-2xl border overflow-hidden ${desktopLightMode ? 'bg-white border-cyan-100' : 'bg-black/20 border-cyan-500/20'}`}>
                            <div className={`px-4 py-3 border-b flex items-center gap-2 ${desktopLightMode ? 'border-gray-100 bg-cyan-50/60' : 'border-white/8 bg-cyan-500/8'}`}>
                              <WandIcon className="w-4 h-4 text-cyan-400" />
                              <span className={`text-xs font-black uppercase tracking-wider ${desktopLightMode ? 'text-cyan-800' : 'text-cyan-300'}`}>Batch CRISPR</span>
                            </div>
                            <textarea
                              value={batchInputs[selectedStack.id] || ''}
                              onChange={(e) => setBatchInputs(prev => ({ ...prev, [selectedStack.id]: e.target.value }))}
                              rows={4}
                              placeholder="Apply a precise edit to every editable artifact in this chain..."
                              className={`w-full bg-transparent resize-none px-4 py-3 text-sm focus:outline-none ${desktopLightMode ? 'text-gray-800 placeholder-gray-400' : 'text-gray-100 placeholder-gray-600'}`}
                            />
                            <div className={`border-t px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${desktopLightMode ? 'border-gray-100 bg-gray-50' : 'border-white/8 bg-white/[0.03]'}`}>
                              <div className="flex flex-wrap gap-1.5">
                                {quickCrisprPresets.map(preset => (
                                  <button key={preset.label} onClick={() => onBatchCrispr(selectedStack.id, preset.instruction, { disableSmartRouting: true })} className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors ${desktopLightMode ? 'bg-white text-gray-500 border-gray-200 hover:text-cyan-700 hover:border-cyan-200' : 'bg-white/5 text-gray-400 border-white/8 hover:text-cyan-300 hover:border-cyan-400/30'}`}>{preset.label}</button>
                                ))}
                              </div>
                              <button
                                onClick={() => {
                                  const value = (batchInputs[selectedStack.id] || '').trim();
                                  if (!value) return;
                                  onBatchCrispr(selectedStack.id, value);
                                  setBatchInputs(prev => ({ ...prev, [selectedStack.id]: '' }));
                                }}
                                disabled={!(batchInputs[selectedStack.id] || '').trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all disabled:opacity-40"
                              >
                                <SendIcon className="w-3.5 h-3.5" />
                                Apply to All
                              </button>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                              <span className={`text-[11px] font-black uppercase tracking-wider block mb-3 ${labelClass}`}>Members</span>
                              <div className="space-y-2">
                                {selectedStackArtifacts.map(artifact => (
                                  <button key={artifact.id} onClick={() => onFocusArtifact?.(artifact.id)} className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${desktopLightMode ? 'bg-white border-gray-100 hover:border-cyan-200' : 'bg-black/20 border-white/8 hover:border-cyan-400/30'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${artifact.type === 'image' ? 'bg-pink-500/15 text-pink-400' : artifact.type === 'video' ? 'bg-fuchsia-500/15 text-fuchsia-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                      {artifact.type === 'image' || artifact.type === 'video' ? <ImageIcon className="w-3.5 h-3.5" /> : <LayoutIcon className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className={`text-xs font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{artifact.title}</div>
                                      <div className={`text-[9px] ${mutedTextClass}`}>{artifact.language === 'react' ? 'Thinklet agent' : artifact.type || 'artifact'}</div>
                                    </div>
                                    {artifact.language === 'react' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={`rounded-2xl border p-4 ${subtlePanelClass}`}>
                              <span className={`text-[11px] font-black uppercase tracking-wider block mb-3 ${labelClass}`}>Related Edges</span>
                              {connections.filter(c => selectedStack.artifactIds?.includes(c.fromId) || selectedStack.artifactIds?.includes(c.toId)).length === 0 ? (
                                <p className={`text-xs ${mutedTextClass}`}>No graph edges touch this chain yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {connections.filter(c => selectedStack.artifactIds?.includes(c.fromId) || selectedStack.artifactIds?.includes(c.toId)).map(conn => (
                                    <div key={conn.id} className={`rounded-xl border px-3 py-2 ${desktopLightMode ? 'bg-white border-gray-100' : 'bg-black/20 border-white/8'}`}>
                                      <div className={`text-[11px] font-bold truncate ${desktopLightMode ? 'text-gray-800' : 'text-gray-200'}`}>{getConnectionLabel(conn)}</div>
                                      <div className={`mt-1 text-[9px] ${mutedTextClass}`}>{conn.mode || 'directed'} · {timeAgo(conn.createdAt)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
