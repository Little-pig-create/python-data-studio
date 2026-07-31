import { useMemo, useRef, useState } from "react";
import { Button } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LockResetRounded from "@mui/icons-material/LockResetRounded";
import ManageAccountsRounded from "@mui/icons-material/ManageAccountsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import { useNavigate, useParams } from "react-router-dom";
import { PortalHeader } from "./PortalHeader";
import { RoleWorkspaceNav } from "./RoleWorkspaceNav";

const REQUIRED_FIELDS = ["student_no", "name", "class_code", "initial_password"];

const adminNavigation = [
  { to: "/school-admin", label: "管理概览", icon: <DashboardRounded fontSize="small" />, end: true },
  { to: "/school-admin/students", label: "学生账号", icon: <ManageAccountsRounded fontSize="small" /> },
  { to: "/school-admin/classes", label: "班级与任课", icon: <GroupsRounded fontSize="small" /> },
  { to: "/school-admin/roles", label: "角色权限", icon: <AdminPanelSettingsRounded fontSize="small" /> },
  { to: "/school-admin/audit", label: "审计记录", icon: <HistoryRounded fontSize="small" /> },
];

const sectionMeta = {
  overview: { title: "学校管理工作台", subtitle: "管理学生账号、班级、任课关系与平台角色，不进入个人学习页面。" },
  students: { title: "学生账号", subtitle: "批量建号、查询账号状态，并为首次登录建立安全流程。" },
  classes: { title: "班级与任课", subtitle: "维护学校组织结构以及教师、课程和班级之间的授权关系。" },
  roles: { title: "角色权限", subtitle: "以最小权限原则分配学生、教师与学校管理员角色。" },
  audit: { title: "审计记录", subtitle: "追踪账号、班级、角色和密码相关的重要管理操作。" },
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") { cell += "\""; index += 1; }
    else if (char === "\"") quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function validateCsv(text) {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!matrix.length) return { rows: [], errors: ["文件为空"] };
  const headers = matrix[0];
  const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  if (missing.length) return { rows: [], errors: ["缺少字段：" + missing.join("、")] };
  const objects = matrix.slice(1).map((values, index) => ({
    line: index + 2,
    ...Object.fromEntries(headers.map((header, column) => [header, values[column] || ""])),
  }));
  const errors = [];
  const seen = new Set();
  objects.forEach((item) => {
    const missingValues = REQUIRED_FIELDS.filter((field) => !item[field]);
    if (missingValues.length) errors.push("第 " + item.line + " 行缺少：" + missingValues.join("、"));
    if (item.student_no && seen.has(item.student_no)) errors.push("第 " + item.line + " 行学号重复：" + item.student_no);
    seen.add(item.student_no);
    if (item.initial_password && item.initial_password.length < 8) errors.push("第 " + item.line + " 行初始密码少于 8 位");
  });
  return { rows: objects, errors };
}

const adminModules = [
  { icon: <ManageAccountsRounded />, title: "学生账号", copy: "批量注册、状态查询、冻结与安全重置。", path: "/school-admin/students", service: "账号服务" },
  { icon: <GroupsRounded />, title: "班级与任课", copy: "维护班级、课程和教师任课关系。", path: "/school-admin/classes", service: "组织服务" },
  { icon: <AdminPanelSettingsRounded />, title: "角色权限", copy: "控制教师与管理员权限，不向普通账号开放。", path: "/school-admin/roles", service: "权限服务" },
  { icon: <HistoryRounded />, title: "审计记录", copy: "查询重要管理操作的操作者与结果。", path: "/school-admin/audit", service: "审计服务" },
];

function ServiceBadge({ children = "等待管理服务" }) {
  return <span className="integration-badge admin">{children}</span>;
}

function EmptyWorkspace({ icon, title, description, endpoint }) {
  return <div className="workspace-empty-state"><span className="workspace-empty-icon admin">{icon}</span><h3>{title}</h3><p>{description}</p>{endpoint && <code>{endpoint}</code>}</div>;
}

function AdminOverview() {
  const navigate = useNavigate();
  return <>
    <section className="role-overview-banner admin-overview-banner"><div><span className="role-status admin">管理员视图</span><h2>账号、组织和权限集中管理，学习数据保持隔离</h2><p>学校管理员只负责平台账号和组织结构，不进入课程学习、Notebook 实训或学生个人记录。所有写操作必须由独立管理服务校验和审计。</p></div><ServiceBadge>管理服务未连接</ServiceBadge></section>
    <section className="workspace-kpi-grid"><article><span>学生账号</span><strong>--</strong><small>启用 / 冻结 / 待改密</small></article><article><span>教学班级</span><strong>--</strong><small>当前有效班级</small></article><article><span>教师账号</span><strong>--</strong><small>含任课关系</small></article><article><span>待处理事件</span><strong>--</strong><small>导入或权限异常</small></article></section>
    <section className="portal-section"><div className="portal-section-heading"><div><span className="eyebrow">学校管理范围</span><h2>管理员功能入口</h2></div><span>页面不展示虚构学校数据</span></div><div className="role-module-grid">{adminModules.map((item) => <button type="button" className="role-module-card role-module-button admin" key={item.title} onClick={() => navigate(item.path)}><span className="role-module-icon admin">{item.icon}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div><small>{item.service} · 待接入</small></button>)}</div></section>
    <AdminServiceBoundary />
  </>;
}

