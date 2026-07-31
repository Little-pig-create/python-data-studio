use axum::{extract::{Path, State}, http::{header, HeaderMap, Method, StatusCode}, response::IntoResponse, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::{Arc, Mutex}, time::{SystemTime, UNIX_EPOCH}};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState { users: Arc<Mutex<HashMap<String, Account>>>, sessions: Arc<Mutex<HashMap<String, User>>>, codes: Arc<Mutex<HashMap<String, Verification>>>, cdkeys: Arc<Mutex<HashMap<String, CdKey>>> }

#[derive(Clone, Serialize, Deserialize)]
struct User { user_id: String, identifier: String, name: String, role: String }

#[derive(Clone)] struct Account { user: User, password: String, verified: bool }
#[derive(Clone)] struct Verification { code: String, expires_at: u64 }
#[derive(Clone, Serialize)] struct CdKey { code: String, role: String, expires_at: Option<u64>, max_uses: u32, used_count: u32, active: bool }

#[derive(Deserialize)] struct LoginRequest { identifier: String, password: String }
#[derive(Deserialize)] struct SendCodeRequest { email: String }
#[derive(Deserialize)] struct RegisterRequest { email: String, password: String, name: String, verification_code: Option<String> }
#[derive(Deserialize)] struct CdKeyCreateRequest { role: Option<String>, expires_at: Option<u64>, max_uses: Option<u32> }

fn users() -> Vec<(String, String, User)> {
    vec![
        ("admin@example.com".into(), std::env::var("AUTH_ADMIN_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()), User { user_id: "admin-1".into(), identifier: "admin@example.com".into(), name: "学校管理员".into(), role: "school_admin".into() }),
        ("teacher@example.com".into(), std::env::var("AUTH_TEACHER_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()), User { user_id: "teacher-1".into(), identifier: "teacher@example.com".into(), name: "教师".into(), role: "teacher".into() }),
        ("student@example.com".into(), std::env::var("AUTH_STUDENT_PASSWORD").unwrap_or_else(|_| "ChangeMe123!".into()), User { user_id: "student-1".into(), identifier: "student@example.com".into(), name: "学生".into(), role: "student".into() }),
    ]
}

fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() }
fn email_verification_enabled() -> bool { std::env::var("AUTH_EMAIL_VERIFICATION_ENABLED").map(|value| value.to_lowercase() == "true" || value == "1").unwrap_or(false) }
fn initial_users() -> HashMap<String, Account> { users().into_iter().map(|(id, password, user)| (id, Account { user, password, verified: true })).collect() }

fn session(headers: &HeaderMap, state: &AppState) -> Option<User> {
    let token = headers.get(header::COOKIE)?.to_str().ok()?.split(';').find_map(|item| item.trim().strip_prefix("pds_session=").map(str::to_owned))?;
    state.sessions.lock().ok()?.get(&token).cloned()
}

async fn get_session(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    match session(&headers, &state) { Some(user) => (StatusCode::OK, Json(serde_json::json!({"user": user}))), None => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"message":"未登录"}))) }
}

async fn login(State(state): State<AppState>, Json(input): Json<LoginRequest>) -> impl IntoResponse {
    let account = state.users.lock().unwrap().get(&input.identifier.trim().to_lowercase()).cloned();
    let Some(account) = account.filter(|item| item.password == input.password && item.verified) else { return (StatusCode::UNAUTHORIZED, HeaderMap::new(), Json(serde_json::json!({"message":"账号或密码不正确"}))); };
    let user = account.user;
    let token = Uuid::new_v4().to_string();
    state.sessions.lock().unwrap().insert(token.clone(), user.clone());
    let mut headers = HeaderMap::new();
    headers.insert(header::SET_COOKIE, format!("pds_session={token}; Path=/; HttpOnly; SameSite=Lax").parse().unwrap());
    (StatusCode::OK, headers, Json(serde_json::json!({"user": user})))
}

async fn send_code(State(state): State<AppState>, Json(input): Json<SendCodeRequest>) -> impl IntoResponse {
    if !email_verification_enabled() { return (StatusCode::NOT_IMPLEMENTED, Json(serde_json::json!({"enabled":false,"message":"邮箱验证码服务未启用"}))); }
    let email = input.email.trim().to_lowercase();
    if !email.contains('@') { return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"message":"邮箱格式不正确"}))); }
    let code = format!("{:06}", (now() % 900000) + 100000);
    state.codes.lock().unwrap().insert(email.clone(), Verification { code: code.clone(), expires_at: now() + 600 });
    // Development transport: production should send through an SMTP/provider adapter and never return the code.
    (StatusCode::OK, Json(serde_json::json!({"message":"验证码已发送","expiresIn":600,"developmentCode":code})))
}

