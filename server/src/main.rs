use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// 数据模型
// ---------------------------------------------------------------------------

#[derive(Clone, Serialize, Deserialize)]
struct User {
    user_id: String,
    identifier: String,
    name: String,
    role: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct Account {
    user: User,
    password_hash: String,
    verified: bool,
}

#[derive(Clone, Serialize, Deserialize)]
struct Session {
    user: User,
    created_at: u64,
    expires_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct Verification {
    code_hash: String,
    expires_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct CdKey {
    code: String,
    role: String,
    expires_at: Option<u64>,
    max_uses: u32,
    used_count: u32,
    active: bool,
}

/// 登录失败保护(仅内存,不持久化)。
#[derive(Clone, Default)]
struct LoginGuard {
    failed: u32,
    locked_until: u64,
}

#[derive(Clone, Serialize, Deserialize, Default)]
struct PersistedState {
    users: HashMap<String, Account>,
    sessions: HashMap<String, Session>,
    codes: HashMap<String, Verification>,
    cdkeys: HashMap<String, CdKey>,
}

#[derive(Clone)]
struct AppState {
    data: Arc<Mutex<PersistedState>>,
    data_dir: PathBuf,
    guards: Arc<Mutex<HashMap<String, LoginGuard>>>,
}

#[derive(Deserialize)]
struct LoginRequest {
    identifier: String,
    password: String,
}
#[derive(Deserialize)]
struct SendCodeRequest {
    email: String,
}
#[derive(Deserialize)]
struct RegisterRequest {
    email: String,
    password: String,
    name: String,
    verification_code: Option<String>,
}
#[derive(Deserialize)]
struct CdKeyCreateRequest {
    role: Option<String>,
    expires_at: Option<u64>,
    max_uses: Option<u32>,
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn env_bool(name: &str) -> bool {
    std::env::var(name)
        .map(|v| v.to_lowercase() == "true" || v == "1")
        .unwrap_or(false)
}

fn env_u64(name: &str, default: u64) -> u64 {
    std::env::var(name)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn email_verification_enabled() -> bool {
    env_bool("AUTH_EMAIL_VERIFICATION_ENABLED")
}

fn session_ttl_seconds() -> u64 {
    env_u64("PDS_SESSION_TTL_HOURS", 24).min(24 * 30) * 3600
}

fn login_max_attempts() -> u32 {
    env_u64("PDS_LOGIN_MAX_ATTEMPTS", 5).max(1) as u32
}

fn login_lock_seconds() -> u64 {
    env_u64("PDS_LOGIN_LOCK_MINUTES", 10) * 60
}

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| format!("密码哈希失败: {e}"))
}

fn verify_password(password: &str, hash: &str) -> bool {
    PasswordHash::new(hash)
        .map(|parsed| Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
        .unwrap_or(false)
}

// ---------------------------------------------------------------------------
// 持久化(JSON 文件,写时保存)
// ---------------------------------------------------------------------------

fn data_file(state: &AppState, name: &str) -> PathBuf {
    state.data_dir.join(format!("{name}.json"))
}

fn load_persisted(data_dir: &PathBuf) -> PersistedState {
    let file = data_dir.join("state.json");
    match fs::read_to_string(&file) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_else(|err| {
            eprintln!("[auth] 解析 {file:?} 失败({err}),使用空状态启动");
            PersistedState::default()
        }),
        Err(_) => PersistedState::default(),
    }
}

fn persist(state: &AppState) {
    if let Err(err) = fs::create_dir_all(&state.data_dir) {
        eprintln!("[auth] 无法创建数据目录 {}: {err}", state.data_dir.display());
        return;
    }
    let file = data_file(state, "state");
    let raw = serde_json::to_string_pretty(&*state.data.lock().unwrap());
    match raw {
        Ok(json) => {
            // 原子替换,避免写一半损坏状态文件。
            let tmp = file.with_extension("json.tmp");
            if fs::write(&tmp, json).and_then(|_| fs::rename(&tmp, &file)).is_err() {
                eprintln!("[auth] 写入状态文件 {file:?} 失败");
            }
        }
        Err(err) => eprintln!("[auth] 序列化状态失败: {err}"),
    }
}

/// 用环境变量种子账号(仅当存储中没有任何账号时执行)。
fn seed_default_users(state: &AppState) {
    if !state.data.lock().unwrap().users.is_empty() {
        return;
    }
    let mut seeded: Vec<(String, String, User)> = vec![
        (
            "admin@example.com".into(),
            std::env::var("AUTH_ADMIN_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()),
            User { user_id: "admin-1".into(), identifier: "admin@example.com".into(), name: "学校管理员".into(), role: "school_admin".into() },
        ),
        (
            "teacher@example.com".into(),
            std::env::var("AUTH_TEACHER_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()),
            User { user_id: "teacher-1".into(), identifier: "teacher@example.com".into(), name: "教师".into(), role: "teacher".into() },
        ),
        (
            "student@example.com".into(),
            std::env::var("AUTH_STUDENT_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()),
            User { user_id: "student-1".into(), identifier: "student@example.com".into(), name: "学生".into(), role: "student".into() },
        ),
    ];
    // 默认启用种子账号;仅当显式设置 PDS_SEED_DEFAULT_USERS=false 时禁用。
    let seed_enabled = match std::env::var("PDS_SEED_DEFAULT_USERS") {
        Ok(value) => value.to_lowercase() == "true" || value == "1",
        Err(_) => true,
    };
    if !seed_enabled {
        return;
    }
    let mut accounts = state.data.lock().unwrap();
    for (identifier, password, user) in seeded.drain(..) {
        if accounts.users.contains_key(&identifier) {
            continue;
        }
        match hash_password(&password) {
            Ok(hash) => {
                accounts.users.insert(identifier, Account { user, password_hash: hash, verified: true });
            }
            Err(err) => eprintln!("[auth] 种子账号哈希失败: {err}"),
        }
    }
}

// ---------------------------------------------------------------------------
// 会话
// ---------------------------------------------------------------------------

fn session_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|item| item.trim().strip_prefix("pds_session=").map(str::to_owned))
}

/// 读取会话;过期会话会被惰性删除并返回 None。
fn session(headers: &HeaderMap, state: &AppState) -> Option<User> {
    let token = session_token(headers)?;
    let mut data = state.data.lock().ok()?;
    match data.sessions.get(&token) {
        Some(item) if item.expires_at >= now() => Some(item.user.clone()),
        _ => {
            data.sessions.remove(&token);
            None
        }
    }
}

fn persist_session(state: &AppState, token: String, user: User) {
    let ttl = session_ttl_seconds();
    let session_item = Session { user: user.clone(), created_at: now(), expires_at: now() + ttl };
    state.data.lock().unwrap().sessions.insert(token, session_item);
    persist(state);
}

// ---------------------------------------------------------------------------
// 路由处理
// ---------------------------------------------------------------------------

async fn get_session(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    match session(&headers, &state) {
        Some(user) => (StatusCode::OK, Json(serde_json::json!({ "user": user }))),
        None => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "message": "未登录" }))),
    }
}