function StudentAccounts() {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const valid = rows.length > 0 && errors.length === 0;
  const preview = useMemo(() => rows.slice(0, 6), [rows]);

  function downloadTemplate() {
    const content = "student_no,name,class_code,initial_password\n20260001,示例学生,DATA-2601,ChangeMe123!\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "学生账号批量导入模板.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setRows([]);
      setErrors(["请选择 CSV 文件"]);
      return;
    }
    const result = validateCsv(await file.text());
    setRows(result.rows);
    setErrors(result.errors);
  }

  return <>
    <section className="admin-import-panel"><div className="admin-import-copy"><span className="role-status admin">批量建号</span><span className="eyebrow">CSV 本地预检</span><h2>先检查格式，再提交独立管理服务</h2><p>模板包含学号、姓名、班级代码和初始密码。文件只在当前浏览器内预检，不写入 localStorage 或 IndexedDB；初始密码不会回显。</p><div><Button variant="outlined" startIcon={<DownloadRounded />} onClick={downloadTemplate}>下载 CSV 模板</Button><Button variant="contained" startIcon={<UploadFileRounded />} onClick={() => inputRef.current?.click()}>选择 CSV 文件</Button><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} /></div></div><div className="admin-import-status"><strong>{fileName || "尚未选择文件"}</strong>{rows.length > 0 && <span>读取 {rows.length} 条学生记录</span>}<span className={valid ? "status-valid" : "status-waiting"}>{valid ? "格式预检通过" : errors.length ? "发现需要修正的问题" : "等待上传"}</span></div></section>
    {(rows.length > 0 || errors.length > 0) && <section className="csv-preview-panel"><div className="portal-section-heading"><div><span className="eyebrow">本地预检结果</span><h2>{valid ? "可以提交到管理服务" : "请先修正文件"}</h2></div><span>初始密码仅显示“已提供”</span></div>{errors.length > 0 && <ul className="csv-error-list">{errors.slice(0, 12).map((error) => <li key={error}>{error}</li>)}</ul>}{preview.length > 0 && <div className="csv-table-wrap"><table><thead><tr><th>行</th><th>学号</th><th>姓名</th><th>班级</th><th>初始密码</th></tr></thead><tbody>{preview.map((item) => <tr key={item.line}><td>{item.line}</td><td>{item.student_no}</td><td>{item.name}</td><td>{item.class_code}</td><td>{item.initial_password ? "已提供" : "缺失"}</td></tr>)}</tbody></table>{rows.length > preview.length && <p>另有 {rows.length - preview.length} 条记录未展开。</p>}</div>}<div className="admin-submit-row"><Button variant="contained" disabled>提交并创建账号</Button><span>连接 <code>/api/admin/v1/students/import</code> 后开放；服务端需要二次预检、哈希密码并强制首次登录修改。</span></div></section>}
    <section className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">账号查询</span><h2>学生账号与状态</h2></div><ServiceBadge /></div><section className="workspace-filter-bar embedded" aria-label="学生账号筛选"><label className="filter-search"><span>搜索学生</span><div><SearchRounded fontSize="small" /><input disabled placeholder="学号或姓名" /></div></label><label><span>班级</span><select disabled><option>全部班级</option></select></label><label><span>账号状态</span><select disabled><option>全部状态</option></select></label></section><EmptyWorkspace icon={<ManageAccountsRounded />} title="尚未加载学生账号" description="接入管理服务后显示账号状态、班级、首次登录改密状态和最近管理操作；不展示密码。" endpoint="GET /api/admin/v1/students" /></section>
  </>;
}

function ClassManagement() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">组织结构</span><h2>班级是课程授权和任课范围的基础</h2><p>先维护班级，再绑定课程与教师；历史任课关系应保留生效时间。</p></div><Button variant="contained" startIcon={<AddRounded />} disabled>新建班级</Button></section>
    <section className="workspace-panel-grid two-columns"><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">班级列表</span><h2>学校教学班级</h2></div><ServiceBadge /></div><EmptyWorkspace icon={<GroupsRounded />} title="暂无班级数据" description="接入后显示班级代码、名称、年级、专业、学生数和有效状态。" endpoint="GET /api/admin/v1/classes" /></article><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">任课关系</span><h2>绑定教师、课程和班级</h2></div></div><ol className="workspace-step-list"><li><span>1</span><div><strong>选择班级</strong><p>仅使用学校内唯一班级代码</p></div></li><li><span>2</span><div><strong>选择课程与教师</strong><p>教师账号必须处于启用状态</p></div></li><li><span>3</span><div><strong>设置生效周期</strong><p>支持学期起止和提前撤销</p></div></li><li><span>4</span><div><strong>提交并审计</strong><p>记录操作者、变更前后值与原因</p></div></li></ol></article></section>
  </>;
}

