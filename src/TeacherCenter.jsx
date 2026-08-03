import { useEffect, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, TextField } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DatasetRounded from "@mui/icons-material/DatasetRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import PeopleRounded from "@mui/icons-material/PeopleRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import SystemUpdateAltRounded from "@mui/icons-material/SystemUpdateAltRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import PushPinRounded from "@mui/icons-material/PushPinRounded";
import { useNavigate, useParams } from "react-router-dom";
import { PortalHeader } from "./PortalHeader";
import { RoleWorkspaceNav } from "./RoleWorkspaceNav";
import { DatasetCenter } from "./DatasetCenter";
import { NotebookContentCenter } from "./NotebookContentCenter";
import { listPublishedAnnouncements, syncAnnouncements } from "./announcementRepository";
import { APP_VERSION } from "./appVersion";

const teacherNavigation = [
  { to: "/teaching", label: "教学概览", icon: <DashboardRounded fontSize="small" />, end: true },
  { to: "/teaching/tasks", label: "实训任务", icon: <AssignmentRounded fontSize="small" /> },
  { to: "/teaching/reviews", label: "提交评阅", icon: <FactCheckRounded fontSize="small" /> },
  { to: "/teaching/classes", label: "班级学情", icon: <PeopleRounded fontSize="small" /> },
  { to: "/teaching/analytics", label: "教学分析", icon: <BarChartRounded fontSize="small" /> },
  { to: "/teaching/resources", label: "教学资源", icon: <DatasetRounded fontSize="small" /> },
  { to: "/teaching/notebooks", label: "Notebook维护", icon: <MenuBookRounded fontSize="small" /> },
  { to: "/teaching/announcements", label: "公告管理", icon: <CampaignRounded fontSize="small" /> },
  { to: "/teaching/updates", label: "在线更新", icon: <SystemUpdateAltRounded fontSize="small" /> },
];

const sectionMeta = {
  overview: { title: "教学工作台", subtitle: "组织实训、评阅提交，并从课程视角了解班级学习情况。" },
  tasks: { title: "实训任务", subtitle: "创建、发布和跟踪面向班级的 Notebook 实训任务。" },
  reviews: { title: "提交评阅", subtitle: "结合自动评测结果查看学生提交并形成可追溯反馈。" },
  classes: { title: "班级学情", subtitle: "按任课范围查看学习进度、任务完成与知识点掌握情况。" },
  analytics: { title: "教学分析", subtitle: "从章节、任务和知识点三个维度发现教学薄弱环节。" },
  resources: { title: "教学资源", subtitle: "统一预览、导入并为课程与实训准备固定版本的数据资源。" },
  notebooks: { title: "Notebook维护中心", subtitle: "上传、校验、预览并发布自定义 Notebook 章节。" },
  announcements: { title: "公告发布管理", subtitle: "面向学生发布课程通知、维护公告和实训提醒。" },
  updates: { title: "在线更新管理", subtitle: "维护桌面端版本、更新说明和发布检查状态。" },
};

const modules = [
  { icon: <AssignmentRounded />, title: "实训任务", description: "创建任务、设置截止时间、分配班级与发布状态。", path: "/teaching/tasks", service: "教学服务" },
  { icon: <FactCheckRounded />, title: "提交评阅", description: "查看 Notebook 提交、自动评测摘要并给出反馈。", path: "/teaching/reviews", service: "评测服务" },
  { icon: <PeopleRounded />, title: "班级学情", description: "按班级查看课程进度、任务完成率与常见困难。", path: "/teaching/classes", service: "统计服务" },
  { icon: <BarChartRounded />, title: "教学分析", description: "比较章节掌握情况，定位需要补充讲解的知识点。", path: "/teaching/analytics", service: "统计服务" },
  { icon: <DatasetRounded />, title: "教学资源", description: "预览经典数据集，为课程、练习和实训选择固定版本。", path: "/teaching/resources", service: "资源服务" },
  { icon: <MenuBookRounded />, title: "Notebook维护", description: "上传 Notebook，填写章节信息并管理发布状态。", path: "/teaching/notebooks", service: "内容服务" },
  { icon: <CampaignRounded />, title: "公告管理", description: "编辑、定时发布并撤回面向学生的公告。", path: "/teaching/announcements", service: "通知服务" },
  { icon: <SystemUpdateAltRounded />, title: "在线更新", description: "维护版本元数据和客户端更新说明。", path: "/teaching/updates", service: "发布服务" },
];

