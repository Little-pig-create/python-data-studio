import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import PlayCircleOutlineRounded from "@mui/icons-material/PlayCircleOutlineRounded";
import RocketLaunchRounded from "@mui/icons-material/RocketLaunchRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { useMemo, useState } from "react";
import { BitsTopBar, CountUp, Magnetic, MouseGlow, ScrollReveal, ShinyText, SpotlightCard } from "./ui-react-bits";

const modules = [
  { id: "python", label: "Python 基础", range: "01–10", color: "#2563eb" },
  { id: "numpy", label: "NumPy", range: "11–15", color: "#0e7490" },
  { id: "pandas", label: "Pandas", range: "16–24", color: "#16865c" },
  { id: "matplotlib", label: "Matplotlib / Seaborn", range: "25–54", color: "#c77908" },
  { id: "plotly", label: "Plotly", range: "55–71", color: "#b4236b" },
  { id: "projects", label: "综合项目", range: "72–75", color: "#7c3aed" },
  { id: "machine-learning", label: "机器学习", range: "76–108", color: "#0f766e" },
];

const features = [
  {
    icon: <TerminalRounded />,
    title: "打开浏览器就能运行",
    text: "基于 JupyterLite 与 Pyodide，学生无需安装 Python 环境，进入章节即可编写、运行和查看结果。",
  },
  {
    icon: <BarChartRounded />,
    title: "从数据处理到可视化",
    text: "课程覆盖 NumPy、Pandas、Matplotlib、Seaborn 与 Plotly，沿着一条清晰路径建立数据分析能力。",
  },
  {
    icon: <GroupsRounded />,
    title: "面向教学组织设计",
    text: "学生、教师、学校管理员拥有不同工作台，课程、练习、数据集、实训与进度统一管理。",
  },
];

