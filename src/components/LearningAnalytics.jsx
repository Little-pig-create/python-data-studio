import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { chapterProgress } from "../utils/progressHelpers";
import { buildActivityTimeline, buildActivityWeeks } from "../utils/learningActivity";

const activityColors = ["#eff6ff", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"];

const formatDay = (date) => date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });

function activityLevel(value, max) {
  if (!value || !max) return 0;
  return Math.max(1, Math.min(4, Math.ceil((value / max) * 4)));
}

export function LearningActivityHeatmap({ activity = {} }) {
  const weeks = buildActivityWeeks(activity, 16);
  const values = weeks.flat().map((item) => item.value);
  const max = Math.max(0, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  return <section className="learning-analytics-panel learning-heatmap-panel" aria-labelledby="learning-heatmap-title">
    <div className="learning-analytics-heading">
      <div><div className="eyebrow">学习活跃度</div><h2 id="learning-heatmap-title">最近 16 周学习热力图</h2></div>
      <span>{total ? `共 ${total} 次学习活动` : "暂无活动记录"}</span>
    </div>
    <div className="learning-heatmap-scroll">
      <div className="learning-heatmap-weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="learning-heatmap-grid" style={{ "--heatmap-color-0": activityColors[0], "--heatmap-color-1": activityColors[1], "--heatmap-color-2": activityColors[2], "--heatmap-color-3": activityColors[3], "--heatmap-color-4": activityColors[4] }}>
        {weeks.map((week, weekIndex) => <div className="learning-heatmap-week" key={week[0].key}>
          <span className="learning-heatmap-month">{week[0].date.getDate() <= 7 ? `${week[0].date.getMonth() + 1}月` : ""}</span>
          {week.map((item) => <span
            className={`learning-heatmap-cell level-${activityLevel(item.value, max)}`}
            key={item.key}
            title={`${item.key}：${item.value} 次学习活动`}
            aria-label={`${item.key}，${item.value} 次学习活动`}
          />)}
        </div>)}
      </div>
    </div>
    <div className="learning-heatmap-footer"><span>{max ? `单日最高 ${max} 次` : "打开章节或运行代码后开始记录"}</span><span className="learning-heatmap-legend"><span>少</span>{activityColors.map((color, index) => <i key={color} className={`level-${index}`} style={{ background: color }} />)}<span>多</span></span></div>
  </section>;
}

export function LearningActivityTrend({ activity = {} }) {
  const timeline = buildActivityTimeline(activity, 14);
  return <section className="learning-analytics-panel learning-trend-panel" aria-labelledby="learning-trend-title">
    <div className="learning-analytics-heading"><div><div className="eyebrow">活动趋势</div><h2 id="learning-trend-title">近 14 天学习活动</h2></div><span>按打开章节和成功运行单元格计数</span></div>
    <LineChart
      height={230}
      xAxis={[{ scaleType: "point", data: timeline.map((item) => formatDay(item.date)), tickLabelStyle: { fontSize: 10 } }]}
      series={[{ data: timeline.map((item) => item.value), label: "学习活动", color: "#2563EB", curve: "自然" }]}
      yAxis={[{ min: 0, tickMinStep: 1 }]}
      margin={{ left: 38, right: 14, top: 18, bottom: 38 }}
      grid={{ horizontal: true }}
    />
  </section>;
}

export function LearningStatusChart({ catalog, store }) {
  const completed = catalog.chapters.filter((chapter) => store.completedIds.includes(chapter.id)).length;
  const inProgress = catalog.chapters.filter((chapter) => !store.completedIds.includes(chapter.id) && chapterProgress(store, chapter.id) > 0).length;
  const notStarted = Math.max(0, catalog.chapters.length - completed - inProgress);
  const data = [
    { id: "completed", label: "已完成", value: completed },
    { id: "in-progress", label: "进行中", value: inProgress },
    { id: "not-started", label: "未开始", value: notStarted },
  ];
  return <section className="learning-analytics-panel learning-status-panel" aria-labelledby="learning-status-title">
    <div className="learning-analytics-heading"><div><div className="eyebrow">学习状态</div><h2 id="learning-status-title">章节状态分布</h2></div><span>{catalog.chapters.length} 个课程资源</span></div>
    <div className="learning-status-chart"><PieChart height={220} series={[{ data, innerRadius: 48, outerRadius: 82, paddingAngle: 2, cornerRadius: 3 }]} colors={["#16a34a", "#f59e0b", "#d0d5dd"]} margin={{ left: 8, right: 8, top: 8, bottom: 8 }} /></div>
    <div className="learning-status-legend">{data.map((item, index) => <div key={item.id}><i style={{ background: ["#16a34a", "#f59e0b", "#d0d5dd"][index] }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
  </section>;
}
