use rand::{distr::Alphanumeric, Rng};
use serde::Serialize;
use std::{
  fs::{self, File},
  io::{Read, Write},
  net::{TcpListener, TcpStream},
  path::PathBuf,
  process::{Child, Command, Stdio},
  sync::Mutex,
  thread,
  time::{Duration, Instant},
};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
  pub kind: String,
  pub status: String,
  pub python_version: Option<String>,
  pub server_url: Option<String>,
  pub token: Option<String>,
  pub workspace_path: Option<String>,
  pub datasets_path: Option<String>,
  pub log_path: Option<String>,
  pub runtime_manifest: Option<serde_json::Value>,
  pub capabilities: RuntimeCapabilities,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCapabilities {
  pub native_file_system: bool,
  pub package_install: bool,
  pub interrupt: bool,
  pub rich_output: bool,
  pub offline: bool,
}

impl Default for RuntimeCapabilities {
  fn default() -> Self {
    Self { native_file_system: true, package_install: false, interrupt: true, rich_output: true, offline: true }
  }
}

struct ManagedRuntime {
  child: Child,
  info: RuntimeInfo,
}

pub struct RuntimeManager {
  runtime: Mutex<Option<ManagedRuntime>>,
}

impl RuntimeManager {
  fn stop(&self) {
    if let Ok(mut slot) = self.runtime.lock() {
      if let Some(mut runtime) = slot.take() {
        let _ = runtime.child.kill();
        let _ = runtime.child.wait();
      }
    }
  }

  fn current(&self) -> Option<RuntimeInfo> {
    self.runtime.lock().ok().and_then(|slot| slot.as_ref().map(|runtime| runtime.info.clone()))
  }
}

fn random_token() -> String {
  rand::rng().sample_iter(&Alphanumeric).take(48).map(char::from).collect()
}

fn runtime_root(app: &AppHandle) -> Result<PathBuf, String> {
  let resource = app.path().resource_dir().map_err(|error| error.to_string())?;
  let bundled_candidates = [
    resource.join("python-runtime"),
    resource.join("resources").join("python-runtime"),
  ];
  if let Some(bundled) = bundled_candidates.iter().find(|path| python_executable(path).is_file()) {
    return Ok(bundled.clone());
  }
  let development = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../runtime/native/dist/python-runtime");
  if python_executable(&development).is_file() { return Ok(development); }
  if bundled_candidates.iter().any(|path| path.exists()) || development.exists() {
    return Err("Runtime 未找到：资源目录存在，但缺少 Windows Scripts/python.exe".into());
  }
  Err("Runtime 未找到：请先执行 npm run build:native-runtime".into())
}

fn python_executable(root: &PathBuf) -> PathBuf {
  if cfg!(windows) {
    let bundled = root.join("python.exe");
    if bundled.is_file() { return bundled; }
    let scripts = root.join("Scripts").join("python.exe");
    if scripts.is_file() { scripts } else { root.join("python.exe") }
  } else {
    root.join("bin").join("python")
  }
}

fn wait_for_server(url: &str, token: &str) -> Result<(), String> {
  let deadline = Instant::now() + Duration::from_secs(20);
  let address = url.strip_prefix("http://").unwrap_or(url);
  while Instant::now() < deadline {
    if let Ok(mut stream) = TcpStream::connect(address) {
      let request = format!("GET /api/status?token={} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", token, address);
      let _ = stream.write_all(request.as_bytes());
      let mut response = String::new();
      let _ = stream.read_to_string(&mut response);
      if response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200") { return Ok(()); }
    }
    thread::sleep(Duration::from_millis(150));
  }
  Err("Jupyter Server 未在规定时间内就绪".into())
}

