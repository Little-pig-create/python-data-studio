/**
 * Node 内置模块的浏览器空桩。
 *
 * 背景：Web 版会打包真实的 `thebe-core`，它（及其传递依赖）在 Node 与浏览器
 * 共用代码里 `import path / fs / url / source-map-js`。这些代码路径在浏览器中
 * **不会执行**，但 Vite 会为每个这样的导入打印
 *    "Module \"path\" has been externalized for browser compatibility.
 *     Cannot access \"path.isAbsolute\" in client code."
 * 既污染控制台、干扰排障，也会在属性被访问时直接抛错。
 *
 * 这里提供一个**宽容的空桩**：属性访问返回可调用的空函数，
 * 而不是抛错。这样即使某条边界路径真的走到了，也只是得到 undefined，
 * 不会让整个 notebook 崩掉。
 *
 * 注意：仅用于 Web 构建；桌面版不引入 thebe-core，无需此桩。
 */

const noop = () => undefined;
const noopObject = () => ({});

/** 常见常量，避免读取到函数对象造成困惑。 */
const CONSTANTS = {
  sep: "/",
  delimiter: ":",
  posix: null, // 由 Proxy 兜底为 noop
  win32: null,
};

const stub = new Proxy(CONSTANTS, {
  get(target, prop) {
    if (prop in target) {
      const value = target[prop];
      return value === null ? stub : value;
    }
    if (prop === "default") return stub;
    if (prop === "__esModule") return true;
    if (prop === "promises") return stub; // fs.promises 的常见用法
    if (prop === "Symbol.toStringTag") return "Module";
    return noop;
  },
  // 允许被当作函数调用（例如 url.parse() 的默认导出形式）
  apply() {
    return noopObject();
  },
});

export default stub;

// 显式导出被外部具名引用的成员，避免 ESM 链接期报"未导出"错误。
export const isAbsolute = noop;
export const resolve = noop;
export const join = noop;
export const dirname = noop;
export const basename = noop;
export const extname = noop;
export const normalize = noop;
export const relative = noop;
export const existsSync = noop;
export const readFileSync = noop;
export const writeFileSync = noop;
export const fileURLToPath = noop;
export const pathToFileURL = noop;
export const sep = "/";
export const delimiter = ":";
export const SourceMapConsumer = noopObject;
export const SourceMapGenerator = noopObject;
