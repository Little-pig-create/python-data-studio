"""第4章 列表：管理多条记录"""

TITLE = "列表：管理多条记录"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第4章 列表：管理多条记录

一笔账已经能算了，但一个月有几十笔。总不能 `spend1`、`spend2`……起一百个名字。
**列表（list）**把多条数据放进一个变量里，是批量处理的第一步。

主线任务：**把 8 月的支出放进一个列表，算总额、找最大、查某笔账**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 创建列表，用索引和切片访问元素，说清负索引含义；
- 用 `append`、`remove`、`pop` 增删元素，理解“列表是可变的”；
- 用 `sum`、`max`、`min`、`len`、`sorted` 做基本统计；
- 避开列表两大坑：越界、共享引用（`b = a` 不是复制）。""", []),

    ("md", """\
## 4.1 创建与访问

**概念**：列表用方括号包起来，元素之间逗号隔开，元素类型可以不同。
访问方式和字符串一样：索引从 0 开始、支持负索引和切片、`len()` 求长度。""", []),

    ("md", "### 例 1｜最小例子：一列数字", []),

    ("code", """\
nums = [10, 25, 30, 5]

print(nums[0])      # 10
print(nums[-1])     # 5：最后一个
print(nums[1:3])    # [25, 30]：切片取的还是列表
print(len(nums))    # 4""", ["example"]),

    ("md", "### 例 2｜业务例子：一周支出", []),

    ("code", """\
# 8 月第 1 周的 7 笔支出（元）
week1 = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

print(f"共 {len(week1)} 笔")
print(f"周末两天（索引 5、6）: {week1[5]:.1f} 和 {week1[6]:.1f}")
print(f"前三天合计: {sum(week1[:3]):.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：`sum()` 能直接对数字列表求和——列表 + 内置函数的组合
是后面所有统计分析的地基。

### 例 3｜常见错误：越界与“空列表没有 0 号”""", []),

    ("code", """\
week1 = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

# 反例 1：越界
# print(week1[7])   # IndexError：7 个元素，索引最大 6

# 反例 2：对空列表取第一个
empty = []
# print(empty[0])   # IndexError：空列表没有任何元素

# 修复：先判断
if len(week1) > 6:
    print(week1[6])
if empty:
    print(empty[0])
else:
    print("列表为空，跳过")""", ["example"]),

    ("md", """\
**要点**：空列表 `[]` 的真值是 `False`，所以 `if empty:` 能同时完成
“存在性检查”。访问前先想：这个列表**一定**有元素吗？""", []),

    ("md", """\
## 4.2 增删改：列表是可变的

**概念**：和字符串不同，列表**可以原地修改**——
`append(x)` 尾部追加；`insert(i, x)` 插入；`remove(x)` 按值删除第一个匹配；
`pop()` 取出并删除末尾元素；`nums[i] = v` 直接改某一位。""", []),

    ("md", "### 例 1｜最小例子：增删改各来一下", []),

    ("code", """\
nums = [10, 20, 30]

nums.append(40)     # [10, 20, 30, 40]
nums[1] = 22        # [10, 22, 30, 40]
nums.remove(22)     # [10, 30, 40]：按值删
last = nums.pop()   # 取出 40，列表变 [10, 30]
print(nums, last)""", ["example"]),

    ("md", "### 例 2｜业务例子：记账就是 append", []),

    ("code", """\
spends = [18.5, 6.0, 25.5]

spends.append(32.0)     # 中午买了饭
spends.append(88.0)     # 晚上打车回家
print(spends)
print(f"当前合计: {sum(spends):.1f} 元")

# 记错了一笔 88.0，撤销：
spends.remove(88.0)
print("撤销后:", spends)""", ["example"]),

    ("md", """\
**输出解读**：记账程序的日常就是“往列表里 append，随时 sum”。
注意 `remove(88.0)` 删的是**第一个**等于 88.0 的元素——如果有多笔相同金额，
得配合第 9 章的循环按索引删。

### 例 3｜常见错误：remove 不存在的值 / append 返回 None""", []),

    ("code", """\
spends = [18.5, 6.0, 25.5]

# 反例 1：删除不存在的值
# spends.remove(99.0)   # ValueError: list.remove(x): x not in list

# 反例 2：以为 append 有返回值
result = spends.append(32.0)
print(result)      # None！append 是原地修改，返回 None
# spends = result  # 这样一行就把列表变成了 None，数据全丢

# 修复：append/remove 直接调用，不接返回值
spends.append(32.0)
print(spends)""", ["example"]),

    ("md", """\
**要点**：凡是**原地修改**的方法（append / remove / sort 等）都返回 `None`。
写 `x = x.append(...)` 是新手第二常见的事故（第一常见的是 `b = a` 伪复制，见 1.3）。""", []),

    ("md", """\
## 4.3 排序与复制：sorted 和真正的 copy

**概念**：
`sorted(xs)` 返回**排好序的新列表**，原列表不动；`xs.sort()` 原地排序返回 None。
`reverse=True` 降序。**复制列表必须写 `xs.copy()` 或 `xs[:]`**——
写 `b = a` 只是给同一个列表起了个别名。""", []),

    ("md", "### 例 1｜最小例子：两种排序、一种别名", []),

    ("code", """\
nums = [30, 10, 20]

print(sorted(nums))    # [10, 20, 30]：新列表
print(nums)            # [30, 10, 20]：原列表没变
nums.sort()            # 原地排序
print(nums)            # [10, 20, 30]

alias = nums           # 别名：两个名字指向同一个列表！
copy_ = nums.copy()    # 真复制
nums.append(99)
print(alias)           # [10, 20, 30, 99]：跟着变了
print(copy_)           # [10, 20, 30]：不受影响""", ["example"]),

    ("md", "### 例 2｜业务例子：找出最大的三笔支出", []),

    ("code", """\
month_spends = [18.5, 235.0, 6.0, 88.0, 199.9, 45.9, 312.0]

top3 = sorted(month_spends, reverse=True)[:3]
print(f"最大三笔: {top3}")          # [312.0, 235.0, 199.9]
print(f"合计占比: {sum(top3) / sum(month_spends):.1%}")""", ["example"]),

    ("md", """\
**输出解读**：`降序排序 + 切片前 3 个` 两步连用，一行拿到 Top3。
这种“sorted 再切片”的组合以后在 pandas 里还会反复见到。

### 例 3｜常见错误：b = a 之后“莫名其妙被改”""", []),

    ("code", """\
# 反例：经典事故现场
a = [100.0, 200.0]
b = a               # 没有复制！a、b 是同一个列表
b.append(999.0)
print(a)            # [100.0, 200.0, 999.0] —— a 也“被改”了

# 修复：b = a.copy() 或 b = a[:]
b = a.copy()
b.append(1.0)
print(a)            # 不受影响
print(b)""", ["example"]),

    ("md", """\
**要点**：把列表传给函数、存进字典时，理解“引用”尤其重要。
一个简单的自检：**改 b 想 a 不变，就必须 copy。**""", []),

    ("md", """\
## 4.4 查找与判断：in、index、count

**概念**：`x in xs` 判断存在（最快最常用）；`xs.index(x)` 找位置（不存在报错）；
`xs.count(x)` 数出现次数。查找前先用 `in` 判断，是避免报错的习惯。""", []),

    ("md", "### 例 1｜最小例子 + 业务例子：查一笔账", []),

    ("code", """\
categories = ["餐饮", "交通", "餐饮", "娱乐", "餐饮"]

print("交通" in categories)     # True
print(categories.count("餐饮")) # 3：出现次数
print(categories.index("娱乐")) # 3：第一次出现的位置

# 安全查找模板
target = "医疗"
if target in categories:
    print(categories.index(target))
else:
    print(f"本月没有 {target} 类支出")""", ["example"]),

    ("md", """\
### 例 2｜常见错误：index 不存在的值""", []),

    ("code", """\
categories = ["餐饮", "交通"]

# 反例：直接 index 会崩
# print(categories.index("医疗"))   # ValueError: '医疗' is not in list

# 修复：in 先行（或第 13 章的 try/except）
target = "医疗"
pos = categories.index(target) if target in categories else -1
print(pos)    # -1：自定义的“未找到”标记""", ["example"]),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 4.1：周支出统计", ["exercise"]),

    ("code", """\
week1 = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

# TODO 1：打印总支出（保留 1 位小数）
# TODO 2：打印平均每日支出（sum / len，保留 1 位小数）
# TODO 3：打印最大单笔与它的索引（用 max 和 index）""", ["exercise"]),

    ("md", "### 练一练 4.2：记账流水操作", ["exercise"]),

    ("code", """\
spends = [18.5, 6.0, 25.5]

# TODO 1：追加 88.0 和 12.0 两笔
# TODO 2：发现 6.0 记错了，删除它
# TODO 3：打印最终列表与总支出""", ["exercise"]),

    ("md", "### 练一练 4.3：安全 Top2 与别名陷阱", ["exercise"]),

    ("code", """\
month_spends = [18.5, 235.0, 6.0, 88.0, 199.9]
backup = month_spends          # 注意：这行是别名，不是复制！

# TODO 1：先把 backup 变成真复制（改这一行）
# TODO 2：用降序排序 + 切片求最大两笔 top2
# TODO 3：向 month_spends 追加 500.0，
#         打印 top2 和 sum(backup)，验证 backup 没被追加影响""", ["exercise"]),

    ("md", """\
## 易错点清单

- 索引越界：访问前想清楚列表是否够长、是否为空；
- `append`/`sort` 返回 None，`x = x.append(...)` 会丢数据；
- `b = a` 是别名不是复制，要复制用 `a.copy()`；
- `remove` 只删第一个匹配值，且值不存在会 ValueError；
- `index` 找不到会报错，先用 `in` 判断。""", []),

    ("md", """\
## 本章小结

- 列表 = 有序、可变的批量容器；字符串的索引切片规则全部适用。
- 增删改：append / insert / remove / pop / `xs[i] = v`。
- 统计：sum、max、min、len、sorted 组合出大部分报表。
- 引用与复制：改 b 想 a 不变就必须 copy。
- 下一章：记录比数字更复杂——一行账有摘要、类别、金额多个字段，用元组打包。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 4.1 参考答案
week1 = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

print(f"{sum(week1):.1f}")
print(f"{sum(week1) / len(week1):.1f}")
biggest = max(week1)
print(biggest, week1.index(biggest))""", ["solution"]),

    ("code", """\
# 练一练 4.2 参考答案
spends = [18.5, 6.0, 25.5]

spends.append(88.0)
spends.append(12.0)
spends.remove(6.0)
print(spends, f"合计 {sum(spends):.1f} 元")   # [18.5, 25.5, 88.0, 12.0] 合计 144.0 元""", ["solution"]),

    ("code", """\
# 练一练 4.3 参考答案
month_spends = [18.5, 235.0, 6.0, 88.0, 199.9]
backup = month_spends.copy()              # 真复制

top2 = sorted(month_spends, reverse=True)[:2]
month_spends.append(500.0)
print(top2)                               # [235.0, 199.9]
print(sum(backup))                        # 547.9，不含后来追加的 500.0""", ["solution"]),
]