async fn login(State(state): State<AppState>, Json(input): Json<LoginRequest>) -> impl IntoResponse {
    let identifier = input.identifier.trim().to_lowercase();

    // 登录失败锁定保护
    {
        let mut guards = state.guards.lock().unwrap();
        let guard = guards.entry(identifier.clone()).or_default();
        if guard.locked_until > now() {
            let remaining = guard.locked_until - now();
            return (
                StatusCode::TOO_MANY_REQUESTS,
                HeaderMap::new(),
                Json(serde_json::json!({ "message": format!("登录失败次数过多,请 {remaining} 秒后重试") })),
            );
        }
    }

    let account = state.data.lock().unwrap().users.get(&identifier).cloned();
    let ok = match &account {
        Some(item) => item.verified && verify_password(&input.password, &item.password_hash),
        None => false,
    };

    if !ok {
        let mut guards = state.guards.lock().unwrap();
        let guard = guards.entry(identifier.clone()).or_default();
        guard.failed += 1;
        if guard.failed >= login_max_attempts() {
            guard.locked_until = now() + login_lock_seconds();
            guard.failed = 0;
            eprintln!("[auth] 账号 {identifier} 登录失败次数过多,已锁定至锁定窗口结束");
        }
        return (
            StatusCode::UNAUTHORIZED,
            HeaderMap::new(),
            Json(serde_json::json!({ "message": "账号或密码不正确" })),
        );
    }

    state.guards.lock().unwrap().remove(&identifier);
    let user = account.unwrap().user;
    let token = Uuid::new_v4().to_string();
    persist_session(&state, token.clone(), user.clone());

    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        format!("pds_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}", session_ttl_seconds())
            .parse()
            .unwrap(),
    );
    (StatusCode::OK, headers, Json(serde_json::json!({ "user": user })))
}

