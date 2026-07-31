const DB_NAME = "python-data-studio-datasets";
const STORE_NAME = "imports";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const requestResult = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export async function listImportedDatasets() {
  const database = await openDatabase();
  return requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
}

export async function saveImportedDataset(file) {
  if (!file || file.size > 60 * 1024 * 1024) throw new Error("单个导入文件不能超过 60 MB");
  const database = await openDatabase();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type || "text/plain",
    importedAt: new Date().toISOString(),
    blob: file
  };
  await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item));
  return item;
}

export async function deleteImportedDataset(id) {
  const database = await openDatabase();
  await requestResult(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id));
}

export const readDatasetPreview = async (blob) => blob.slice(0, 64 * 1024).text();
