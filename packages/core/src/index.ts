// Single barrel for the shared core. Both apps/web and apps/mac import from
// `@desktop-studio/core` and we re-export everything they need here.

export * from "./ai-models";
export * from "./ai-client";
// JS modules: kept as .js + .d.ts so TS can resolve types without checkJs.
// (artifact-runtime.js ≈ 700 LOC; artifact-utils.js ≈ 2150 LOC of legacy JS.)
export * from "./artifact-runtime";
export * from "./artifact-utils";