function ServiceBadge({ children = "等待服务接入" }) {
  return <span className="integration-badge">{children}</span>;
}

function EmptyWorkspace({ icon, title, description, endpoint }) {
  return <div className="workspace-empty-state">
    <span className="workspace-empty-icon">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    {endpoint && <code>{endpoint}</code>}
  </div>;
}

function TeacherOverview() {
  const navigate = useNavigate();
  return <>
    <section className="role-overview-banner">
      <div><span className="role-status">教师视图</span><h2>围绕“布置—提交—评阅—分析”组织教学</h2><p>教师可以预览课程、练习并管理教学资源，但不会进入学生个人学习记录。接入服务端后，所有班级和提交数据必须再次校验任课关系。</p></div>
      <div className="role-quick-actions"><Button variant="contained" startIcon={<MenuBookRounded />} onClick={() => navigate("/course/chapter-1")}>预览课程</Button><Button variant="outlined" startIcon={<DatasetRounded />} onClick={() => navigate("/teaching/resources")}>教学资源</Button></div>
    </section>
    <section className="portal-section">
      <div className="portal-section-heading"><div><span className="eyebrow">教学流程</span><h2>教师功能入口</h2></div><span>未连接服务时仅展示结构与空状态</span></div>
      <div className="role-module-grid">{modules.map((item) => <button type="button" className="role-module-card role-module-button" key={item.title} onClick={() => navigate(item.path)}><span className="role-module-icon">{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><small>{item.service} · 待接入</small></button>)}</div>
    </section>
    <section className="workflow-strip" aria-label="教学任务流程">
      {["创建任务与评分规则", "分配任课班级", "学生提交与自动评测", "教师复核并反馈", "聚合班级学情"].map((item, index) => <div key={item}><span>{index + 1}</span><strong>{item}</strong></div>)}
    </section>
    <ServiceBoundary />
  </>;
}

function TeacherTasks() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">任务管理</span><h2>按班级发布可运行的 Notebook 实训</h2><p>任务由教学服务保存，前端不在本地伪造发布状态。</p></div><Button variant="contained" startIcon={<AddRounded />} disabled>新建实训任务</Button></section>
    <section className="workspace-filter-bar" aria-label="任务筛选">
      <label><span>任课班级</span><select disabled><option>连接服务后加载</option></select></label>
      <label><span>任务状态</span><select disabled><option>全部状态</option></select></label>
      <label className="filter-search"><span>搜索任务</span><div><SearchRounded fontSize="small" /><input disabled placeholder="任务名称或章节" /></div></label>
    </section>
    <section className="workspace-panel-grid two-columns">
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">任务列表</span><h2>已创建任务</h2></div><ServiceBadge /></div><EmptyWorkspace icon={<AssignmentRounded />} title="尚未加载实训任务" description="接入教学服务后，这里按草稿、已发布、已截止和已归档展示任务。" endpoint="GET /api/teacher/v1/tasks" /></article>
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">创建规范</span><h2>一个完整任务应包含</h2></div></div><ul className="requirement-list"><li><strong>任务目标</strong><span>学生需要解决的业务问题与成果形式</span></li><li><strong>数据与 Notebook</strong><span>固定版本数据集、起始文件和运行环境</span></li><li><strong>提交要求</strong><span>截止时间、允许次数、文件命名与补交规则</span></li><li><strong>评分规则</strong><span>自动测试、结果正确性、分析解释和代码质量</span></li><li><strong>可见范围</strong><span>仅分配给教师实际任课的班级</span></li></ul></article>
    </section>
  </>;
}

