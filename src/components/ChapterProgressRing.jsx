export function ChapterProgressRing({ value }) {
  return <span
    className={`chapter-progress-ring ${value === 100 ? "is-complete" : ""}`}
    style={{ "--chapter-progress": `${value * 3.6}deg` }}
    title={`本章进度 ${value}%`}
    aria-label={`本章进度 ${value}%`}
  ><span /></span>;
}
