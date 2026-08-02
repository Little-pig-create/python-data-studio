# Python Data Studio API 文档

> **课程内容映射说明（2026-08-02）**：当前课程采用 117 个课程章节（108 个原有教学章节 + 1 个文件操作专题 + 8 个模块大作业章节）。本文中的 assignments/tasks/practice 接口是未来服务化接入的兼容契约；默认不代表当前前端已经启用章节作业或独立实训。若实现提交流程，应优先使用 `capstone`/模块大作业语义，并在接口版本或资源类型中明确区分。

版本：`1.0`  
更新日期：2026-07-30

本文档描述 Python Data Studio 的服务端接口边界。接口按身份和数据归属隔离，前端路由限制不能替代服务端鉴权。

## 1. 通用约定

- 默认 JSON 编码：`application/json; charset=utf-8`
- 默认会话：`Secure; HttpOnly; SameSite=Lax` Cookie
- 跨域请求必须携带 `credentials: include`
- 时间字段使用 ISO 8601 UTC，例如 `2026-07-30T12:00:00Z`
- 分页参数：`page` 从 1 开始，`pageSize` 默认 20，最大 100

统一错误格式：

```json
{
  "message": "无权访问该资源",
  "code": "FORBIDDEN",
  "details": null,
  "requestId": "req_01J..."
}
```

常见状态码：`200` 成功，`201` 创建成功，`204` 无响应体，`400` 参数错误，`401` 未登录，`403` 角色或数据范围不足，`404` 不存在，`409` 状态冲突，`422` 校验失败，`500` 服务端错误。

## 2. Rust 认证服务

当前开发服务由 `server/` 下的 Axum Rust 服务提供，地址为 `http://127.0.0.1:8787`，前缀 `/api/auth/v1`。

### `POST /login`

登录并创建 HttpOnly 会话。

请求：

```json
{ "identifier": "student@example.com", "password": "********" }
```

响应 `200`：

```json
{
  "user": {
    "user_id": "student-1",
    "identifier": "student@example.com",
    "name": "学生",
    "role": "student"
  }
}
```

### `GET /session`

读取当前会话。未登录返回 `401`。

### `POST /logout`

撤销当前会话，返回 `204`。

开发服务默认账号密码由 `AUTH_*_PASSWORD` 环境变量控制。当前会话存于内存，生产环境应改为数据库、密码哈希和持久化会话存储。

## 3. 学生服务 `/api/student/v1`

所有接口只返回当前登录学生的数据，服务端不得接受前端传入的任意学生 ID。

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/me` | 当前学生资料、班级和账号状态 |
| `GET` | `/assignments?status=&type=capstone&page=&pageSize=` | 我的模块大作业或教师扩展任务列表（预留） |
| `GET` | `/assignments/{assignmentId}` | 大作业详情、允许数据集和截止时间（预留） |
| `POST` | `/assignments/{assignmentId}/attempts` | 开始一次模块大作业尝试（预留） |
| `POST` | `/assignments/{assignmentId}/submissions` | 提交模块大作业 Notebook、答案和运行结果（预留） |
| `PUT` | `/learning-progress` | 同步章节学习进度 |

提交示例：

```json
{
  "attemptId": "attempt_123",
  "notebookId": "chapter-106",
  "cells": [],
  "answers": {},
  "clientUpdatedAt": "2026-07-30T12:00:00Z"
}
```

## 4. 教师服务 `/api/teacher/v1`

仅允许教师访问本人有效任课关系覆盖的班级和课程。

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/tasks` | 任务列表，支持草稿、发布、截止、归档筛选 |
| `POST` | `/tasks` | 创建模块大作业或教师扩展任务（预留） |
| `PATCH` | `/tasks/{taskId}` | 修改任务内容或状态 |
| `GET` | `/submissions?taskId=&classId=&status=` | 学生提交评阅队列 |
| `GET` | `/submissions/{submissionId}` | 提交详情和评测结果 |
| `POST` | `/submissions/{submissionId}/review` | 教师评分、评语和退回 |
| `GET` | `/classes` | 本人任课班级 |
| `GET` | `/analytics/chapters?classId=` | 班级章节完成率和练习正确率 |
| `GET` | `/announcements` | 教师可管理的公告 |
| `POST` | `/announcements` | 创建公告草稿 |
| `PATCH` | `/announcements/{announcementId}` | 编辑、发布、撤回或置顶公告 |

## 5. 学校管理服务 `/api/admin/v1`