function TeacherReviews() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">评阅工作流</span><h2>先看自动评测，再做教师复核</h2><p>评阅结果应保留评分依据、教师反馈、操作者和更新时间。</p></div><ServiceBadge>等待评测服务</ServiceBadge></section>
    <section className="workspace-kpi-grid"><article><span>待评阅</span><strong>--</strong><small>当前任课范围</small></article><article><span>需要复核</span><strong>--</strong><small>自动评测异常</small></article><article><span>已反馈</span><strong>--</strong><small>本教学周期</small></article><article><span>逾期提交</span><strong>--</strong><small>按任务规则识别</small></article></section>
    <section className="workspace-panel-grid two-columns">
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">评阅队列</span><h2>学生提交</h2></div></div><EmptyWorkspace icon={<FactCheckRounded />} title="暂无可评阅提交" description="接入服务后可按班级、任务、提交状态和自动评测结果筛选。" endpoint="GET /api/teacher/v1/submissions" /></article>
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">统一口径</span><h2>建议评分维度</h2></div></div><div className="rubric-list"><div><strong>代码可运行</strong><span>环境、依赖和执行顺序正确</span></div><div><strong>结果正确</strong><span>指标口径、模型输出和验证过程可靠</span></div><div><strong>分析解释</strong><span>结论回答任务问题并说明限制</span></div><div><strong>代码质量</strong><span>命名、结构、复用和必要注释清晰</span></div></div></article>
    </section>
  </>;
}

function TeacherClasses() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">任课班级</span><h2>聚合展示，不暴露无关学生信息</h2><p>班级列表和学生范围完全由服务端根据教师任课关系返回。</p></div><ServiceBadge>等待统计服务</ServiceBadge></section>
    <section className="workspace-kpi-grid"><article><span>任课班级</span><strong>--</strong><small>由任课关系确定</small></article><article><span>在学学生</span><strong>--</strong><small>仅统计授权班级</small></article><article><span>平均课程进度</span><strong>--%</strong><small>章节完成口径</small></article><article><span>实训完成率</span><strong>--%</strong><small>已提交 / 应提交</small></article></section>
    <section className="workspace-panel-grid two-columns">
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">班级列表</span><h2>选择班级查看学情</h2></div></div><EmptyWorkspace icon={<PeopleRounded />} title="暂无任课班级数据" description="接入后显示班级代码、课程、学生人数、当前章节和任务完成情况。" endpoint="GET /api/teacher/v1/classes" /></article>
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">隐私边界</span><h2>页面元素设计原则</h2></div></div><ul className="security-rule-list"><li>默认先展示班级聚合指标，再按授权进入学生详情。</li><li>不展示初始密码、身份证号、联系方式等无关字段。</li><li>导出名单和成绩必须记录审计事件。</li><li>教师只能看到本人当前有效任课关系覆盖的数据。</li></ul></article>
    </section>
  </>;
}

function TeacherAnalytics() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">教学洞察</span><h2>从数据中定位下一次应重点讲解的内容</h2><p>分析页只显示满足最小样本量的聚合结果，避免从小群体指标反推个人。</p></div><ServiceBadge>等待分析服务</ServiceBadge></section>
    <section className="workspace-filter-bar" aria-label="教学分析筛选"><label><span>课程</span><select disabled><option>Python 数据分析</option></select></label><label><span>班级</span><select disabled><option>连接服务后加载</option></select></label><label><span>分析周期</span><select disabled><option>当前教学周期</option></select></label></section>
    <section className="workspace-panel-grid analytics-layout">
      <article className="workspace-panel chart-placeholder"><div className="workspace-panel-heading"><div><span className="eyebrow">章节掌握</span><h2>完成率与练习正确率</h2></div></div><EmptyWorkspace icon={<InsightsRounded />} title="等待统计数据" description="接入后展示章节完成率、练习通过率与中位学习时长，不生成虚假示例图。" endpoint="GET /api/teacher/v1/analytics/chapters" /></article>
      <article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">行动建议</span><h2>分析结果应转化为教学动作</h2></div></div><ul className="requirement-list"><li><strong>知识点薄弱</strong><span>安排补充示例或针对性练习</span></li><li><strong>任务卡点集中</strong><span>检查题目表述、数据质量或前置知识</span></li><li><strong>进度分化明显</strong><span>提供基础与进阶两级任务</span></li><li><strong>异常耗时</strong><span>核对环境问题和 Notebook 执行依赖</span></li></ul></article>
    </section>
  </>;
}

