### Git 发版

项目不使用 GitHub Actions 自动发布。版本发布通过纯 Git 完成，并同时在本地构建 Release 安装包：

```powershell
npm run release -- 0.1.3
```

脚本会依次完成：

1. 同步更新应用版本号（`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`）；
2. 本地构建学生端正式桌面安装包（`npm run desktop:build:student:release`）；
3. 归档安装包到 `release/v0.1.3/`，并生成 `RELEASE_NOTES.md` 和 `SHA256SUMS.txt`；
4. 创建版本提交和 `v0.1.3` Tag；
5. 执行：

   ```text
   git push origin main
   git push origin v0.1.3
   ```

如需跳过本地构建（例如只打 Tag）：

```powershell
npm run release -- 0.1.3 --skip-build
```

如需使用其他 Git 远程：

```powershell
$env:RELEASE_REMOTE = "github"
npm run release -- 0.1.3
```

Release 产物位于 `release/vX.Y.Z/`，需要分发时将目录内容上传到 Git 托管平台（GitHub / Gitee）的 Release 页面即可。`release/` 目录不会提交到仓库。

### 在线更新发布

应用内自动更新依赖 Tauri 签名安装包和静态更新清单 `latest.json`。普通 EXE/MSI 安装包不能单独用于应用内更新。

首次发布前生成并妥善保存签名密钥：

```powershell
npx tauri signer generate -w "$env:USERPROFILE\.tauri\python-data-studio.key"
```

构建在线更新包前设置发布环境变量：

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.tauri\python-data-studio.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "签名密钥密码"
$env:TAURI_UPDATER_PUBKEY = "生成密钥时输出的公钥全文"
$env:TAURI_RELEASE_OWNER = "Little-pig-create"
$env:TAURI_RELEASE_REPO = "python-data-studio"

npm run desktop:build:online
```

构建完成后，`src-tauri/target/release/bundle/` 下会包含：

- Windows 安装包；
- 与安装包同名的 `.sig` 签名；
- 自动生成的 `latest.json`。

将安装包、`.sig` 和 `latest.json` 上传到同一个 `vX.Y.Z` GitHub Release。必须保持 `latest.json` 中的文件名与 Release 资产名完全一致。应用启动后会自动检查更新；发现更高版本时直接弹出更新窗口。

若 `latest.json` 暂时缺失，客户端会回退到 GitHub Release API：仍能识别新版本并弹窗，但按钮会改为下载完整安装包，无法静默完成应用内安装。