仅允许学校管理员访问；所有写操作必须记录审计事件。

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/students/import` | CSV 批量创建学生账号 |
| `GET` | `/students?query=&classId=&status=` | 查询学生账号状态，不返回密码 |
| `POST` | `/students/{studentId}/freeze` | 冻结账号 |
| `POST` | `/students/{studentId}/reset-password` | 发起密码重置 |
| `GET` | `/classes` | 班级列表 |
| `POST` | `/classes` | 创建班级 |
| `PATCH` | `/classes/{classId}` | 修改班级状态或名称 |
| `GET` | `/role-assignments` | 角色分配列表 |
| `POST` | `/role-assignments` | 分配或变更角色 |
| `GET` | `/audit-events?page=&pageSize=` | 审计记录 |

批量导入请求示例：

```json
{
  "rows": [
    { "studentNo": "20260001", "name": "张三", "classCode": "DS2401", "initialPassword": "********" }
  ],
  "reason": "2026 秋季班建号"
}
```

初始密码只能在请求生命周期内使用并由服务端哈希，任何查询、导出和日志都不得返回原密码。

## 6. 公共内容服务

### `GET /api/announcements?status=published`

返回当前用户可见的已发布公告，支持 `page`、`pageSize` 和 `pinnedFirst=true`。

### `GET /api/content/v1/course-catalog`

返回课程目录、章节版本和 Notebook 资源元数据。学生只能读取已发布内容。

### `GET /api/content/v1/notebooks/{notebookId}`

读取已发布 Notebook。教师维护中心上传、校验和发布 Notebook 的接口应额外校验教师课程范围。

## 7. 在线更新服务

### `GET /api/update/v1/latest?platform=&arch=`

返回桌面端最新版本、下载地址、SHA-256 和签名信息：

```json
{
  "version": "0.2.0",
  "platform": "windows",
  "arch": "x86_64",
  "url": "https://download.example.com/app.msi",
  "sha256": "...",
  "signature": "...",
  "releaseNotes": "修复..."
}
```

客户端必须先验证签名和哈希，再提示用户安装；服务端保留发布和回滚记录。

## 8. 安全要求

1. 角色、学生 ID、班级范围全部由服务端会话和数据库关系决定。
2. Cookie 会话启用 `Secure`、`HttpOnly`、`SameSite`，跨站写请求增加 CSRF 防护。
3. 登录、批量建号、密码重置、评阅、公告发布和角色变更写入审计日志。
4. Notebook 和数据集下载使用短期签名地址，禁止通过猜测路径越权读取。
5. 对登录、提交、导入和公告接口设置限流、请求体大小限制和幂等键。
6. 前端本地保存账号密码仅适合个人开发环境；学校部署应改用浏览器密码管理器或短期会话。

## 9. RESTful 预留接口

以下接口作为后续服务拆分和远程维护的稳定契约。接口遵循“资源名使用复数、动作通过 HTTP 方法表达、路径只表示资源层级”的规则；暂未实现的接口统一返回 `501 NOT_IMPLEMENTED`，不使用前端本地数据伪装成功。

### 课程与 Notebook 服务 `/api/content/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/courses` | 查询当前用户可见课程，支持 `page`、`pageSize`、`keyword` |
| `POST` | `/courses` | 教师创建课程草稿 |
| `GET` | `/courses/{courseId}` | 课程详情和发布状态 |
| `PATCH` | `/courses/{courseId}` | 修改课程元数据 |
| `GET` | `/courses/{courseId}/chapters` | 查询章节目录 |
| `POST` | `/courses/{courseId}/chapters` | 创建章节草稿 |
| `PATCH` | `/chapters/{chapterId}` | 修改章节标题、顺序和状态 |
| `DELETE` | `/chapters/{chapterId}` | 删除未发布章节 |
| `GET` | `/notebooks/{notebookId}` | 读取 Notebook 元数据和内容 |
| `POST` | `/notebooks` | 上传 Notebook 草稿 |
| `PUT` | `/notebooks/{notebookId}` | 保存 Notebook 内容 |
| `POST` | `/notebooks/{notebookId}/publish` | 发布 Notebook 版本 |
| `POST` | `/notebooks/{notebookId}/archive` | 归档 Notebook |
| `GET` | `/notebooks/{notebookId}/versions` | 查询版本历史 |
| `POST` | `/notebooks/{notebookId}/versions/{version}/rollback` | 回滚到指定版本 |

### 数据集服务 `/api/datasets/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/datasets` | 查询公开数据集，支持主题、格式和分页筛选 |
| `POST` | `/datasets` | 教师上传数据集元数据和文件 |
| `GET` | `/datasets/{datasetId}` | 查看数据集说明、来源和许可 |
| `PATCH` | `/datasets/{datasetId}` | 修改数据集说明或可见范围 |
| `DELETE` | `/datasets/{datasetId}` | 删除未被已发布任务引用的数据集 |
| `GET` | `/datasets/{datasetId}/download` | 获取短期签名下载地址 |
| `POST` | `/datasets/{datasetId}/validate` | 校验文件格式、字段和大小 |

学生端只能读取教师已授权的数据集元数据和下载地址，不提供上传、删除和管理接口。

### 学习记录与练习服务 `/api/learning/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/progress` | 当前学生的课程进度，支持课程筛选和分页 |
| `PUT` | `/progress/chapters/{chapterId}` | 幂等更新章节进度 |
| `DELETE` | `/progress/chapters/{chapterId}` | 清除单章学习记录 |
| `GET` | `/recent-items` | 最近学习记录，支持分页 |
| `GET` | `/notes` | 当前学生的学习笔记列表 |
| `PUT` | `/notes/{chapterId}` | 新建或覆盖章节笔记 |
| `DELETE` | `/notes/{chapterId}` | 删除章节笔记 |
| `GET` | `/practice-items` | 按模块、难度和状态查询课堂自检项（预留） |
| `POST` | `/practice-items/{itemId}/attempts` | 创建练习尝试 |
| `POST` | `/practice-attempts/{attemptId}/submissions` | 提交练习答案 |

进度更新示例：

```http
PUT /api/learning/v1/progress/chapters/chapter-106
Idempotency-Key: progress-chapter-106-20260730-001
```

```json
{
  "completedCells": ["cell-1", "cell-2"],
  "progress": 66,
  "lastCellId": "cell-2",
  "clientUpdatedAt": "2026-07-30T12:00:00Z"
}
```

### 公告与更新管理 `/api/management/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/announcements` | 按状态、置顶和发布时间查询公告 |
| `POST` | `/announcements` | 创建公告草稿 |
| `GET` | `/announcements/{announcementId}` | 查看公告详情 |
| `PATCH` | `/announcements/{announcementId}` | 修改公告内容、置顶或状态 |
| `DELETE` | `/announcements/{announcementId}` | 删除草稿公告 |
| `POST` | `/announcements/{announcementId}/publish` | 发布公告 |
| `POST` | `/announcements/{announcementId}/withdraw` | 撤回公告 |
| `GET` | `/releases` | 查询客户端版本发布记录 |
| `POST` | `/releases` | 创建待审核版本 |
| `POST` | `/releases/{releaseId}/publish` | 发布版本清单 |
| `POST` | `/releases/{releaseId}/rollback` | 回滚版本 |

### 系统接口 `/api/system/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/health` | 存活检查，不需要登录 |
| `GET` | `/ready` | 数据库、对象存储和队列就绪检查 |
| `GET` | `/version` | 返回 API 合约版本和服务版本 |

预留接口的实现顺序建议为：先完成 `/health`、`/ready`、`/courses`、`/chapters` 和 `/progress`，再接入 Notebook 版本管理、数据集服务、模块大作业评阅和公告发布。任何新接口必须同步更新本文档、权限矩阵和审计字段。

## 10. 邮箱注册与 CDKey

### 邮箱注册登录 `/api/auth/v1`

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| `POST` | `/email/send-code` | 公开 | 向邮箱发送注册验证码，10 分钟有效 |
| `POST` | `/register` | 公开 | 使用邮箱、验证码和密码注册学生账号 |
| `POST` | `/login` | 公开 | 邮箱和密码登录，成功后设置 HttpOnly Cookie |
| `GET` | `/session` | 登录用户 | 获取当前会话 |
| `POST` | `/logout` | 登录用户 | 注销会话 |

发送验证码：

```json
{ "email": "student@example.com" }
```

注册：

```json
{
  "email": "student@example.com",
  "password": "strong-password",
  "name": "张三",
  "verification_code": "123456"
}
```

验证码必须服务端生成、限流、单次使用并设置过期时间。当前 Rust 开发服务响应中包含 `developmentCode`，仅用于本地联调；生产环境必须接入 SMTP 或邮件服务商，删除该字段，并记录发送结果而不记录验证码原文。

### CDKey 兑换 `/api/cdkeys/v1`

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| `POST` | `/{code}/redeem` | 登录用户 | 兑换有效 CDKey |

CDKey 字段：

```json
{
  "code": "PDS-AB12CD34-9F01",
  "role": "student",
  "expires_at": 1785456000,
  "max_uses": 1,
  "used_count": 0,
  "active": true
}
```

兑换前必须同时检查：存在、启用、未过期、未超过最大使用次数。兑换操作应使用数据库事务和幂等键，避免并发请求重复消耗次数。CDKey 原文只在创建或导出时显示，列表接口应按需要脱敏。

### CDKey 管理 `/api/admin/v1`

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| `GET` | `/cdkeys` | 学校管理员 | 分页查询 CDKey 状态 |
| `POST` | `/cdkeys` | 学校管理员 | 创建 CDKey |
| `POST` | `/cdkeys/{code}/revoke` | 学校管理员 | 撤销 CDKey |

创建请求：

```json
{
  "role": "student",
  "expires_at": 1785456000,
  "max_uses": 30
}
```

管理员接口必须从服务端会话确认 `school_admin` 角色，并写入审计事件：创建者、用途、有效期、最大次数、撤销原因和请求 ID。生产环境应使用密码哈希、数据库唯一约束、审计表和密钥轮换；当前内存实现仅用于接口联调。
