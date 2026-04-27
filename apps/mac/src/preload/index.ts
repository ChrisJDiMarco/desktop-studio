import { contextBridge, ipcRenderer } from "electron";

export type GenerateRequest = {
  prompt: string;
  model?: string;
  max_tokens?: number;
  images?: string[];
  preservePrompt?: boolean;
};

export type GenerateResponse = {
  text: string;
  model: string;
  usage?: unknown;
  citations?: unknown;
  search_results?: unknown;
};

export type Config = {
  backendUrl: string;
  model: string;
  brandPrompt: string;
  criticMode: boolean;
  focusMode: boolean;
  promptHistory: string[];
};

const api = {
  // Pill window controls
  hidePill: () => ipcRenderer.send("pill:hide"),
  setExpanded: (expanded: boolean) =>
    ipcRenderer.invoke("pill:set-expanded", expanded),
  createArtifact: (prompt: string) =>
    ipcRenderer.invoke("artifact:create", prompt),

  // Backend (Next.js / app.thinklet.io)
  generate: (req: GenerateRequest) =>
    ipcRenderer.invoke("backend:generate", req) as Promise<GenerateResponse>,
  generateImage: (req: {
    prompt: string;
    aspectRatio?: string;
    model?: string;
  }) =>
    ipcRenderer.invoke("backend:generate-image", req) as Promise<{
      url: string;
      model?: string;
      aspectRatio?: string;
    }>,
  generateVideo: (req: {
    prompt: string;
    aspectRatio?: string;
    duration?: string;
    quality?: string;
    resolution?: string;
    model?: string;
  }) =>
    ipcRenderer.invoke("backend:generate-video", req) as Promise<{
      url: string;
      videoUrl?: string;
      provider?: string;
      model?: string;
      requestId?: string;
    }>,

  // Config
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<Config>,
  setConfig: (patch: Partial<Config>) =>
    ipcRenderer.invoke("config:set", patch) as Promise<Config>,
  getBackendUrl: () =>
    ipcRenderer.invoke("config:get-backend-url") as Promise<string>,
  setBackendUrl: (url: string) =>
    ipcRenderer.invoke("config:set-backend-url", url) as Promise<void>,
  pushPromptHistory: (prompt: string) =>
    ipcRenderer.invoke("config:push-prompt-history", prompt) as Promise<Config>,

  // Backend reachability — used by Settings drawer for live status.
  pingBackend: (overrideUrl?: string) =>
    ipcRenderer.invoke("backend:ping", overrideUrl) as Promise<{
      ok: boolean;
      url: string;
      status?: number;
      latencyMs?: number;
      error?: string;
    }>,

  // Shell helpers
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:open-external", url) as Promise<void>,

  // Main → renderer signals
  onFocusInput: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("pill:focus-input", handler);
    return () => {
      ipcRenderer.removeListener("pill:focus-input", handler);
    };
  },
} as const;

contextBridge.exposeInMainWorld("desktopStudio", api);

export type DesktopStudioApi = typeof api;
