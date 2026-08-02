// Stub for desktop mode - thebe-lite is not needed when using native Python runtime
export default {};
export const startJupyterLiteServer = () => { throw new Error("JupyterLite not available in desktop mode"); };
