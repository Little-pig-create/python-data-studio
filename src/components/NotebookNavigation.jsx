import { Link } from "react-router-dom";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

function navigationLabel(lesson) {
  if (lesson.kind === "capstone") return `模块大作业｜${lesson.label || lesson.title}`;
  if (lesson.kind === "project") return `综合项目｜${lesson.label || lesson.title}`;
  return lesson.label;
}

export function NotebookNavigation({ previousLesson, nextLesson, lessonPosition, totalLessons }) {
  const item = (target, direction, Icon) => target
    ? (
      <Link className={`notebook-navigation-item is-${direction}`} to={`/course/${target.id}`}>
        <Icon fontSize="small" />
        <span><small>{direction === "previous" ? "上一节" : "下一节"}</small><strong>{navigationLabel(target)}</strong></span>
      </Link>
    )
    : (
      <span className={`notebook-navigation-item is-disabled is-${direction}`} aria-disabled="true">
        <Icon fontSize="small" />
        <span><small>{direction === "previous" ? "上一节" : "下一节"}</small><strong>{direction === "previous" ? "已经是第一节" : "已经是最后一节"}</strong></span>
      </span>
    );

  return (
    <nav className="notebook-navigation" aria-label="课程章节导航">
      {item(previousLesson, "previous", ArrowBackRounded)}
      <span className="notebook-navigation-position">
        <small>课程位置</small>
        <strong>{lessonPosition || "—"} / {totalLessons || "—"}</strong>
      </span>
      {item(nextLesson, "next", ArrowForwardRounded)}
    </nav>
  );
}
