const example = (title, explanation, code) => ({ title, explanation, code });

export const foundationContexts = {
  1: {
    scenario: "先用几个变量算出一项学习计划，再观察 Notebook 怎样保存变量、显示输出，以及为什么运行顺序会影响结果。",
    position: "这是课程的起点。后面的 NumPy、Pandas 和机器学习代码，都依赖这里的单元格组织和复现方式。",
    prerequisites: ["会使用浏览器打开并运行 Notebook", "能区分代码单元格和 Markdown 单元格"],
    output: "完成一个包含输入、计算、检查和文字结论的小型分析。"
  },
  2: {
    scenario: "把一笔订单拆成数量、单价、折扣和会员状态，计算应付金额，并检查每个变量的类型和单位。",
    position: "这一章把“能运行代码”推进到“能定义口径”。后面的文本清洗、数据处理都需要稳定的变量命名和类型意识。",
    prerequisites: ["会创建变量并使用 print()", "知道整数、浮点数、布尔值和字符串的基本区别"],
    output: "完成一份带金额、折扣和资格判断的订单计算，并说明每个变量的含义。"
  },
  3: {
    scenario: "从带空格、大小写混杂的商品描述中提取品牌和规格，得到可以继续分组统计的标准文本。",
    position: "真实数据里，字符串往往先于表格出现：文件名、用户输入、商品描述和日志都需要先清洗。",
    prerequisites: ["会创建字符串变量", "理解索引从 0 开始，并能读取简单切片"],
    output: "完成一段文本的查找、替换、拆分、拼接和格式化，并保留清洗前后对照。"
  },
  4: {
    scenario: "整理一周订单金额和课程成绩：需要追加记录、删除异常值、排序，并保留一份不应被修改的基准数据。",
    position: "列表和元组是后续批量计算的基础容器。先理解可变与不可变，能减少数据被意外改写的问题。",
    prerequisites: ["掌握字符串和基本运算", "能读取列表中的元素并进行简单遍历"],
    output: "完成一个列表清洗流程，并用元组保存不可变的范围或多值结果。"
  },
  5: {
    scenario: "把一条用户消费记录表示成字典，再用集合比较两批用户或商品，找出共同、独有和重复成员。",
    position: "字典适合表达业务记录，集合适合做去重和成员关系判断；两者会贯穿 Pandas 前的数据准备阶段。",
    prerequisites: ["会使用列表和元组", "理解键值对和“元素是否存在”的问题"],
    output: "完成一条嵌套记录的读写、汇总和两组成员集合的关系计算。"
  },
  6: {
    scenario: "把“满减、会员、地区和订单金额”翻译成明确的分支规则，并检查临界值到底属于哪一档。",
    position: "数据分析不是只算数，还要把业务规则变成可测试的条件。条件写错，后续指标会整体偏离。",
    prerequisites: ["会使用比较运算和布尔值", "能读懂缩进和代码块"],
    output: "完成一个带边界值测试的订单评级或优惠判定函数式流程。"
  },
  7: {
    scenario: "逐笔扫描一组订单，计算总额、合格订单数和平均值；同时练习在满足条件时跳过或提前停止。",
    position: "循环是从单个样本走向批量数据的桥梁。理解累计变量和终止条件，才能安全处理真实记录。",
    prerequisites: ["会创建列表、字典和条件判断", "理解变量在循环中如何逐步变化"],
    output: "完成一次可检查的批量汇总，并说明循环变量、累计变量和终止条件。"
  },
  8: {
    scenario: "把重复的金额计算和标签判断封装成函数，让同一套规则可以被多组订单复用和单独测试。",
    position: "函数让分析步骤可以复用、测试和组合，是从一次性脚本走向稳定 Notebook 的关键一步。",
    prerequisites: ["掌握条件判断和循环", "能阅读参数、返回值和缩进代码块"],
    output: "完成至少两个带参数函数，返回计算结果，并用样例输入验证边界。"
  },
  9: {
    scenario: "把一段分析结果保存到文本文件，再用 pathlib 检查文件是否存在、大小是否合理，并安全地读取内容。",
    position: "数据分析经常需要读写配置、日志和中间结果；路径和编码处理不稳，Notebook 换环境就容易失效。",
    prerequisites: ["掌握字符串、列表和函数调用", "知道相对路径与文件名的基本概念"],
    output: "完成一次可重复的文件写入、读取和路径检查，并保证文件会被正确关闭。"
  },
  10: {
    scenario: "处理可能为空、格式错误或超出范围的用户输入，把程序崩溃变成可定位、可恢复的提示。",
    position: "异常处理不是把错误藏起来，而是明确区分预期输入问题和真正的代码缺陷。",
    prerequisites: ["掌握函数、条件判断和基本类型转换", "能阅读异常类型和错误消息"],
    output: "完成一段包含具体异常、else、finally 和主动校验的输入处理流程。"
  }
};

