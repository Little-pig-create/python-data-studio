// 内核状态映射（纯函数）。
//
// 从 hooks/useKernelStatus.js 抽出，目的是让"Jupyter 信号 → 应用状态"的规则
// 可以被单元测试直接覆盖，并确保 hook 与测试共用同一份实现（不会各自漂移）。

import { kernelStatusDetails } from "./notebookHelpers.js";

/** 内核执行状态（statusChanged）→ 应用状态。 */
export function mapKernelStatus(kernelStatus) {
  const [state, message] = kernelStatusDetails[kernelStatus]
    || ["loading", "正在同步内核状态"];
  return { state, message };
}

/**
 * 连接状态（connectionStatusChanged）→ 应用状态。
 *
 * 注意 connected 是特殊情形：连接恢复后应回读**内核自身的状态**，
 * 而不是假定它已就绪，因此返回 `publishKernelStatus: true` 交给调用方处理。
 */
export function mapConnectionStatus(connectionStatus, kernelStatus) {
  if (connectionStatus === "connected") {
    return { publishKernelStatus: true, state: null, message: null };
  }
  if (connectionStatus === "connecting") {
    return { publishKernelStatus: false, state: "loading", message: "正在重新连接内核" };
  }
  return { publishKernelStatus: false, state: "error", message: "内核连接已断开" };
}
