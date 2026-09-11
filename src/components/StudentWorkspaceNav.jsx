import { NavLink } from "react-router-dom";

const items = [
  { to: "/student/notebooks", label: "我的 Notebook" },
  { to: "/student/packages", label: "Python 环境" },
  { to: "/practice", label: "章节练习" },
  { to: "/training", label: "我的实训" },
  { to: "/progress", label: "学习记录" },
];

export function StudentWorkspaceNav({ active }) {
  return (
    <nav className="student-workspace-nav" aria-label="学生工作区导航">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={item.to === active ? "is-active" : undefined}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
