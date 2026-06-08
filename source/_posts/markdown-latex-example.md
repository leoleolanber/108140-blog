---
title: "Markdown + LaTeX 写作示例"
date: "2026-06-04"
tags: ["Markdown", "LaTeX", "文档"]
summary: "以后写文章只需要编辑 Markdown 文件；行内公式和块级公式会由 KaTeX 自动渲染。"
readingTime: "3 min"
image: "assets/hero.png"
imageAlt: "信息技术博客背景图"
---

这篇文章是写作示例。以后你只需要在 `content/posts/` 目录新增一个 `.md` 文件，然后写 Markdown 和 LaTeX。

## 行内公式

行内公式直接写在 `$...$` 里，例如网络吞吐量可以粗略写成 $T = \frac{D}{t}$。

## 块级公式

块级公式写成：

$$
\text{latency}_{avg} = \frac{\sum_{i=1}^{n} latency_i}{n}
$$

## Markdown 表格

| 类型 | 用法 |
| --- | --- |
| `A` 记录 | 根域名指向 IP |
| `CNAME` | 子域名指向另一个域名 |
| `TXT` | 验证所有权或配置策略 |

## 代码块

```powershell
Resolve-DnsName blog.66zhang.cn -Type CNAME
git status --short --branch
```