async fn logout(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Some(token) = session_token(&headers) {
        let removed = state.data.lock().unwrap().sessions.remove(&token).is_some();
        if removed {
            persist(&state);
        }
    }
    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        "pds_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0".parse().unwrap(),
    );
    (StatusCode::NO_CONTENT, headers)
}

async fn send_code(State(state): State<AppState>, Json(input): Json<SendCodeRequest>) -> impl IntoResponse {
    if !email_verification_enabled() {
        return (StatusCode::NOT_IMPLEMENTED, Json(serde_json::json!({ "enabled": false, "message": "邮箱验证码服务未启用" })));
    }
    let email = input.email.trim().to_lowercase();
    if !email.contains('@') {
        return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({ "message": "邮箱格式不正确" })));
    }
    let code = format!("{:06}", (now() % 900000) + 100000);
    let code_hash = match hash_password(&code) {
        Ok(hash) => hash,
        Err(err) => {
            eprintln!("[auth] 验证码哈希失败: {err}");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "message": "验证码生成失败" })));
        }
    };
    state.data.lock().unwrap().codes.insert(email.clone(), Verification { code_hash, expires_at: now() + 600 });
    persist(&state);
    // 开发传输:生产环境应通过 SMTP/短信适配器发送,绝不在响应中返回验证码。
    // 如需在开发环境继续查看验证码,可显式设置 PDS_DEV_RETURN_CODE=true。
    let dev_return = env_bool("PDS_DEV_RETURN_CODE");
    let mut body = serde_json::json!({ "message": "验证码已发送", "expiresIn": 600, "enabled": true });
    if dev_return {
        body["developmentCode"] = serde_json::json!(code);
    }
    (StatusCode::OK, Json(body))
}

async fn register(State(state): State<AppState>, Json(input): Json<RegisterRequest>) -> impl IntoResponse {
    let email = input.email.trim().to_lowercase();
    if email_verification_enabled() {
        let code_ok = {
            let mut data = state.data.lock().unwrap();
            let entry = data.codes.remove(&email);
            match entry {
                Some(item) if item.expires_at >= now() => {
                    verify_password(&input.verification_code.clone().unwrap_or_default(), &item.code_hash)
                }
                _ => false,
            }
        };
        if !code_ok {
            return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "message": "验证码无效或已过期" })));
        }
    }
    if input.password.len() < 8 {
        return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({ "message": "密码至少 8 位" })));
    }
    let hash = match hash_password(&input.password) {
        Ok(hash) => hash,
        Err(err) => {
            eprintln!("[auth] 注册密码哈希失败: {err}");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "message": "注册失败,请稍后重试" })));
        }
    };
    let user = {
        let mut accounts = state.data.lock().unwrap();
        if accounts.users.contains_key(&email) {
            return (StatusCode::CONFLICT, Json(serde_json::json!({ "message": "邮箱已注册" })));
        }
        let user = User { user_id: Uuid::new_v4().to_string(), identifier: email.clone(), name: input.name.trim().to_string(), role: "student".into() };
        accounts.users.insert(email, Account { user: user.clone(), password_hash: hash, verified: true });
        user
    };
    persist(&state);
    (StatusCode::CREATED, Json(serde_json::json!({ "user": user })))
}

fn admin(headers: &HeaderMap, state: &AppState) -> bool {
    session(headers, state).map(|user| user.role == "school_admin").unwrap_or(false)
}

async fn create_cdkey(State(state): State<AppState>, headers: HeaderMap, Json(input): Json<CdKeyCreateRequest>) -> impl IntoResponse {
    if !admin(&headers, &state) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "message": "需要管理员权限" })));
    }
    let code = format!("PDS-{}-{}", &Uuid::new_v4().to_string()[..8].to_uppercase(), &Uuid::new_v4().to_string()[..4].to_uppercase());
    let item = CdKey {
        code: code.clone(),
        role: input.role.unwrap_or_else(|| "student".into()),
        expires_at: input.expires_at,
        max_uses: input.max_uses.unwrap_or(1).max(1),
        used_count: 0,
        active: true,
    };
    state.data.lock().unwrap().cdkeys.insert(code.clone(), item.clone());
    persist(&state);
    (StatusCode::CREATED, Json(serde_json::to_value(item).unwrap()))
}

