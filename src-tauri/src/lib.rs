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
#[cfg(windows)]
use std::os::windows::process::CommandExt;
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
        request_server_shutdown(&runtime.info);
        let deadline = Instant::now() + Duration::from_secs(2);
        while Instant::now() < deadline {
          if matches!(runtime.child.try_wait(), Ok(Some(_))) { return; }
          thread::sleep(Duration::from_millis(80));
        }
        let _ = runtime.child.kill();
        let _ = runtime.child.wait();
      }
    }
  }

  fn current(&self) -> Option<RuntimeInfo> {
    self.runtime.lock().ok().and_then(|slot| slot.as_ref().map(|runtime| runtime.info.clone()))
  }
}

fn request_server_shutdown(info: &RuntimeInfo) {
  let (Some(url), Some(token)) = (&info.server_url, &info.token) else { return; };
  let address = url.strip_prefix("http://").unwrap_or(url);
  let Ok(mut stream) = TcpStream::connect_timeout(
    &match address.parse() { Ok(value) => value, Err(_) => return },
    Duration::from_millis(400),
  ) else { return; };
  let request = format!(
    "POST /api/shutdown?token={} HTTP/1.1\r\nHost: {}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
    token, address
  );
  let _ = stream.write_all(request.as_bytes());
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

#[cfg(windows)]
fn configure_no_window(command: &mut Command) {
  command.creation_flags(0x08000000);
}

#[cfg(not(windows))]
fn configure_no_window(_command: &mut Command) {}

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
  eprintln!("[native-runtime] root={} python={}", root.display(), python.display());
  log::info!("native runtime root={} python={}", root.display(), python.display());
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
  let mut version_command = Command::new(&python);
  configure_no_window(&mut version_command);
  let python_version = version_command.arg("--version").output().ok().and_then(|output| {
    let bytes = if output.stdout.is_empty() { output.stderr } else { output.stdout };
    String::from_utf8(bytes).ok().map(|value| value.trim().replace("Python ", ""))
  });
  let mut command = Command::new(&python);
  configure_no_window(&mut command);
  command.args(["-m", "jupyter_server", "--no-browser", "--ServerApp.ip=127.0.0.1"])
    .arg(format!("--ServerApp.port={}", port))
    .arg(format!("--ServerApp.token={}", token))
    .args([
      "--ServerApp.open_browser=False",
      "--ServerApp.allow_remote_access=False",
      "--ServerApp.port_retries=0",
      "--ServerApp.allow_origin_pat=^(https?://)?(tauri\\.localhost|localhost|127\\.0\\.0\\.1)(:\\d+)?$",
    ])
    .arg(format!("--ServerApp.root_dir={}", workspace.display()))
    .env("PDS_DATASETS_DIR", &datasets)
    .env("PDS_WORKSPACE_DIR", &workspace)
    .stdout(Stdio::from(log_file.try_clone().map_err(|error| error.to_string())?))
    .stderr(Stdio::from(log_file));
  eprintln!("[native-runtime] spawning jupyter_server on 127.0.0.1:{}", port);
  log::info!("spawning jupyter_server on 127.0.0.1:{}", port);
  let child = command.spawn().map_err(|error| format!("Runtime 启动失败：{}", error))?;
  if let Err(error) = wait_for_server(&server_url, &token) {
    eprintln!("[native-runtime] server startup failed: {}", error);
    log::error!("native runtime server startup failed: {}", error);
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

#[tauri::command]
pub fn delete_user_notebook(app: AppHandle, key: String) -> Result<(), String> {
  let path = notebook_file(&app, &key)?;
  if path.exists() {
    fs::remove_file(path).map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
pub fn list_user_notebooks(app: AppHandle) -> Result<Vec<serde_json::Value>, String> {
  let root = app.path().app_data_dir().map_err(|error| error.to_string())?.join("notebooks");
  if !root.is_dir() { return Ok(Vec::new()); }

  let mut records = Vec::new();
  for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
    let path = entry.map_err(|error| error.to_string())?.path();
    let is_custom = path.extension().and_then(|value| value.to_str()) == Some("ipynb")
      && path.file_stem().and_then(|value| value.to_str()).map(|value| value.starts_with("custom-notebook_")) == Some(true);
    if !is_custom { continue; }
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    if let Ok(document) = serde_json::from_str::<serde_json::Value>(&text) {
      records.push(document);
    }
  }
  Ok(records)
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
  if !(url.starts_with("https://") || url.starts_with("http://")) {
    return Err("仅支持打开 HTTP/HTTPS 链接".into());
  }

  #[cfg(windows)]
  {
    let mut command = Command::new("cmd");
    configure_no_window(&mut command);
    command.args(["/C", "start", "", &url]);
    command.status().map_err(|error| error.to_string()).and_then(|status| {
      if status.success() { Ok(()) } else { Err(format!("默认浏览器启动失败：{}", status)) }
    })
  }

  #[cfg(target_os = "macos")]
  {
    Command::new("open").arg(&url).status().map_err(|error| error.to_string()).and_then(|status| {
      if status.success() { Ok(()) } else { Err(format!("默认浏览器启动失败：{}", status)) }
    })
  }

  #[cfg(all(unix, not(target_os = "macos")))]
  {
    Command::new("xdg-open").arg(&url).status().map_err(|error| error.to_string()).and_then(|status| {
      if status.success() { Ok(()) } else { Err(format!("默认浏览器启动失败：{}", status)) }
    })
  }
}

#[tauri::command]
pub async fn fetch_release_info() -> Result<serde_json::Value, String> {
  const STATIC_RELEASE_INFO: &str = "https://github.com/Little-pig-create/python-data-studio/releases/latest/download/release-info.json";
  const GITHUB_RELEASE_API: &str = "https://api.github.com/repos/Little-pig-create/python-data-studio/releases/latest";

  let client = reqwest::Client::builder()
    .tls_backend_native()
    .user_agent(format!("Python Data Studio/{}", env!("CARGO_PKG_VERSION")))
    .timeout(Duration::from_secs(20))
    .build()
    .map_err(|error| format!("无法创建更新请求：{}", error))?;

  let mut errors = Vec::new();
  for (label, url) in [("发布元数据", STATIC_RELEASE_INFO), ("GitHub Release", GITHUB_RELEASE_API)] {
    let response = match client
      .get(url)
      .header(reqwest::header::ACCEPT, "application/vnd.github+json, application/json")
      .send()
      .await
    {
      Ok(response) => response,
      Err(error) => {
        errors.push(format!("{}连接失败：{}", label, error));
        continue;
      }
    };

    let status = response.status();
    if !status.is_success() {
      errors.push(format!("{}请求失败（{}）", label, status.as_u16()));
      continue;
    }

    match response.json::<serde_json::Value>().await {
      Ok(payload) => return Ok(payload),
      Err(error) => errors.push(format!("{}格式错误：{}", label, error)),
    }
  }

  Err(format!("无法读取版本信息：{}", errors.join("；")))
}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(RuntimeManager { runtime: Mutex::new(None) })
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![commands::start_native_runtime, commands::stop_native_runtime, commands::native_runtime_status, commands::native_runtime_diagnostics, commands::load_user_notebook, commands::save_user_notebook, commands::delete_user_notebook, commands::list_user_notebooks, commands::open_external_url, commands::fetch_release_info])
    .setup(|_app| {
      #[cfg(feature = "desktop-debug")]
      {
        _app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            // The default LogDir target can fail with ERROR_ACCESS_DENIED on
            // locked-down Windows machines. Debugging must still be possible
            // without requiring write access to the OS application log dir.
            .targets([
              tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
              tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stderr),
            ])
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

#[cfg(test)]
mod tests {
  #[test]
  #[ignore = "需要访问 GitHub，仅用于发版前在线更新诊断"]
  fn release_info_endpoint_is_reachable() {
    let payload = tauri::async_runtime::block_on(super::commands::fetch_release_info())
      .expect("桌面后端应能读取最新 Release");
    assert!(payload.get("version").is_some() || payload.get("tag_name").is_some());
  }
}
