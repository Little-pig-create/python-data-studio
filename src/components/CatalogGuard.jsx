import { PageSkeleton } from "../LoadingSkeletons";

/**
 * 课程目录状态守卫。
 *
 * `PracticeCenter` / `StudentTrainingCenter` 等页面直接读 `catalog.chapters`。
 * 但 `useCourseCatalog()` 在加载完成前返回 `catalog = null`，
 * 加载失败时只设置 `catalogError`。若不加处理，列表会渲染成"0 个"，
 * 学生容易误判为"课程是空的"。
 *
 * 三种状态：
 *   - catalog 仍为 null 且无错误 → 骨架屏（正在加载）
 *   - catalogError 且无目录      → 可重试的错误提示
 *   - catalog 就绪但 chapters 为空 → 明确的"暂无内容"提示
 */
export function CatalogGuard({ catalog, catalogError, onRetry, emptyHint, children }) {
  const chapters = catalog?.chapters;

  if (!chapters && !catalogError) {
    return <PageSkeleton />;
  }

  if (catalogError && !chapters?.length) {
    return (
      <div className="catalog-guard" role="alert">
        <div className="catalog-guard-card">
          <p className="eyebrow">课程目录</p>
          <h2 className="catalog-guard-title">课程目录加载失败</h2>
          <p className="catalog-guard-text">{catalogError}</p>
          {onRetry && (
            <button type="button" className="catalog-guard-button" onClick={onRetry}>
              重新加载
            </button>
          )}
        </div>
      </div>
    );
  }

  if (chapters && chapters.length === 0) {
    return (
      <div className="catalog-guard">
        <div className="catalog-guard-card">
          <p className="eyebrow">课程目录</p>
          <h2 className="catalog-guard-title">暂时没有可用的课程内容</h2>
          <p className="catalog-guard-text">
            {emptyHint || "课程内容尚未同步到本地，请稍后重试或联系教师。"}
          </p>
          {onRetry && (
            <button type="button" className="catalog-guard-button" onClick={onRetry}>
              重新加载
            </button>
          )}
        </div>
      </div>
    );
  }

  return children;
}