async fn list_cdkeys(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if !admin(&headers, &state) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "message": "需要管理员权限" })));
    }
    let items: Vec<CdKey> = state.data.lock().unwrap().cdkeys.values().cloned().collect();
    (StatusCode::OK, Json(serde_json::json!({ "items": items, "total": items.len() })))
}

async fn revoke_cdkey(State(state): State<AppState>, headers: HeaderMap, Path(code): Path<String>) -> impl IntoResponse {
    if !admin(&headers, &state) {
        return StatusCode::FORBIDDEN;
    }
    let changed = {
        let mut data = state.data.lock().unwrap();
        match data.cdkeys.get_mut(&code) {
            Some(item) => {
                item.active = false;
                true
            }
            None => false,
        }
    };
    if changed {
        persist(&state);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

async fn redeem_cdkey(State(state): State<AppState>, headers: HeaderMap, Path(code): Path<String>) -> impl IntoResponse {
    let Some(user) = session(&headers, &state) else {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "message": "请先登录" })));
    };
    let item = {
        let mut keys = state.data.lock().unwrap();
        let Some(item) = keys.cdkeys.get_mut(&code) else {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "message": "CDKey 不存在" })));
        };
        if !item.active || item.expires_at.map(|v| v < now()).unwrap_or(false) || item.used_count >= item.max_uses {
            return (StatusCode::GONE, Json(serde_json::json!({ "message": "CDKey 已失效或已用尽" })));
        }
        item.used_count += 1;
        item.clone()
    };
    persist(&state);
    (StatusCode::OK, Json(serde_json::json!({ "userId": user.user_id, "role": item.role, "code": item.code, "remainingUses": item.max_uses - item.used_count })))
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok" })))
}

async fn ready() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ready", "checks": { "session_store": "persistent_json", "password_hashing": "argon2id" } })))
}

async fn version() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "service": "python-data-studio-auth", "apiVersion": "1.0", "version": env!("CARGO_PKG_VERSION") })))
}

async fn auth_config() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "emailVerificationEnabled": email_verification_enabled(), "sessionStore": "persistent_json", "passwordHashing": "argon2id" })))
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() {
    let data_dir = PathBuf::from(
        std::env::var("PDS_DATA_DIR").unwrap_or_else(|_| "server-data".to_string()),
    );
    let persisted = load_persisted(&data_dir);
    let state = AppState {
        data: Arc::new(Mutex::new(persisted)),
        data_dir: data_dir.clone(),
        guards: Arc::new(Mutex::new(HashMap::new())),
    };
    seed_default_users(&state);
    persist(&state);

    let cors = CorsLayer::new()
        .allow_origin(header::HeaderValue::from_static("http://127.0.0.1:5173"))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
        .allow_credentials(true);

    let app = Router::new()
        .route("/api/auth/v1/session", get(get_session))
        .route("/api/auth/v1/config", get(auth_config))
        .route("/api/auth/v1/login", post(login))
        .route("/api/auth/v1/logout", post(logout))
        .route("/api/auth/v1/email/send-code", post(send_code))
        .route("/api/auth/v1/register", post(register))
        .route("/api/admin/v1/cdkeys", get(list_cdkeys).post(create_cdkey))
        .route("/api/admin/v1/cdkeys/:code/revoke", post(revoke_cdkey))
        .route("/api/cdkeys/v1/:code/redeem", post(redeem_cdkey))
        .route("/api/system/v1/health", get(health))
        .route("/api/system/v1/ready", get(ready))
        .route("/api/system/v1/version", get(version))
        .with_state(state)
        .layer(cors);

    let port = env_u64("PDS_PORT", 8787);
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{port}"))
        .await
        .unwrap_or_else(|err| panic!("无法绑定 127.0.0.1:{port}: {err}"));
    println!("Rust auth server listening on http://127.0.0.1:{port} (data dir: {})", data_dir.display());
    axum::serve(listener, app).await.unwrap();
}
