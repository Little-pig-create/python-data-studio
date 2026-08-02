### Git 发版

项目不使用 GitHub Release 或 GitHub Actions 作为发布机制。版本发布只通过 Git 提交和 Tag 完成：

```powershell
npm run release -- 0.1.3
```

脚本会同步更新应用版本号，创建版本提交和 `v0.1.3` Tag，并执行：

```text
git push origin main
git push origin v0.1.3
```

如需使用其他 Git 远程：

```powershell
$env:RELEASE_REMOTE = "github"
npm run release -- 0.1.3
```

安装包需要在本地通过 `npm run desktop:build` 构建，构建结果位于 `src-tauri/target/release/`。Git Tag 是版本标识，不会自动创建 GitHub Release，也不会自动上传二进制文件。
