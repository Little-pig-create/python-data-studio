import { Drawer, IconButton, Button, TextField, InputAdornment, Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { useAppStore } from "../store";
import { useAuth, ROLES } from "../AuthProvider";
import { CourseTree, SearchResults, CollapsedRail } from "./CourseTree";
import { StudentAnnouncements } from "./StudentAnnouncements";

export function Sidebar({ catalog, mobileOpen, onClose }) {
  const navigate = useNavigate();
  const store = useAppStore();
  const { user } = useAuth();
  const collapsed = store.sidebarMode === "rail";
  const query = store.searchQuery.trim().toLowerCase();
  const content = <div className="sidebar-content">
    <div className="sidebar-brand">
      <div className="brand-mark"><MenuBookRounded fontSize="small" /></div>
      <div className="brand-title">Python Data Studio</div>
      <Tooltip title={collapsed ? "展开目录" : "折叠目录"} placement="right">
        <IconButton
          size="small"
          className="sidebar-toggle"
          aria-label={collapsed ? "展开目录" : "折叠目录"}
          aria-expanded={!collapsed}
          onClick={() => store.setSidebarMode(collapsed ? "full" : "rail")}
        >
          {collapsed ? <ChevronRightRounded fontSize="small" /> : <ChevronLeftRounded fontSize="small" />}
        </IconButton>
      </Tooltip>
    </div>
    {collapsed
      ? <CollapsedRail catalog={catalog} store={store} navigate={navigate} onClose={onClose} />
      : <>
        <div className="sidebar-tools">
          {user.role === ROLES.TEACHER && <Button className="sidebar-teaching-link" startIcon={<DashboardRounded fontSize="small" />} onClick={() => { navigate("/teaching"); onClose?.(); }}>教学工作台</Button>}
          <TextField
            className="course-search-input"
            size="small"
            fullWidth
            placeholder="搜索课程、模块或标签"
            value={store.searchQuery}
            onChange={(event) => store.setSearchQuery(event.target.value)}
            inputProps={{ "aria-label": "搜索课程" }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment>,
              endAdornment: store.searchQuery ? <InputAdornment position="end"><IconButton size="small" aria-label="清除搜索" onClick={() => store.setSearchQuery("")}><span aria-hidden="true">×</span></IconButton></InputAdornment> : null
            }}
          />
        </div>
        <div className="course-tree">
          {query ? <SearchResults catalog={catalog} store={store} navigate={navigate} onClose={onClose} query={query} /> : <CourseTree catalog={catalog} store={store} navigate={navigate} onClose={onClose} />}
        </div>
        <div className="sidebar-session sidebar-about-session">
          {user.role === ROLES.STUDENT && <>
            <Button className="sidebar-progress-link" startIcon={<HistoryRounded fontSize="small" />} onClick={() => { navigate("/progress"); onClose?.(); }}>学习记录</Button>
            <Button className="sidebar-training-link" startIcon={<AssignmentRounded fontSize="small" />} onClick={() => { navigate("/training"); onClose?.(); }}>我的实训</Button>
          </>}
          <Button className="sidebar-about-link" startIcon={<InfoOutlined fontSize="small" />} onClick={() => { navigate("/about"); onClose?.(); }}>关于软件</Button>
        </div>
      </>}
  </div>;
  return <><aside className={`sidebar desktop-sidebar ${collapsed ? "is-collapsed" : ""}`}>{content}</aside><Drawer open={mobileOpen} onClose={onClose} className="mobile-sidebar" PaperProps={{ className: "!w-[304px]" }}>{content}</Drawer></>;
}
