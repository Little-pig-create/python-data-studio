// 内核启动进度：阶段权重与平滑推进。
//
// 这些权重是**按实测耗时**设定的（Chrome 无头 + DevTools 计时）：
//   冷启动到达 ready 约 6.4 s，等待 kernel.info 约 5 s。
// 若权重失真，进度条会长时间停在同一个数字上，看起来像卡死
// —— 这正是此前"卡在 40%"的成因，因此用测试锁住。

import { test } from "node:test";
import assert from "node:assert/strict";

import { RUNTIME_PHASES } from "../../src/notebookRuntime.js";

test("阶段权重合计为 100，保证百分比可直接映射", () => {
  const total = RUNTIME_PHASES.reduce((sum, phase) => sum + phase.weight, 0);
  assert.equal(total, 100);
});

test("等待内核就绪（ready）的权重最大", () => {
  const ready = RUNTIME_PHASES.find((phase) => phase.id === "ready");
  assert.ok(ready, "应定义 ready 阶段");
  for (const phase of RUNTIME_PHASES) {
    if (phase.id === "ready") continue;
    assert.ok(
      ready.weight >= phase.weight,
      `ready(${ready.weight}) 应不小于 ${phase.id}(${phase.weight})：`
        + "它是实测最耗时且无子进度的一段",
    );
  }
});

test("阶段顺序符合真实启动流程", () => {
  assert.deepEqual(
    RUNTIME_PHASES.map((phase) => phase.id),
    ["script", "connect", "session", "ready", "packages", "done"],
  );
});

test("每个阶段都有可读的中文标签", () => {
  for (const phase of RUNTIME_PHASES) {
    assert.ok(phase.label && phase.label.length >= 4, `${phase.id} 缺少标签`);
  }
});

test("ready 阶段落在进度条的中间区间（不会太早跑满）", () => {
  let acc = 0;
  let readyEnd = 0;
  for (const phase of RUNTIME_PHASES) {
    acc += phase.weight;
    if (phase.id === "ready") readyEnd = acc;
  }
  assert.ok(readyEnd >= 50 && readyEnd <= 85,
    `ready 结束时应在 50%–85%，实际 ${readyEnd}%`);
});
