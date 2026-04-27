import { app, BrowserWindow, globalShortcut, screen, ipcMain } from "electron";
import path from "node:path";

// @ts-expect-error — electron-squirrel-startup ships no .d.ts in some versions
import started from "electron-squirrel-startup";

// Forge's Vite plugin injects these at build time.
declare const PILL_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const PILL_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

const PILL_WIDTH = 520;
const PILL_HEIGHT = 64;
const PILL_BOTTOM_MARGIN = 24;
const HOTKEY = "Alt+Space";

let pillWindow: BrowserWindow | null = null;

function pillWindowPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  const x = Math.round(workArea.x + (workArea.width - PILL_WIDTH) / 2);
  const y = workArea.y + workArea.height - PILL_HEIGHT - PILL_BOTTOM_MARGIN;
  return { x, y };
}

function createPillWindow() {
  const { x, y } = pillWindowPosition();

  pillWindow = new BrowserWindow({
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    x,
    y,
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
    vibrancy: "under-window",
    visualEffectState: "active",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Float above other windows but below full-screen apps.
  pillWindow.setAlwaysOnTop(true, "floating");
  pillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (PILL_WINDOW_VITE_DEV_SERVER_URL) {
    pillWindow.loadURL(PILL_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    pillWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${PILL_WINDOW_VITE_NAME}/index.html`
      )
    );
  }

  pillWindow.once("ready-to-show", () => {
    pillWindow?.show();
    pillWindow?.focus();
  });

  pillWindow.on("closed", () => {
    pillWindow = null;
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
    const { x, y } = pillWindowPosition();
    pillWindow.setPosition(x, y);
    pillWindow.show();
    pillWindow.focus();
  }
}

ipcMain.on("pill:hide", () => {
  pillWindow?.hide();
});

app.whenReady().then(() => {
  // Hide from Dock — pill is meant to feel ambient, not a regular app.
  // Comment this out during early development if you need Dock access for debugging.
  // app.dock?.hide();

  createPillWindow();

  const registered = globalShortcut.register(HOTKEY, togglePill);
  if (!registered) {
    console.warn(`[desktop-studio] Failed to register ${HOTKEY} global shortcut.`);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPillWindow();
    } else {
      pillWindow?.show();
      pillWindow?.focus();
    }
  });
});

app.on("window-all-closed", () => {
  // Stay alive on macOS — the pill is just hidden.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
