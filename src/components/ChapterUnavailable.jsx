import { Button } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";

export function ChapterUnavailable({ onBack }) {
  return <main className="custom-notebook-error chapter-unavailable"><strong>章节不存在或已下线</strong><p>该章节可能已被教师下线、删除，或课程目录已经更新。</p><Button variant="contained" startIcon={<ArrowBackRounded />} onClick={onBack}>返回课程目录</Button></main>;
}
