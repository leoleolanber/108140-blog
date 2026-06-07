# blog.66zhang.cn Blog

这是一个为 `blog.66zhang.cn` 准备的信息技术博客。页面结构面向技术内容分享：首屏、文章流、搜索、标签筛选、专题侧栏、归档、RSS、站点地图和 404 页面。

## 本地预览

先安装依赖并生成站点：

```powershell
npm install
npm run build
```

然后预览 `_site` 目录：

```powershell
python -m http.server 4173 -d _site
```

然后访问 `http://localhost:4173/`。

## 写文章

你只需要在 `content/posts/` 目录写 Markdown 文件。每篇文章顶部放 front matter：

```markdown
---
title: "文章标题"
date: "2026-06-07"
tags: ["网络", "Linux", "云服务"]
summary: "文章摘要，会显示在首页卡片和 RSS 中。"
---
```

正文直接写 Markdown。LaTeX 支持行内公式 `$E=mc^2$` 和块级公式：

```markdown
$$
T = \frac{D}{t}
$$
```

可以参考 `content/posts/markdown-latex-example.md`。

## 发布到 GitHub Pages

1. 使用当前仓库，或新建一个仓库。
2. 把本目录推到仓库的 `main` 分支。
3. 在仓库的 Settings -> Pages 里选择 GitHub Actions 作为发布方式。
4. 在 Settings -> Pages -> Custom domain 中填写 `blog.66zhang.cn` 并保存。
5. 等待 `Deploy static blog` 工作流完成。
6. GitHub Actions 发布主要依赖 Pages 设置里的 Custom domain。仓库根目录里的 `CNAME` 文件已保留，方便以后改成分支发布或同步记录。

## 后续编辑

- 首页文章列表在 `index.html`
- Markdown 文章在 `content/posts/`
- 生成脚本在 `scripts/build.js`
- 样式在 `assets/styles.css`
- 搜索和标签筛选在 `assets/app.js`
- 自定义域名在 `CNAME`
- 全站背景图目前使用 `assets/site-background.png`。以后要换整站背景图，可以直接替换这个文件，或在 `assets/styles.css` 里修改 `--site-bg-image`。
