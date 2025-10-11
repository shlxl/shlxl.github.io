---
title: "LangChain 表达式语言 (LCEL) 入门指南：构建自定义 AI 链"
date: 2025-10-10T18:40:07.712Z
description: "本文旨在为初学者介绍 LangChain 表达式语言 (LCEL) 的核心概念、关键优势以及基本用法。通过具体的 Python 代码示例，你将学会如何利用 LCEL 的管道操作符来灵活地组合和调用大语言模型（LLM）应用链。"
slug: getting-started-with-langchain-expression-language-lcel
tags: langchain,lcel,python,llm,ai,prompt engineering
draft: false
publish: true
categories: 工程实践
---

##
 前言

>在使用 LangChain 构建大语言模型（LLM）应用时，开发者常常需要将多个组件（如 Prompt、模型、输出解析器）串联起来。LangChain 表达式语言（LangChain Expression Language, LCEL）为此提供了一种声明式、可组合的方式，让构建复杂的链（Chain）变得前所未有的简单和直观。

>本文将带你了解 LCEL 是什么，它为何重要，并通过代码示例展示如何上手使用。

## 什么是 LCEL？

LCEL 是一种用于组合 LangChain 组件的声明式语法。它的核心是管道操作符 `|`，这个操作符类似于 Unix/Linux 系统中的管道命令，可以将一个组件的输出无缝地传递给下一个组件作为输入。

通过 LCEL，我们可以用一种非常 pythonic 的方式来定义组件之间的数据流，从而替代旧版本中相对繁琐的 `Chain` 类封装。这不仅使代码更易读，也极大地增强了灵活性。

## LCEL 的核心优势

相比传统的链构建方式，LCEL 提供了几项关键的开箱即用优势：

1.  **异步与流式处理**：所有使用 LCEL 构建的链都天然支持同步（invoke）、异步（ainvoke）和流式（stream）调用，无需任何额外配置。
2.  **可组合性**：LCEL 的设计核心就是组合。你可以轻松地将一个链与另一个链、或与其他 LangChain 组件组合，构建出任意复杂的逻辑。
3.  **优化的并行执行**：当一个链的多个部分可以并行运行时（例如，从多个检索器中获取文档），LCEL 会自动进行并行处理，提升执行效率。
4.  **透明的调试与观察**：可以方便地查看链中每一步的输入和输出，这对于调试和优化复杂应用至关重要。

## LCEL 基础用法示例

让我们通过一个简单的例子，看看如何使用 LCEL 构建一个“Prompt + Model + Parser”的基础链。这个链的功能是接收一个主题，然后生成关于该主题的回答。

首先，确保你已经安装了必要的库：

```bash
npm i -g pnpm
pip install langchain langchain-openai
```

接下来，我们用 Python 代码来构建这个链：

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# 1. 定义 Prompt 模板
prompt = ChatPromptTemplate.from_template(
    "请简要介绍一下什么是 {topic}。"
)

# 2. 初始化模型 (请确保已设置 OPENAI_API_KEY 环境变量)
model = ChatOpenAI(model="gpt-3.5-turbo")

# 3. 定义输出解析器，将聊天消息转换为字符串
output_parser = StrOutputParser()

# 4. 使用 LCEL 管道符 | 将组件链接起来
chain = prompt | model | output_parser

# 5. 调用链并传入输入变量
response = chain.invoke({"topic": "人工智能"})

print(response)
```

在这段代码中，`prompt | model | output_parser` 清晰地定义了数据流：用户的输入首先被格式化为 Prompt，然后传递给 LLM 模型，最后模型的输出被解析为纯字符串。

## 总结

LangChain 表达式语言 (LCEL) 是现代 LangChain 开发的基石。它通过简洁的管道语法，极大地简化了复杂 LLM 应用的构建、调试和维护过程。对于任何希望高效利用 LangChain 的开发者来说，掌握 LCEL 都是必不可少的一步。希望本文能为你提供一个清晰的起点。
