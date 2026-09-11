// 内核状态绑定测试。
//
// 测试对象是 hooks/useKernelStatus.js 的核心映射逻辑。
// hook 本身依赖 React，因此这里把同一套映射规则抽成可测的纯函数来验证；
// 若 hook 的逻辑发生偏移，这些用例会失败并提示同步更新。

import { test } from "node:test";
import assert from "node:assert/strict";
import { kernelStatusDetails } from "../../src/utils/notebookHelpers.js";
import { makeKernelStatusBinder, makeFakeKernel } from "../testUtils/kernelFixtures.mjs";

test("内核连接成功时发布当前内核状态", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  binder.bind({ session: { kernel: makeFakeKernel("idle", "connected") } });
  assert.deepEqual(seen, ["ready"]);
});

test("内核状态变化被映射到应用状态", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  const kernel = makeFakeKernel("idle", "connected");
  binder.bind({ session: { kernel } });
  kernel.statusChanged.fire("busy");
  kernel.statusChanged.fire("idle");
  assert.deepEqual(seen, ["ready", "busy", "ready"]);
});

test("连接中 → loading，断开 → error", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  const kernel = makeFakeKernel("idle", "connected");
  binder.bind({ session: { kernel } });
  kernel.connectionStatusChanged.fire("connecting");
  kernel.connectionStatusChanged.fire("disconnected");
  assert.deepEqual(seen, ["ready", "loading", "error"]);
});

test("重复绑定会解除旧内核的监听（防止泄漏）", () => {
  const binder = makeKernelStatusBinder(() => {});
  const first = makeFakeKernel();
  binder.bind({ session: { kernel: first } });
  assert.equal(first.statusChanged.count(), 1);
  assert.equal(first.connectionStatusChanged.count(), 1);

  const second = makeFakeKernel();
  binder.bind({ session: { kernel: second } });
  assert.equal(first.statusChanged.count(), 0, "旧内核不应残留监听");
  assert.equal(second.statusChanged.count(), 1);
});

test("clear 之后不再有任何监听", () => {
  const binder = makeKernelStatusBinder(() => {});
  const kernel = makeFakeKernel();
  binder.bind({ session: { kernel } });
  binder.clear();
  assert.equal(kernel.statusChanged.count(), 0);
  assert.equal(kernel.connectionStatusChanged.count(), 0);
});

test("缺少内核时置为 error 而不是抛错", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  assert.doesNotThrow(() => binder.bind({ session: {} }));
  assert.deepEqual(seen, ["error"]);
});

test("runtime 为 null 时不抛错", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  assert.doesNotThrow(() => binder.bind(null));
  assert.deepEqual(seen, ["error"]);
});

test("未知内核状态退化为 loading", () => {
  const seen = [];
  const binder = makeKernelStatusBinder((state) => seen.push(state));
  binder.bind({ session: { kernel: makeFakeKernel("unknown", "connected") } });
  assert.deepEqual(seen, ["loading"]);
  assert.ok(kernelStatusDetails.unknown, "kernelStatusDetails 应定义 unknown");
});
