// 常见 Python 错误的友好提示
export const friendlyErrorMessages = {
  NameError: {
    pattern: /name '(\w+)' is not defined/,
    suggestions: (match) => ({
      title: `❌ 变量 '${match[1]}' 未定义`,
      causes: [
        `• 你还没有运行包含 "${match[1]}" 的代码单元格`,
        `• 变量名拼写错误`,
        `• 变量在另一个单元格中定义，但你重启了内核`
      ],
      solutions: [
        "1️⃣ 先运行第一个代码单元格（导入语句）",
        "2️⃣ 或点击工具栏的'全部运行'按钮",
        "3️⃣ 检查变量名是否拼写正确"
      ]
    })
  },
  ModuleNotFoundError: {
    pattern: /No module named ['"''](\w+)[''"]/,
    suggestions: (match) => ({
      title: `❌ 模块 '${match[1]}' 未安装`,
      causes: [
        `• ${match[1]} 包在这个环境中不可用`,
        `• 拼写错误（例如：numpy 不是 np）`
      ],
      solutions: [
        `💡 这个教程使用的包已包含在内`,
        `🔧 如果仍然报错，请重启 Python 内核`,
        `📖 查看第1章获取所有可用包的列表`
      ]
    })
  },
  KeyError: {
    pattern: /KeyError: '(\w+)'/,
    suggestions: (match) => ({
      title: `❌ 字典中不存在键 '${match[1]}'`,
      causes: [
        `• DataFrame 或字典中没有 '${match[1]}' 这个列/键`,
        `• 列名拼写错误`,
        `• 大小写不匹配（Python 区分大小写）`
      ],
      solutions: [
        `1️⃣ 打印数据查看实际的列名：print(df.columns)`,
        `2️⃣ 检查大小写和空格`,
        `3️⃣ 使用 df.head() 查看前几行数据`
      ]
    })
  },
  IndexError: {
    pattern: /list index out of range/,
    suggestions: () => ({
      title: `❌ 列表索引超出范围`,
      causes: [
        `• 你尝试访问的行号不存在`,
        `• 列表长度小于你指定的索引`
      ],
      solutions: [
        `1️⃣ 先用 len(list) 查看列表长度`,
        `2️⃣ Python 索引从 0 开始，不是从 1 开始`,
        `3️⃣ 检查索引是否在有效范围内`
      ]
    })
  },
  SyntaxError: {
    pattern: /invalid syntax/,
    suggestions: (match, fullError) => {
      const lineMatch = fullError.match(/line (\d+)/);
      return {
        title: `❌ 语法错误`,
        causes: [
          `• 代码第 ${lineMatch?.[1] || '?'} 行有语法问题`,
          `• 可能是缺少冒号、括号或引号`,
          `• 缩进不正确`
        ],
        solutions: [
          `1️⃣ 检查代码第 ${lineMatch?.[1] || '?'} 行附近`,
          `2️⃣ 确保所有括号、引号都成对出现`,
          `3️⃣ if/for/def 后面需要冒号 :`
        ]
      };
    }
  },
  AttributeError: {
    pattern: /has no attribute '(\w+)'/,
    suggestions: (match) => ({
      title: `❌ 对象没有属性 '${match[1]}'`,
      causes: [
        `• 这个对象类型不支持 .${match[1]} 操作`,
        `• 属性名拼写错误`,
        `• 模块未正确导入`
      ],
      solutions: [
        `1️⃣ 检查你的数据类型（list/dict/DataFrame）`,
        `2️⃣ 使用 type(obj) 查看对象类型`,
        `3️⃣ 检查方法名是否拼写正确`
      ]
    })
  },
  TypeError: {
    pattern: /unsupported operand type/,
    suggestions: () => ({
      title: `❌ 类型错误：不支持的操作`,
      causes: [
        `• 你尝试对两个不兼容的数据类型做运算`,
        `• 例如：字符串 + 数字`
      ],
      solutions: [
        `1️⃣ 检查数据类型：type(variable)`,
        `2️⃣ 使用 int()、str() 等函数进行类型转换`,
        `3️⃣ 确保 + - * / 两边的类型匹配`
      ]
    })
  },
  ValueError: {
    pattern: /could not convert string to float/,
    suggestions: () => ({
      title: `❌ 数值转换失败`,
      causes: [
        `• 你尝试将不是数字的文本转换为数字`,
        `• 例如：int('abc') 会报错`,
        `• 可能存在缺失值或特殊字符`
      ],
      solutions: [
        `1️⃣ 检查数据中是否有非数字内容`,
        `2️⃣ 使用 pd.to_numeric(data, errors='coerce') 处理`,
        `3️⃣ 先用 df.info() 查看数据类型`
      ]
    })
  },
  // ---- 以下为补齐的常见错误（初学者高频，此前会退化为"未知错误"）----
  IndentationError: {
    pattern: /IndentationError|unexpected indent|expected an indented block|unindent does not match/,
    suggestions: (match, fullError) => {
      const lineMatch = fullError.match(/line (\d+)/);
      const line = lineMatch?.[1] || '?';
      return {
        title: `❌ 缩进错误（第 ${line} 行附近）`,
        causes: [
          `• Python 用缩进表示代码块，空格数必须一致`,
          `• 冒号 : 后面忘记了缩进`,
          `• 混用了 Tab 和空格（最常见）`
        ],
        solutions: [
          `1️⃣ 检查第 ${line} 行及上一行的缩进`,
          `2️⃣ if / for / while / def 后面要缩进 4 个空格`,
          `3️⃣ 统一使用空格，不要混用 Tab`,
          `4️⃣ 同一层级的代码缩进量必须完全相同`
        ]
      };
    }
  },
  ZeroDivisionError: {
    pattern: /ZeroDivisionError|division by zero/,
    suggestions: () => ({
      title: `❌ 除以零`,
      causes: [
        `• 除数（分母）的值为 0`,
        `• 数据里存在 0，做比率计算时就会触发`,
        `• 对空数据求平均也可能触发`
      ],
      solutions: [
        `1️⃣ 先检查分母：print((df['分母'] == 0).sum())`,
        `2️⃣ 过滤掉 0：df[df['分母'] != 0]`,
        `3️⃣ 计算占比时先判断：if total > 0: ...`
      ]
    })
  },
  FileNotFoundError: {
    pattern: /FileNotFoundError|No such file or directory/,
    suggestions: (match, fullError) => {
      const pathMatch = fullError.match(/['"]([^'"]+\.\w+)['"]/);
      return {
        title: `❌ 找不到文件${pathMatch ? `：${pathMatch[1]}` : ''}`,
        causes: [
          `• 文件名拼写错误或路径不对`,
          `• 课程数据在 /datasets/ 目录下，不是当前目录`,
          `• 你自己保存的文件还没生成`
        ],
        solutions: [
          `1️⃣ 课程数据请用 /datasets/xxx.csv 这样的绝对路径`,
          `2️⃣ 检查文件名大小写和扩展名`,
          `3️⃣ 运行过保存单元格后再读取该文件`
        ]
      };
    }
  },
  ImportError: {
    pattern: /ImportError|cannot import name/,
    suggestions: (match, fullError) => {
      const nameMatch = fullError.match(/cannot import name ['"]?(\w+)['"]?/);
      return {
        title: `❌ 导入失败${nameMatch ? `：${nameMatch[1]}` : ''}`,
        causes: [
          `• 该名称拼写错误，或不在这个模块里`,
          `• 写成了 from pandas import read_csv —— 应改为 pd.read_csv`,
          `• 模块名与实际包名不一致`
        ],
        solutions: [
          `1️⃣ 检查名称拼写`,
          `2️⃣ 多数情况下直接用 pd.xxx / np.xxx 即可`,
          `3️⃣ 重启内核后重新运行导入单元格`
        ]
      };
    }
  },
  TypeErrorNotCallable: {
    pattern: /TypeError: '(\w+)' object is not callable/,
    suggestions: (match) => ({
      title: `❌ '${match[1]}' 不能被调用`,
      causes: [
        `• 你把变量名取成了和函数同名（如 sum = 3 后再 sum(...)）`,
        `• 该属性是数据而不是方法，比如 df.shape 写成了 df.shape()`,
        `• 忘记写 . 后的方法名`
      ],
      solutions: [
        `1️⃣ 检查是否覆盖了内置函数名（sum / max / len 等）`,
        `2️⃣ 属性不要加括号：df.shape 而不是 df.shape()`,
        `3️⃣ 重启内核可清除被覆盖的名字`
      ]
    })
  },
  TypeErrorArguments: {
    pattern: /TypeError: (\w+)\(\) missing \d+ required positional|takes \d+ positional argument/,
    suggestions: (match, fullError) => {
      const fn = fullError.match(/TypeError: (\w+)\(\)/)?.[1];
      return {
        title: `❌ ${fn || '函数'} 缺少必要参数`,
        causes: [
          `• 调用时少传了参数`,
          `• 参数顺序或名称不对`,
          `• 把方法写成了函数（如 df.read_csv(...)）`
        ],
        solutions: [
          `1️⃣ 查看该函数的参数列表`,
          `2️⃣ 确认必填参数都已传入`,
          `3️⃣ pandas / numpy 的方法是 df.xxx(...) 形式`
        ]
      };
    }
  },
  ValueErrorShape: {
    pattern: /ValueError: shapes? .* not aligned|operands could not be broadcast/,
    suggestions: () => ({
      title: `❌ 数组形状不匹配`,
      causes: [
        `• 两个数组的维度或长度不一致`,
        `• 广播规则不满足`,
        `• 行列方向搞反了`
      ],
      solutions: [
        `1️⃣ 先打印形状：print(a.shape, b.shape)`,
        `2️⃣ 需要对齐时用 reshape 或转置 .T`,
        `3️⃣ 按轴运算时用 axis=0 / axis=1 明确方向`
      ]
    })
  },
  ValueErrorUnpack: {
    pattern: /ValueError: (too many|not enough) values to unpack/,
    suggestions: () => ({
      title: `❌ 解包数量不匹配`,
      causes: [
        `• 左边变量个数和右边元素个数不一样`,
        `• 例如 a, b = [1, 2, 3] 会报错`,
        `• 函数返回值个数与接收变量不符`
      ],
      solutions: [
        `1️⃣ 打印右侧长度：print(len(结果))`,
        `2️⃣ 调整左侧变量个数`,
        `3️⃣ 数量不定时用星号收集：a, *rest = 结果`
      ]
    })
  },
  IndexErrorPositional: {
    pattern: /IndexError: single positional indexer is out-of-bounds|out-of-bounds/i,
    suggestions: () => ({
      title: `❌ 位置索引超出范围`,
      causes: [
        `• 用 .iloc[n] 访问了不存在的行`,
        `• 数据过滤后行数变少，索引还停留在旧值`,
        `• 循环范围写大了`
      ],
      solutions: [
        `1️⃣ 先看行数：print(len(df))`,
        `2️⃣ 检查 .iloc 的下标是否小于行数`,
        `3️⃣ 用 .head() 预览数据确认规模`
      ]
    })
  },
  SettingWithCopyWarning: {
    pattern: /SettingWithCopyWarning/,
    suggestions: () => ({
      title: `⚠️ 可能修改了副本而不是原数据`,
      causes: [
        `• 对切片结果赋值，改动不会写回原表`,
        `• 链式索引：df[df.a > 1]['b'] = 0`
      ],
      solutions: [
        `1️⃣ 明确复制：sub = df[df.a > 1].copy()`,
        `2️⃣ 一步完成赋值：df.loc[df.a > 1, 'b'] = 0`,
        `3️⃣ 这只是警告，但可能导致结果不符合预期`
      ]
    })
  }
};

export function convertErrorToFriendly(errorText) {
  for (const [errorType, config] of Object.entries(friendlyErrorMessages)) {
    const match = errorText.match(config.pattern);
    if (match) {
      const suggestion = config.suggestions(match, errorText);
      return {
        type: errorType,
        title: suggestion.title,
        causes: suggestion.causes,
        solutions: suggestion.solutions,
        original: errorText
      };
    }
  }

  // 如果没有匹配到特定错误，返回通用提示
  return {
    type: 'UnknownError',
    title: '❌ 代码运行出错',
    causes: ['• 未知的 Python 错误'],
    solutions: [
      '1️⃣ 查看下方错误信息',
      '2️⃣ 尝试重启 Python 内核',
      '3️⃣ 查看相关章节的示例代码'
    ],
    original: errorText
  };
}
