import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import { Pagination } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useAppStore } from "../store";
import { chapterById } from "../courseCatalog";
import { ChapterProgressRing } from "../components/ChapterProgressRing";
import { LearningBackupPanel } from "../LearningBackupPanel";
import { CountUp, FadeContent } from "../ui-react-bits";
import { chapterProgress } from "../utils/progressHelpers";

export function ProgressPage({ catalog }) {
  const store = useAppStore();
  const navigate = useNavigate();
  const [recentPage, setRecentPage] = useState(1);
  const complete = Math.round((store.completedIds.length / catalog.chapters.length) * 100);
  const currentLesson = chapterById(catalog.chapters, store.activeChapterId);
  const noteCount = Object.keys(store.chapterNotes || {}).length;
  const recentLessons = store.recentIds
    .map((id) => catalog.chapters.find((item) => item.id === id))
    .filter(Boolean);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(recentLessons.length / pageSize));
  const visibleLessons = recentLessons.slice((recentPage - 1) * pageSize, recentPage * pageSize);
  useEffect(() => {
    if (recentPage > pageCount) setRecentPage(pageCount);
  }, [pageCount, recentPage]);

  return <main className="dashboard-page"><FadeContent><div className="dashboard-header"><div><div className="dashboard-kicker">学习记录</div><h1>学习概览与最近记录</h1><p className="dashboard-lede">集中查看整体进度、模块完成情况，并从最近学习的章节继续练习。</p></div><Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/course/" + currentLesson.id)}>返回课程</Button></div><div className="learning-tools"><Button variant="outlined" startIcon={<SchoolRounded />} onClick={() => navigate("/practice")}>练习中心</Button><Button variant="outlined" startIcon={<AssignmentRounded />} onClick={() => navigate("/training")}>我的实训</Button></div><div className="dashboard-grid"><div className="metric-panel"><span className="eyebrow">总完成度</span><strong className="metric-value"><CountUp value={complete} suffix="%" /></strong><span className="metric-note">已完成 {store.completedIds.length} / {catalog.chapters.length} 个章节</span></div><div className="chart-panel"><div className="eyebrow">模块进度</div><BarChart height={220} xAxis={[{ scaleType: "band", data: catalog.modules.map((item) => item.label.replace("与 ", "").replace("Matplotlib ", "MPL ")) }]} series={[{ data: catalog.modules.map((item) => catalog.chapters.filter((chapter) => chapter.module === item.id && store.completedIds.includes(chapter.id)).length) }]} colors={["#2563EB"]} margin={{ left: 36, right: 12, top: 20, bottom: 44 }} /></div></div><section className="learning-records" aria-labelledby="recent-learning-title"><div className="learning-records-heading"><div><div className="eyebrow">最近学习</div><h2 id="recent-learning-title">继续上次的章节</h2></div><span>{recentLessons.length} 条记录 · {noteCount} 篇笔记</span></div>{visibleLessons.length ? <div className="learning-record-list">{visibleLessons.map((item) => { const module = catalog.modules.find((candidate) => candidate.id === item.module); const progress = chapterProgress(store, item.id); const hasNote = Boolean(store.chapterNotes?.[item.id]); return <button type="button" className="learning-record-item" key={item.id} onClick={() => { store.setActiveChapter(item.id); navigate("/course/" + item.id); }}><ChapterProgressRing value={progress} /><span className="learning-record-copy"><strong>{item.label || `第${item.chapter}章 ${item.title}`}</strong><small>{module?.label || "课程章节"}{hasNote && <span className="learning-record-note">有笔记</span>}</small></span><span className="learning-record-progress">{progress}%</span></button>; })}</div> : <div className="learning-record-empty">还没有学习记录，打开任意章节后会在这里显示。</div>}{recentLessons.length > pageSize && <Pagination className="learning-record-pagination" page={recentPage} count={pageCount} color="primary" shape="rounded" onChange={(_, page) => setRecentPage(page)} />}</section><LearningBackupPanel /></FadeContent></main>;
}
