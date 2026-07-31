const STORAGE_KEY = "python-data-studio-announcements";
const remoteBase = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_ANNOUNCEMENT_API || "").replace(/\/$/, "") : "";

const readLocal = () => {
  try {
    const value = JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export async function listPublishedAnnouncements() {
  if (remoteBase) {
    try {
      const response = await fetch(`${remoteBase}/announcements?status=published`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("公告服务暂不可用");
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.items)) return payload.items;
    } catch {
      // Offline mode intentionally falls back to the last local snapshot.
    }
  }
  return readLocal().filter((item) => item.status === "published");
}

export async function syncAnnouncements(items) {
  if (remoteBase) {
    const response = await fetch(`${remoteBase}/teacher/announcements/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items })
    });
    if (!response.ok) throw new Error("公告同步失败");
  }
  window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("announcements-updated"));
}

export { STORAGE_KEY };
