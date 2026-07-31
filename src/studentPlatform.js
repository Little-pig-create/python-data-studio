const DEFAULT_API_BASE_URL = "/api/student/v1";

export const studentPlatformConfig = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_STUDENT_API_BASE_URL || DEFAULT_API_BASE_URL,
  apiEnabled: import.meta.env.VITE_STUDENT_API_ENABLED === "true",
  contractVersion: "1.0",
});

export class StudentPlatformError extends Error {
  constructor(message, { status = 0, code = "STUDENT_PLATFORM_ERROR", details = null } = {}) {
    super(message);
    this.name = "StudentPlatformError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const normalizeAssignment = (assignment = {}) => ({
  id: String(assignment.id || ""),
  title: assignment.title || "未命名实训",
  description: assignment.description || "",
  status: assignment.status || "not_started",
  notebookId: assignment.notebookId || null,
  datasetIds: Array.isArray(assignment.datasetIds) ? assignment.datasetIds : [],
  dueAt: assignment.dueAt || null,
  maxAttempts: Number.isFinite(assignment.maxAttempts) ? assignment.maxAttempts : null,
  attemptCount: Number.isFinite(assignment.attemptCount) ? assignment.attemptCount : 0,
  progress: Number.isFinite(assignment.progress) ? Math.max(0, Math.min(100, assignment.progress)) : 0,
});

/**
 * 学生端 API 适配器。
 * 当前仓库只依赖学生可访问的接口。批量注册、班级维护、密码重置等
 * 管理能力必须由独立的学校管理服务提供，不得加入此客户端。
 */
export function createStudentPlatformClient({
  baseUrl = studentPlatformConfig.apiBaseUrl,
  getAccessToken = () => null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const request = async (path, options = {}) => {
    if (!fetchImpl) throw new StudentPlatformError("当前环境不支持网络请求");

    const token = await getAccessToken();
    const response = await fetchImpl(baseUrl + path, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers,
      },
    });

    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new StudentPlatformError(payload?.message || "学生平台服务请求失败", {
        status: response.status,
        code: payload?.code || "STUDENT_API_REQUEST_FAILED",
        details: payload?.details || null,
      });
    }
    return payload;
  };

  return {
    getMyProfile: () => request("/me"),
    listMyAssignments: async ({ status, page = 1, pageSize = 20 } = {}) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status) params.set("status", status);
      const payload = await request("/assignments?" + params);
      return {
        items: (payload?.items || []).map(normalizeAssignment),
        total: Number(payload?.total || 0),
        page: Number(payload?.page || page),
        pageSize: Number(payload?.pageSize || pageSize),
      };
    },
    getAssignment: async (assignmentId) => normalizeAssignment(
      await request("/assignments/" + encodeURIComponent(assignmentId)),
    ),
    startAssignment: (assignmentId) => request(
      "/assignments/" + encodeURIComponent(assignmentId) + "/attempts",
      { method: "POST", body: JSON.stringify({}) },
    ),
    submitAssignment: (assignmentId, submission) => request(
      "/assignments/" + encodeURIComponent(assignmentId) + "/submissions",
      { method: "POST", body: JSON.stringify(submission) },
    ),
    syncLearningProgress: (progress) => request(
      "/learning-progress",
      { method: "PUT", body: JSON.stringify(progress) },
    ),
  };
}

export const studentApiContract = Object.freeze({
  owner: "学生学习与实训端",
  authentication: "默认使用 Secure、HttpOnly、SameSite Cookie 会话；跨域部署可选短期 Bearer token",
  endpoints: [
    "GET /me",
    "GET /assignments",
    "GET /assignments/:assignmentId",
    "POST /assignments/:assignmentId/attempts",
    "POST /assignments/:assignmentId/submissions",
    "PUT /learning-progress",
  ],
  excludedCapabilities: [
    "批量注册学生账号",
    "查看或导出学生密码",
    "班级与学籍信息维护",
    "教师和管理员权限配置",
  ],
});
