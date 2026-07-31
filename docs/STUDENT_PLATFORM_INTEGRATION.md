# 学生平台接入边界

Python Data Studio 现在使用统一前端入口，但学生、教师和学校管理员仍通过不同业务服务与服务端权限边界隔离。完整角色矩阵和登录协议见 `docs/AUTHORIZATION_ARCHITECTURE.md`。

## 学生端职责

- 获取当前登录学生的最小资料；
- 获取分配给本人的实训任务；
- 创建任务尝试并进入隔离 Notebook；
- 提交 Notebook、关键结果和自动评测摘要；
- 同步课程进度与任务状态；
- 在服务未接入时继续使用本地课程和自主项目。

学生端不得调用批量建号、班级维护、密码重置或角色分配接口。管理页面虽然位于同一前端构建中，但路由和服务端 API 均要求 `school_admin` 角色。

## 已预留学生端接口

默认前缀：`/api/student/v1`

- `GET /me`
- `GET /assignments`
- `GET /assignments/:assignmentId`
- `POST /assignments/:assignmentId/attempts`
- `POST /assignments/:assignmentId/submissions`
- `PUT /learning-progress`

客户端适配器位于 `src/studentPlatform.js`，默认携带 Cookie 会话，也兼容由调用方提供短期 Bearer token。

## 安全要求

- 初始密码由管理服务生成或导入，服务端可靠哈希并要求首次登录修改；
- 刷新凭据优先放在 Secure、HttpOnly、SameSite Cookie 中；
- 服务端必须根据当前登录身份过滤任务和提交，不能信任前端传入的学号；
- Notebook 提交限制大小、文件类型和执行资源，并在隔离环境中评测；
- 同一浏览器的本地学习记录按用户 ID 隔离，服务端同步数据仍是最终权威。