async fn register(State(state): State<AppState>, Json(input): Json<RegisterRequest>) -> impl IntoResponse {
    let email = input.email.trim().to_lowercase();
    if email_verification_enabled() {
        let valid = state.codes.lock().unwrap().remove(&email).filter(|item| item.code == input.verification_code.clone().unwrap_or_default() && item.expires_at >= now()).is_some();
        if !valid { return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"message":"验证码无效或已过期"}))); }
    }
    if input.password.len() < 8 { return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"message":"密码至少 8 位"}))); }
    let mut accounts = state.users.lock().unwrap();
    if accounts.contains_key(&email) { return (StatusCode::CONFLICT, Json(serde_json::json!({"message":"邮箱已注册"}))); }
    let user = User { user_id: Uuid::new_v4().to_string(), identifier: email.clone(), name: input.name.trim().to_string(), role: "student".into() };
    accounts.insert(email, Account { user: user.clone(), password: input.password, verified: true });
    (StatusCode::CREATED, Json(serde_json::json!({"user":user})))
}

fn admin(headers: &HeaderMap, state: &AppState) -> bool { session(headers, state).map(|user| user.role == "school_admin").unwrap_or(false) }
async fn create_cdkey(State(state): State<AppState>, headers: HeaderMap, Json(input): Json<CdKeyCreateRequest>) -> impl IntoResponse {
    if !admin(&headers, &state) { return (StatusCode::FORBIDDEN, Json(serde_json::json!({"message":"需要管理员权限"}))); }
    let code = format!("PDS-{}-{}", &Uuid::new_v4().to_string()[..8].to_uppercase(), &Uuid::new_v4().to_string()[..4].to_uppercase());
    let item = CdKey { code: code.clone(), role: input.role.unwrap_or_else(|| "student".into()), expires_at: input.expires_at, max_uses: input.max_uses.unwrap_or(1).max(1), used_count: 0, active: true };
    state.cdkeys.lock().unwrap().insert(code.clone(), item.clone());
    (StatusCode::CREATED, Json(serde_json::to_value(item).unwrap()))
}
async fn list_cdkeys(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if !admin(&headers, &state) { return (StatusCode::FORBIDDEN, Json(serde_json::json!({"message":"需要管理员权限"}))); }
    let items: Vec<CdKey> = state.cdkeys.lock().unwrap().values().cloned().collect();
    (StatusCode::OK, Json(serde_json::json!({"items":items,"total":items.len()})))
}
async fn revoke_cdkey(State(state): State<AppState>, headers: HeaderMap, Path(code): Path<String>) -> impl IntoResponse {
    if !admin(&headers, &state) { return StatusCode::FORBIDDEN; }
    match state.cdkeys.lock().unwrap().get_mut(&code) { Some(item) => { item.active = false; StatusCode::NO_CONTENT }, None => StatusCode::NOT_FOUND }
}
async fn redeem_cdkey(State(state): State<AppState>, headers: HeaderMap, Path(code): Path<String>) -> impl IntoResponse {
    let Some(user) = session(&headers, &state) else { return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"message":"请先登录"}))); };
    let mut keys = state.cdkeys.lock().unwrap();
    let Some(item) = keys.get_mut(&code) else { return (StatusCode::NOT_FOUND, Json(serde_json::json!({"message":"CDKey 不存在"}))); };
    if !item.active || item.expires_at.map(|value| value < now()).unwrap_or(false) || item.used_count >= item.max_uses { return (StatusCode::GONE, Json(serde_json::json!({"message":"CDKey 已失效或已用尽"}))); }
    item.used_count += 1;
    (StatusCode::OK, Json(serde_json::json!({"userId":user.user_id,"role":item.role,"code":item.code,"remainingUses":item.max_uses-item.used_count})))
}

async fn logout(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Some(token) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok()).and_then(|v| v.split(';').find_map(|item| item.trim().strip_prefix("pds_session=").map(str::to_owned))) { state.sessions.lock().unwrap().remove(&token); }
    (StatusCode::NO_CONTENT, HeaderMap::new())
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok" })))
}

async fn ready() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ready", "checks": { "memory_session_store": "ok" } })))
}

async fn version() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "service": "python-data-studio-auth", "apiVersion": "1.0", "version": "0.1.0" })))
}

async fn auth_config() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "emailVerificationEnabled": email_verification_enabled() })))
}

#[tokio::main]
async fn main() {
    let state = AppState { users: Arc::new(Mutex::new(initial_users())), sessions: Arc::new(Mutex::new(HashMap::new())), codes: Arc::new(Mutex::new(HashMap::new())), cdkeys: Arc::new(Mutex::new(HashMap::new())) };
    let cors = CorsLayer::new().allow_origin(header::HeaderValue::from_static("http://127.0.0.1:5173")).allow_methods([Method::GET, Method::POST]).allow_headers([header::CONTENT_TYPE, header::ACCEPT]).allow_credentials(true);
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
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787").await.unwrap();
    println!("Rust auth server listening on http://127.0.0.1:8787");
    axum::serve(listener, app).await.unwrap();
}
