// Stub for desktop mode - thebe-core is not needed when using native Python runtime
export default {};
export const makeConfiguration = () => { throw new Error("thebe-core not available in desktop mode"); };
export const makeRenderMimeRegistry = () => { throw new Error("thebe-core not available in desktop mode"); };
export const ThebeServer = class ThebeServer {
  constructor() { throw new Error("thebe-core not available in desktop mode"); }
};
