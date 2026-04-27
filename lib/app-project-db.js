const DB_NAME = 'desktop-studio-app-projects';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';

let _db = null;

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE);
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error || new Error('Failed to open app project database'));
  });
}

function idbPut(key, value) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    tx.objectStore(PROJECT_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save app project'));
  }));
}

function idbGet(key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, 'readonly');
    const req = tx.objectStore(PROJECT_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('Failed to load app project'));
  }));
}

function idbDelete(key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    tx.objectStore(PROJECT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete app project'));
  }));
}

export function appProjectMeta(project) {
  if (!project || typeof project !== 'object') return null;
  const files = Array.isArray(project.files) ? project.files : [];
  return {
    id: project.id,
    artifactId: project.artifactId,
    title: project.title || 'Generated App',
    slug: project.slug || 'generated-app',
    description: project.description || '',
    status: project.status || 'ready',
    fileCount: files.length || project.fileCount || 0,
    entryPath: project.entryPath || project.entry || 'app/page.tsx',
    createdAt: project.createdAt || Date.now(),
    updatedAt: project.updatedAt || Date.now(),
    error: project.error || null,
  };
}

export async function saveAppProject(project) {
  if (!project?.id) throw new Error('App project is missing an id');
  const now = Date.now();
  const stored = {
    ...project,
    updatedAt: now,
    status: project.status || 'ready',
  };
  await idbPut(project.id, stored);
  return appProjectMeta(stored);
}

export async function loadAppProject(id) {
  if (!id) return null;
  return idbGet(id);
}

export async function deleteAppProject(id) {
  if (!id) return;
  await idbDelete(id);
}
