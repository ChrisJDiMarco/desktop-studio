// Surface the preload-exposed API on `window` for type safety in the renderer.
import type { DesktopStudioApi } from "../preload";

declare global {
  interface Window {
    desktopStudio: DesktopStudioApi;
  }
}

export {};