mod commands {
use super::*;

#[tauri::command]
pub fn start_native_runtime(app: AppHandle, state: State<'_, RuntimeManager>) -> Result<RuntimeInfo, String> {
  state.stop();
  let root = runtime_root(&app)?;
  let python = python_executable(&root);
  if !python.exists() { return Err("Runtime 未找到：缺少打包的 Python 可执行文件".into()); }

  let app_data = app.path().app_data_dir().map_err(|error| error.to_string())?;
  let workspace = app_data.join("workspace");
  let resource_dir = app.path().resource_dir().map_err(|error| error.to_string())?;
  let dataset_candidates = [resource_dir.join("datasets"), resource_dir.join("resources").join("datasets")];
  let datasets = dataset_candidates.iter().find(|path| path.is_dir()).cloned().unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../datasets"));
  let logs = app_data.join("logs");
  fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
  fs::create_dir_all(&logs).map_err(|error| error.to_string())?;
  let log_path = logs.join("jupyter-server.log");
  let log_file = File::create(&log_path).map_err(|error| error.to_string())?;
  let port = TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?.local_addr().map_err(|error| error.to_string())?.port();
  let token = random_token();
  let server_url = format!("http://127.0.0.1:{}", port);
  let python_version = Command::new(&python).arg("--version").output().ok().and_then(|output| {
    let bytes = if output.stdout.is_empty() { output.stderr } else { output.stdout };
    String::from_utf8(bytes).ok().map(|value| value.trim().replace("Python ", ""))
  });
  let mut command = Command::new(&python);
  command.args(["-m", "jupyter", "server", "--no-browser", "--ServerApp.ip=127.0.0.1"])
    .arg(format!("--ServerApp.port={}", port))
    .arg(format!("--ServerApp.token={}", token))
    .args(["--ServerApp.open_browser=False", "--ServerApp.allow_remote_access=False", "--ServerApp.port_retries=0"])
    .arg(format!("--ServerApp.root_dir={}", workspace.display()))
    .arg(format!("--ServerApp.allow_origin={}", "tauri://localhost"))
    .env("PDS_DATASETS_DIR", &datasets)
    .env("PDS_WORKSPACE_DIR", &workspace)
    .stdout(Stdio::from(log_file.try_clone().map_err(|error| error.to_string())?))
    .stderr(Stdio::from(log_file));
  let child = command.spawn().map_err(|error| format!("Runtime 启动失败：{}", error))?;
  if let Err(error) = wait_for_server(&server_url, &token) {
    let mut failed_child = child;
    let _ = failed_child.kill();
    return Err(error);
  }
  let info = RuntimeInfo { kind: "native".into(), status: "ready".into(), python_version, server_url: Some(server_url), token: Some(token), workspace_path: Some(workspace.display().to_string()), datasets_path: Some(datasets.display().to_string()), log_path: Some(log_path.display().to_string()), runtime_manifest: load_manifest(&root), capabilities: RuntimeCapabilities::default() };
  let result = info.clone();
  state.runtime.lock().map_err(|_| "Runtime 状态锁不可用".to_string())?.replace(ManagedRuntime { child, info });
  Ok(result)
}

fn load_manifest(root: &PathBuf) -> Option<serde_json::Value> {
  let path = root.join("runtime-manifest.json");
  fs::read_to_string(path).ok().and_then(|text| serde_json::from_str(&text).ok())
}

fn notebook_file(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
  let safe = key.replace([':', '/', '\\'], "_");
  let root = app.path().app_data_dir().map_err(|error| error.to_string())?.join("notebooks");
  fs::create_dir_all(&root).map_err(|error| error.to_string())?;
  Ok(root.join(format!("{}.ipynb", safe)))
}

#[tauri::command]
pub fn stop_native_runtime(state: State<'_, RuntimeManager>) -> Result<(), String> { state.stop(); Ok(()) }

#[tauri::command]
pub fn native_runtime_status(state: State<'_, RuntimeManager>) -> Option<RuntimeInfo> { state.current() }

#[tauri::command]
pub fn native_runtime_diagnostics(app: AppHandle, state: State<'_, RuntimeManager>) -> Result<serde_json::Value, String> {
  let root = runtime_root(&app)?;
  let runtime = state.current().map(|mut info| { info.token = None; info });
  Ok(serde_json::json!({ "runtime": runtime, "runtimeRoot": root, "manifest": load_manifest(&root) }))
}

#[tauri::command]
pub fn load_user_notebook(app: AppHandle, key: String) -> Result<Option<serde_json::Value>, String> {
  let path = notebook_file(&app, &key)?;
  if !path.exists() { return Ok(None); }
  let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
  serde_json::from_str(&text).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_user_notebook(app: AppHandle, key: String, document: serde_json::Value) -> Result<(), String> {
  let path = notebook_file(&app, &key)?;
  let text = serde_json::to_string_pretty(&document).map_err(|error| error.to_string())?;
  fs::write(path, text).map_err(|error| error.to_string())
}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(RuntimeManager { runtime: Mutex::new(None) })
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![commands::start_native_runtime, commands::stop_native_runtime, commands::native_runtime_status, commands::native_runtime_diagnostics, commands::load_user_notebook, commands::save_user_notebook])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      if matches!(event, tauri::WindowEvent::Destroyed) { window.state::<RuntimeManager>().stop(); }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
