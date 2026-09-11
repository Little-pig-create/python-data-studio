import { Component } from "react";

/**
 * 全局渲染错误兜底。
 *
 * 没有它时，任何一个组件在渲染期抛错都会让 React 卸载整棵树，
 * 用户只看到一片空白（教学场景下学生通常误判为"软件坏了"）。
 * 这里捕获后给出可读提示，并提供"重试"与"返回首页"两条出路。
 *
 * 说明：只捕获**渲染期**错误。事件处理器、异步回调里的异常不会被
 * ErrorBoundary 捕获，那些位置应各自 try/catch 并给出反馈。
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleHome = this.handleHome.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // 保留控制台输出，便于开发期定位；生产环境可在此接入上报。
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReset() {
    this.setState({ error: null, info: null });
  }

  handleHome() {
    // 回到首页并整页刷新，清掉可能已损坏的内存状态。
    window.location.assign("/");
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const detail = String(error?.message || error || "未知错误");
    const stack = this.props.showDetails ? info?.componentStack : null;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <p className="eyebrow">运行时错误</p>
          <h1 className="error-boundary-title">页面遇到了一个错误</h1>
          <p className="error-boundary-text">
            这一部分没能正常显示。你可以先重试；如果仍然失败，刷新页面或返回首页继续学习，
            你的课程进度已经保存在本地，不会丢失。
          </p>
          <pre className="error-boundary-detail">{detail}</pre>
          {stack && <pre className="error-boundary-stack">{stack.trim()}</pre>}
          <div className="error-boundary-actions">
            <button type="button" className="error-boundary-button primary" onClick={this.handleReset}>
              重试
            </button>
            <button type="button" className="error-boundary-button" onClick={this.handleHome}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }
}