export const foundationProfiles = {
  1: {
    summary: "掌握单元格类型、内核状态、执行顺序和结果输出。",
    summaryQuestion: `本章核心：单元格负责组织计算，内核保存运行状态，执行顺序决定变量是否可用。

**检查**：

1. 重启内核后按顺序运行所有依赖单元格。
2. 保留输入、计算和输出单元格，避免依赖隐藏状态。`,
    objectives: ["区分Markdown与代码单元格", "理解执行编号与变量状态", "使用print查看中间结果", "按顺序组织一次简单分析"],
    concepts: [
      "Markdown 单元格保存标题、规则和结论；代码单元格执行 Python 代码。",
      "`In [n]` 是实际执行顺序，不代表单元格在页面中的位置。",
      "变量存活于当前内核；重启内核会清空变量、执行编号和输出状态。",
      "后续代码依赖前面已经执行的变量；依赖关系应通过单元格顺序表达。",
      "输出是检查计算的证据，不能只依赖最后一个汇总数字。",
      "用 `type()`、`len()`、断言和格式化输出检查输入与结果。",
      "把输入参数、计算过程和结论分开，后续修改参数时更容易定位差异。",
      "Notebook 的可复现性来自“相同输入 + 相同顺序 + 相同环境”，不是来自页面看起来完整。"
    ],
    detailNotes: `## 单元格怎么分工

| 单元格 | 适合放什么 | 运行后重点检查 |
| --- | --- | --- |
| Markdown | 问题、口径、假设、结论和操作提示 | 读者能否知道这一段要解决什么 |
| 输入代码 | 常量、列表、字典或数据文件路径 | 类型、单位、样本量是否符合预期 |
| 计算代码 | 一种明确的计算或转换 | 中间变量是否有清晰名称 |
| 检查代码 | \`type()\`、\`len()\`、断言、范围检查 | 错误是否在靠近源头的位置暴露 |
| 输出代码 | \`print()\`、表格或图形 | 输出是否带标签、单位和口径 |

### 推荐的最小结构

1. **输入**：只定义本单元格需要的参数，不把多个无关步骤混在一起。
2. **计算**：每个单元格完成一个动作，例如“换算小时”或“计算平均分”。
3. **检查**：先检查类型、长度和边界，再相信结果。
4. **表达**：用带标签的输出说明结果代表什么，避免只显示一个裸数字。

如果需要重跑，先重启内核，再按这个顺序从上到下执行。这样可以发现“依赖了旧变量”的隐性问题。`,
    examples: [
      example("第一个计算结果", "最后一个表达式自动显示；多值或带标签的结果使用 `print()`。", `course_name = "Python Data Studio"\nchapter_count = 75\nprint(course_name)\nprint("课程章节数:", chapter_count)\nchapter_count / 3`),
      example("观察执行状态", "本单元格依赖前一个单元格创建的 `chapter_count`。", `completed = 8\nprogress = completed / chapter_count\nprint(f"已完成 {completed} 章，进度 {progress:.1%}")`),
      example("组织一次微型分析", "按“输入数据 → 指标计算 → 结果输出”组织代码。", `scores = [82, 91, 76, 88, 95]\naverage = sum(scores) / len(scores)\nbest = max(scores)\nprint(f"平均分: {average:.1f}")\nprint(f"最高分: {best}")`),
      example("检查输入和结果", "先检查类型与长度，再输出指标，避免空列表或类型错误被忽略。", `scores = [82, 91, 76, 88, 95]\nassert isinstance(scores, list)\nassert len(scores) > 0\nassert all(isinstance(score, (int, float)) for score in scores)\naverage = sum(scores) / len(scores)\nprint("样本数:", len(scores))\nprint("平均分:", round(average, 1))`),
      example("验证执行顺序", "修改变量后重新运行依赖单元格，比较前后结果，理解内核中的状态变化。", `base_hours = 2\nstudents = 5\ntotal_hours = base_hours * students\nprint("第一次计算:", total_hours)\n\nbase_hours = 3\nprint("只修改变量后:", total_hours)\nprint("重新计算后:", base_hours * students)`),
      example("把参数和报告分开", "把业务参数放在一个字典里，计算和输出只读取参数，修改输入时不用到处找数字。", `plan = {\n    "course": "Python数据分析",\n    "weeks": 4,\n    "hours_per_week": 3,\n}\ntotal_hours = plan["weeks"] * plan["hours_per_week"]\nreport = (\n    f"{plan['course']}：{plan['weeks']} 周 × "\n    f"每周 {plan['hours_per_week']} 小时 = {total_hours} 小时"\n)\nprint(report)`),
      example("检查类型、单位和边界", "数值正确不等于口径正确；同时检查类型、单位和允许范围。", `days = 14\nminutes_per_day = 45\nhours_per_day = minutes_per_day / 60\n\nassert isinstance(days, int)\nassert isinstance(minutes_per_day, int)\nassert days > 0 and 0 < minutes_per_day <= 24 * 60\nprint("天数类型:", type(days).__name__)\nprint(f"每天学习: {hours_per_day:.2f} 小时")`),
      example("受控地观察常见报错", "先让错误以可读方式出现，再补上缺失变量；不要用 `try/except` 静默吞掉所有异常。", `try:\n    print(total_minutes)\nexcept NameError as error:\n    print("变量尚未定义:", type(error).__name__)\n\ndays = 14\nminutes_per_day = 45\ntotal_minutes = days * minutes_per_day\nprint("补齐变量后，总分钟数:", total_minutes)`),
      example("记录一次可复核输出", "输出中同时保留输入、计算口径和结果，别人才能判断数字是否算对。", `inputs = {"订单数": 128, "完成订单数": 96}\ncompletion_rate = inputs["完成订单数"] / inputs["订单数"]\nprint("输入:", inputs)\nprint(f"完成率 = 完成订单数 / 订单数 = {completion_rate:.1%}")\nassert 0 <= completion_rate <= 1`),
    ],
    pitfalls: ["依赖变量尚未创建就运行后续单元格", "修改变量后未重新运行依赖它的单元格", "只保留结果，不保留输入和计算过程", "把分钟、小时、金额等不同单位混在同一个变量里", "用一个很大的 try/except 把真正的错误隐藏起来"],
    practice: ["创建课程名称、学习天数和每日时长三个变量，并检查变量类型与允许范围", "分别计算总分钟数和总学习时长，同时输出天数、每日时长、总分钟数和总小时数", "用一句完整文本输出结果；小时保留 1 位小数，并用断言检查输入和结果", "把参数集中放进一个字典，再修改每日时长，观察哪些输出会同步变化"],
    practiceScaffold: `# 1. 输入：集中管理参数
plan = {
    "course": "Python数据分析",
    "days": 14,
    "minutes_per_day": 45,
}

# 2. 检查：先确认类型和边界
assert isinstance(plan["course"], str) and plan["course"].strip()
assert isinstance(plan["days"], int) and plan["days"] > 0
assert isinstance(plan["minutes_per_day"], (int, float))
assert 0 < plan["minutes_per_day"] <= 24 * 60

# 3. 计算：明确保存单位
total_minutes = plan["days"] * plan["minutes_per_day"]
total_hours = total_minutes / 60

# 4. 输出：带标签和单位
print(f"{plan['course']}：{plan['days']} 天")
print(f"每日 {plan['minutes_per_day']} 分钟，共 {total_minutes} 分钟")
print(f"折合 {total_hours:.1f} 小时")`,
    practiceCode: `plan = {
    "course": "Python数据分析",
    "days": 14,
    "minutes_per_day": 45,
}
assert isinstance(plan["course"], str) and plan["course"].strip()
assert isinstance(plan["days"], int) and plan["days"] > 0
assert isinstance(plan["minutes_per_day"], (int, float))
assert 0 < plan["minutes_per_day"] <= 24 * 60
total_minutes = plan["days"] * plan["minutes_per_day"]
total_hours = total_minutes / 60
print(f"{plan['course']}：{plan['days']} 天")
print(f"每日 {plan['minutes_per_day']} 分钟，共 {total_minutes} 分钟")
print(f"折合 {total_hours:.1f} 小时")`,
    practiceAssert: `assert total_minutes == 630, "检查总分钟数：应该是 days * minutes_per_day"\nassert total_hours == 10.5, "检查总时长：应该是 total_minutes / 60"\nassert isinstance(total_hours, float), "total_hours 应该是浮点数"\nassert plan["days"] > 0 and plan["minutes_per_day"] > 0, "天数和每日时长必须为正数"`
  },
  2: {
    summary: "掌握变量、核心数据类型和运算符，能够写出口径清晰的指标计算。",
    summaryQuestion: `掌握变量、核心数据类型和运算符，能够写出口径清晰的指标计算。

**迁移思考**：

1. 如果会员折扣改为满减券（满300减30），discount_rate 的计算逻辑需要如何修改？
2. 为什么金额计算要用 float 而不是 int？什么场景下会出错？`,
    objectives: ["正确命名和赋值", "识别int、float、bool与None", "组合算术和比较运算", "使用逻辑条件表达业务规则"],
    concepts: ["变量名应表达含义，并避免覆盖Python内置函数。", "除法通常得到float；金额、比例和数量要明确单位。", "比较运算产生bool，多个条件使用and、or和not组合。"],
    examples: [
      example("变量与类型", "type可以确认运行时的数据类型。", `product = "键盘"\nquantity = 3\nunit_price = 299.0\nis_member = True\ncoupon = None\nfor value in [product, quantity, unit_price, is_member, coupon]:\n    print(repr(value), type(value).__name__)`),
      example("指标计算", "先给中间指标命名，避免把复杂公式压成一行。", `subtotal = quantity * unit_price\ndiscount_rate = 0.9 if is_member else 1.0\npayable = subtotal * discount_rate\nprint(f"原价: {subtotal:.2f} 元")\nprint(f"应付: {payable:.2f} 元")`),
      example("比较与逻辑运算", "布尔表达式可以直接描述规则。", `free_shipping = payable >= 99\nneeds_review = quantity >= 10 or payable >= 5000\nvalid_order = quantity > 0 and unit_price > 0\nprint("包邮:", free_shipping)\nprint("需要复核:", needs_review)\nprint("订单有效:", valid_order)`)
    ],
    pitfalls: ["使用等号判断相等，应使用==", "整数除法和普通除法混用", "金额计算中忘记说明单位和折扣口径"],
    practice: ["定义商品单价、数量和优惠券金额", "计算优惠后的订单金额", "判断订单是否达到300元"],
    practiceScaffold: `# 定义变量
price = 128.0
quantity = 3
coupon_amount = 30.0

# TODO: 在这里计算优惠后的订单金额
order_amount =

# TODO: 在这里判断是否达到300元门槛
reaches_threshold =

print(f"订单金额: {order_amount:.2f} 元")
print("达到300元门槛:", reaches_threshold)`,
    practiceCode: `price = 128.0\nquantity = 3\ncoupon_amount = 30.0\norder_amount = price * quantity - coupon_amount\nreaches_threshold = order_amount >= 300\nprint(f"订单金额: {order_amount:.2f} 元")\nprint("达到300元门槛:", reaches_threshold)`,
    practiceAssert: `assert order_amount == 354.0, "检查订单金额计算：应该是 price * quantity - coupon_amount"\nassert reaches_threshold == True, "354元应该达到300元门槛"`
  },
  3: {
    summary: "集中掌握字符串的索引、切片、查找、拆分、合并、格式化和清洗。",
    summaryQuestion: `集中掌握字符串的索引、切片、查找、拆分、合并、格式化和清洗。

**迁移思考**：

1. 如果标签之间的分隔符不是逗号而是空格，清洗步骤需要如何调整？
2. 为什么 find 找不到时返回 -1 而不是报错？这种设计在什么场景下有用？`,
    objectives: ["使用索引和切片提取文本", "调用常用字符串方法", "拆分并重新组合字段", "清洗空格、大小写和格式"],
    concepts: ["字符串是不可变序列，方法通常返回新字符串。", "索引从0开始，负索引从末尾开始。", "清洗前应保留原始列，并明确大小写、空格和缺失值规则。"],
    examples: [
      example("索引与切片", "切片左闭右开，可以省略起止位置。", `text = "Python Data Analysis"\nprint(text[0], text[-1])\nprint(text[:6])\nprint(text[7:11])\nprint(text[::-1])`),
      example("查找、替换与统计", "方法链适合短流程，复杂清洗建议拆分为多步。", `raw = "  python,data,python  "\nclean = raw.strip().replace("python", "Python")\nprint(clean)\nprint("Python出现次数:", clean.count("Python"))\nprint("data位置:", clean.find("data"))`),
      example("拆分、合并与格式化", "split把文本变成列表，join执行相反操作。", `record = "A102|华东|1280.50"\norder_id, region, amount_text = record.split("|")\namount = float(amount_text)\nlabel = " / ".join([order_id, region])\nprint(f"{label} / 金额 {amount:,.2f} 元")`)
    ],
    pitfalls: ["忘记字符串方法不会原地修改原变量", "find未找到时返回-1而不是报错", "split后的字段数量与解包变量数量不一致"],
    practice: ["清理一组带空格和大小写混乱的标签", "把标签统一为小写", "使用连字符重新合并"],
    practiceScaffold: `raw_tags = "  Python, PANDAS, data Cleaning "

# TODO: 拆分、清理并转为小写
tags =

# TODO: 用连字符合并
normalized =

print(tags)
print(normalized)`,
    practiceCode: `raw_tags = "  Python, PANDAS, data Cleaning "\ntags = [item.strip().lower() for item in raw_tags.split(",")]\nnormalized = "-".join(tags)\nprint(tags)\nprint(normalized)`,
    practiceAssert: `assert tags == ["python", "pandas", "data cleaning"], "检查标签清理：应该是小写且去除空格"\nassert normalized == "python-pandas-data cleaning", "检查合并结果"`
  },
  4: {
    summary: "理解列表的可变性和元组的不可变性，能够管理有序数据集合。",
    summaryQuestion: `理解列表的可变性和元组的不可变性，能够管理有序数据集合。

**迁移思考**：

1. 如果需要筛选前10名的订单金额，除了排序+切片，还可以用什么方法？
2. 为什么用 = 复制列表会导致两个变量共享同一对象？应该如何正确复制？`,
    objectives: ["创建和访问列表与元组", "执行列表增删改查", "排序、复制和推导", "使用元组解包返回多值"],
    concepts: ["列表适合需要修改的有序集合，元组适合固定结构记录。", "浅复制可以避免两个变量意外共享同一列表。", "推导式适合简单映射和筛选，复杂逻辑使用普通循环。"],
    examples: [
      example("列表增删改查", "append添加单个元素，extend添加多个元素。", `scores = [85, 92, 78]\nscores.append(96)\nscores.extend([88, 91])\nscores[2] = 80\nremoved = scores.pop(0)\nprint("删除:", removed)\nprint("当前:", scores)`),
      example("排序与推导式", "sorted返回新列表，list.sort原地修改。", `sorted_scores = sorted(scores, reverse=True)\npassed = [score for score in scores if score >= 90]\nscaled = [round(score / 100, 2) for score in scores]\nprint(sorted_scores)\nprint("90分以上:", passed)\nprint("标准化:", scaled)`),
      example("元组与解包", "固定字段记录可用元组表示并直接解包。", `order = ("A102", "华东", 1280.5)\norder_id, region, amount = order\nminimum, maximum = min(scores), max(scores)\nprint(order_id, region, amount)\nprint("范围:", (minimum, maximum))`)
    ],
    pitfalls: ["用=复制列表导致两个变量指向同一对象", "把sort的返回值赋给变量，得到None", "试图直接修改元组中的元素"],
    practice: ["创建一组订单金额", "筛选大于500的订单", "计算最高和最低金额并组成元组"],
    practiceScaffold: `amounts = [128, 880, 460, 1250, 320]

# TODO: 筛选大于500的订单
high_value =

# TODO: 计算金额范围（最小值，最大值）
amount_range =

print("高价值订单:", high_value)
print("金额范围:", amount_range)`,
    practiceCode: `amounts = [128, 880, 460, 1250, 320]\nhigh_value = [amount for amount in amounts if amount > 500]\namount_range = (min(amounts), max(amounts))\nprint("高价值订单:", high_value)\nprint("金额范围:", amount_range)`,
    practiceAssert: `assert high_value == [880, 1250], "检查筛选结果：应该只包含大于500的金额"\nassert amount_range == (128, 1250), "检查金额范围：应该是 (最小值, 最大值)"`
  },
  5: {
    summary: "使用字典表示结构化记录，使用集合完成去重和集合关系计算。",
    summaryQuestion: `使用字典表示结构化记录，使用集合完成去重和集合关系计算。

**迁移思考**：

1. 如果需要统计每个地区出现的次数，除了手写循环，还可以用什么数据结构？
2. 为什么集合可以快速判断成员关系，而列表需要遍历全部元素？`,
    objectives: ["读写和遍历字典", "处理嵌套结构", "使用字典推导式", "完成集合去重和交并差"],
    concepts: ["字典通过唯一键定位值，适合表示一条结构化记录。", "get可以为缺失键提供默认值。", "集合无序且元素唯一，适合成员判断与去重。"],
    examples: [
      example("字典访问与更新", "直接索引要求键存在，get更适合不确定字段。", `order = {"id": "A102", "region": "华东", "amount": 1280.5}\norder["channel"] = "线上"\norder["amount"] += 120\nprint(order["id"], order.get("coupon", 0))\nfor key, value in order.items():\n    print(key, "=>", value)`),
      example("嵌套字典与推导式", "嵌套结构要逐层访问，并对缺失层级保持谨慎。", `sales = {\n    "华东": {"一月": 120, "二月": 150},\n    "华南": {"一月": 98, "二月": 132},\n}\ntotals = {region: sum(months.values()) for region, months in sales.items()}\nprint(totals)`),
      example("集合关系", "集合运算直接表达共同、全部和独有成员。", `january_users = {"u1", "u2", "u3", "u5"}\nfebruary_users = {"u2", "u3", "u4", "u6"}\nprint("两月都活跃:", january_users & february_users)\nprint("至少活跃一次:", january_users | february_users)\nprint("一月独有:", january_users - february_users)`)
    ],
    pitfalls: ["访问不存在的键导致KeyError", "使用可变对象作为字典键或集合元素", "依赖集合的显示顺序"],
    practice: ["创建商品名称到价格的字典", "筛选价格不低于100的商品", "用集合计算两个订单的共同商品"],
    practiceScaffold: `prices = {"键盘": 299, "鼠标": 129, "桌垫": 59, "耳机": 499}

# TODO: 筛选价格不低于100的商品
premium =

order_a = {"键盘", "鼠标", "桌垫"}
order_b = {"鼠标", "耳机"}

# TODO: 计算共同商品
common =

print("高价商品:", premium)
print("共同商品:", common)`,
    practiceCode: `prices = {"键盘": 299, "鼠标": 129, "桌垫": 59, "耳机": 499}\npremium = {name: price for name, price in prices.items() if price >= 100}\norder_a = {"键盘", "鼠标", "桌垫"}\norder_b = {"鼠标", "耳机"}\nprint("高价商品:", premium)\nprint("共同商品:", order_a & order_b)`,
    practiceAssert: `assert premium == {"键盘": 299, "鼠标": 129, "耳机": 499}, "检查筛选结果"\nassert common == {"鼠标"}, "检查共同商品：应该是两个订单的交集"`
  },
  6: {
    summary: "用条件判断把业务规则翻译为清晰、可测试的代码分支。",
    summaryQuestion: `用条件判断把业务规则翻译为清晰、可测试的代码分支。

**迁移思考**：

1. 如果订单类型增加到5个等级，如何避免过长的 elif 链条？
2. 为什么复杂条件要先保存为布尔变量？这样做有什么好处？`,
    objectives: ["编写if、elif和else", "组合多个条件", "处理边界值", "使用条件表达式生成标签"],
    concepts: ["条件从上到下判断，命中一个分支后停止。", "边界值应明确包含或排除。", "复杂条件先保存为命名良好的布尔变量。"],
    examples: [
      example("多分支评级", "分支应从最严格或最具体的条件开始。", `score = 87\nif score >= 90:\n    level = "优秀"\nelif score >= 80:\n    level = "良好"\nelif score >= 60:\n    level = "合格"\nelse:\n    level = "需改进"\nprint(level)`),
      example("组合业务条件", "拆分条件能提升可读性和调试效率。", `amount = 1280\nis_member = True\nregion = "华东"\namount_ok = amount >= 1000\neligible_region = region in {"华东", "华南"}\nif amount_ok and (is_member or eligible_region):\n    discount = 0.9\nelse:\n    discount = 1.0\nprint("应付:", amount * discount)`),
      example("条件表达式", "只在二选一且表达式简短时使用。", `inventory = 3\nstatus = "库存紧张" if inventory < 5 else "库存充足"\nshipping = "包邮" if amount >= 99 else "不包邮"\nprint(status, shipping)`)
    ],
    pitfalls: ["条件顺序导致更具体的分支永远无法到达", "把=写成==或反过来", "过度嵌套使业务规则难以阅读"],
    practice: ["根据订单金额划分普通、重点和大额订单", "边界分别为500和2000", "输出金额与标签"],
    practiceScaffold: `amount = 1680

# TODO: 根据金额判断订单类型
if amount >= 2000:
    label =
elif amount >= 500:
    label =
else:
    label =

print(amount, label)`,
    practiceCode: `amount = 1680\nif amount >= 2000:\n    label = "大额订单"\nelif amount >= 500:\n    label = "重点订单"\nelse:\n    label = "普通订单"\nprint(amount, label)`,
    practiceAssert: `assert label == "重点订单", "1680元应该是重点订单（>= 500 且 < 2000）"`
  },
  7: {
    summary: "使用for和while处理重复任务，并掌握range、enumerate、zip和循环控制。",
    summaryQuestion: `使用for和while处理重复任务，并掌握range、enumerate、zip和循环控制。

**迁移思考**：

1. 如果需要同时遍历三个列表（地区、销售额、目标），zip 还能用吗？
2. 为什么能用 sum() 直接求和时不应该手写循环累加？`,
    objectives: ["遍历序列和字典", "使用enumerate与zip", "编写有终止条件的while", "合理使用break与continue"],
    concepts: ["for适合遍历已知集合，while适合由条件决定次数。", "enumerate同时提供位置和值，zip并行遍历多个序列。", "while必须保证状态向终止条件推进。"],
    examples: [
      example("遍历与累计", "累计变量应在循环前初始化。", `amounts = [120, 580, 320, 760]\ntotal = 0\nfor index, amount in enumerate(amounts, start=1):\n    total += amount\n    print(f"订单{index}: {amount}")\nprint("合计:", total)`),
      example("zip并行遍历", "zip以最短序列为准，长度不一致时应提前检查。", `regions = ["华东", "华南", "华北"]\nsales = [1280, 960, 1100]\nfor region, value in zip(regions, sales):\n    print(f"{region}: {value} 万元")`),
      example("while与循环控制", "continue跳过当前轮，break结束整个循环。", `balance = 1000\nmonths = 0\nwhile balance < 1600:\n    months += 1\n    balance *= 1.08\n    if months > 24:\n        break\nprint(f"{months}个月后余额约为 {balance:.2f}")`)
    ],
    pitfalls: ["在循环中修改正在遍历的列表", "while条件永远不变造成无限循环", "能直接求和时仍手写复杂循环"],
    practice: ["遍历月度销售额", "跳过负数记录", "累计有效销售额并统计数量"],
    practiceScaffold: `monthly_sales = [120, 150, -1, 180, 210]
valid_total = 0
valid_count = 0

for value in monthly_sales:
    # TODO: 跳过负数记录
    if value < 0:

    # TODO: 累计有效销售额并计数
    valid_total +=
    valid_count +=

print("有效月份:", valid_count)
print("有效合计:", valid_total)`,
    practiceCode: `monthly_sales = [120, 150, -1, 180, 210]\nvalid_total = 0\nvalid_count = 0\nfor value in monthly_sales:\n    if value < 0:\n        continue\n    valid_total += value\n    valid_count += 1\nprint("有效月份:", valid_count)\nprint("有效合计:", valid_total)`,
    practiceAssert: `assert valid_count == 4, "检查有效月份数：应该跳过1个负数"\nassert valid_total == 660, "检查有效合计：120+150+180+210"`
  },
  8: {
    summary: "把重复逻辑封装为函数，系统掌握参数、返回值、作用域和Lambda。",
    summaryQuestion: `把重复逻辑封装为函数，系统掌握参数、返回值、作用域和Lambda。

**迁移思考**：

1. 如果增长率函数需要返回增长量和增长率两个值，应该如何修改？
2. 为什么函数内部应该用 return 而不是 print？什么场景下需要 print？`,
    objectives: ["定义和调用函数", "使用多种参数形式", "返回一个或多个结果", "理解局部作用域和轻量函数"],
    concepts: ["函数应完成一个清晰任务，名称使用动词。", "参数默认值只用于稳定、无副作用的默认行为。", "return返回计算结果，print只负责显示。"],
    examples: [
      example("定义与返回", "函数把计算与具体输入分离。", `def calculate_total(price, quantity, discount=1.0):\n    """计算折扣后的订单总额。"""\n    return price * quantity * discount\n\namount = calculate_total(299, 3, discount=0.9)\nprint(f"订单金额: {amount:.2f}")`),
      example("多返回值与作用域", "Python实际返回一个元组，可以直接解包。", `def summarize(values):\n    total = sum(values)\n    average = total / len(values)\n    return total, average, min(values), max(values)\n\nsales = [120, 150, 180, 210]\ntotal, average, minimum, maximum = summarize(sales)\nprint(total, average, minimum, maximum)`),
      example("Lambda与排序键", "Lambda适合短小的一次性函数，复杂逻辑仍应使用def。", `orders = [\n    {"id": "A1", "amount": 320},\n    {"id": "A2", "amount": 880},\n    {"id": "A3", "amount": 460},\n]\nranked = sorted(orders, key=lambda item: item["amount"], reverse=True)\nprint(ranked)`)
    ],
    pitfalls: ["函数内部只print却期望外部获得返回值", "修改全局变量造成隐藏状态", "用Lambda承载多步复杂逻辑"],
    practice: ["定义一个计算增长率的函数", "处理上期值为0的情况", "返回小数并在外部格式化为百分比"],
    practiceScaffold: `def growth_rate(current, previous):
    # TODO: 处理上期值为0的情况，返回 None
    if previous == 0:

    # TODO: 返回增长率（小数）
    return

rate = growth_rate(168, 140)
print("无法计算" if rate is None else f"增长率: {rate:.1%}")`,
    practiceCode: `def growth_rate(current, previous):\n    if previous == 0:\n        return None\n    return (current - previous) / previous\n\nrate = growth_rate(168, 140)\nprint("无法计算" if rate is None else f"增长率: {rate:.1%}")`,
    practiceAssert: `assert growth_rate(168, 140) == 0.2, "检查增长率：(168-140)/140 应该是 0.2"\nassert growth_rate(100, 0) is None, "上期为0时应该返回 None"`
  },
  9: {
    summary: "使用上下文管理器和pathlib安全读写浏览器内核中的文件。",
    summaryQuestion: `使用上下文管理器和pathlib安全读写浏览器内核中的文件。

**迁移思考**：

1. 如果需要追加内容而不是覆盖文件，应该如何修改打开模式？
2. 为什么浏览器环境中的文件在页面刷新后可能消失？如何保存持久化结果？`,
    objectives: ["理解文本文件与编码", "使用with自动关闭文件", "使用Path构造路径", "读写并检查文件内容"],
    concepts: ["文本读写应显式指定UTF-8编码。", "with块结束后自动关闭文件。", "浏览器内核中的文件位于临时文件系统，页面重新加载后可能消失。"],
    examples: [
      example("写入和读取文本", "write不会自动添加换行，需要显式提供。", `from pathlib import Path\n\nfile_path = Path("/tmp/course_notes.txt")\nwith file_path.open("w", encoding="utf-8") as file:\n    file.write("Python数据分析\\n")\n    file.write("今日完成：字符串与函数\\n")\n\nwith file_path.open("r", encoding="utf-8") as file:\n    content = file.read()\nprint(content)`),
      example("逐行处理", "逐行遍历适合较大文本，strip去除行尾换行。", `with file_path.open("r", encoding="utf-8") as file:\n    lines = [line.strip() for line in file if line.strip()]\nfor number, line in enumerate(lines, start=1):\n    print(number, line)`),
      example("路径信息", "Path提供跨平台的路径拼接和属性访问。", `output_dir = Path("/tmp") / "course_outputs"\noutput_dir.mkdir(exist_ok=True)\nreport_path = output_dir / "summary.txt"\nreport_path.write_text("有效订单: 18\\n销售额: 3280", encoding="utf-8")\nprint(report_path.name)\nprint(report_path.suffix)\nprint(report_path.read_text(encoding="utf-8"))`)
    ],
    pitfalls: ["依赖Windows反斜杠手工拼接路径", "未指定编码导致中文乱码", "以为浏览器临时文件会永久保存"],
    practice: ["把三条学习记录写入文件", "重新读取并统计非空行", "打印文件名和行数"],
    practiceScaffold: `from pathlib import Path

log_path = Path("/tmp/study_log.txt")
records = ["完成NumPy数组", "练习布尔筛选", "复习广播机制"]

# TODO: 用换行符连接后写入文件（指定 utf-8 编码）
log_path.write_text(, encoding="utf-8")

# TODO: 读取并过滤出非空行
loaded =

print(log_path.name, len(loaded))`,
    practiceCode: `from pathlib import Path\n\nlog_path = Path("/tmp/study_log.txt")\nrecords = ["完成NumPy数组", "练习布尔筛选", "复习广播机制"]\nlog_path.write_text("\\n".join(records), encoding="utf-8")\nloaded = [line for line in log_path.read_text(encoding="utf-8").splitlines() if line]\nprint(log_path.name, len(loaded))`,
    practiceAssert: `assert len(loaded) == 3, "检查非空行数：应该是3条记录"\nassert log_path.name == "study_log.txt", "检查文件名"`
  },
  10: {
    summary: "用异常处理管理可预期失败，并把错误转化为清晰、可恢复的信息。",
    summaryQuestion: `用异常处理管理可预期失败，并把错误转化为清晰、可恢复的信息。

**迁移思考**：

1. 如果需要记录哪些输入值导致了转换失败，应该如何改进异常处理代码？
2. 为什么不应该使用 except Exception 捕获所有异常？这样做有什么风险？`,
    objectives: ["捕获具体异常", "使用else和finally", "主动抛出异常", "避免吞掉真实错误"],
    concepts: ["只捕获能够处理的具体异常。", "else在未发生异常时运行，finally无论成功失败都会运行。", "数据校验失败时主动raise比继续计算更安全。"],
    examples: [
      example("捕获转换错误", "用户或外部数据转换是常见的可预期失败。", `samples = ["128.5", "N/A", "360"]\nvalues = []\nfor sample in samples:\n    try:\n        values.append(float(sample))\n    except ValueError:\n        print("跳过无效值:", sample)\nprint(values)`),
      example("else与finally", "else存放只在成功时执行的逻辑。", `text = "42"\ntry:\n    number = int(text)\nexcept ValueError:\n    result = None\nelse:\n    result = number * 2\nfinally:\n    print("转换流程结束")\nprint("结果:", result)`),
      example("主动校验", "函数应在输入违反约束时立即给出明确错误。", `def conversion_rate(orders, visits):\n    if visits <= 0:\n        raise ValueError("访问量必须大于0")\n    if orders < 0:\n        raise ValueError("订单量不能为负数")\n    return orders / visits\n\nprint(f"转化率: {conversion_rate(36, 420):.1%}")`)
    ],
    pitfalls: ["使用except Exception隐藏所有错误", "捕获异常后不记录任何信息", "把正常分支逻辑全部塞进try块"],
    practice: ["编写安全除法函数", "分母为0时返回None", "其他输入正常返回结果"],
    practiceScaffold: `def safe_divide(numerator, denominator):
    # TODO: 捕获除零错误，返回 None
    try:
        return
    except ZeroDivisionError:
        return

for denominator in [4, 0, 2]:
    print(denominator, safe_divide(20, denominator))`,
    practiceCode: `def safe_divide(numerator, denominator):\n    try:\n        return numerator / denominator\n    except ZeroDivisionError:\n        return None\n\nfor denominator in [4, 0, 2]:\n    print(denominator, safe_divide(20, denominator))`,
    practiceAssert: `assert safe_divide(20, 4) == 5.0, "检查正常除法：20/4 应该是 5.0"\nassert safe_divide(20, 0) is None, "分母为0时应该返回 None"`
  },
  11: {
    summary: "认识ndarray、形状和数据类型，使用多种方式创建数值数组。",
    summaryQuestion: `认识ndarray、形状和数据类型，使用多种方式创建数值数组。

**迁移思考**：

1. 如果需要创建一个 2×3×4 的三维数组，shape 应该是什么？ndim 是多少？
2. 为什么 NumPy 数组要求同一类型？这种限制带来了什么好处？`,
    objectives: ["创建一维和多维数组", "读取shape、ndim和dtype", "使用arange与linspace", "控制数组数据类型"],
    concepts: ["NumPy数组通常存储同一类型的数据。", "shape描述各维长度，ndim描述维数。", "固定数值类型能提高运算效率并减少隐式转换。"],
    examples: [
      example("创建数组并检查属性", "数组属性帮助确认后续运算需要的结构。", `import numpy as np\n\nsales = np.array([120, 150, 180, 210], dtype=np.float64)\nmatrix = np.array([[1, 2, 3], [4, 5, 6]])\nprint(sales)\nprint("shape:", matrix.shape)\nprint("ndim:", matrix.ndim)\nprint("dtype:", sales.dtype)`),
      example("规则序列", "arange控制步长，linspace控制点数。", `days = np.arange(1, 8)\nrates = np.linspace(0.05, 0.20, 4)\nzeros = np.zeros((2, 3))\nones = np.ones(5, dtype=int)\nprint(days)\nprint(rates)\nprint(zeros)\nprint(ones)`),
      example("类型转换", "astype返回新数组，转换前应检查是否会损失精度。", `price_text = np.array(["128.5", "299.0", "59.9"])\nprices = price_text.astype(float)\nrounded = prices.astype(int)\nprint(prices, prices.dtype)\nprint(rounded, rounded.dtype)`)
    ],
    pitfalls: ["把shape和size混为一谈", "整数类型保存小数导致精度丢失", "创建不规则嵌套列表数组"],
    practice: ["创建3×4数组", "输出维度、形状和元素数", "转换为浮点类型"],
    practiceScaffold: `import numpy as np

# TODO: 创建3×4数组，元素为1到12
arr =

# TODO: 转换为浮点类型
float_arr =

print(arr)
print("ndim:", arr.ndim, "shape:", arr.shape, "size:", arr.size)
print(float_arr.dtype)`,
    practiceCode: `import numpy as np\n\narr = np.arange(1, 13).reshape(3, 4)\nfloat_arr = arr.astype(float)\nprint(arr)\nprint("ndim:", arr.ndim, "shape:", arr.shape, "size:", arr.size)\nprint(float_arr.dtype)`,
    practiceAssert: `assert arr.shape == (3, 4), "检查形状：应该是3行4列"\nassert arr.size == 12, "检查元素数：应该是12个元素"\nassert float_arr.dtype == np.float64, "检查类型：应该是float64"`
  },
  12: {
    summary: "掌握数组索引、切片、布尔掩码和高级索引，准确提取需要的数据。",
    summaryQuestion: `掌握数组索引、切片、布尔掩码和高级索引，准确提取需要的数据。

**迁移思考**：

1. 如果需要提取所有大于平均值的元素并保持原有位置关系，应该用什么方法？
2. 为什么修改切片视图会影响原数组？什么时候需要使用 copy()？`,
    objectives: ["访问一维和二维元素", "使用切片提取区域", "根据条件筛选", "理解视图与副本"],
    concepts: ["二维索引使用行、列两个维度。", "布尔掩码形状必须与被筛选维度匹配。", "普通切片通常返回视图，高级索引通常返回副本。"],
    examples: [
      example("二维索引与切片", "逗号前选择行，逗号后选择列。", `import numpy as np\n\nsales = np.array([\n    [120, 150, 180, 210],\n    [98, 132, 145, 170],\n    [110, 128, 160, 188],\n])\nprint("第1行:", sales[0])\nprint("最后一列:", sales[:, -1])\nprint("前两行中间两列:\\n", sales[:2, 1:3])`),
      example("布尔筛选", "条件表达式直接生成与数组同形状的布尔数组。", `mask = sales >= 160\nprint(mask)\nprint("达标值:", sales[mask])\nmonthly_total = sales.sum(axis=0)\nprint("高销售月份:", monthly_total[monthly_total > 450])`),
      example("高级索引", "索引数组可以按任意顺序提取多个位置。", `selected_rows = sales[[2, 0]]\nselected_values = sales[[0, 2], [1, 3]]\nprint(selected_rows)\nprint("指定位置:", selected_values)\ncopy_part = sales[:2].copy()\ncopy_part[0, 0] = 999\nprint("原数组未改变:", sales[0, 0])`)
    ],
    pitfalls: ["忘记二维数组需要分别指定行和列", "切片视图被修改后影响原数组", "布尔掩码长度不一致"],
    practice: ["创建4×5数组", "提取最后两行", "筛选所有偶数并计算平均值"],
    practiceScaffold: `import numpy as np

matrix = np.arange(1, 21).reshape(4, 5)

# TODO: 提取最后两行
last_rows =

# TODO: 筛选所有偶数
even_values =

print(last_rows)
print("偶数:", even_values)
print("偶数平均值:", even_values.mean())`,
    practiceCode: `import numpy as np\n\nmatrix = np.arange(1, 21).reshape(4, 5)\nlast_rows = matrix[-2:]\neven_values = matrix[matrix % 2 == 0]\nprint(last_rows)\nprint("偶数:", even_values)\nprint("偶数平均值:", even_values.mean())`,
    practiceAssert: `assert last_rows.shape == (2, 5), "检查最后两行的形状"\nassert len(even_values) == 10, "检查偶数个数：1到20中有10个偶数"\nassert even_values.mean() == 11.0, "检查偶数平均值：应该是11.0"`
  },
  13: {
    summary: "使用reshape、转置、合并和拆分调整数组结构。",
    summaryQuestion: `使用reshape、转置、合并和拆分调整数组结构。

**迁移思考**：

1. 如果有一个 12 元素数组，除了 reshape(3, 4) 还可以变成什么形状？
2. 为什么 vstack 和 hstack 要求除目标轴外的其他维度必须匹配？`,
    objectives: ["改变数组形状", "区分展平方法", "按不同轴合并", "将数组拆分为多个部分"],
    concepts: ["reshape前后元素总数必须一致。", "axis=0通常表示按行方向操作，axis=1表示按列方向操作。", "合并前除目标轴外的其他维度必须匹配。"],
    examples: [
      example("形状变换与转置", "reshape只改变视图结构，不改变元素顺序。", `import numpy as np\n\nvalues = np.arange(1, 13)\nmatrix = values.reshape(3, 4)\nprint(matrix)\nprint("转置:\\n", matrix.T)\nprint("展平:", matrix.ravel())`),
      example("数组合并", "vstack按行叠加，hstack按列拼接。", `first = np.array([[1, 2], [3, 4]])\nsecond = np.array([[5, 6], [7, 8]])\nprint("按行:\\n", np.vstack([first, second]))\nprint("按列:\\n", np.hstack([first, second]))\nprint("新增维度:\\n", np.stack([first, second], axis=0).shape)`),
      example("数组拆分", "split要求能够等分，array_split允许不等分。", `monthly = np.arange(1, 13)\nquarters = np.split(monthly, 4)\nuneven = np.array_split(monthly, 5)\nprint("季度:", quarters)\nprint("不等分长度:", [len(part) for part in uneven])`)
    ],
    pitfalls: ["reshape目标元素数不一致", "混淆按行和按列合并", "使用split拆分不能整除的数组"],
    practice: ["把1到24变成4×6数组", "拆成上半部和下半部", "转置后输出形状"],
    practiceScaffold: `import numpy as np

# TODO: 创建4×6数组
matrix =

# TODO: 拆成上半部和下半部
top, bottom =

# TODO: 转置
transposed =

print("原形状:", matrix.shape)
print("上半部:\\n", top)
print("下半部:\\n", bottom)
print("转置形状:", transposed.shape)`,
    practiceCode: `import numpy as np\n\nmatrix = np.arange(1, 25).reshape(4, 6)\ntop, bottom = np.split(matrix, 2, axis=0)\ntransposed = matrix.T\nprint("原形状:", matrix.shape)\nprint("上半部:\\n", top)\nprint("下半部:\\n", bottom)\nprint("转置形状:", transposed.shape)`,
    practiceAssert: `assert matrix.shape == (4, 6), "检查原形状：应该是4×6"\nassert top.shape == (2, 6), "检查上半部形状：应该是2×6"\nassert transposed.shape == (6, 4), "检查转置形状：应该是6×4"`
  },
  14: {
    summary: "利用向量化和广播替代逐元素循环，写出简洁高效的数组计算。",
    summaryQuestion: `利用向量化和广播替代逐元素循环，写出简洁高效的数组计算。

**迁移思考**：

1. 如果需要用不同的季节系数调整每个地区的销售额（3个地区×4个月），系数数组应该是什么形状？
2. 为什么广播成功不代表业务含义正确？应该如何避免沿错误的轴广播？`,
    objectives: ["执行逐元素运算", "使用通用函数", "理解广播规则", "诊断维度不兼容"],
    concepts: ["向量化把运算交给NumPy底层实现。", "广播从末尾维度开始比较，维度相等或其中一个为1时兼容。", "能广播不代表业务含义正确，仍需检查轴和单位。"],
    examples: [
      example("向量化计算", "数组运算会逐元素执行，不需要手写循环。", `import numpy as np\n\nprices = np.array([128.0, 299.0, 59.0, 499.0])\nquantities = np.array([2, 1, 3, 1])\namounts = prices * quantities\ndiscounted = np.where(amounts >= 300, amounts * 0.9, amounts)\nprint(amounts)\nprint(discounted)`),
      example("通用函数", "ufunc支持批量数学运算和返回多个数组。", `values = np.array([1, 4, 9, 16])\nprint("平方根:", np.sqrt(values))\nprint("对数:", np.log1p(values))\nfraction, integer = np.modf(np.array([1.25, 2.8, 3.0]))\nprint("小数部分:", fraction)\nprint("整数部分:", integer)`),
      example("二维广播", "行向量可以与二维矩阵的每一行进行运算。", `sales = np.array([[120, 150, 180], [90, 130, 160]])\nmonthly_factor = np.array([1.0, 1.05, 1.1])\nadjusted = sales * monthly_factor\nregion_base = np.array([[100], [80]])\nindex_values = sales / region_base * 100\nprint(adjusted)\nprint(index_values)`)
    ],
    pitfalls: ["广播成功但沿错了业务维度", "用Python循环重复NumPy原生操作", "数组形状不兼容时盲目reshape"],
    practice: ["建立3个商品×4个月销量矩阵", "用长度为4的季节系数调整", "输出调整后每个商品合计"],
    practiceScaffold: `import numpy as np

sales = np.array([[12, 15, 18, 20], [8, 11, 13, 16], [20, 22, 25, 28]])
season_factor = np.array([0.9, 1.0, 1.1, 1.2])

# TODO: 使用广播进行季节调整
adjusted =

print(adjusted)
print("商品合计:", adjusted.sum(axis=1))`,
    practiceCode: `import numpy as np\n\nsales = np.array([[12, 15, 18, 20], [8, 11, 13, 16], [20, 22, 25, 28]])\nseason_factor = np.array([0.9, 1.0, 1.1, 1.2])\nadjusted = sales * season_factor\nprint(adjusted)\nprint("商品合计:", adjusted.sum(axis=1))`,
    practiceAssert: `assert adjusted.shape == (3, 4), "检查调整后的形状"\nassert np.allclose(adjusted[0], [10.8, 15.0, 19.8, 24.0]), "检查第一个商品的调整值"`
  },
  15: {
    summary: "使用axis完成数组统计，并通过现代随机数生成器进行可复现抽样。",
    summaryQuestion: `使用axis完成数组统计，并通过现代随机数生成器进行可复现抽样。

**迁移思考**：

1. 如果一个 4×5 数组按 axis=0 求和，结果是什么形状？按 axis=1 呢？
2. 为什么随机模拟需要固定种子？什么场景下应该使用不同的种子？`,
    objectives: ["按轴聚合", "计算分位数和离散程度", "创建可复现随机数", "执行抽样、洗牌和模拟"],
    concepts: ["axis=0聚合行并保留列，axis=1聚合列并保留行。", "均值要结合标准差和分位数解释。", "使用default_rng和固定种子保证结果可复现。"],
    examples: [
      example("按轴统计", "先确认每个轴代表什么业务维度。", `import numpy as np\n\nsales = np.array([[120, 150, 180, 210], [98, 132, 145, 170], [110, 128, 160, 188]])\nprint("每月合计:", sales.sum(axis=0))\nprint("每区平均:", sales.mean(axis=1))\nprint("整体中位数:", np.median(sales))\nprint("标准差:", sales.std().round(2))`),
      example("分位数与异常阈值", "IQR规则是识别潜在异常的启发式方法。", `values = np.array([52, 58, 61, 63, 65, 68, 72, 120])\nq1, median, q3 = np.quantile(values, [0.25, 0.5, 0.75])\niqr = q3 - q1\nupper = q3 + 1.5 * iqr\nprint(q1, median, q3)\nprint("潜在异常:", values[values > upper])`),
      example("随机抽样与模拟", "同一种子产生相同序列，便于复现实验。", `rng = np.random.default_rng(15)\nsample = rng.choice(np.arange(100, 201), size=8, replace=False)\nsimulated_orders = rng.poisson(lam=24, size=30)\nprint("抽样:", sample)\nprint("模拟日均订单:", simulated_orders.mean().round(2))`)
    ],
    pitfalls: ["不说明axis导致统计口径错误", "只报告均值忽略分布", "每次运行使用不同随机状态导致结果无法复现"],
    practice: ["模拟60天销售额", "计算均值、中位数和90%分位数", "抽取5天作为检查样本"],
    practiceScaffold: `import numpy as np

rng = np.random.default_rng(150)

# TODO: 模拟60天销售额（正态分布，均值180，标准差35，最小值60）
daily_sales =

# TODO: 抽取5天样本
inspection =

print("均值:", daily_sales.mean().round(2))
print("中位数:", np.median(daily_sales).round(2))
print("90%分位:", np.quantile(daily_sales, 0.9).round(2))
print("检查样本:", inspection.round(2))`,
    practiceCode: `import numpy as np\n\nrng = np.random.default_rng(150)\ndaily_sales = rng.normal(180, 35, 60).clip(60)\ninspection = rng.choice(daily_sales, size=5, replace=False)\nprint("均值:", daily_sales.mean().round(2))\nprint("中位数:", np.median(daily_sales).round(2))\nprint("90%分位:", np.quantile(daily_sales, 0.9).round(2))\nprint("检查样本:", inspection.round(2))`,
    practiceAssert: `assert len(daily_sales) == 60, "检查数据长度：应该是60天"\nassert daily_sales.min() >= 60, "检查最小值：应该不小于60"\nassert len(inspection) == 5, "检查样本数：应该是5个"`
  },
  16: {
    summary: "理解Series与DataFrame的索引对齐、列类型和基础运算。",
    summaryQuestion: `理解Series与DataFrame的索引对齐、列类型和基础运算。

**迁移思考**：

1. 如果两个 Series 的索引完全不同，相加后会得到什么结果？如何处理？
2. 为什么 Pandas 要按索引标签对齐而不是按位置对齐？这种设计解决了什么问题？`,
    objectives: ["创建Series和DataFrame", "读取索引与列", "检查数据类型", "理解按标签自动对齐"],
    concepts: ["Series是一维带标签数组，DataFrame是二维表格。", "Pandas运算优先按索引标签对齐，而不是仅按位置。", "数据类型决定可用操作和缺失值表示。"],
    examples: [
      example("创建Series", "索引为数值提供业务标签。", `import pandas as pd\n\nsales = pd.Series([120, 150, 180], index=["华东", "华南", "华北"], name="sales")\nprint(sales)\nprint("华南:", sales["华南"])\nprint("合计:", sales.sum())`),
      example("创建DataFrame", "字典的键成为列名，各列表长度必须一致。", `orders = pd.DataFrame({\n    "order_id": ["A1", "A2", "A3", "A4"],\n    "region": ["华东", "华南", "华东", "华北"],\n    "amount": [320.0, 880.0, 460.0, 1250.0],\n    "paid": [True, True, False, True],\n})\nprint(orders)\nprint(orders.dtypes)`),
      example("索引对齐", "不同索引的Series运算会取标签并集，缺失位置得到NaN。", `january = pd.Series({"华东": 120, "华南": 98, "华北": 110})\nfebruary = pd.Series({"华东": 150, "华南": 132, "西南": 86})\ngrowth = february - january\nprint(growth)\nprint("填零后合计:\\n", january.add(february, fill_value=0))`)
    ],
    pitfalls: ["把默认整数索引当成稳定业务主键", "忽略索引对齐产生的缺失值", "混合类型导致整列变成object"],
    practice: ["创建商品DataFrame", "包含名称、价格和库存", "计算库存总价值列"],
    practiceScaffold: `import pandas as pd

products = pd.DataFrame({
    "name": ["键盘", "鼠标", "耳机"],
    "price": [299.0, 129.0, 499.0],
    "stock": [18, 32, 12],
})

# TODO: 计算库存总价值列
products["stock_value"] =

print(products)
print("库存总价值:", products["stock_value"].sum())`,
    practiceCode: `import pandas as pd\n\nproducts = pd.DataFrame({\n    "name": ["键盘", "鼠标", "耳机"],\n    "price": [299.0, 129.0, 499.0],\n    "stock": [18, 32, 12],\n})\nproducts["stock_value"] = products["price"] * products["stock"]\nprint(products)\nprint("库存总价值:", products["stock_value"].sum())`,
    practiceAssert: `assert "stock_value" in products.columns, "检查列名：应该创建 stock_value 列"\nassert products["stock_value"].sum() == 11714.0, "检查库存总价值：应该是 299*18 + 129*32 + 499*12"`
  },
  17: {
    summary: "使用loc、iloc、条件表达式、query和排序准确定位数据。",
    summaryQuestion: `使用loc、iloc、条件表达式、query和排序准确定位数据。

**迁移思考**：

1. 如果需要筛选"金额大于500或地区为华东"的订单，布尔表达式应该如何写？
2. 为什么 loc 切片包含终点而 iloc 切片不包含？这种差异在什么场景下容易出错？`,
    objectives: ["按标签与位置选择", "组合多条件筛选", "使用query表达条件", "按一列或多列排序"],
    concepts: ["loc按标签选择且切片包含终点，iloc按位置选择且右端不包含。", "多个布尔条件必须分别加括号。", "筛选前先检查缺失值和数据类型。"],
    examples: [
      example("loc与iloc", "显式选择列可以减少无关数据进入后续计算。", `import pandas as pd\n\norders = pd.DataFrame({\n    "region": ["华东", "华南", "华东", "华北", "华南"],\n    "channel": ["线上", "线下", "线上", "线上", "线下"],\n    "amount": [320, 880, 460, 1250, 720],\n}, index=["A1", "A2", "A3", "A4", "A5"])\nprint(orders.loc[["A2", "A4"], ["region", "amount"]])\nprint(orders.iloc[:3, [0, 2]])`),
      example("条件筛选与query", "query适合可读的列条件，复杂动态逻辑仍可用布尔掩码。", `selected = orders[(orders["amount"] >= 500) & (orders["channel"] == "线上")]\nqueried = orders.query("amount >= 500 and region != '华北'")\nprint(selected)\nprint(queried)`),
      example("排序与Top N", "稳定排序和明确方向有助于复现排名。", `ranked = orders.sort_values(["amount", "region"], ascending=[False, True])\ntop_three = orders.nlargest(3, "amount")\nprint(ranked)\nprint("Top 3:\\n", top_three)`)
    ],
    pitfalls: ["loc和iloc切片边界规则混淆", "多个条件之间漏写括号", "排序后仍使用旧的位置含义"],
    practice: ["筛选华东或华南订单", "金额不低于400", "按金额降序返回前三条"],
    practiceScaffold: `import pandas as pd

orders = pd.DataFrame({
    "region": ["华东", "华南", "华北", "华东", "西南"],
    "amount": [320, 880, 460, 1250, 720],
    "status": ["完成", "完成", "取消", "完成", "完成"],
})

# TODO: 筛选华东或华南且金额不低于400的订单
result = orders[
    orders["region"].isin(["华东", "华南"]) & (orders["amount"] >= 400)
]

# TODO: 按金额降序并返回前三条
result = result.sort_values("amount", ascending=False).head(3)

print(result)`,
    practiceCode: `import pandas as pd\n\norders = pd.DataFrame({\n    "region": ["华东", "华南", "华北", "华东", "西南"],\n    "amount": [320, 880, 460, 1250, 720],\n    "status": ["完成", "完成", "取消", "完成", "完成"],\n})\nresult = orders[\n    orders["region"].isin(["华东", "华南"]) & (orders["amount"] >= 400)\n].sort_values("amount", ascending=False).head(3)\nprint(result)`,
    practiceAssert: `assert len(result) == 3, "检查结果行数：应该返回3条记录"\nassert result.iloc[0]["amount"] == 1250, "检查第一条：金额最大应该是1250"`
  },
  18: {
    summary: "系统掌握新增、修改、删除、重命名和类型转换。",
    summaryQuestion: `系统掌握新增、修改、删除、重命名和类型转换。

**迁移思考**：

1. 如果需要批量修改多个条件下的值（如取消订单的金额改为0，退款订单的金额改为负数），应该如何组织代码？
2. 为什么使用 errors='coerce' 后要检查新增的缺失值？这些缺失值代表什么？`,
    objectives: ["新增派生列", "安全更新数据", "删除和重命名行列", "转换数值与分类类型"],
    concepts: ["派生列应记录计算口径。", "链式赋值可能只修改临时对象，优先使用loc。", "类型转换失败时应选择报错或转为缺失值。"],
    examples: [
      example("新增与修改列", "assign适合链式生成新表，loc适合条件更新。", `import pandas as pd\n\norders = pd.DataFrame({\n    "amount": [320, 880, 460, 1250],\n    "quantity": [2, 4, 1, 5],\n    "status": ["完成", "完成", "取消", "完成"],\n})\norders = orders.assign(unit_price=orders["amount"] / orders["quantity"])\norders.loc[orders["status"] == "取消", "amount"] = 0\nprint(orders)`),
      example("删除与重命名", "drop默认返回新对象，inplace并非总是更清晰。", `clean = orders.drop(columns=["status"]).rename(columns={\n    "amount": "sales_amount",\n    "quantity": "item_count",\n})\nclean = clean.drop(index=2).reset_index(drop=True)\nprint(clean)`),
      example("类型转换", "to_numeric的errors参数决定无效值处理方式。", `raw = pd.DataFrame({\n    "amount": ["320.5", "N/A", "880"],\n    "region": ["华东", "华南", "华东"],\n})\nraw["amount"] = pd.to_numeric(raw["amount"], errors="coerce")\nraw["region"] = raw["region"].astype("category")\nprint(raw)\nprint(raw.dtypes)`)
    ],
    pitfalls: ["触发SettingWithCopyWarning仍继续运行", "直接覆盖原始列却没有保留转换前数据", "errors='coerce'后不检查新增缺失值"],
    practice: ["创建销售额和成本列", "计算利润和利润率", "把地区转换为分类类型"],
    practiceScaffold: `import pandas as pd

finance = pd.DataFrame({
    "region": ["华东", "华南", "华北"],
    "sales": [1280, 960, 1100],
    "cost": [820, 710, 760],
})

# TODO: 计算利润
finance["profit"] =

# TODO: 计算利润率
finance["margin"] =

# TODO: 把地区转换为分类类型
finance["region"] =

print(finance)
print(finance.dtypes)`,
    practiceCode: `import pandas as pd\n\nfinance = pd.DataFrame({\n    "region": ["华东", "华南", "华北"],\n    "sales": [1280, 960, 1100],\n    "cost": [820, 710, 760],\n})\nfinance["profit"] = finance["sales"] - finance["cost"]\nfinance["margin"] = finance["profit"] / finance["sales"]\nfinance["region"] = finance["region"].astype("category")\nprint(finance)\nprint(finance.dtypes)`,
    practiceAssert: `assert finance["profit"].tolist() == [460, 250, 340], "检查利润计算"\nassert finance["region"].dtype.name == "category", "检查地区类型：应该是 category"`
  },
  19: {
    summary: "建立数据质量检查流程，处理缺失、重复、异常和无效记录。",
    summaryQuestion: `建立数据质量检查流程，处理缺失、重复、异常和无效记录。

**迁移思考**：

1. 如果一个订单表中订单ID不重复，但同一用户有多个订单，去重时应该用什么键？
2. 为什么异常值应该先标记而不是直接删除？什么情况下可以删除异常值？`,
    objectives: ["生成质量概览", "处理缺失值", "识别并删除重复", "使用规则标记异常"],
    concepts: ["先统计问题规模，再决定删除、填充或保留。", "缺失值处理取决于业务含义，不能统一填0。", "异常值应先标记和调查，不能机械删除。"],
    examples: [
      example("质量概览", "同时查看形状、缺失、重复和类型。", `import numpy as np\nimport pandas as pd\n\norders = pd.DataFrame({\n    "order_id": ["A1", "A2", "A2", "A3", "A4"],\n    "region": ["华东", "华南", "华南", None, "华北"],\n    "amount": [320.0, 880.0, 880.0, np.nan, 9800.0],\n})\nprint("形状:", orders.shape)\nprint("缺失:\\n", orders.isna().sum())\nprint("重复行:", orders.duplicated().sum())\nprint(orders.dtypes)`),
      example("缺失与重复处理", "订单ID重复时需要明确保留规则。", `clean = orders.drop_duplicates(subset="order_id", keep="first").copy()\nclean["region"] = clean["region"].fillna("未知")\nmedian_amount = clean["amount"].median()\nclean["amount"] = clean["amount"].fillna(median_amount)\nprint(clean)`),
      example("IQR异常标记", "标记异常并保留原值，便于后续调查。", `q1 = clean["amount"].quantile(0.25)\nq3 = clean["amount"].quantile(0.75)\niqr = q3 - q1\nupper = q3 + 1.5 * iqr\nclean["is_outlier"] = clean["amount"] > upper\nprint("上界:", upper)\nprint(clean[clean["is_outlier"]])`)
    ],
    pitfalls: ["看到缺失值就全部填0", "删除重复时未说明唯一键", "把真实的大额订单误判为错误数据"],
    practice: ["创建含缺失和重复的客户表", "按客户ID去重", "使用中位数填充年龄并输出质量报告"],
    practiceScaffold: `import numpy as np
import pandas as pd

customers = pd.DataFrame({
    "customer_id": ["U1", "U2", "U2", "U3"],
    "age": [28, np.nan, np.nan, 42],
    "city": ["上海", "广州", "广州", None],
})

# TODO: 按客户ID去重
clean = customers.drop_duplicates("customer_id").copy()

# TODO: 使用中位数填充年龄
clean["age"] =

# TODO: 填充城市缺失值为"未知"
clean["city"] =

print(clean)
print(clean.isna().sum())`,
    practiceCode: `import numpy as np\nimport pandas as pd\n\ncustomers = pd.DataFrame({\n    "customer_id": ["U1", "U2", "U2", "U3"],\n    "age": [28, np.nan, np.nan, 42],\n    "city": ["上海", "广州", "广州", None],\n})\nclean = customers.drop_duplicates("customer_id").copy()\nclean["age"] = clean["age"].fillna(clean["age"].median())\nclean["city"] = clean["city"].fillna("未知")\nprint(clean)\nprint(clean.isna().sum())`,
    practiceAssert: `assert len(clean) == 3, "检查去重后行数：应该有3个唯一客户"\nassert clean.isna().sum().sum() == 0, "检查缺失值：应该全部填充完成"`
  },
  20: {
    summary: "结合字符串、日期和数值列构造可分析的业务特征。",
    summaryQuestion: `结合字符串、日期和数值列构造可分析的业务特征。

**迁移思考**：

1. 如果需要提取用户邮箱的用户名部分（@符号之前），正则表达式应该如何写？
2. 为什么特征构造要避免使用未来信息？举一个会导致数据泄漏的例子。`,
    objectives: ["批量清洗文本列", "解析和拆解日期", "计算时间差", "构造分类与数值特征"],
    concepts: ["Pandas字符串方法通过str访问器调用。", "日期必须先转换为datetime才能进行时间运算。", "特征应由业务问题驱动，并避免使用未来信息。"],
    examples: [
      example("文本标准化", "清洗步骤包括去空格、统一大小写和提取模式。", `import pandas as pd\n\ncustomers = pd.DataFrame({\n    "name": [" 张三 ", "LI SI", "王 五"],\n    "email": ["A@EXAMPLE.COM", "li@test.cn", "wang@example.com"],\n})\ncustomers["name_clean"] = customers["name"].str.strip().str.replace(" ", "", regex=False)\ncustomers["email_clean"] = customers["email"].str.strip().str.lower()\ncustomers["domain"] = customers["email_clean"].str.extract(r"@(.+)$", expand=False)\nprint(customers)`),
      example("日期解析与拆解", "errors='coerce'把无效日期转换为NaT。", `orders = pd.DataFrame({\n    "order_date": ["2026-01-05", "2026-02-18", "invalid", "2026-03-22"],\n    "amount": [320, 880, 460, 1250],\n})\norders["order_date"] = pd.to_datetime(orders["order_date"], errors="coerce")\norders["month"] = orders["order_date"].dt.to_period("M").astype("string")\norders["weekday"] = orders["order_date"].dt.day_name()\nprint(orders)`),
      example("特征构造", "特征应有明确口径并可从原始字段复算。", `reference_date = pd.Timestamp("2026-04-01")\norders["days_ago"] = (reference_date - orders["order_date"]).dt.days\norders["amount_level"] = pd.cut(\n    orders["amount"],\n    bins=[0, 500, 1000, float("inf")],\n    labels=["普通", "重点", "大额"],\n)\nprint(orders)`)
    ],
    pitfalls: ["直接对object列使用日期运算", "正则提取失败后不检查缺失", "使用结果变量构造导致数据泄漏的特征"],
    practice: ["清洗手机号中的空格和连字符", "解析注册日期", "构造注册月份和账户天数"],
    practiceScaffold: `import pandas as pd

users = pd.DataFrame({
    "phone": ["138-0000-1234", " 139 0000 5678 "],
    "registered_at": ["2025-12-15", "2026-02-08"],
})

# TODO: 清洗手机号，去除所有非数字字符
users["phone_clean"] =

# TODO: 解析注册日期
users["registered_at"] =

# TODO: 提取注册月份
users["register_month"] =

# TODO: 计算账户天数（以2026-04-01为参考日期）
users["account_days"] =

print(users)`,
    practiceCode: `import pandas as pd\n\nusers = pd.DataFrame({\n    "phone": ["138-0000-1234", " 139 0000 5678 "],\n    "registered_at": ["2025-12-15", "2026-02-08"],\n})\nusers["phone_clean"] = users["phone"].str.replace(r"\\D", "", regex=True)\nusers["registered_at"] = pd.to_datetime(users["registered_at"])\nusers["register_month"] = users["registered_at"].dt.to_period("M").astype("string")\nusers["account_days"] = (pd.Timestamp("2026-04-01") - users["registered_at"]).dt.days\nprint(users)`,
    practiceAssert: `assert users["phone_clean"].tolist() == ["13800001234", "13900005678"], "检查手机号清洗"\nassert users["account_days"].tolist() == [107, 52], "检查账户天数计算"`
  },
  21: {
    summary: "掌握CSV与JSON的读取、参数控制、内存往返和结果导出。",
    summaryQuestion: `掌握CSV与JSON的读取、参数控制、内存往返和结果导出。

**迁移思考**：

1. 如果 CSV 文件中的日期格式是"2026/01/05"而不是"2026-01-05"，pd.to_datetime 还能自动识别吗？
2. 为什么商品编号要用 dtype="string" 而不是让 Pandas 自动推断类型？`,
    objectives: ["从文本读取表格", "控制类型和缺失值", "处理编码与日期", "导出可复用结果"],
    concepts: ["读取时明确分隔符、编码、日期和类型。", "保存索引前先判断它是否是业务字段。", "浏览器课程使用内存文本模拟文件，方法与真实路径一致。"],
    examples: [
      example("读取CSV文本", "StringIO让文本表现得像文件对象。", `from io import StringIO\nimport pandas as pd\n\ncsv_text = """order_id,region,amount,date\nA1,华东,320.5,2026-01-05\nA2,华南,880.0,2026-01-08\nA3,华北,,2026-01-12\n"""\norders = pd.read_csv(StringIO(csv_text), parse_dates=["date"])\nprint(orders)\nprint(orders.dtypes)`),
      example("控制缺失和类型", "dtype和na_values使读取结果更稳定。", `csv_text = """product_id,category,stock\n001,办公,18\n002,数码,N/A\n003,家居,24\n"""\nproducts = pd.read_csv(\n    StringIO(csv_text),\n    dtype={"product_id": "string", "category": "category"},\n    na_values=["N/A"],\n)\nprint(products)\nprint(products.dtypes)`),
      example("导出CSV与JSON", "index=False避免把默认行号写成多余列。", `output_csv = orders.to_csv(index=False)\noutput_json = orders.to_json(orient="records", force_ascii=False, date_format="iso")\nprint(output_csv)\nprint(output_json)`)
    ],
    pitfalls: ["让商品编号被自动读取为整数并丢失前导零", "保存默认索引造成Unnamed列", "未检查日期和数值解析失败"],
    practice: ["读取一段分号分隔文本", "指定日期列", "筛选有效记录并导出CSV"],
    practiceScaffold: `from io import StringIO
import pandas as pd

text = """date;region;sales
2026-01-01;华东;120
2026-01-02;华南;98
2026-01-03;华北;invalid
"""

# TODO: 读取CSV文本，使用分号分隔符，解析日期列
data = pd.read_csv(StringIO(text), sep=";", parse_dates=["date"])

# TODO: 转换sales列为数值，无效值转为缺失值
data["sales"] =

# TODO: 删除sales列缺失的行
clean =

print(clean.to_csv(index=False))`,
    practiceCode: `from io import StringIO\nimport pandas as pd\n\ntext = """date;region;sales\n2026-01-01;华东;120\n2026-01-02;华南;98\n2026-01-03;华北;invalid\n"""\ndata = pd.read_csv(StringIO(text), sep=";", parse_dates=["date"])\ndata["sales"] = pd.to_numeric(data["sales"], errors="coerce")\nclean = data.dropna(subset=["sales"])\nprint(clean.to_csv(index=False))`,
    practiceAssert: `assert len(clean) == 2, "检查有效记录数：应该保留2条"\nassert clean["sales"].sum() == 218, "检查有效销售额合计"`
  },
  22: {
    summary: "使用groupby、agg、transform、pivot_table和crosstab回答分组问题。",
    summaryQuestion: `使用groupby、agg、transform、pivot_table和crosstab回答分组问题。

**迁移思考**：

1. 如果需要计算每个地区销售额占全国的比例，应该用 agg 还是 transform？为什么？
2. 为什么透视表中的缺失组合不能无条件填0？什么情况下填0是合理的？`,
    objectives: ["执行分组聚合", "一次计算多个指标", "保留原行的组内计算", "构建透视表和交叉表"],
    concepts: ["分组前必须明确维度、指标和聚合函数。", "agg压缩行数，transform保持原行数。", "透视表中的缺失组合与真实0含义不同。"],
    examples: [
      example("分组聚合", "命名聚合让输出列直接表达口径。", `import pandas as pd\n\norders = pd.DataFrame({\n    "region": ["华东", "华东", "华南", "华南", "华北", "华北"],\n    "channel": ["线上", "线下", "线上", "线下", "线上", "线下"],\n    "amount": [520, 310, 460, 280, 390, 260],\n    "quantity": [3, 2, 2, 1, 2, 1],\n})\nsummary = orders.groupby("region").agg(\n    sales=("amount", "sum"),\n    orders=("amount", "size"),\n    average=("amount", "mean"),\n)\nprint(summary)`),
      example("transform组内占比", "transform结果与原表等长，可直接添加为新列。", `orders["region_total"] = orders.groupby("region")["amount"].transform("sum")\norders["region_share"] = orders["amount"] / orders["region_total"]\nprint(orders)`),
      example("透视表与交叉表", "index与columns分别定义行维度和列维度。", `pivot = orders.pivot_table(\n    index="region", columns="channel", values="amount", aggfunc="sum", fill_value=0\n)\ncounts = pd.crosstab(orders["region"], orders["channel"], margins=True)\nprint(pivot)\nprint(counts)`)
    ],
    pitfalls: ["使用mean却把结果描述为合计", "groupby后忘记处理索引", "把缺失组合无条件填0"],
    practice: ["按地区和渠道分组", "计算销售额、订单数和平均订单金额", "构建地区×渠道透视表"],
    practiceScaffold: `import pandas as pd

orders = pd.DataFrame({
    "region": ["华东", "华东", "华南", "华南", "华北"],
    "channel": ["广告", "自然", "广告", "自然", "广告"],
    "amount": [620, 410, 530, 380, 470],
})

# TODO: 按地区和渠道分组，计算销售额、订单数和平均订单金额
summary = orders.groupby(["region", "channel"]).agg(
    sales=("amount", "sum"),
    order_count=("amount", "size"),
    average_order=("amount", "mean"),
).reset_index()

# TODO: 构建地区×渠道透视表（销售额）
pivot =

print(summary)
print(pivot)`,
    practiceCode: `import pandas as pd\n\norders = pd.DataFrame({\n    "region": ["华东", "华东", "华南", "华南", "华北"],\n    "channel": ["广告", "自然", "广告", "自然", "广告"],\n    "amount": [620, 410, 530, 380, 470],\n})\nsummary = orders.groupby(["region", "channel"]).agg(\n    sales=("amount", "sum"),\n    order_count=("amount", "size"),\n    average_order=("amount", "mean"),\n).reset_index()\npivot = summary.pivot(index="region", columns="channel", values="sales").fillna(0)\nprint(summary)\nprint(pivot)`,
    practiceAssert: `assert len(summary) == 4, "检查分组结果：应该有4个组合"\nassert pivot.loc["华东", "广告"] == 620, "检查透视表：华东-广告应该是620"`
  },
  23: {
    summary: "通过merge、concat、melt、stack和unstack整合并重塑表格。",
    summaryQuestion: `通过merge、concat、melt、stack和unstack整合并重塑表格。

**迁移思考**：

1. 如果订单表和商品表连接后行数突然增加了10倍，最可能的原因是什么？如何诊断？
2. 为什么长表更适合分组统计和可视化？宽表适合什么场景？`,
    objectives: ["按键连接表格", "纵向与横向拼接", "宽表转长表", "在索引层级间重塑"],
    concepts: ["连接前检查键唯一性和匹配率。", "concat负责轴向拼接，merge负责关系连接。", "长表更适合分组统计和可视化。"],
    examples: [
      example("关系连接", "validate参数可以验证预期的一对一或多对一关系。", `import pandas as pd\n\norders = pd.DataFrame({\n    "order_id": ["A1", "A2", "A3"],\n    "customer_id": ["U1", "U2", "U1"],\n    "amount": [320, 880, 460],\n})\ncustomers = pd.DataFrame({\n    "customer_id": ["U1", "U2"],\n    "city": ["上海", "广州"],\n})\nmerged = orders.merge(customers, on="customer_id", how="left", validate="many_to_one", indicator=True)\nprint(merged)`),
      example("数据拼接", "拼接后通常需要重新建立连续索引。", `january = pd.DataFrame({"month": ["1月", "1月"], "sales": [120, 98]})\nfebruary = pd.DataFrame({"month": ["2月", "2月"], "sales": [150, 132]})\ncombined = pd.concat([january, february], ignore_index=True)\nprint(combined)`),
      example("宽表转长表", "melt明确保留标识列，把多个指标列折叠为变量和值。", `wide = pd.DataFrame({\n    "region": ["华东", "华南"],\n    "一月": [120, 98],\n    "二月": [150, 132],\n    "三月": [180, 145],\n})\nlong = wide.melt(id_vars="region", var_name="month", value_name="sales")\nrestored = long.pivot(index="region", columns="month", values="sales")\nprint(long)\nprint(restored)`)
    ],
    pitfalls: ["连接键不唯一导致行数意外膨胀", "连接后不检查未匹配记录", "重塑时遗漏标识列"],
    practice: ["连接订单表与商品表", "计算订单行金额", "将月度宽表转换为长表"],
    practiceScaffold: `import pandas as pd

items = pd.DataFrame({"product_id": ["P1", "P2"], "price": [299, 129]})
order_lines = pd.DataFrame({
    "order_id": ["A1", "A1", "A2"],
    "product_id": ["P1", "P2", "P2"],
    "quantity": [1, 2, 3],
})

# TODO: 连接订单表与商品表
result = order_lines.merge(items, on="product_id", validate="many_to_one")

# TODO: 计算订单行金额
result["line_amount"] =

print(result)
print(result.groupby("order_id")["line_amount"].sum())`,
    practiceCode: `import pandas as pd\n\nitems = pd.DataFrame({"product_id": ["P1", "P2"], "price": [299, 129]})\norder_lines = pd.DataFrame({\n    "order_id": ["A1", "A1", "A2"],\n    "product_id": ["P1", "P2", "P2"],\n    "quantity": [1, 2, 3],\n})\nresult = order_lines.merge(items, on="product_id", validate="many_to_one")\nresult["line_amount"] = result["price"] * result["quantity"]\nprint(result)\nprint(result.groupby("order_id")["line_amount"].sum())`,
    practiceAssert: `assert len(result) == 3, "检查连接结果：应该有3行"\nassert result["line_amount"].sum() == 686, "检查总金额：299 + 258 + 387"`
  },
  24: {
    summary: "结合滚动窗口、累计指标和描述性统计完成探索性分析。",
    summaryQuestion: `结合滚动窗口、累计指标和描述性统计完成探索性分析。

**迁移思考**：

1. 如果需要计算7日移动平均但前6天数据不足，min_periods 应该设置为多少？
2. 为什么相关系数高不代表因果关系？请举一个相关但无因果的例子。`,
    objectives: ["计算滚动与累计指标", "生成描述性统计", "检查频数和分位数", "分析相关关系但避免因果误读"],
    concepts: ["窗口大小必须与业务周期一致。", "滚动统计前要按时间排序。", "相关系数只描述线性共同变化，不能证明因果。"],
    examples: [
      example("滚动与累计计算", "min_periods控制窗口不足时是否返回结果。", `import pandas as pd\n\nsales = pd.DataFrame({\n    "date": pd.date_range("2026-01-01", periods=10, freq="D"),\n    "amount": [120, 135, 128, 160, 175, 168, 190, 205, 198, 220],\n})\nsales["rolling_3d"] = sales["amount"].rolling(3, min_periods=1).mean()\nsales["cumulative"] = sales["amount"].cumsum()\nsales["daily_growth"] = sales["amount"].pct_change()\nprint(sales.round(3))`),
      example("描述性统计与频数", "数值概览和类别频数应一起检查。", `orders = pd.DataFrame({\n    "region": ["华东", "华南", "华东", "华北", "华东", "华南"],\n    "amount": [320, 880, 460, 1250, 720, 540],\n    "items": [2, 4, 1, 5, 3, 2],\n})\nprint(orders[["amount", "items"]].describe().round(2))\nprint(orders["region"].value_counts(normalize=True).round(3))`),
      example("相关与分位数", "先检查散点和异常，再解释相关系数。", `print("分位数:\\n", orders["amount"].quantile([0.25, 0.5, 0.75]))\nprint("相关矩阵:\\n", orders[["amount", "items"]].corr().round(3))\norders["amount_rank"] = orders["amount"].rank(ascending=False, method="dense")\nprint(orders.sort_values("amount_rank"))`)
    ],
    pitfalls: ["未按日期排序就计算滚动窗口", "窗口长度与业务周期不一致", "把相关系数解释为因果效应"],
    practice: ["创建12个月销售序列", "计算3个月移动平均和累计销售", "找出销售额最高的3个月"],
    practiceScaffold: `import pandas as pd

monthly = pd.DataFrame({
    "month": pd.period_range("2025-01", periods=12, freq="M").astype("string"),
    "sales": [120, 128, 135, 142, 150, 146, 160, 172, 180, 188, 205, 218],
})

# TODO: 计算3个月移动平均
monthly["moving_3m"] =

# TODO: 计算累计销售
monthly["cumulative"] =

print(monthly.round(2))
print("Top 3:\\n", monthly.nlargest(3, "sales")[["month", "sales"]])`,
    practiceCode: `import pandas as pd\n\nmonthly = pd.DataFrame({\n    "month": pd.period_range("2025-01", periods=12, freq="M").astype("string"),\n    "sales": [120, 128, 135, 142, 150, 146, 160, 172, 180, 188, 205, 218],\n})\nmonthly["moving_3m"] = monthly["sales"].rolling(3, min_periods=1).mean()\nmonthly["cumulative"] = monthly["sales"].cumsum()\nprint(monthly.round(2))\nprint("Top 3:\\n", monthly.nlargest(3, "sales")[["month", "sales"]])`,
    practiceAssert: `assert monthly["cumulative"].iloc[-1] == 1944, "检查累计销售：最后一行应该是总和"\nassert len(monthly.nlargest(3, "sales")) == 3, "检查Top 3行数"`
  }
};
