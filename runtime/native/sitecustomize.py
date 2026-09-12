"""让课程里的 "/datasets/xxx.csv" 在内核中可读。

背景
----
课程代码统一写作 `pd.read_csv("/datasets/titanic.csv")`（67 个章节如此）。
这是 **Jupyter Server 的 contents 路径**：浏览器里通过 /files 或
/api/contents 访问时，服务端会把它映射到 root_dir 下。但 Python 内核里
它只是一个普通的绝对路径，在 Windows 上会解析成 <当前盘符>:\\datasets\\…，
因此直接运行会 FileNotFoundError。

Rust 侧启动 Jupyter 时已经通过环境变量 `PDS_DATASETS_DIR` 告知数据集在磁盘
上的真实位置，但此前没有任何 Python 代码读取它——于是课程读数据的单元格
在干净机器上必然失败（开发机上之所以没暴露，只是因为恰好存在 D:\\datasets）。

本模块在解释器启动时（site 初始化阶段自动导入 sitecustomize）把
`PDS_DATASETS_DIR` 暴露成 "/datasets/…" 可解析的路径。做法是注册一个
**路径钩子**：当有代码尝试打开以 "/datasets/" 开头的路径时，重定向到真实目录。
这样既不用改 67 个章节的代码，也不会污染真实的文件系统根目录。
"""

import builtins
import io
import os
import sys

_REAL_DIR = os.environ.get("PDS_DATASETS_DIR")

# 只有配置了真实数据集目录、且目录确实存在时才启用。
if _REAL_DIR and os.path.isdir(_REAL_DIR):
    _PREFIX = "/datasets/"
    _REAL_DIR = os.path.abspath(_REAL_DIR)

    def _resolve(path):
        """把 /datasets/x 映射到 <真实目录>/x；其它路径原样返回。"""
        if isinstance(path, bytes):
            return path
        if not isinstance(path, str):
            return path
        # 统一分隔符后再判断，兼容 Windows 上的 "/datasets" 与 "\\datasets"。
        normalized = path.replace("\\", "/")
        if normalized.startswith(_PREFIX):
            relative = normalized[len(_PREFIX):]
            if relative:
                return os.path.join(_REAL_DIR, *relative.split("/"))
        return path

    _real_exists = os.path.exists

    def _patched_exists(path, *args, **kwargs):
        return _real_exists(_resolve(path), *args, **kwargs)

    _real_isdir = os.path.isdir

    def _patched_isdir(path, *args, **kwargs):
        return _real_isdir(_resolve(path), *args, **kwargs)

    os.path.exists = _patched_exists
    os.path.isdir = _patched_isdir

    _real_open = builtins.open

    def _patched_open(file, *args, **kwargs):
        if isinstance(file, (str, bytes)) or hasattr(file, "__fspath__"):
            try:
                file = _resolve(os.fspath(file) if hasattr(file, "__fspath__") else file)
            except TypeError:
                pass
        return _real_open(file, *args, **kwargs)

    builtins.open = _patched_open

    # pandas 底层走 io.open / open，上面的补丁已覆盖 builtins.open；
    # 但 C 扩展（如 numpy/pandas 的 parsers）可能直接调用 io.open，一并处理。
    _real_io_open = io.open

    def _patched_io_open(file, *args, **kwargs):
        if isinstance(file, (str, bytes)):
            file = _resolve(file)
        return _real_io_open(file, *args, **kwargs)

    io.open = _patched_io_open

    # 便于课程代码查看当前数据集目录。
    os.environ.setdefault("PDS_DATASETS_RESOLVED", _REAL_DIR)
