/**
 * IndexedDB storage for large artifact data (base64 images, HTML content).
 *
 * localStorage has a ~5-10MB limit. Two Imagen-generated images (~2MB each as
 * base64) plus HTML content easily exceeds this, causing silent QuotaExceededError
 * and artifacts disappearing on reload.
 *
 * Strategy:
 *  - localStorage: slim artifact metadata (id, title, x, y, width, height, …)
 *  - IndexedDB:    artifact.content (HTML) and artifact.mediaUrl (data: URLs)
 *
 * Keys in localStorage use sentinel strings "idb:content:<id>" and
 * "idb:media:<id>" so the hydration step knows what to fetch.
 */

const DB_NAME = 'desktop-studio-artifacts';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const CONTENT_STORE = 'content';

let _db = null;
const _savedContent = new Map();
const _savedMedia = new Map();

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(MEDIA_STORE)) d.createObjectStore(MEDIA_STORE);
      if (!d.objectStoreNames.contains(CONTENT_STORE)) d.createObjectStore(CONTENT_STORE);
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function idbPut(storeName, key, value) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function idbPutIfChanged(storeName, key, value) {
  const cache = storeName === CONTENT_STORE ? _savedContent : _savedMedia;
  if (cache.get(key) === value) return Promise.resolve();
  return idbPut(storeName, key, value).then(() => {
    cache.set(key, value);
  });
}

function idbGet(storeName, key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  }));
}

function idbDelete(storeName, key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => {
      const cache = storeName === CONTENT_STORE ? _savedContent : _savedMedia;
      cache.delete(key);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  }));
}

function idbGetAllKeys(storeName) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const IDB_CONTENT_PREFIX = 'idb:content:';
export const IDB_MEDIA_PREFIX   = 'idb:media:';
export const IDB_WORKSPACE_PREFIX = 'workspace:';
export const IDB_DESKTOP_BACKGROUND_KEY = 'desktop-background:current';
export const IDB_WALLPAPER_PREFIX = 'wallpaper:';

/** Return true if value is a sentinel reference, not real data. */
export function isIdbRef(val) {
  return typeof val === 'string' &&
    (val.startsWith(IDB_CONTENT_PREFIX) || val.startsWith(IDB_MEDIA_PREFIX));
}

/**
 * Serialize an array of artifacts for localStorage.
 * Large content/mediaUrl fields are written to IndexedDB and replaced with
 * sentinel strings. Also strips isLoading, future, and trims history.
 */
export async function serializeArtifacts(artifacts) {
  const slim = await Promise.all(artifacts.map(async (a) => {
    const out = {
      ...a,
      isLoading: false,       // never persist a loading state
      future: undefined,      // redo history — not needed across sessions
      history: await persistHistoryContent(a.id, a.history),
    };

    // Move HTML content to IDB if non-trivial
    if (typeof a.content === 'string' && a.content.length > 500) {
      await idbPutIfChanged(CONTENT_STORE, a.id, a.content);
      out.content = IDB_CONTENT_PREFIX + a.id;
    }

    // Move data-URL mediaUrl to IDB (base64 images are 1-4MB each)
    if (typeof a.mediaUrl === 'string' && a.mediaUrl.startsWith('data:')) {
      await idbPutIfChanged(MEDIA_STORE, a.id, a.mediaUrl);
      out.mediaUrl = IDB_MEDIA_PREFIX + a.id;
    }

    if (Array.isArray(a.snapshots)) {
      out.snapshots = await Promise.all(a.snapshots.map(async (snapshot) => {
        const snapOut = { ...snapshot };
        const snapKey = `${a.id}:snapshot:${snapshot.id}`;
        if (typeof snapshot.content === 'string' && snapshot.content.length > 500) {
          await idbPutIfChanged(CONTENT_STORE, snapKey, snapshot.content);
          snapOut.content = IDB_CONTENT_PREFIX + snapKey;
        }
        if (typeof snapshot.mediaUrl === 'string' && snapshot.mediaUrl.startsWith('data:')) {
          await idbPutIfChanged(MEDIA_STORE, snapKey, snapshot.mediaUrl);
          snapOut.mediaUrl = IDB_MEDIA_PREFIX + snapKey;
        }
        return snapOut;
      }));
    }

    return out;
  }));

  return slim;
}

/**
 * Hydrate artifacts loaded from localStorage.
 * Replaces sentinel strings with actual data fetched from IndexedDB.
 * Returns null for any entry it can't resolve (artifact data is gone).
 */