export function LandingPage({ catalog }) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeModule, setActiveModule] = useState("python");
  const activeCatalogModule = useMemo(
    () => catalog?.modules?.find((item) => item.id === activeModule) || catalog?.modules?.[0],
    [catalog, activeModule],
  );
  const activeChapters = useMemo(
    () => catalog?.chapters?.filter((item) => item.module === activeCatalogModule?.id) || [],
    [catalog, activeCatalogModule],
  );
  return (
    <main className="landing-page">
      <MouseGlow />
      <div className="landing-ambient" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-scanline" />
        <div className="ambient-route route-one"><i /><i /><i /><i /></div>
        <div className="ambient-route route-two"><i /><i /><i /></div>
        <div className="ambient-data-label label-one">DATA / 108 CHAPTERS</div>
        <div className="ambient-data-label label-two">PYTHON.RUNTIME // READY</div>
        <div className="ambient-data-label label-three">PANDAS · PLOTLY · SKLEARN</div>
      </div>
      <BitsTopBar className="landing-topbar">
        <header className="landing-nav">
          <a className="landing-brand" href="/">
            <span className="landing-brand-mark"><CodeRounded /></span>
            <span>
              <strong>Python 数据工作台</strong>
              <small>浏览器端数据分析教学平台</small>
            </span>
          </a>
          <nav className="landing-nav-links" aria-label="主导航">
            <a href="#path">课程路径</a>
            <a href="#features">平台能力</a>
            <a href="#roles">适用角色</a>
          </nav>
          <a className="landing-nav-login" href="/login">登录工作台 <ArrowForwardRounded fontSize="small" /></a>
        </header>
      </BitsTopBar>

      <section className="landing-hero">
        <ScrollReveal className="landing-hero-copy">
          <div className="landing-kicker"><span><AutoAwesomeRounded fontSize="small" /></span><ShinyText>为数据分析教学而生的 Python 学习空间</ShinyText></div>
          <h1>把每一次代码运行，<em>变成可见的学习进步。</em></h1>
          <p>Python 数据工作台把课程、Notebook、真实数据集和项目实践放进同一个浏览器工作区，让学生从第一行代码一直走到完整的数据分析作品。</p>
          <div className="landing-hero-actions">
            <Magnetic><a className="landing-primary-button" href="/login">进入学习工作台 <ArrowForwardRounded /></a></Magnetic>
            <Magnetic strength={5}><button className="landing-secondary-button" type="button" onClick={() => setCatalogOpen(true)}><PlayCircleOutlineRounded />查看章节目录</button></Magnetic>
          </div>
          <div className="landing-proof-row">
            <span><CheckCircleRounded />无需本地安装</span>
            <span><CheckCircleRounded />108 个章节</span>
            <span><CheckCircleRounded />4 个综合项目</span>
          </div>
        </ScrollReveal>
        <ScrollReveal className="landing-hero-visual" delay={140}>
          <div className="landing-visual-label"><span className="status-dot" /> Python 按需启动 <span>● ● ●</span></div>
          <div className="landing-window">
            <div className="landing-window-sidebar">
              <div className="mini-brand"><span><CodeRounded /></span><strong>Python Data Studio</strong></div>
              <div className="mini-progress"><span>课程进度</span><b>42%</b><i><u /></i></div>
              <div className="mini-tab active"><MenuBookRounded />课程</div>
              <div className="mini-module"><b>⌄</b><span>Python 基础</span></div>
              <div className="mini-lessons">
                <span>第1章 Python 与 Notebook 入门</span>
                <span>第2章 变量、数据类型与运算符</span>
                <span className="selected">第4章 Python 常用数据结构</span>
                <span>第5章 条件判断与循环</span>
              </div>
              <div className="mini-module"><b>›</b><span>NumPy</span></div>
              <div className="mini-module"><b>›</b><span>Pandas</span></div>
              <div className="mini-module"><b>›</b><span>综合项目</span></div>
            </div>
            <div className="landing-window-main">
              <div className="mini-breadcrumb">Python 基础 / 第4章</div>
              <h3>Python 常用数据结构</h3>
              <div className="mini-toolbar"><b>▣ &nbsp; Python 常用数据结构</b><span>▶ 运行　▶ 全部运行　■ 停止　↻ 重启</span></div>
              <div className="mini-notebook">
                <h4>第4章 Python 常用数据结构</h4>
                <p>讲解列表、元组、字典、集合、嵌套结构和推导式。</p>
                <h5>学习目标</h5>
                <ul><li>掌握列表、元组、字典和集合</li><li>能够对数据结构进行增删改查</li><li>使用推导式快速构造数据</li></ul>
                <div className="mini-code"><span>scores = [85, 92, 78, 96]</span><span>print(scores[0], scores[-1], scores[1:3])</span><span>scores.append(88)</span><span>print(sorted(scores, reverse=True))</span></div>
                <div className="mini-output">85 96 [92, 78]<br />[96, 92, 90, 88]</div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="landing-stats">
        <ScrollReveal delay={0}><div><strong><CountUp value={108} /></strong><span>系统化课程章节</span></div></ScrollReveal>
        <ScrollReveal delay={70}><div><strong><CountUp value={7} /></strong><span>数据分析核心模块</span></div></ScrollReveal>
        <ScrollReveal delay={140}><div><strong><CountUp value={4} /></strong><span>真实场景综合项目</span></div></ScrollReveal>
        <ScrollReveal delay={210}><div><strong><CountUp value={3} /></strong><span>教学角色工作台</span></div></ScrollReveal>
      </section>

      <section className="landing-section landing-path" id="path">
        <div className="landing-section-heading">
          <span className="landing-overline">A CLEAR LEARNING PATH</span>
          <h2>从第一行 Python，走到完整作品。</h2>
          <p>按能力递进组织的课程目录，让学习过程有目标、有反馈、有产出。</p>
        </div>
        <div className="landing-module-grid">
          {modules.map((item, index) => <ScrollReveal key={item.label} delay={index * 45}><SpotlightCard><button className="landing-module-card" type="button" onClick={() => { setActiveModule(item.id); setCatalogOpen(true); }}>
            <i style={{ backgroundColor: item.color }} />
            <div><strong>{item.label}</strong><span>第 {item.range} 章</span></div>
            <ArrowForwardRounded />
          </button></SpotlightCard></ScrollReveal>)}
        </div>
      </section>

      <section className="landing-section landing-features" id="features">
        <div className="landing-section-heading compact">
          <span className="landing-overline">BUILT FOR PRACTICE</span>
          <h2>让学习过程，本身就是工作流。</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map((feature, index) => <ScrollReveal key={feature.title} delay={index * 80}><SpotlightCard><article className="landing-feature-card">
            <span className="landing-feature-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article></SpotlightCard></ScrollReveal>)}
        </div>
      </section>

      <section className="landing-roles" id="roles">
        <div className="landing-role-copy">
          <span className="landing-overline">ONE PLATFORM, THREE WORKSPACES</span>
          <h2>让每个角色，都拥有合适的下一步。</h2>
          <p>从个人学习到班级教学，再到学校管理，统一的课程资产与数据基础，支撑完整的教学闭环。</p>
          <a className="landing-text-link" href="/login">登录查看工作台 <ArrowForwardRounded /></a>
        </div>
        <div className="landing-role-list">
          <div><span className="role-icon blue"><SchoolRounded /></span><span><b>学生工作台</b><small>课程、练习、项目与个人进度</small></span><ArrowForwardRounded /></div>
          <div><span className="role-icon green"><GroupsRounded /></span><span><b>教师工作台</b><small>内容发布、数据集与教学组织</small></span><ArrowForwardRounded /></div>
          <div><span className="role-icon orange"><RocketLaunchRounded /></span><span><b>学校管理中心</b><small>账号、授权与平台配置</small></span><ArrowForwardRounded /></div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Python 数据工作台</span>
        <small>Browser-first Python learning for data analysis education.</small>
        <a href="/login">开始使用 <ArrowForwardRounded fontSize="small" /></a>
      </footer>
      {catalogOpen && <div className="landing-catalog-backdrop" role="presentation" onClick={() => setCatalogOpen(false)}>
        <section className="landing-catalog-panel" role="dialog" aria-modal="true" aria-labelledby="landing-catalog-title" onClick={(event) => event.stopPropagation()}>
          <div className="landing-catalog-heading">
            <div><span className="landing-overline">COURSE CATALOG</span><h2 id="landing-catalog-title">完整章节目录</h2><p>{catalog?.chapters?.length || 108} 个章节，按能力路径组织学习。</p></div>
            <button className="landing-catalog-close" type="button" aria-label="关闭章节目录" onClick={() => setCatalogOpen(false)}><CloseRounded /></button>
          </div>
          <div className="landing-catalog-body">
            <div className="landing-catalog-modules">
              {(catalog?.modules || []).map((module) => <button key={module.id} type="button" className={module.id === activeCatalogModule?.id ? "active" : ""} onClick={() => setActiveModule(module.id)}>
                <i style={{ backgroundColor: module.color }} /><span><b>{module.label}</b><small>{module.range}</small></span><ArrowForwardRounded />
              </button>)}
            </div>
            <div className="landing-catalog-chapters">
              <div className="landing-catalog-chapters-heading"><strong>{activeCatalogModule?.label || "课程章节"}</strong><span>{activeChapters.length} 章</span></div>
              <div className="landing-catalog-chapter-list">
                {activeChapters.map((chapter) => <a key={chapter.id} href={`/course/${chapter.id}`} onClick={() => setCatalogOpen(false)}>
                  <span className="chapter-number">{chapter.kind === "capstone" ? "★" : String(chapter.chapter).padStart(2, "0")}</span>
                  <span className="chapter-title"><b>{chapter.title}</b><small>{(chapter.tags || []).slice(0, 2).join(" · ")}</small></span>
                  <span className={`chapter-kind ${chapter.kind === "project" ? "project" : ""}`}>{chapter.kind === "project" ? "项目" : `${chapter.estimatedMinutes || 35} 分钟`}</span>
                  <ArrowForwardRounded />
                </a>)}
              </div>
            </div>
          </div>
        </section>
      </div>}
    </main>
  );
}
