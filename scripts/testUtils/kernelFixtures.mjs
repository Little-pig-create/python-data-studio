// 测试夹具：内核状态绑定的映射逻辑 + 假内核。
//
// 重要：这里的映射规则必须与 src/hooks/useKernelStatus.js 保持一致。
// 为避免"测试通过但实现漂移"，映射部分被抽成纯函数放在
// src/utils/kernelStatusMapping.js，hook 与测试**共用同一份实现**。

import {
  mapKernelStatus,
  mapConnectionStatus,
} from "../../src/utils/kernelStatusMapping.js";

/** 创建一个可手动触发事件的假内核。 */
export function makeFakeKernel(status = "idle", connectionStatus = "connected") {
  const listeners = { status: [], connection: [] };
  const makeSignal = (key) => ({
    connect: (fn) => listeners[key].push(fn),
    disconnect: (fn) => {
      const index = listeners[key].indexOf(fn);
      if (index >= 0) listeners[key].splice(index, 1);
    },
    count: () => listeners[key].length,
    fire: (value) => [...listeners[key]].forEach((fn) => fn(null, value)),
  });
  return {
    status,
    connectionStatus,
    statusChanged: makeSignal("status"),
    connectionStatusChanged: makeSignal("connection"),
  };
}

/**
 * 与 useKernelStatus 同构的绑定器（共用映射函数）。
 * @param onState 状态变化回调；第二个参数用于记录文案（可选）
 */
export function makeKernelStatusBinder(onState, onMessage) {
  let binding = null;

  const emit = (result) => {
    onState?.(result.state);
    onMessage?.(result.message);
  };

  const publish = (kernelStatus) => emit(mapKernelStatus(kernelStatus));

  const clear = () => {
    if (!binding) return;
    binding.kernel.statusChanged.disconnect(binding.onStatusChanged);
    binding.kernel.connectionStatusChanged.disconnect(binding.onConnectionStatusChanged);
    binding = null;
  };

  const bind = (runtime) => {
    clear();
    const kernel = runtime?.session?.kernel;
    if (!kernel) {
      emit({ state: "error", message: "Python 内核不可用" });
      return;
    }
    const onStatusChanged = (_, status) => publish(status);
    const onConnectionStatusChanged = (_, status) => {
      const mapped = mapConnectionStatus(status, kernel.status);
      if (mapped.publishKernelStatus) {
        publish(kernel.status);
      } else {
        emit(mapped);
      }
    };
    kernel.statusChanged.connect(onStatusChanged);
    kernel.connectionStatusChanged.connect(onConnectionStatusChanged);
    binding = { kernel, onStatusChanged, onConnectionStatusChanged };
    onConnectionStatusChanged(kernel, kernel.connectionStatus);
  };

  return { bind, clear, publish };
}
