# -*- coding: utf-8 -*-
"""模块级补强（C）：补齐 ML 模块「核心概念」的「背景引入」。

现状：ML 模块方法章节的核心概念不一致——多数章节（如 82/84/87/89/93-95/99/103/106）
只有 4 条要点、缺「背景引入」；而其余章节（如 80/83/85/86/88/90/91/96-98/100-102/104/107）
已有丰富背景引入。本脚本只为缺失「背景引入」的核心概念细胞补一段贴合的引入，
保留原有要点与「打个比方」，风格与同模块一致。

幂等：已含「背景引入」则跳过，避免重复。只改目标 markdown 细胞的 source。
写回后交由 normalize-notebook-architecture.py 统一稳定 id 与 content_fingerprint。
"""
import json, os, sys, shutil, re

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"D:\Research\Python数据工作台_2026-07-22"
COURSE = os.path.join(ROOT, "public", "course")
BACKUP = os.path.join(ROOT, ".backup-ml-coreedit")

# 文件号 -> 背景引入正文（放在 heading 之后、要点之前）
INTROS = {
    81: "预测一个连续的量——比如房价、月销售额——我们通常想找一条能“透过特征看结果”的直线。线性回归就是这条“最会讲道理的直线”：它让每个点离线的距离（残差）平方和最小，从而得到一个可解释、可检验的公式。但特征一多，直线容易“太听话”而记住噪声，正则化（Ridge 的 L2）正是为了压住过大的系数而存在。",
    82: "很多问题不是“预测多少钱”，而是“判断会不会”——比如这个客户会不会下单、这条消息是不是垃圾。逻辑回归给的不是 0/1 的硬判决，而是“属于正类的概率”。它把概率与几率的对数挂钩，再用一个默认阈值（通常是 0.5）把概率切回类别。看懂它，你才能理解为什么阈值和系数解释那么关键。",
    84: "面对一份有类别标签的数据，最直觉的做法是“按问题一步步问下去”——是不是会员？金额够不够？决策树正是把这样的判断规则画成一棵可解释的树。它无需给特征做缩放，天然适合带缺失和类别混杂的数据；但树太深就会把训练噪声也背下来，所以控制复杂度是它的核心功课。",
    87: "我们常想在两类点之间划一条“最宽的分界线”，让两类离得越远越稳。支持向量机（SVM）做的正是这件事：它找一条尽量宽的“安全护栏”来分开两类，而护栏放哪只由最贴边的那几个点（支持向量）说了算。理解 C 与 gamma，就知道它如何在“严格分类”和“容忍噪声”之间取舍。",
    89: "手上一批没有标签的数据，连“该分几组”都没有标准答案——这正是聚类的起点。K-Means 把点分成若干堆，每堆找一个“中心”当队长，谁离队长近就归谁。它简单、快速、可解释，适合“一团一团”的分布；但对初始位置敏感、对长条或弯月形分布束手无策。",
    92: "当正类极其稀少（比如只有 1% 的客户会购买）时，“准确率”几乎失去意义——哪怕模型把所有人都判成“不买”，准确率也有 99%。真正要决策的是：在漏掉正类和多误报之间怎么权衡。类别权重或重采样改变的是训练损失，而真正一刀切的，是那个决策阈值。",
    93: "单独一棵回归树对数据里的一点波动都可能“反应过度”，预测忽高忽低。随机森林回归让很多棵随机化的树各自预测再取平均，把单棵树的冲动摊平，往往更稳、更准。看懂它就是理解“集成的力量”，以及为什么抽样方式和叶节点分寸如此重要。",
    94: "加法模型是另一条与“多树投票”不同的路：我这一棵树学完，把没猜对的部分交给下一棵树去“接力补救”，一轮轮累加（加上一个缩小的更新），慢慢逼近更强的预测。学习率和迭代轮数就是这场“接力”的步幅与棒数，决定了走得稳还是走得快。",
    95: "当类别不止两类，我们要给每个样本一套“属于各类的概率分布”。Softmax 就是把一组得分拧成“加起来等于 1 的概率”的开关——某类占 70%、另一类又占 60%，那一定算错了。多分类还带来一个选择：对每个类别一视同仁（macro），还是按样本量分配权重（weighted）。",
    99: "“模型说七成把握”到底靠不靠谱？如果嘴上说 70%、实际只有 60% 命中，那就是“说大话”。概率校准就是纠正这类“水分”，让模型报告的概率与真实比例尽量一致。校准要用没当过裁判的独立数据或内部交叉验证，否则就是自欺欺人。",
    103: "交叉验证的常见做法是把数据随机切几折，但遇到时间、客户这类有次序的依赖，随机切会“偷看未来”。交叉验证策略的核心是：用哪种切法更接近真实使用场景。分类要保持类别比例、同一客户不能跨折、未来数据不能进入过去训练——这些才是它真正的难点。",
    106: "模型给出一个预测，我们常追问“它到底靠哪个特征”？置换重要性把某个特征“打乱”再看模型掉多少分，掉得多说明模型依赖它。但要分清：模型“依赖”一个特征，不等于它真就是导致结果的“原因”。解释工具描述的是模型，不是现实机制。",
}


def src(c):
    s = c.get("source", [])
    return "".join(s) if isinstance(s, list) else s


def find_core(cells):
    for i, c in enumerate(cells):
        if c.get("cell_type") == "markdown" and re.search(r"^##\s+\d+\.\d*\s*核心概念", src(c), re.M):
            return i, c
    return None, None


def apply(path, intro):
    with open(path, "r", encoding="utf-8") as fh:
        nb = json.load(fh)
    idx, cell = find_core(nb["cells"])
    if cell is None:
        print(f"[MISS] {os.path.basename(path)}: 未找到核心概念细胞")
        return
    cur = src(cell)
    if "**背景引入**" in cur:
        print(f"[SKIP] {os.path.basename(path)}: 已有背景引入")
        return
    lines = cur.splitlines(keepends=True)
    # 找到 heading 所在行（## NN.1 核心概念），在其后的空行处插入引入段
    out = []
    inserted = False
    for ln in lines:
        out.append(ln)
        if not inserted and re.match(r"^##\s+\d+\.\d*\s*核心概念", ln.rstrip("\n").strip()):
            out.append("\n")
            out.append(f"**背景引入**：{intro}\n")
            out.append("\n")
            inserted = True
    if not inserted:
        # 兜底：在 heading 之前插入
        out = [f"## {'xx.1 核心概念'}\n\n"]
    cell["source"] = out
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"[OK] {os.path.basename(path)}: 已补背景引入")


def main():
    os.makedirs(BACKUP, exist_ok=True)
    for n, intro in INTROS.items():
        p = os.path.join(COURSE, f"course-chapter-{n}.ipynb")
        shutil.copy2(p, os.path.join(BACKUP, f"course-chapter-{n}.ipynb"))
        apply(p, intro)


if __name__ == "__main__":
    main()