export async function hydrateArtifacts(artifacts) {
  return Promise.all(artifacts.map(async (a) => {
    let content = a.content;
    let mediaUrl = a.mediaUrl;
    let snapshots = a.snapshots;

    if (typeof content === 'string' && content.startsWith(IDB_CONTENT_PREFIX)) {
      content = await idbGet(CONTENT_STORE, content.slice(IDB_CONTENT_PREFIX.length)).catch(() => null);
    }

    if (typeof mediaUrl === 'string' && mediaUrl.startsWith(IDB_MEDIA_PREFIX)) {
      mediaUrl = await idbGet(MEDIA_STORE, mediaUrl.slice(IDB_MEDIA_PREFIX.length)).catch(() => null);
    }

    if (Array.isArray(snapshots)) {
      snapshots = await Promise.all(snapshots.map(async (snapshot) => {
        let snapContent = snapshot.content;
        let snapMediaUrl = snapshot.mediaUrl;
        if (typeof snapContent === 'string' && snapContent.startsWith(IDB_CONTENT_PREFIX)) {
          snapContent = await idbGet(CONTENT_STORE, snapContent.slice(IDB_CONTENT_PREFIX.length)).catch(() => null);
        }
        if (typeof snapMediaUrl === 'string' && snapMediaUrl.startsWith(IDB_MEDIA_PREFIX)) {
          snapMediaUrl = await idbGet(MEDIA_STORE, snapMediaUrl.slice(IDB_MEDIA_PREFIX.length)).catch(() => null);
        }
        return { ...snapshot, content: snapContent, mediaUrl: snapMediaUrl };
      }));
    }

    const history = Array.isArray(a.history)
      ? await Promise.all(a.history.map(async (h) => {
          if (!h || typeof h !== 'object') return h;
          let entryContent = h.content;
          if (typeof entryContent === 'string' && entryContent.startsWith(IDB_CONTENT_PREFIX)) {
            entryContent = await idbGet(CONTENT_STORE, entryContent.slice(IDB_CONTENT_PREFIX.length)).catch(() => null);
          }
          return { ...h, content: entryContent };
        }))
      : a.history;

    return { ...a, content, mediaUrl, snapshots, history };
  }));
}

/** Store data-URL desktop backgrounds in IDB before writing metadata to localStorage. */
export async function serializeDesktopBackground(background) {
  if (!background || typeof background !== 'object') return background;
  const out = { ...background };
  if (typeof out.value === 'string' && out.value.startsWith('data:')) {
    await idbPutIfChanged(MEDIA_STORE, IDB_DESKTOP_BACKGROUND_KEY, out.value);
    out.value = IDB_MEDIA_PREFIX + IDB_DESKTOP_BACKGROUND_KEY;
  }
  return out;
}

/** Hydrate a persisted desktop background from IDB when needed. */
export async function hydrateDesktopBackground(background) {
  if (!background || typeof background !== 'object') return background;
  if (typeof background.value !== 'string' || !background.value.startsWith(IDB_MEDIA_PREFIX)) {
    return background;
  }
  const key = background.value.slice(IDB_MEDIA_PREFIX.length);
  const value = await idbGet(MEDIA_STORE, key).catch(() => null);
  return value ? { ...background, value } : background;
}

