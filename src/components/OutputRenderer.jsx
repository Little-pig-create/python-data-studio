import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { convertErrorToFriendly } from "../errorMessageHelper";
import { outputText } from "../utils/notebookHelpers";

export function PlotlyOutput({ figure }) {
  const hostRef = useRef(null);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let plotly;
    let resizeObserver;
    const host = hostRef.current;

    const render = async () => {
      try {
        const module = await import("plotly.js-dist-min");
        plotly = module.default || module;
        if (cancelled || !host) return;

        const payload = typeof figure === "string" ? JSON.parse(figure) : figure;
        const layout = { ...(payload?.layout || {}), autosize: true };
        delete layout.width;
        await plotly.newPlot(
          host,
          payload?.data || [],
          layout,
          { responsive: true, displaylogo: false, ...(payload?.config || {}) }
        );
        if (cancelled) return;

        resizeObserver = new ResizeObserver(() => plotly.Plots.resize(host));
        resizeObserver.observe(host);
      } catch (error) {
        if (!cancelled) setRenderError(error instanceof Error ? error.message : String(error));
      }
    };

    setRenderError("");
    render();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (plotly && host) plotly.purge(host);
    };
  }, [figure]);

  if (renderError) {
    return <pre className="notebook-error-output">Plotly 图表渲染失败：{renderError}</pre>;
  }
  return <div ref={hostRef} className="notebook-output-plotly" aria-label="Plotly 交互式图表" />;
}

export function OutputRenderer({ outputs = [] }) {
  if (!outputs.length) return null;
  return <div className="notebook-output-content">{outputs.map((output, index) => {
    if (output.output_type === "stream") return <pre key={index} className="notebook-stream">{outputText(output.text)}</pre>;
    if (output.output_type === "error") {
      const isAssertionError = output.ename === "AssertionError";
      const className = isAssertionError ? "notebook-assert-error" : "notebook-error-output";
      const errorText = outputText([output.ename, output.evalue, ...(output.traceback || [])].filter(Boolean).join("\n"));

      const friendlyError = !isAssertionError ? convertErrorToFriendly(errorText) : null;

      if (friendlyError && friendlyError.type !== "UnknownError") {
        return (
          <div key={index} className="notebook-error-box">
            <div className="error-title">{friendlyError.title}</div>
            <div className="error-section">
              <div className="error-label">💭 可能原因：</div>
              <ul className="error-list">
                {friendlyError.causes.map((cause, i) => <li key={i}>{cause}</li>)}
              </ul>
            </div>
            <div className="error-section">
              <div className="error-label">🔧 解决方法：</div>
              <ol className="error-list">
                {friendlyError.solutions.map((solution, i) => <li key={i}>{solution}</li>)}
              </ol>
            </div>
            <details className="error-details">
              <summary>📋 查看完整错误信息</summary>
              <pre className="error-details-content">{friendlyError.original}</pre>
            </details>
          </div>
        );
      }

      const prefix = isAssertionError ? "❌ 自检未通过：" : "";
      return (
        <pre key={index} className={className}>
          {prefix}
          {errorText}
        </pre>
      );
    }
    const data = output.data || {};
    if (data["image/png"]) return <img key={index} className="notebook-output-image" src={`data:image/png;base64,${data["image/png"]}`} alt="Python 输出图像" />;
    if (data["image/jpeg"]) return <img key={index} className="notebook-output-image" src={`data:image/jpeg;base64,${data["image/jpeg"]}`} alt="Python 输出图像" />;
    if (data["application/vnd.plotly.v1+json"]) return <PlotlyOutput key={index} figure={data["application/vnd.plotly.v1+json"]} />;
    if (data["text/html"]) return <div key={index} className="notebook-output-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(outputText(data["text/html"])) }} />;
    if (data["text/plain"]) return <pre key={index} className="notebook-stream">{outputText(data["text/plain"])}</pre>;
    return <pre key={index} className="notebook-stream">{JSON.stringify(data, null, 2)}</pre>;
  })}</div>;
}