const ANNOUNCEMENTS_KEY = "python-data-studio-announcements";
const defaultAnnouncements = [{ id: "welcome", title: "欢迎使用 Python Data Studio", content: "课程和实训通知会在这里发布。", status: "published", pinned: true, updatedAt: new Date().toISOString() }];

function readAnnouncements() {
  try { const value = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY) || "null"); return Array.isArray(value) ? value : defaultAnnouncements; } catch { return defaultAnnouncements; }
}

function TeacherAnnouncements() {
  const [items, setItems] = useState(readAnnouncements);
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState("");
  const save = (next) => { setItems(next); localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(next)); };
  useEffect(() => { listPublishedAnnouncements().then((remoteItems) => { if (remoteItems.length) setItems((current) => [...remoteItems, ...current.filter((item) => item.status !== "published")]); }).catch(() => {}); }, []);
  const openEditor = (item = { id: `announcement-${Date.now()}`, title: "", content: "", status: "draft", pinned: false }) => setEditor({ ...item });
  const persistEditor = async (status) => { if (!editor?.title.trim() || !editor.content.trim()) { setToast("请填写公告标题和内容"); return; } const next = [{ ...editor, status, updatedAt: new Date().toISOString() }, ...items.filter((item) => item.id !== editor.id)]; try { await syncAnnouncements(next); save(next); setEditor(null); setToast(status === "published" ? "公告已发布并同步" : "草稿已保存"); } catch (reason) { save(next); setToast(reason.message || "同步失败，已保留本地记录"); } };
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">通知服务</span><h2>公告发布管理</h2><p>公告先保存为草稿，发布后学生端按可见范围读取；所有状态变化应由服务端记录审计。</p></div><Button variant="contained" startIcon={<AddRounded />} onClick={() => openEditor()}>新建公告</Button></section>
    <section className="workspace-kpi-grid"><article><span>全部公告</span><strong>{items.length}</strong><small>本地演示记录</small></article><article><span>已发布</span><strong>{items.filter((item) => item.status === "published").length}</strong><small>学生可见</small></article><article><span>草稿</span><strong>{items.filter((item) => item.status === "draft").length}</strong><small>待完善</small></article><article><span>置顶</span><strong>{items.filter((item) => item.pinned).length}</strong><small>优先展示</small></article></section>
    <section className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">公告列表</span><h2>课程通知</h2></div><code>GET /api/announcements · POST /api/teacher/v1/announcements</code></div><div className="management-list">{items.map((item) => <article className="management-list-item" key={item.id}><div><div className="management-list-title">{item.pinned && <PushPinRounded fontSize="small" />}{item.title}</div><p>{item.content}</p><small>更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}</small></div><div className="management-list-actions"><Chip size="small" label={item.status === "published" ? "已发布" : "草稿"} color={item.status === "published" ? "success" : "warning"} /><Button size="small" startIcon={<EditRounded />} onClick={() => openEditor(item)}>编辑</Button>{item.status === "published" ? <Button size="small" onClick={() => save(items.map((candidate) => candidate.id === item.id ? { ...candidate, status: "draft", updatedAt: new Date().toISOString() } : candidate))}>撤回</Button> : <Button size="small" variant="contained" onClick={() => { if (!item.title || !item.content) { openEditor(item); return; } save(items.map((candidate) => candidate.id === item.id ? { ...candidate, status: "published", updatedAt: new Date().toISOString() } : candidate)); setToast("公告已发布"); }}>发布</Button>}<Button size="small" color="error" onClick={() => save(items.filter((candidate) => candidate.id !== item.id))} aria-label="删除公告"><DeleteOutlineRounded fontSize="small" /></Button></div></article>)}</div></section>
    <Dialog open={Boolean(editor)} onClose={() => setEditor(null)} fullWidth maxWidth="sm"><DialogTitle>{editor?.status === "published" ? "编辑公告" : "新建公告"}</DialogTitle><DialogContent><TextField autoFocus fullWidth margin="dense" label="公告标题" value={editor?.title || ""} onChange={(event) => setEditor((value) => ({ ...value, title: event.target.value }))} inputProps={{ maxLength: 80 }} /><TextField fullWidth multiline minRows={6} margin="dense" label="公告内容" value={editor?.content || ""} onChange={(event) => setEditor((value) => ({ ...value, content: event.target.value }))} inputProps={{ maxLength: 2000 }} /><label className="management-checkbox"><input type="checkbox" checked={Boolean(editor?.pinned)} onChange={(event) => setEditor((value) => ({ ...value, pinned: event.target.checked }))} />置顶公告</label></DialogContent><DialogActions><Button onClick={() => setEditor(null)}>取消</Button><Button onClick={() => persistEditor("draft")}>保存草稿</Button><Button variant="contained" onClick={() => persistEditor("published")}>立即发布</Button></DialogActions></Dialog><Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast("")}><Alert severity="success">{toast}</Alert></Snackbar>
  </>;
}