function ensureWallpaperId(wallpaper, index) {
  if (wallpaper?.id) return wallpaper.id;
  const createdAt = wallpaper?.createdAt || Date.now();
  const source = `${wallpaper?.prompt || ''}:${wallpaper?.type || ''}:${index}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  return `wallpaper-${createdAt}-${index}-${Math.abs(hash).toString(36)}`;
}

/** Store saved wallpaper data URLs in IDB and return localStorage-safe entries. */
export async function serializeSavedWallpapers(wallpapers) {
  return Promise.all((wallpapers || []).map(async (wallpaper, index) => {
    const id = ensureWallpaperId(wallpaper, index);
    const out = { ...wallpaper, id };
    if (typeof out.url === 'string' && out.url.startsWith('data:')) {
      const key = `${IDB_WALLPAPER_PREFIX}${id}`;
      await idbPutIfChanged(MEDIA_STORE, key, out.url);
      out.url = IDB_MEDIA_PREFIX + key;
    }
    return out;
  }));
}

/** Hydrate saved wallpaper entries from IDB before rendering thumbnails. */
export async function hydrateSavedWallpapers(wallpapers) {
  return Promise.all((wallpapers || []).map(async (wallpaper, index) => {
    const id = ensureWallpaperId(wallpaper, index);
    const out = { ...wallpaper, id };
    if (typeof out.url === 'string' && out.url.startsWith(IDB_MEDIA_PREFIX)) {
      const key = out.url.slice(IDB_MEDIA_PREFIX.length);
      const value = await idbGet(MEDIA_STORE, key).catch(() => null);
      if (value) out.url = value;
    }
    return out;
  }));
}

/** Delete IDB media for a saved wallpaper entry. */
export async function deleteSavedWallpaperMedia(wallpaper) {
  if (!wallpaper) return;
  const keys = [];
  if (wallpaper.id) keys.push(`${IDB_WALLPAPER_PREFIX}${wallpaper.id}`);
  if (typeof wallpaper.url === 'string' && wallpaper.url.startsWith(IDB_MEDIA_PREFIX)) {
    keys.push(wallpaper.url.slice(IDB_MEDIA_PREFIX.length));
  }
  await Promise.all([...new Set(keys)].map(key => idbDelete(MEDIA_STORE, key).catch(() => {})));
}

/** Delete all IDB data for a given artifact ID. */
export async function deleteArtifactData(id) {
  await Promise.all([CONTENT_STORE, MEDIA_STORE].map(async (storeName) => {
    const keys = await idbGetAllKeys(storeName);
    await Promise.all(keys
      .filter(k => k === id || (typeof k === 'string' && k.startsWith(`${id}:`)))
      .map(k => idbDelete(storeName, k))
    );
  }));
}

/** Serialize artifacts into stable, snapshot-scoped IDB keys. */
export async function serializeWorkspaceArtifacts(artifacts, snapshotId) {
  const safeSnapshotId = String(snapshotId || Date.now()).replace(/[^a-zA-Z0-9:_-]/g, '-');
  return Promise.all((artifacts || []).map(async (a) => {
    const keyBase = `${IDB_WORKSPACE_PREFIX}${safeSnapshotId}:${a.id}`;
    const out = {
      ...a,
      isLoading: false,
      future: undefined,
      history: trimHistory(a.history),
      snapshots: trimSnapshotList(a.snapshots),
    };

    if (typeof a.content === 'string' && a.content.length > 500) {
      const key = `${keyBase}:content`;
      await idbPutIfChanged(CONTENT_STORE, key, a.content);
      out.content = IDB_CONTENT_PREFIX + key;
    }

    if (typeof a.mediaUrl === 'string' && a.mediaUrl.startsWith('data:')) {
      const key = `${keyBase}:media`;
      await idbPutIfChanged(MEDIA_STORE, key, a.mediaUrl);
      out.mediaUrl = IDB_MEDIA_PREFIX + key;
    }

    return out;
  }));
}

/** Hydrate artifacts from a workspace snapshot. */
export async function hydrateWorkspaceArtifacts(artifacts) {
  return hydrateArtifacts(artifacts || []);
}

/** Delete IDB blobs that belong to one workspace snapshot. */
export async function deleteWorkspaceSnapshotData(snapshotId) {
  const prefix = `${IDB_WORKSPACE_PREFIX}${snapshotId}:`;
  await Promise.all([CONTENT_STORE, MEDIA_STORE].map(async (storeName) => {
    const keys = await idbGetAllKeys(storeName);
    await Promise.all(keys
      .filter(k => typeof k === 'string' && k.startsWith(prefix))
      .map(k => idbDelete(storeName, k))
    );
  }));
}

/** Remove IDB entries whose IDs are no longer in the active artifact list. */
export async function pruneOrphans(activeIds) {
  for (const storeName of [CONTENT_STORE, MEDIA_STORE]) {
    const keys = await idbGetAllKeys(storeName);
    await Promise.all(keys
      .filter(k => {
        if (activeIds.has(k)) return false;
        if (typeof k === 'string') {
          if (k === IDB_DESKTOP_BACKGROUND_KEY || k.startsWith(IDB_WALLPAPER_PREFIX)) return false;
          if (k.startsWith(IDB_WORKSPACE_PREFIX)) return false;
          for (const id of activeIds) {
            if (k.startsWith(`${id}:`)) return false;
          }
        }
        return true;
      })
      .map(k => idbDelete(storeName, k))
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Workspace snapshots are point-in-time captures — undo within them isn't
// meaningful, so we just drop history to save space.
function trimHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-3).map(h => ({
    title: h?.title,
    mediaUrl: typeof h?.mediaUrl === 'string' && !h.mediaUrl.startsWith('data:')
      ? h.mediaUrl
      : undefined,
  }));
}

// Keep the last 10 history entries and stash each entry's content in IDB so
// undo/redo work after a reload. Each entry gets a stable per-position key
// (`<artifactId>:history:0` is the oldest of the 10). `deleteArtifactData`
// already cleans these up via the `<id>:` prefix sweep.
async function persistHistoryContent(artifactId, history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const tail = history.slice(-10);
  return Promise.all(tail.map(async (h, idx) => {
    if (!h || typeof h !== 'object') return h;
    const out = {
      title: h.title,
      mediaUrl: typeof h.mediaUrl === 'string' && !h.mediaUrl.startsWith('data:')
        ? h.mediaUrl
        : undefined,
    };
    if (typeof h.content === 'string' && h.content.length > 0) {
      if (h.content.length > 500) {
        const key = `${artifactId}:history:${idx}`;
        await idbPutIfChanged(CONTENT_STORE, key, h.content);
        out.content = IDB_CONTENT_PREFIX + key;
      } else {
        out.content = h.content;
      }
    }
    return out;
  }));
}

function trimSnapshotList(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return [];
  return snapshots.slice(0, 5).map(snapshot => ({
    id: snapshot.id,
    name: snapshot.name,
    title: snapshot.title,
    type: snapshot.type,
    language: snapshot.language,
    width: snapshot.width,
    height: snapshot.height,
    createdAt: snapshot.createdAt,
    mediaUrl: typeof snapshot.mediaUrl === 'string' && !snapshot.mediaUrl.startsWith('data:')
      ? snapshot.mediaUrl
      : undefined,
  }));
}
