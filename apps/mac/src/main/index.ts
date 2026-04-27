import { app, BrowserWindow, globalShortcut, screen, ipcMain, shell } from "electron";
import path from "node:path";

// @ts-expect-error — electron-squirrel-startup ships no .d.ts in some versions
import started from "electron-squirrel-startup";

import { generate, type GenerateRequest } from "./backend";
import {
  getBackendUrl,
  setBackendUrl,
  getConfig,
  setConfig,
  pushPromptHistory,
  type Config,
} from "./config";

// Forge's Vite plugin injects these at build time.
declare const PILL_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const PILL_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

const PILL_WIDTH = 520;
const PILL_HEIGHT_COLLAPSED = 64;
const PILL_HEIGHT_EXPANDED = 320;
const PILL_BOTTOM_MARGIN = 24;
const HOTKEY = "Alt+Space";

const ARTIFACT_WIDTH = 560;
const ARTIFACT_HEIGHT = 420;
const ARTIFACT_OFFSET_STEP = 28;

let pillWindow: BrowserWindow | null = null;
let pillExpanded = false;
let artifactCount = 0;

function pillBoundsFor(expanded: boolean) {
  const { workArea } = screen.getPrimaryDisplay();
  const height = expanded ? PILL_HEIGHT_EXPANDED : PILL_HEIGHT_COLLAPSED;
  const x = Math.round(workArea.x + (workArea.width - PILL_WIDTH) / 2);
  const y = workArea.y + workArea.height - height - PILL_BOTTOM_MARGIN;
  return { x, y, width: PILL_WIDTH, height };
}

function focusPillInput() {
  pillWindow?.webContents.send("pill:focus-input");
}

function bringPillToFront() {
  if (!pillWindow) return;
  pillWindow.show();
  pillWindow.moveTop();
  app.focus({ steal: true });
  pillWindow.focus();
  pillWindow.webContents.focus();
  focusPillInput();
}

function rendererUrlFor(hash: string) {
  if (PILL_WINDOW_VITE_DEV_SERVER_URL) {
    return { type: "url" as const, value: PILL_WINDOW_VITE_DEV_SERVER_URL + hash };
  }
  return {
    type: "file" as const,
    file: path.join(__dirname, `../renderer/${PILL_WINDOW_VITE_NAME}/index.html`),
    hash,
  };
}

function createPillWindow() {
  const bounds = pillBoundsFor(false);

  pillWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  pillWindow.setAlwaysOnTop(true, "floating");
  pillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const target = rendererUrlFor("");
  if (target.type === "url") {
    pillWindow.loadURL(target.value);
  } else {
    pillWindow.loadFile(target.file);
  }

  pillWindow.once("ready-to-show", bringPillToFront);

  // In dev (when Vite's URL is set), open DevTools detached so renderer
  // crashes are visible. The pill window itself is too small to host the
  // panel inline.
  if (PILL_WINDOW_VITE_DEV_SERVER_URL) {
    pillWindow.webContents.openDevTools({ mode: "detach" });
  }

  // If the renderer fails to load (build error, JS exception in main.tsx),
  // surface it instead of leaving an invisible transparent window.
  pillWindow.webContents.on(
    "render-process-gone",
    (_e, details) => {
      console.error("[desktop-studio] Pill renderer crashed:", details);
    }
  );

  pillWindow.on("closed", () => {
    pillWindow = null;
    pillExpanded = false;
  });
}

function togglePill() {
  if (!pillWindow) {
    createPillWindow();
    return;
  }
  if (pillWindow.isVisible() && pillWindow.isFocused()) {
    pillWindow.hide();
  } else {
    pillWindow.setBounds(pillBoundsFor(pillExpanded));
    bringPillToFront();
  }
}

function createArtifactWindow(prompt: string) {
  const { workArea } = screen.getPrimaryDisplay();
  const offset = (artifactCount % 8) * ARTIFACT_OFFSET_STEP;
  artifactCount++;

  const x = Math.round(workArea.x + (workArea.width - ARTIFACT_WIDTH) / 2 + offset);
  const y = Math.round(workArea.y + (workArea.height - ARTIFACT_HEIGHT) / 3 + offset);

  const win = new BrowserWindow({
    width: ARTIFACT_WIDTH,
    height: ARTIFACT_HEIGHT,
    minWidth: 360,
    minHeight: 280,
    x,
    y,
    title: prompt || "Artifact",
    frame: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const hash = `#artifact=${encodeURIComponent(prompt)}`;
  const target = rendererUrlFor(hash);
  if (target.type === "url") {
    win.loadURL(target.value);
  } else {
    win.loadFile(target.file, { hash: target.hash });
  }

  win.once("ready-to-show", () => win.show());
}

ipcMain.on("pill:hide", () => {
  pillWindow?.hide();
});

ipcMain.handle("pill:set-expanded", (_event, expanded: boolean) => {
  pillExpanded = !!expanded;
  if (!pillWindow) return;
  pillWindow.setBounds(pillBoundsFor(pillExpanded), true);
});

ipcMain.handle("artifact:create", (_event, prompt: string) => {
  if (!prompt || typeof prompt !== "string") return;
  pushPromptHistory(prompt);
  createArtifactWindow(prompt);
});

ipcMain.handle("config:push-prompt-history", (_event, prompt: string) => {
  if (typeof prompt !== "string") return getConfig();
  return pushPromptHistory(prompt);
});

ipcMain.handle("backend:generate", async (_event, req: GenerateRequest) => {
  return generate(req);
});

ipcMain.handle("config:get-backend-url", () => getBackendUrl());

ipcMain.handle("config:set-backend-url", (_event, url: string) => {
  if (typeof url !== "string" || !url.trim()) return;
  setBackendUrl(url.trim());
});

ipcMain.handle("config:get", () => getConfig());

ipcMain.handle("config:set", (_event, patch: Partial<Config>) => {
  if (!patch || typeof patch !== "object") return getConfig();
  return setConfig(patch);
});

ipcMain.handle("shell:open-external", (_event, url: string) => {
  if (typeof url !== "string") return;
  shell.openExternal(url);
});

app.whenReady().then(() => {
  createPillWindow();

  const registered = globalShortcut.register(HOTKEY, togglePill);
  if (!registered) {
    console.warn(
      `[desktop-studio] Failed to register ${HOTKEY} global shortcut.`
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPillWindow();
    } else {
      bringPillToFront();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
