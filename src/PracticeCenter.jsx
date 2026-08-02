import { useEffect, useMemo, useRef, useState } from "react";
import { Button, InputAdornment, Pagination, TextField } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "./store";

const PAGE_SIZE = 12;

export function PracticeCenter({ catalog }) {
  const navigate = useNavigate();
  const store = useAppStore();
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);

  const exercises = useMemo(
    () =>
      catalog.chapters.filter((chapter) => {
        const text = `${chapter.title} ${chapter.label} ${(chapter.tags || []).join(" ")}`.toLowerCase();
        return (
          (!query || text.includes(query.toLowerCase())) &&
          (module === "all" || chapter.module === module) &&
          (kind === "all" || chapter.kind === kind)
        );
      }),
    [catalog.chapters, kind, module, query],
  );

  const pageCount = Math.max(1, Math.ceil(exercises.length / PAGE_SIZE));
  const visibleExercises = exercises.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = exercises.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(page * PAGE_SIZE, exercises.length);

  useEffect(() => {
    setPage(1);
  }, [query, module, kind]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const changePage = (_, nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main className="tool-page">
      <div className="tool-page-header">
        <div>
          <div className="dashboard-kicker">练习中心</div>
          <h1>按目标选择下一次练习</h1>
          <p>从课程中的可运行 Notebook 开始练习，完成状态会自动回写到学习记录。</p>
        </div>
        <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/progress")}>
          返回学习记录
        </Button>
      </div>

      <div className="practice-filters">
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索主题或标签"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <select value={module} onChange={(event) => setModule(event.target.value)} aria-label="按模块筛选">
          <option value="all">全部模块</option>
          {catalog.modules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="按练习类型筛选">
          <option value="all">全部类型</option>
          <option value="lesson">课程练习</option>
          <option value="project">综合项目</option>
        </select>
        <span>{exercises.length} 个可练习章节</span>
      </div>

      <div ref={listRef} className="practice-list-anchor" />
      {visibleExercises.length ? (
        <>
          <div className="practice-page-summary">
            <span>当前显示 {rangeStart}–{rangeEnd} 项</span>
            <span>第 {page} / {pageCount} 页</span>
          </div>
          <section className="practice-grid">
            {visibleExercises.map((chapter) => {
              const done = store.completedIds.includes(chapter.id);
              const moduleInfo = catalog.modules.find((item) => item.id === chapter.module);
              return (
                <article className="practice-card" key={chapter.id}>
                  <div>
                    <span className="dataset-category">{moduleInfo?.label}</span>
                    <h2>{chapter.label || `第${chapter.chapter}章 ${chapter.title}`}</h2>
                    <p>{chapter.tags.join(" · ")} · 约 {chapter.estimatedMinutes} 分钟</p>
                  </div>
                  <Button
                    size="small"
                    variant={done ? "outlined" : "contained"}
                    startIcon={<PlayArrowRounded />}
                    onClick={() => {
                      store.setActiveChapter(chapter.id);
                      navigate(`/course/${chapter.id}`);
                    }}
                  >
                    {done ? "再次练习" : "开始练习"}
                  </Button>
                </article>
              );
            })}
          </section>
          {pageCount > 1 && (
            <Pagination
              className="practice-pagination"
              page={page}
              count={pageCount}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
              onChange={changePage}
            />
          )}
        </>
      ) : (
        <div className="dataset-empty">没有匹配的练习，请调整筛选条件。</div>
      )}
    </main>
  );
}
