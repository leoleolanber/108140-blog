---
title: "用 GitHub Pages 托管技术博客"
date: "2026-06-07"
tags: ["云服务", "GitHub", "部署"]
summary: "用静态文件、GitHub Actions 和自定义域名，搭一个低成本、易维护的技术分享站。"
readingTime: "3 min"
image: "assets/hero.png"
imageAlt: "信息技术博客背景图"
---

对技术博客来说，静态站点是一个很稳的起点。HTML、CSS、JavaScript 和图片就能完成发布，不需要维护数据库，也不需要长期运行服务器进程。

## 上线需要三件事

第一，仓库里保留 **CNAME** 文件，内容是 **blog.66zhang.cn**。第二，在 GitHub Pages 里选择从 GitHub Actions 发布。第三，在域名 DNS 里把 **blog** 子域名指向 GitHub Pages。

## 为什么先保持静态

技术内容最重要的是可读、可访问、可长期维护。静态页面迁移简单、加载快、依赖少，适合先把文章体系跑起来。

## 后续可以升级什么

文章数量变多后，可以引入静态站生成器，把文章从 HTML 换成 Markdown，再加代码高亮、分类页、搜索索引和自动化发布脚本。
