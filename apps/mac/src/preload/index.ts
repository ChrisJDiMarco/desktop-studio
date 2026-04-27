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

  // Config
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<Config>,
  setConfig: (patch: Partial<Config>) =>
    ipcRenderer.invoke("config:set", patch) as Promise<Config>,
  getBackendUrl: () =>
    ipcRenderer.invoke("config:get-backend-url") as Promise<string>,
  setBackendUrl: (url: string) =>
    ipcRenderer.invoke("config:set-backend-url", url) as Promise<void>,

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
