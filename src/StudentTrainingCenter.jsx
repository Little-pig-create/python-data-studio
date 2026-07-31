import { Button } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SyncRounded from "@mui/icons-material/SyncRounded";
import TaskAltRounded from "@mui/icons-material/TaskAltRounded";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "./store";
import { studentPlatformConfig } from "./studentPlatform";

const assignmentSteps = [
  {
    title: "接收实训任务",
    description: "学生登录后，从独立教学服务读取教师发布给本人或所在班级的任务。",
    icon: AssignmentRounded,
  },
  {
    title: "进入隔离工作区",
    description: "每个任务生成独立 Notebook 草稿，课程原始内容和其他任务不会被覆盖。",
    icon: PlayArrowRounded,
  },
  {
    title: "提交与自动评测",
    description: "提交 Notebook、关键结果与测试摘要，由服务端记录尝试次数和评测结果。",
    icon: TaskAltRounded,
  },
  {
    title: "同步学习进度",
    description: "仅同步章节进度、任务状态和评测结果，不在浏览器中保存学生密码。",
    icon: SyncRounded,
  },
];

export function StudentTrainingCenter({ catalog }) {
  const navigate = useNavigate();
  const store = useAppStore();
  const projectLessons = catalog.chapters.filter((chapter) => chapter.kind === "project");

  return (
    <main className="tool-page student-training-page">
      <div className="tool-page-header">
        <div>
          <div className="dashboard-kicker">学生实训</div>
          <h1>我的实训</h1>
          <p>当前保留本地自主练习，同时为学校发布任务、提交评测和学习进度同步预留学生端接口。</p>
        </div>
        <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/progress")}>
          返回学习记录
        </Button>
      </div>

      <section className="student-boundary-banner">
        <div>
          <span className="student-status-badge">{studentPlatformConfig.apiEnabled ? "实训服务已连接" : "本地实训模式"}</span>
          <h2>学生平台与管理服务保持分离</h2>
          <p>你的课程、练习和实训记录会按账号保存；账号与班级信息由学校统一维护。</p>
        </div>
      </section>

      <section className="student-training-section" aria-labelledby="training-flow-title">
        <div className="student-section-heading">
          <div>
            <span className="eyebrow">实训流程</span>
            <h2 id="training-flow-title">完成一次实训</h2>
          </div>
        </div>
        <div className="student-capability-grid">
          {assignmentSteps.map(({ title, description, icon: Icon }, index) => (
            <article className="student-capability-card" key={title}>
              <div className="student-capability-icon"><Icon fontSize="small" /></div>
              <span>步骤 {index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="student-training-section" aria-labelledby="self-practice-title">
        <div className="student-section-heading">
          <div>
            <span className="eyebrow">当前可用</span>
            <h2 id="self-practice-title">自主项目练习</h2>
          </div>
          <Button size="small" variant="text" onClick={() => navigate("/practice")}>查看全部练习</Button>
        </div>
        <div className="student-project-grid">
          {projectLessons.map((chapter) => {
            const completed = store.completedIds.includes(chapter.id);
            return (
              <article className="student-project-card" key={chapter.id}>
                <div>
                  <span className="dataset-category">{chapter.chapter >= 105 ? "机器学习项目" : "数据分析项目"}</span>
                  <h3>第{chapter.chapter}章 {chapter.title}</h3>
                  <p>{(chapter.tags || []).join(" · ")} · 约 {chapter.estimatedMinutes} 分钟</p>
                </div>
                <Button
                  size="small"
                  variant={completed ? "outlined" : "contained"}
                  startIcon={<PlayArrowRounded />}
                  onClick={() => {
                    store.setActiveChapter(chapter.id);
                    navigate("/course/" + chapter.id);
                  }}
                >
                  {completed ? "再次实训" : "开始实训"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
