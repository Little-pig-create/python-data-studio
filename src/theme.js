import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: { mode: "light", primary: { main: "#2563EB" }, background: { default: "#F2F4F7", paper: "#FFFFFF" }, text: { primary: "#1B2430", secondary: "#667085" } },
  shape: { borderRadius: 6 },
  typography: { fontFamily: "\"IBM Plex Sans\", \"Noto Sans SC\", \"Microsoft YaHei\", sans-serif", button: { textTransform: "none", fontWeight: 600 } },
  components: { MuiButton: { defaultProps: { disableElevation: true } }, MuiTooltip: { defaultProps: { arrow: true } } }
});
