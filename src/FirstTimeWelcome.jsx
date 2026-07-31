import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";

export function FirstTimeWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 检查是否是首次访问
    const hasVisited = localStorage.getItem("python-data-studio:first-visit-done");
    if (!hasVisited) {
      setOpen(true);
      localStorage.setItem("python-data-studio:first-visit-done", "true");
    }
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: 600, pb: 1 }}>
        👋 欢迎来到 Python 数据分析教室
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#1a73e8" }}>
              🚀 快速开始（3 步）
            </Typography>
            <Box component="ol" sx={{ pl: 2, m: 0, "& li": { mb: 1, fontSize: 14, lineHeight: 1.6 } }}>
              <li><strong>点击左侧"第1章"</strong>开始学习 Python 基础</li>
              <li><strong>点击代码单元格旁的运行按钮</strong> ▶ 执行代码</li>
              <li><strong>修改代码</strong>，看看会发生什么！</li>
            </Box>
          </Box>

          <Box sx={{ background: "#f0f7ff", border: "1px solid #d4e4f7", borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              💡 小贴士
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#1a73e8", lineHeight: 1.6 }}>
              • 首次运行 Python 需要 10 秒左右来初始化，请耐心等待
              <br />
              • 按 <kbd style={{ background: "#fff", border: "1px solid #ddd", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace", fontSize: 12 }}>Shift+Enter</kbd> 快速运行单元格
              <br />
              • 代码有问题？我们会给出友好的错误提示
            </Typography>
          </Box>

          <Box sx={{ background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📚 课程特色
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0, fontSize: 13, lineHeight: 1.8, "& li": { mb: 1 } }}>
              <li>108 章完整教程，从入门到机器学习实战</li>
              <li>真实数据集的 4 个综合项目</li>
              <li>所有代码可以立即运行，无需配置</li>
              <li>保存进度，随时继续学习</li>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => setOpen(false)} variant="contained" sx={{ textTransform: "none", fontSize: 14 }}>
          ✨ 开始学习
        </Button>
      </DialogActions>
    </Dialog>
  );
}
