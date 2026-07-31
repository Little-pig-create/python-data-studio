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
