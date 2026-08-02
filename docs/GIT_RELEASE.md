### Git 发版

项目不使用 GitHub Actions 自动发布。版本发布通过纯 Git 完成，并同时在本地构建 Release 安装包：

```powershell
npm run release -- 0.1.3
```

脚本会依次完成：

1. 同步更新应用版本号（`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src/AboutPage.jsx`）；
2. 本地构建桌面安装包（`npm run desktop:build`）；
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
