import { IconButton, Divider, Tooltip } from "@mui/material";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ContentCutRounded from "@mui/icons-material/ContentCutRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";

export function CellToolbar({ cell, index, cellCount, onAdd, onMove, onEdit, onDelete, onDuplicate }) {
  return <div className="notebook-cell-toolbar" onClick={(event) => event.stopPropagation()}>
    <Tooltip title="上移单元格"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(cell.id, -1)}><ArrowUpwardRounded fontSize="small" /></IconButton></span></Tooltip>
    <Tooltip title="下移单元格"><span><IconButton size="small" disabled={index === cellCount - 1} onClick={() => onMove(cell.id, 1)}><ArrowDownwardRounded fontSize="small" /></IconButton></span></Tooltip>
    <Divider orientation="vertical" flexItem className="notebook-cell-toolbar-divider" />
    <Tooltip title="编辑单元格"><IconButton size="small" onClick={onEdit}><EditRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="复制单元格"><IconButton size="small" onClick={() => onDuplicate(index)}><ContentCopyRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="剪切单元格"><IconButton size="small" onClick={() => onDelete(cell.id)}><ContentCutRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="删除单元格"><IconButton size="small" onClick={() => onDelete(cell.id)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
    <Divider orientation="vertical" flexItem className="notebook-cell-toolbar-divider" />
    <Tooltip title="更多操作"><IconButton size="small"><MoreHorizRounded fontSize="small" /></IconButton></Tooltip>
  </div>;
}
