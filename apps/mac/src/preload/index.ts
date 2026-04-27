import { contextBridge, ipcRenderer } from "electron";

const api = {
  hidePill: () => ipcRenderer.send("pill:hide"),
  setExpanded: (expanded: boolean) =>
    ipcRenderer.invoke("pill:set-expanded", expanded),
  createArtifact: (prompt: string) =>
    ipcRenderer.invoke("artifact:create", prompt),
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
