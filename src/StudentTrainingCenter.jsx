import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import ViewModuleRounded from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "./store";
import { studentPlatformConfig } from "./studentPlatform";

const assignmentSteps = [
  { title: "选择实训", description: "从模块大作业或综合项目中选择一个真实任务。", icon: AssignmentRounded },
  { title: "完成分析", description: "在独立 Notebook 中完成数据处理、分析与可视化。", icon: PlayArrowRounded },
  { title: "运行验证", description: "运行关键单元格，检查结果并完善分析结论。", icon: TaskAltRounded },
  { title: "记录进度", description: "自动保存代码、运行进度、完成状态与学习笔记。", icon: SyncRounded },
];

const filters = [
  { id: "all", label: "全部实训" },
  { id: "capstone", label: "模块大作业" },
  { id: "project", label: "综合项目" },
  { id: "completed", label: "已完成" },
];

function formatDuration(minutes = 0) {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

export function StudentTrainingCenter({ catalog }) {
  const navigate = useNavigate();
  const store = useAppStore();
  const [filter, setFilter] = useState("all");

  const moduleMap = useMemo(
    () => Object.fromEntries(catalog.modules.map((module) => [module.id, module])),
    [catalog.modules],
  );

  const trainingLessons = useMemo(
    () => catalog.chapters.filter((chapter) => chapter.kind === "capstone" || chapter.kind === "project"),
    [catalog.chapters],
  );

  const completedCount = trainingLessons.filter((chapter) => store.completedIds.includes(chapter.id)).length;
  const totalMinutes = trainingLessons.reduce((sum, chapter) => sum + Number(chapter.estimatedMinutes || 0), 0);
  const capstoneCount = trainingLessons.filter((chapter) => chapter.kind === "capstone").length;
  const activeTraining = trainingLessons.find((chapter) => chapter.id === store.activeChapterId)
    || trainingLessons.find((chapter) => store.recentIds.includes(chapter.id) && !store.completedIds.includes(chapter.id));

  const visibleLessons = trainingLessons.filter((chapter) => {
    if (filter === "completed") return store.completedIds.includes(chapter.id);
    if (filter === "capstone") return chapter.kind === "capstone";
    if (filter === "project") return chapter.kind === "project";
    return true;
  });

  const openTraining = (chapter) => {
    store.setActiveChapter(chapter.id);
    navigate(`/course/${chapter.id}`);
  };

  return (
    <main className="tool-page student-training-page">
      <div className="tool-page-header student-training-header">
        <div>
          <div className="dashboard-kicker">学生实训</div>
          <h1>我的实训</h1>
          <p>集中完成各模块大作业与综合项目，把课程知识转化为可运行、可复盘的数据分析作品。</p>
        </div>
        <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/progress")}>返回学习记录</Button>
      </div>

      <section className="student-training-hero">
        <div className="student-training-hero-copy">
          <span className="student-status-badge">{studentPlatformConfig.apiEnabled ? "实训服务已连接" : "本地实训模式"}</span>
          <h2>{activeTraining ? "继续最近的实训" : "从模块大作业开始实践"}</h2>
          <p>{activeTraining ? activeTraining.title : "每个课程模块都配有一个综合大作业，另有完整的数据分析与机器学习项目。"}</p>
          {activeTraining && <Button variant="contained" startIcon={<PlayArrowRounded />} onClick={() => openTraining(activeTraining)}>继续实训</Button>}
        </div>
        <div className="student-training-summary" aria-label="实训概览">
          <article><ViewModuleRounded /><span>实训总数</span><strong>{trainingLessons.length}</strong><small>模块大作业与综合项目</small></article>
          <article><AssignmentRounded /><span>模块大作业</span><strong>{capstoneCount}</strong><small>覆盖全部课程模块</small></article>
          <article><CheckCircleRounded /><span>已完成</span><strong>{completedCount}</strong><small>完成率 {trainingLessons.length ? Math.round(completedCount / trainingLessons.length * 100) : 0}%</small></article>
          <article><ScheduleRounded /><span>预计总时长</span><strong>{Math.round(totalMinutes / 60)}</strong><small>小时左右</small></article>
        </div>
      </section>

      <section className="student-training-section" aria-labelledby="training-list-title">
        <div className="student-section-heading student-training-list-heading">
          <div>
            <span className="eyebrow">实训项目库</span>
            <h2 id="training-list-title">模块大作业与综合项目</h2>
            <p>共 {trainingLessons.length} 个项目，当前显示 {visibleLessons.length} 个。</p>
          </div>
          <Button size="small" variant="text" onClick={() => navigate("/practice")}>查看章节练习</Button>
        </div>

        <div className="student-training-filters">
          <div className="student-training-filter-group" aria-label="实训类型筛选">
            {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
          </div>
        </div>

        {visibleLessons.length ? <div className="student-training-project-grid">
          {visibleLessons.map((chapter) => {
            const module = moduleMap[chapter.module] || {};
            const completed = store.completedIds.includes(chapter.id);
            const progress = store.chapterExecutionProgress[chapter.id];
            const progressValue = completed ? 100 : progress?.totalCells ? Math.min(99, Math.round(progress.completedCellIds.length / progress.totalCells * 100)) : 0;
            return <article className={`student-training-project-card ${completed ? "completed" : ""}`} key={chapter.id} style={{ "--training-accent": module.color || "#2563eb" }}>
              <div className="student-training-project-topline"><span className="student-training-type">{chapter.kind === "capstone" ? "模块大作业" : "综合项目"}</span><span className={`student-training-state ${completed ? "completed" : progressValue ? "progress" : ""}`}>{completed ? "已完成" : progressValue ? `进行中 ${progressValue}%` : "未开始"}</span></div>
              <div className="student-training-module"><i />{module.label || "课程项目"}<span>{module.range || `第 ${chapter.chapter} 章`}</span></div>
              <h3>{chapter.title}</h3>
              <div className="student-training-tags">{(chapter.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="student-training-meta"><span><ScheduleRounded />{formatDuration(chapter.estimatedMinutes)}</span><span><QueryStatsRounded />Notebook 实训</span></div>
              <div className="student-training-progress"><div><span style={{ width: `${progressValue}%` }} /></div><small>{completed ? "项目已完成，可再次打开复盘" : progressValue ? "已保存当前运行进度" : "开始后自动保存学习进度"}</small></div>
              <Button fullWidth variant={completed || progressValue ? "outlined" : "contained"} startIcon={<PlayArrowRounded />} onClick={() => openTraining(chapter)}>{completed ? "再次实训" : progressValue ? "继续实训" : "开始实训"}</Button>
            </article>;
          })}
        </div> : <div className="student-training-empty"><TaskAltRounded /><h3>暂无符合条件的实训</h3><p>切换类型或课程模块后再试。</p></div>}
      </section>

      <section className="student-training-section student-training-flow" aria-labelledby="training-flow-title">
        <div className="student-section-heading"><div><span className="eyebrow">实训流程</span><h2 id="training-flow-title">从任务到作品</h2></div></div>
        <div className="student-capability-grid">
          {assignmentSteps.map(({ title, description, icon: Icon }, index) => <article className="student-capability-card" key={title}><div className="student-capability-icon"><Icon fontSize="small" /></div><span>步骤 {index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>
    </main>
  );
}
