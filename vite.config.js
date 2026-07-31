// @ts-check
/** @type {import('vite').UserConfigFn} */
export default ({ mode }) => ({
  // Tauri loads the bundled frontend from its asset protocol, so desktop
  // bundles must resolve JS/CSS relative to index.html.
  base: mode === "desktop" || mode === "desktop-online" ? "./" : "/",
  // Tauri 插件在非桌面环境执行 module-level IPC 调用会崩溃，
  // 排除预打包让它们只在真正需要时动态加载（Tauri 容器内）
  optimizeDeps: {
    exclude: ["@tauri-apps/plugin-updater", "@tauri-apps/plugin-process"],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
});
