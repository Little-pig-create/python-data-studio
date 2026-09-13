# 发布记录

按 `docs/RELEASE_RUNBOOK.md` §6 的要求逐次登记。状态只有两种：**已发布** / **候选版**。
若静态目录未同步或冷启动失败，只能标“候选版”。

---

## v0.1.12 — 2026-09-13

| 项 | 值 |
| --- | --- |
| 版本号 | 0.1.12 |
| Tag | `v0.1.12` |
| Commit | `1e1c02115551b3be504c663391d6b5997599b3bb` |
| 日期 | 2026-09-13 |
| 构建平台 | Windows x64 |
| 状态 | **已发布**（GitHub Release 已上线，5 个资产齐备）；人工验收待确认 |
| 批准人 | 用户 |

### 内容范围

- **全课程重写**：113 章正文 + 6 个模块导学 + 8 个模块大作业，catalog 升至 v84（8 模块 / 127 资源）。
- **运行时清零**：逐格执行 `public/course` 全部 113 份 Notebook，真实错误由基线 50 章 / 71 处降为 **0 处**；与 `HEAD`（v0.1.11）逐格比对确认**零回归**。
- **管线根因修复**：`format-course-notebooks.py` 的 autopep8 会把 f-string 花括号当断行点，导致运行时 `ValueError: Invalid format specifier`（36 份 Notebook / 165 处格式说明符受损）。已做根因修复并附「更差则回退原文」保护。
- **其余根因**：`pd.crosstab` category 列多出 0 高柱、练习脚手架回写本章变量、`transform_rest.py` 变量保护逐格生效导致的改名撕裂等（详见 `docs/COURSE_RUNTIME_FIXES_2026-09-13.md`）。
- **发布标准核对**：移除 ch24 两处新引入的 `assert` 自检（改为 `raise`），使教学代码的 `assert` 由重写后的 12 处降为 10 处。
- **新增门禁**：`check:course-runtime`、`repair:course-fstrings`、`test:rewrite`（6 例单元测试）。
- **本次发版额外变更**：**在线更新签名密钥轮换**（见“已知风险”）。

### 数据快照与产物

| 项 | 值 |
| --- | --- |
| Notebook（app 树 `public/course`） | 128 |
| Notebook（静态目录 `dist/course`） | 128（与 app 树一致，已同步） |
| catalog | v84 / 8 模块 / 127 资源 |
| 数据集 | `datasets/` 16 个 CSV |
| 安装包 | `Python Data Studio_0.1.12_x64-setup.exe`，117.34 MiB（123037398 字节） |
| 安装包 SHA256 | `b68e847ee965fef2b52b418b4da4ec90cb080f29ca00c9a366442725f47ccfa4` |
| 更新清单 | `release/v0.1.12/latest.json`（签名 432 字符） |
| Release 页面 | <https://github.com/Little-pig-create/python-data-studio/releases/tag/v0.1.12> |
| 线上资产 | 5 个，全部校验大小一致：安装包 123037398B、`.sig` 432B、`release-info.json` 1195B、`latest.json` 813B、`SHA256SUMS.txt` 304B |
| 远端同步 | GitHub `main` 与 tag `v0.1.12`；码云 `main`（`4df9bdb..a4536a1`）与 tag `v0.1.11`/`v0.1.12` |

### 构建命令

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat .dsh-work/keys/updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # 密钥无密码，必须显式置空，否则 tauri 转为交互式追问而挂起
export TAURI_UPDATER_PUBKEY="$(cat .dsh-work/keys/updater.key.pub)"
export TAURI_RELEASE_OWNER="Little-pig-create"
export TAURI_RELEASE_REPO="python-data-studio"
node scripts/release.mjs 0.1.12
```

> `package.json` 没有 `repository` 字段，`prepare-tauri-release.mjs` 拿不到兜底值，因此 owner/repo **必须**显式传入。

### 测试结果

- 课程门禁：`check:course-runtime`（113 章 REAL 0 / DESIGN 0）、`check:notebooks`（386 文件）、`check:teaching`（127 资源 / 8 模块 / stale 0）、`check:notebook-math`（96 / stale 0）、`check:module-intros`（6 / stale 0）全部通过；`test:rewrite` 6 例通过。
- 发版自检：`verify-release-assets.mjs` 16 项全部通过（安装包唯一性、SHA256 一致性、`release-info.json` 与 `latest.json` 版本/文件名/大小/下载地址对应、签名非空）。

### 已知风险

1. **签名密钥已轮换（不可逆影响）**：v0.1.11 及更早版本的客户端在编译时内置了**旧公钥**，无法验证 v0.1.12 的更新签名，自动更新将降级为“识别到新版本但只能手动下载完整安装包”。旧密钥对已备份于 `.dsh-work/keys/updater.key.v0.1.11-OLD.bak` 与 `.pub.v0.1.11-OLD.bak`。
2. **`assert` 豁免 10 处**：ch13 的 9 处（该章教学内容即 `assert` 与 `unittest`，并已把“用 assert 做业务校验”写成反例）与 ch109 的 1 处（v0.1.11 即存在）。
3. **PEP 8 剩余 82 处 E501**：其中 57 处是 f-string 修复后不可再拆的长行（再拆会回到 `Invalid format specifier` 的损坏写法）。`check:pep8` 不在任何 CI / 发布门禁内，属信息性结果。
4. **人工验收未完成**：冷启动、三档视口 + 无障碍、控制台无报错尚未逐项执行（`docs/QA_CHECKLIST.md` §1 / §11 / §12）。
5. **线上发布已完成**：`npm run release:publish -- 0.1.12 --upload-only` 上传 5 个资产并转为正式 Release；
   `releases/latest` 已指向 `v0.1.12`（`draft=false`）。上传期间 GitHub API 持续返回 500/502，
   脚本内建重试不足，最终以「跳过已正确资产、只补缺失项」的可续传方式完成（见下条）。
6. **已知潜伏缺陷：`latest.json` 的下载地址用了带空格的资产名**。
   `generate-updater-manifest.mjs` 用磁盘原名（`Python Data Studio_0.1.12_x64-setup.exe`）拼 URL，
   编码为 `%20`；但 GitHub 会把资产名里的空格存成点，实际上传名是
   `Python.Data.Studio_0.1.12_x64-setup.exe`。实测：点号 URL 返回 200，`%20` URL 返回 **404**
   （v0.1.7–v0.1.11 线上 `latest.json` 全部如此）。
   **当前不影响用户**：`VITE_TAURI_SIGNED_UPDATER_ENABLED` 在所有 env/构建脚本中都未定义，
   恒为 `false`，客户端走的是读 `release-info.json` 的 MANUAL 手动下载路径（该文件用点号，正常）。
   一旦启用 Tauri 内置更新插件就会暴露。修复方式：`generate-updater-manifest.mjs` 里对资产名
   做 `.replace(/\s+/g, ".")`，与 `publish-release.mjs` 的 `assetName()` 对齐；
   `verify-release-assets.mjs` 的 `urlPointsTo()` 目前两种写法都接受，建议收紧为只认点号。

### 回滚方式

- 代码：`git checkout v0.1.11` 或以新版本号重新发版（`v0.1.12` 的 Tag 已推送，不要复用该版本号）。
- 客户端：分发 `release/v0.1.11/` 中的安装包。
- **注意**：密钥轮换无法通过代码回滚撤销——退回旧公钥需要重新以旧密钥签名并再次发版。
