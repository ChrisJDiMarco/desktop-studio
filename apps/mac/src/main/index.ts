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
const PILL_HEIGHT_COLLAPSED = 64;
const PILL_HEIGHT_EXPANDED = 320;
const PILL_BOTTOM_MARGIN = 24;
const HOTKEY = "Alt+Space";

let pillWindow: BrowserWindow | null = null;
let pillExpanded = false;

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
  // Steal focus from the previously frontmost app so typing lands in the pill,
  // not in the user's last-focused window.
  app.focus({ steal: true });
  pillWindow.focus();
  pillWindow.webContents.focus();
  // Renderer focuses the actual <input> in response to this signal.
  focusPillInput();
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
    // No native vibrancy: it fills the entire rectangular window with a
    // frosted halo, which leaks past the pill's rounded corners. The pill
    // draws its own frosted-glass via CSS backdrop-filter instead.
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

  if (PILL_WINDOW_VITE_DEV_SERVER_URL) {
    pillWindow.loadURL(PILL_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    pillWindow.loadFile(
      path.join(__dirname, `../renderer/${PILL_WINDOW_VITE_NAME}/index.html`)
    );
  }

  pillWindow.once("ready-to-show", () => {
    bringPillToFront();
  });

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
    // Re-pin position in case the work area or display changed since last show.
    pillWindow.setBounds(pillBoundsFor(pillExpanded));
    bringPillToFront();
  }
}

ipcMain.on("pill:hide", () => {
  pillWindow?.hide();
});

ipcMain.handle("pill:set-expanded", (_event, expanded: boolean) => {
  pillExpanded = !!expanded;
  if (!pillWindow) return;
  pillWindow.setBounds(pillBoundsFor(pillExpanded), true);
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
  // Stay alive on macOS — the pill is just hidden, not destroyed.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
