# JupyterLite Runtime

此目录存放 JupyterLite 的构建配置。生成站点位于 public/runtime/，不提交到源码仓库。

先安装固定版本的运行时依赖，再使用根目录的 .venv 执行：

.\.venv\Scripts\python.exe -m pip install -r runtime\requirements.txt
.\.venv\Scripts\jupyter.exe lite build --config runtime/jupyter_lite_config.json --output-dir public/runtime --contents notebooks --force

课程外壳通过 /runtime/lab/index.html 打开运行时。`build:runtime`（scripts/build-runtime.ps1）会先把 `public/course/` 同步进 `notebooks/course/`，再与 `notebooks/extras/` 一起按 course/ 和 extras/ 保留目录层级打包。