function RoleManagement() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">RBAC 权限</span><h2>角色决定页面入口，服务端决定真实数据范围</h2><p>角色提升属于高风险操作，应要求再次确认并写入审计记录。</p></div><ServiceBadge>等待权限服务</ServiceBadge></section>
    <section className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">权限矩阵</span><h2>默认页面访问范围</h2></div></div><div className="permission-matrix-wrap"><table className="permission-matrix"><thead><tr><th>功能区域</th><th>学生</th><th>教师</th><th>学校管理员</th></tr></thead><tbody><tr><td>课程学习与个人进度</td><td>允许</td><td>课程预览</td><td>禁止</td></tr><tr><td>练习与公共数据集</td><td>允许</td><td>预览</td><td>禁止</td></tr><tr><td>个人实训提交</td><td>允许</td><td>禁止</td><td>禁止</td></tr><tr><td>任务发布与评阅</td><td>禁止</td><td>任课范围</td><td>禁止</td></tr><tr><td>学生账号与班级</td><td>禁止</td><td>禁止</td><td>允许</td></tr><tr><td>角色与审计</td><td>禁止</td><td>禁止</td><td>允许</td></tr></tbody></table></div></section>
    <section className="workspace-panel-grid two-columns"><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">角色分配</span><h2>查询账号后变更角色</h2></div></div><EmptyWorkspace icon={<AdminPanelSettingsRounded />} title="尚未连接角色服务" description="管理员不能修改自己的最后一个管理员角色，也不能通过前端参数扩大权限。" endpoint="POST /api/admin/v1/role-assignments" /></article><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">高风险控制</span><h2>角色变更检查</h2></div></div><ul className="security-rule-list"><li>二次验证当前管理员身份。</li><li>显示变更前后角色和受影响的页面范围。</li><li>要求填写变更原因并生成审计事件。</li><li>服务端拒绝越权、同级保护和最后管理员被移除。</li></ul></article></section>
  </>;
}

function AuditRecords() {
  return <>
    <section className="workspace-action-bar"><div><span className="eyebrow">可追溯管理</span><h2>重要操作必须能够回答“谁、何时、做了什么”</h2><p>审计日志只读保存，普通管理员不可删除或覆盖。</p></div><ServiceBadge>等待审计服务</ServiceBadge></section>
    <section className="workspace-filter-bar" aria-label="审计记录筛选"><label><span>事件类型</span><select disabled><option>全部事件</option></select></label><label><span>操作结果</span><select disabled><option>全部结果</option></select></label><label className="filter-search"><span>账号或对象</span><div><SearchRounded fontSize="small" /><input disabled placeholder="操作者、学号或班级" /></div></label></section>
    <section className="workspace-panel-grid two-columns"><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">事件列表</span><h2>管理审计记录</h2></div></div><EmptyWorkspace icon={<HistoryRounded />} title="暂无审计数据" description="接入后按时间倒序展示账号导入、冻结、密码重置、任课和角色变更。" endpoint="GET /api/admin/v1/audit-events" /></article><article className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">事件字段</span><h2>每条记录至少包含</h2></div></div><ul className="requirement-list"><li><strong>操作者</strong><span>管理员用户 ID、学校和会话标识</span></li><li><strong>操作对象</strong><span>账号、班级、任课关系或角色</span></li><li><strong>变更内容</strong><span>前后值摘要，敏感信息脱敏</span></li><li><strong>结果与时间</strong><span>成功或拒绝、服务端时间与请求标识</span></li><li><strong>原因</strong><span>人工填写原因或系统拒绝原因</span></li></ul></article></section>
  </>;
}

function AdminServiceBoundary() {
  return <section className="service-boundary-panel admin-boundary"><div><span className="eyebrow">安全要求</span><h2>密码与权限只由服务端管理</h2></div><ul><li>批量导入接口需要学校管理员角色和防重放保护。</li><li>初始密码使用可靠算法哈希，任何页面均不可查询原密码。</li><li>账号创建、冻结、重置和角色变更必须写入审计日志。</li><li>管理端不能通过前端路由进入学生个人或教师任课数据。</li></ul><code>/api/admin/v1</code></section>;
}

export function SchoolAdminCenter() {
  const { section } = useParams();
  const activeSection = Object.hasOwn(sectionMeta, section) ? section : "overview";
  const meta = sectionMeta[activeSection];
  return <main className="portal-page admin-page"><PortalHeader title={meta.title} subtitle={meta.subtitle} /><RoleWorkspaceNav ariaLabel="学校管理工作台导航" items={adminNavigation} />{activeSection === "overview" && <AdminOverview />}{activeSection === "students" && <StudentAccounts />}{activeSection === "classes" && <ClassManagement />}{activeSection === "roles" && <RoleManagement />}{activeSection === "audit" && <AuditRecords />}</main>;
}
