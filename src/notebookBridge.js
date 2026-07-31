const PROTOCOL_VERSION = 1;
const SOURCE = "course-shell";
const RUNTIME_SOURCE = "jupyter-runtime";

const makeMessage = (type, payload = {}, requestId) => ({
  protocolVersion: PROTOCOL_VERSION,
  source: SOURCE,
  type,
  requestId,
  timestamp: Date.now(),
  payload
});

export function createNotebookBridge({ iframe, onEvent }) {
  let disposed = false;
  let ready = false;
  const pending = [];

  const post = (type, payload, requestId) => {
    if (disposed || !iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(makeMessage(type, payload, requestId), window.location.origin);
  };

  const onMessage = (event) => {
    if (disposed || event.origin !== window.location.origin || event.source !== iframe?.contentWindow) return;
    const message = event.data;
    if (!message || message.protocolVersion !== PROTOCOL_VERSION || message.source !== RUNTIME_SOURCE) return;
    if (message.type === "bridge:ready") {
      ready = true;
      pending.splice(0).forEach(({ type, payload, requestId }) => post(type, payload, requestId));
      post("bridge:ack", { protocolVersion: PROTOCOL_VERSION });
    }
    onEvent?.(message);
  };

  window.addEventListener("message", onMessage);
  const send = (type, payload = {}, requestId = crypto.randomUUID()) => {
    if (type !== "bridge:hello" && !ready) {
      if (pending.length < 20) pending.push({ type, payload, requestId });
    } else {
      post(type, payload, requestId);
    }
    return requestId;
  };

  return {
    hello: () => post("bridge:hello", { protocolVersion: PROTOCOL_VERSION }),
    send,
    dispose: () => {
      disposed = true;
      window.removeEventListener("message", onMessage);
    }
  };
}