function TeacherUpdates() {
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  const check = () => { setChecking(true); setTimeout(() => { setChecking(false); setToast("已完成更新源检查，当前没有新的发布任务"); }, 700); };
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">发布服务</span><h2>在线更新管理</h2><p>这里维护版本说明和发布状态；真正的安装包签名、上传和灰度策略应由发布服务完成。</p></div><Button variant="outlined" startIcon={<SystemUpdateAltRounded />} onClick={check} disabled={checking}>{checking ? "检查中…" : "检查更新源"}</Button></section>
    <section className="workspace-kpi-grid"><article><span>当前版本</span><strong>v{APP_VERSION}</strong><small>桌面端</small></article><article><span>更新通道</span><strong>稳定版</strong><small>stable</small></article><article><span>发布状态</span><strong>已就绪</strong><small>等待服务接入</small></article><article><span>最后检查</span><strong>--</strong><small>由发布服务提供</small></article></section>
    <section className="workspace-panel-grid two-columns"><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">版本清单</span><h2>桌面端发布配置</h2></div></div><dl className="management-detail"><div><dt>产品标识</dt><dd>com.python.datastudio</dd></div><div><dt>更新清单</dt><dd>latest.json</dd></div><div><dt>更新地址</dt><dd>GitHub Releases / 自建对象存储</dd></div><div><dt>安全要求</dt><dd>签名校验、HTTPS、发布审计</dd></div></dl></article><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">发布流程</span><h2>上线前检查</h2></div></div><ul className="requirement-list"><li><strong>构建并签名</strong><span>生成各平台安装包和签名文件</span></li><li><strong>填写更新说明</strong><span>说明功能、修复和兼容性变化</span></li><li><strong>灰度发布</strong><span>先面向测试账号验证下载与重启</span></li><li><strong>正式发布</strong><span>更新 latest.json 并保留可回滚版本</span></li></ul></article></section>
    <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast("")}><Alert severity="success">{toast}</Alert></Snackbar>
  </>;
}

function ServiceBoundary() {
  return <section className="service-boundary-panel"><div><span className="eyebrow">服务端权限边界</span><h2>教师接口不能只依赖前端角色</h2></div><ul><li>只能访问本人任课班级及其学生提交。</li><li>发布、撤回和评阅操作必须记录操作者与时间。</li><li>Notebook 文件应使用签名地址并限制下载范围。</li><li>班级汇总默认最小化个人敏感信息。</li></ul><code>/api/teacher/v1</code></section>;
}

export function TeacherCenter() {
  const { section } = useParams();
  const activeSection = Object.hasOwn(sectionMeta, section) ? section : "overview";
  const meta = sectionMeta[activeSection];
  return <main className="portal-page teacher-page">
    <PortalHeader title={meta.title} subtitle={meta.subtitle} />
    <RoleWorkspaceNav ariaLabel="教师工作台导航" items={teacherNavigation} />
    {activeSection === "overview" && <TeacherOverview />}
    {activeSection === "tasks" && <TeacherTasks />}
    {activeSection === "reviews" && <TeacherReviews />}
    {activeSection === "classes" && <TeacherClasses />}
    {activeSection === "analytics" && <TeacherAnalytics />}
    {activeSection === "resources" && <DatasetCenter variant="teacher" />}
    {activeSection === "notebooks" && <NotebookContentCenter />}
    {activeSection === "announcements" && <TeacherAnnouncements />}
    {activeSection === "updates" && <TeacherUpdates />}
  </main>;
}
