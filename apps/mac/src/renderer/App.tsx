import { useEffect } from "react";
import PillApp from "./PillApp";
import ArtifactApp from "./ArtifactApp";

// Both pill and artifact windows share this renderer bundle. Routing is by
// URL hash: `#artifact=<encoded prompt>` → ArtifactApp, otherwise PillApp.
function isArtifactRoute() {
  return window.location.hash.startsWith("#artifact=");
}

export default function App() {
  const artifact = isArtifactRoute();

  // Tag the body so per-window CSS rules (drag region, padding) can specialize.
  useEffect(() => {
    const cls = artifact ? "artifact-mode" : "pill-mode";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [artifact]);

  return artifact ? <ArtifactApp /> : <PillApp />;
}
