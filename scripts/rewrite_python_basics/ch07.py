"""第7章 集合：去重与关系"""

TITLE = "集合：去重与关系"
EST_MINUTES = 40

CELLS = [
    ("md", """\
# 第7章 集合：去重与关系

两个只关心“有没有、有哪些”的场景：

- 这个月**出现过哪些**消费类别？（自动去重）
- 上月和本月都买过的品类（**共同**）、只在本月买的（**新出现**）。

这就是**集合（set）**：无序、元素唯一、天生支持交并差。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 创建集合，说出它与列表的两个区别（无序、去重）；
- 用 `set()` 给列表去重，并知道顺序会丢失；
- 用 `add`、`remove`、`discard` 增删元素；
- 用交集、并集、差集回答“共同/新增/流失”类业务问题。""", []),

    ("md", """\
## 7.1 集合基础：无序且唯一

**概念**：集合用花括号书写：`{1, 2, 3}`。两条铁律——
**元素自动去重**、**没有顺序**（不能 `s[0]` 取“第一个”）。
空集合必须写 `set()`，`{}` 是空字典。""", []),

    ("md", "### 例 1｜最小例子：去重与无序", []),

    ("code", """\
nums = {3, 1, 3, 2, 1}
print(nums)          # {1, 2, 3}：重复自动消失，顺序也不保证

# 反例：无序，不能按位置访问
# print(nums[0])      # TypeError: 'set' object is not subscriptable

# 反例 2：{} 是空字典
print(type({}).__name__)         # dict
print(type(set()).__name__)      # set：空集合这样创建""", ["example"]),

    ("md", "### 例 2｜业务例子：本月出现过哪些类别", []),

    ("code", """\
# 30 笔账里抽取的类别序列（大量重复）
categories = ["餐饮", "交通", "餐饮", "娱乐", "餐饮", "交通", "医疗"]

unique_categories = set(categories)
print(len(categories), "笔账 ->", len(unique_categories), "个类别")
print(unique_categories)""", ["example"]),

    ("md", """\
**输出解读**：`7 笔账 -> 4 个类别`。去重一行搞定——这是集合最高频的用法。
打印集合时顺序可能和插入顺序不同，别依赖它。

### 例 3｜常见错误：以为去重保序""", []),

    ("code", """\
steps = ["清洗", "聚合", "清洗", "出图", "聚合"]

# 反例：需要保持首次出现顺序时直接用 set
print(set(steps))    # 顺序不保证！

# 修复：去重且保序的小模板（用字典键唯一且有序的特性）
ordered_unique = list(dict.fromkeys(steps))
print(ordered_unique)    # ['清洗', '聚合', '出图']""", ["example"]),

    ("md", """\
**要点**：单纯“有哪些”→ `set()`；要“按出现顺序排好”→ `dict.fromkeys` 模板。""", []),

    ("md", """\
## 7.2 增删：add、remove、discard

**概念**：`add(x)` 加元素；`remove(x)` 删除**不存在会报错**；
`discard(x)` 删除**不存在也不吭声**——更安全的默认选择。""", []),

    ("md", "### 例 1｜最小例子 + 业务例子：维护排除清单", []),

    ("code", """\
# 不参与月度统计的一次性支出
excluded = {"转账", "还款"}

excluded.add("理财申购")      # 新增
excluded.discard("还款")      # 还款改了规则，移出清单
excluded.discard("不存在的项")  # discard 删不存在的不报错
print(excluded)

# remove 与 discard 的区别
excluded.remove("转账")
# excluded.remove("转账")     # 再删一次：KeyError
print(excluded)""", ["example"]),

    ("md", """\
**输出解读**：第一次 remove 成功，第二次同样的 remove 会 KeyError。
**默认用 discard，确定元素一定存在时才用 remove**——让报错有业务含义。""", []),

    ("md", """\
## 7.3 交并差：集合的核心价值

**概念**：三个关系运算——
交集 `a & b`（都出现）、并集 `a | b`（总共出现）、差集 `a - b`（在 a 不在 b）。
业务里的“留存/新增/流失”全靠这三个符号。""", []),

    ("md", "### 例 1｜最小例子：三个符号三张图", []),

    ("code", """\
a = {1, 2, 3, 4}
b = {3, 4, 5}

print(a & b)   # {3, 4}：交集
print(a | b)   # {1, 2, 3, 4, 5}：并集
print(a - b)   # {1, 2}：差集（在 a 不在 b）
print(b - a)   # {5}：差集有方向！""", ["example"]),

    ("md", "### 例 2｜业务例子：消费品类的新增与留存", []),

    ("code", """\
july = {"餐饮", "交通", "娱乐", "医疗"}
august = {"餐饮", "交通", "数码", "健身"}

print("持续消费:", august & july)     # 留存
print("本月新增:", august - july)     # 新品类
print("上月有本月无:", july - august)  # 流失/停用
print("合计覆盖:", august | july)     # 消费广度""", ["example"]),

    ("md", """\
**输出解读**：留存 {餐饮, 交通}、新增 {数码, 健身}、流失 {娱乐, 医疗}。
同一份数据，换成“用户购买的 SKU 集合”，就是电商里的复购分析。

### 例 3｜常见错误：把差集当“互相对比”""", []),

    ("code", """\
old = {"A", "B"}
new = {"B", "C"}

# 反例：想要“变化了的项”却写成单向差集
print(old - new)     # 只有 {A}，漏了 C

# 修复：对称差 ^（只在其中一边出现）
print(old ^ new)     # {A, C}
print((old - new) | (new - old))   # 等价的长写法""", ["example"]),

    ("md", """\
**要点**：`-` 有方向；要“两边的变化”用对称差 `^`。""", []),

    ("md", """\
## 7.4 成员测试：in 为什么快

**概念**：`x in some_set` 是集合的看家本领——无论集合多大，判断几乎是瞬时的；
而 `x in some_list` 要逐个比对，列表越长越慢。**频繁判断“存在性”时，
把列表转成集合**是惯用优化（第 11 章、pandas 里会反复用到）。""", []),

    ("md", "### 例 1｜业务例子：过滤一次性项目", []),

    ("code", """\
excluded = {"转账", "还款", "理财申购"}
records = [
    ("午餐", 25.5), ("转账-房租", 2600.0), ("地铁", 4.0),
    ("还款-花呗", 800.0), ("电影", 45.0),
]

kept = [(name, amount) for name, amount in records if name.split("-")[0] not in excluded]
print(f"过滤前 {len(records)} 笔，统计口径内 {len(kept)} 笔")
for name, amount in kept:
    print(" ", name, amount)""", ["example"]),

    ("md", "### 例 2｜常见错误：拿列表做大规模 in 判断", []),

    ("code", """\
excluded_list = ["转账", "还款", "理财申购"]   # 列表版黑名单

# 不报错，但每次 in 都是全表扫描；数据量大时明显变慢
# 修复：in 判断频繁时转集合
excluded = set(excluded_list)
print("转账" in excluded)""", ["example"]),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 7.1：去重统计", ["exercise"]),

    ("code", """\
payers = ["微信", "支付宝", "微信", "现金", "微信", "支付宝"]

# TODO 1：去重并打印所有出现过的支付方式（集合）
# TODO 2：打印支付方式种类数""", ["exercise"]),

    ("md", "### 练一练 7.2：品类的留存与新增", ["exercise"]),

    ("code", """\
last_month = {"餐饮", "交通", "订阅服务"}
this_month = {"餐饮", "数码", "订阅服务", "健身"}

# TODO 1：打印本月新增品类
# TODO 2：打印本月不再消费的品类
# TODO 3：打印两个月都消费的品类
# TODO 4：打印“有变化的品类”（对称差）""", ["exercise"]),

    ("md", "### 练一练 7.3：安全维护黑名单", ["exercise"]),

    ("code", """\
excluded = {"转账", "还款"}

# TODO 1：add 一个新的一次性项目 "信用卡还款手续费"
# TODO 2：用 discard 移除 "还款"
# TODO 3：再 discard 一次 "还款"，验证不报错
# TODO 4：打印最终黑名单""", ["exercise"]),

    ("md", """\
## 易错点清单

- `{}` 是空字典，空集合写 `set()`；
- 集合无序：不能索引切片，也别依赖打印顺序；
- 去重保序要用 `dict.fromkeys` 模板；
- `remove` 不存在的元素报 KeyError，安全删除用 `discard`；
- 差集 `-` 有方向，“双向变化”用对称差 `^`。""", []),

    ("md", """\
## 本章小结

- 集合 = 唯一 + 无序，去重与存在性判断的首选。
- 交并差（& | - ^）把“留存/新增/流失”写成一行。
- 频繁 `in` 判断用集合代替列表。
- 数据结构至此集齐：列表管批量、元组管固定字段、字典管名字、集合管唯一。
- 下一章把它们串起来：让程序会“做判断”——条件分支。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 7.1 参考答案
payers = ["微信", "支付宝", "微信", "现金", "微信", "支付宝"]

methods = set(payers)
print(methods)
print(len(methods))""", ["solution"]),

    ("code", """\
# 练一练 7.2 参考答案
last_month = {"餐饮", "交通", "订阅服务"}
this_month = {"餐饮", "数码", "订阅服务", "健身"}

print("本月新增:", this_month - last_month)
print("本月不再消费:", last_month - this_month)
print("持续消费:", this_month & last_month)
print("有变化:", this_month ^ last_month)""", ["solution"]),

    ("code", """\
# 练一练 7.3 参考答案
excluded = {"转账", "还款"}

excluded.add("信用卡还款手续费")
excluded.discard("还款")
excluded.discard("还款")     # 不报错
print(excluded)""", ["solution"]),
]
