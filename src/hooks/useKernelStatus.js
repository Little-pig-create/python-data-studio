import { useCallback, useRef } from "react";
import { useNotebookStore } from "../notebookStore";
import { mapConnectionStatus, mapKernelStatus } from "../utils/kernelStatusMapping.js";

/**
 * 内核状态绑定。
 *
 * 作用：把 Jupyter 内核的 `statusChanged` / `connectionStatusChanged` 信号
 * 转换成应用内部统一的状态（idle / loading / busy / error），并写回
 * `useNotebookStore`，供工具栏按钮与状态胶囊使用。
 *
 * 映射规则本身在 `utils/kernelStatusMapping.js`（纯函数），便于单元测试；
 * 本 hook 只负责"订阅信号 + 写回 store"这部分副作用。
 *
 * @param onRuntimeState 状态变化时的回调（可选），用于通知外层。
 */
export function useKernelStatus(onRuntimeState) {
  const bindingRef = useRef(null);
  const onRuntimeStateRef = useRef(onRuntimeState);
  onRuntimeStateRef.current = onRuntimeState;

  /** 把内核原始状态发布到 store。 */
  const publishKernelStatus = useCallback((kernelStatus) => {
    const { state, message } = mapKernelStatus(kernelStatus);
    useNotebookStore.getState().setRuntime(state, message);
    onRuntimeStateRef.current?.(state);
  }, []);

  /** 解除当前绑定（组件卸载或切换 notebook 时调用）。 */
  const clearKernelStatusBinding = useCallback(() => {
    const binding = bindingRef.current;
    if (!binding) return;
    binding.kernel.statusChanged.disconnect(binding.onStatusChanged);
    binding.kernel.connectionStatusChanged.disconnect(binding.onConnectionStatusChanged);
    bindingRef.current = null;
  }, []);

  /** 绑定一个新运行时；会先解除旧绑定，避免重复监听。 */
  const bindKernelStatus = useCallback((runtime) => {
    clearKernelStatusBinding();
    const kernel = runtime?.session?.kernel;
    if (!kernel) {
      useNotebookStore.getState().setRuntime("error", "Python 内核不可用");
      onRuntimeStateRef.current?.("error");
      return;
    }

    const onStatusChanged = (_, status) => publishKernelStatus(status);
    const onConnectionStatusChanged = (_, status) => {
      const mapped = mapConnectionStatus(status, kernel.status);
      if (mapped.publishKernelStatus) {
        // 连接恢复后回读内核自身状态，而不是假定它已就绪。
        publishKernelStatus(kernel.status);
        return;
      }
      useNotebookStore.getState().setRuntime(mapped.state, mapped.message);
      onRuntimeStateRef.current?.(mapped.state);
    };

    kernel.statusChanged.connect(onStatusChanged);
    kernel.connectionStatusChanged.connect(onConnectionStatusChanged);
    bindingRef.current = { kernel, onStatusChanged, onConnectionStatusChanged };
    onConnectionStatusChanged(kernel, kernel.connectionStatus);
  }, [clearKernelStatusBinding, publishKernelStatus]);

  return { bindKernelStatus, clearKernelStatusBinding, publishKernelStatus };
}
