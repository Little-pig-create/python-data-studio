// @ts-check
import path from "node:path";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";

const packageInfo = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import("vite").UserConfigFn} */
export default ({ mode, command }) => {
  const isDesktop = mode.startsWith("desktop");
  const isStudentEdition = mode === "desktop-student";

  /** @type {import("vite").Plugin[]} */
  const plugins = [react()];

  // Tauri 开发模式必须使用桌面入口，否则 Vite 会加载包含 thebe-lite 的 Web 入口。
  if (isDesktop) {
    plugins.push({
      name: "desktop-dev-entry",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const url = new URL(request.url || "/", "http://127.0.0.1");
          if (url.pathname === "/" || url.pathname === "/index.html") {
            request.url = `/index.desktop.html${url.search}`;
          }
          next();
        });
      },
    });
  }

  return {
    plugins,

    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageInfo.version),
      "import.meta.env.VITE_DESKTOP_MODE": JSON.stringify(isDesktop ? "true" : "false"),
      "import.meta.env.VITE_APP_EDITION": JSON.stringify(isStudentEdition ? "student" : "full"),
    },

    // Tauri loads the bundled frontend from its asset protocol, so desktop
    // bundles must resolve JS/CSS relative to index.html.
    base: isDesktop ? "./" : "/",

    // 生产桌面包只复制课程、数据集和字体；Web 版 JupyterLite 的 public/runtime
    // 不进入 dist。开发模式仍保留 public 目录，便于调试课程资源。
    publicDir: isDesktop && command === "build" ? false : "public",

    optimizeDeps: {
      include: isDesktop
        ? ["@jupyterlab/services", "@tauri-apps/api/core"]
        : [],
      exclude: isDesktop
        ? ["@tauri-apps/plugin-updater", "@tauri-apps/plugin-process"]
        : [],
    },

    server: {
      port: 5173,
      strictPort: true,
      host: "127.0.0.1",
    },

    // 桌面版：thebe-* 替换为空桩，不把 Web 版的 WASM 引擎打进主包。
    resolve: {
      alias: {
        "@pds/application-shell": path.resolve(
          isStudentEdition ? "src/StudentApplicationShell.jsx" : "src/ApplicationShell.jsx",
        ),
        ...(isDesktop
          ? {
            "thebe-core": path.resolve("src/stubs/thebe-core.js"),
            "thebe-lite": path.resolve("src/stubs/thebe-lite.js"),
            "thebe-react": path.resolve("src/stubs/thebe-react.js"),
            }
          : {}),
      },
    },

    build: {
      rollupOptions: {
        input: isDesktop ? "index.desktop.html" : "index.html",
      },
    },
  };
};
