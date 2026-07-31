# JupyterLite Runtime

此目录存放 JupyterLite 的构建配置。生成站点位于 public/runtime/，不提交到源码仓库。

先安装固定版本的运行时依赖，再使用根目录的 .venv 执行：

.\.venv\Scripts\python.exe -m pip install -r runtime\requirements.txt
.\.venv\Scripts\jupyter.exe lite build --config runtime/jupyter_lite_config.json --output-dir public/runtime --contents notebooks --force

课程外壳通过 /runtime/lab/index.html 打开运行时。Notebook 原始文件仍位于 notebooks/，运行时按 course/ 和 extras/ 保留目录层级。
