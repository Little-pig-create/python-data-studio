const DB_NAME = "python-data-studio-notebooks";
const STORE_NAME = "documents";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadNotebookDraft(key) {
  if (!window.indexedDB) return null;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNotebookDraft(key, document) {
  if (!window.indexedDB) return;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(document, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNotebookDraft(key) {
  if (!window.indexedDB) return;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const CUSTOM_NOTEBOOK_PREFIX = "custom-notebook:";

export async function loadCustomNotebook(id) {
  return loadNotebookDraft(CUSTOM_NOTEBOOK_PREFIX + id);
}

export async function saveCustomNotebook(id, record) {
  return saveNotebookDraft(CUSTOM_NOTEBOOK_PREFIX + id, record);
}

export async function deleteCustomNotebook(id) {
  return deleteNotebookDraft(CUSTOM_NOTEBOOK_PREFIX + id);
}

export async function listCustomNotebooks() {
  if (!window.indexedDB) return [];
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
    const records = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(records);
        return;
      }
      if (String(cursor.key).startsWith(CUSTOM_NOTEBOOK_PREFIX)) records.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}
