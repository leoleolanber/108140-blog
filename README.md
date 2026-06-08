# blog.66zhang.cn Hexo Blog

这是部署到 `blog.66zhang.cn` 的 Hexo 技术博客。文章使用 Markdown + LaTeX，公式由 KaTeX 渲染，主题在 `themes/108140-tech/`，部署使用 GitHub Actions + GitHub Pages。

## 本地写作

安装依赖：

```powershell
npm install
```

启动本地预览：

```powershell
npm run write
```

然后打开：

```text
http://localhost:4310/
```

## 写文章

文章放在 `source/_posts/`。新增一篇文章可以直接新建 Markdown 文件，也可以用 Hexo 命令：

```powershell
npx hexo new post "文章标题"
```

文章 front matter 示例：

```markdown
---
title: 文章标题
date: 2026-06-08
tags:
  - Linux
  - 网络
summary: 首页和 RSS 里显示的摘要。
featured: false
image: assets/hero.png
---
```

正文直接写 Markdown。LaTeX 支持行内公式 `$E=mc^2$` 和块级公式：

```markdown
$$
T = \frac{D}{t}
$$
```

## 构建

```powershell
npm run clean
npm run build
```

Hexo 会生成 `public/`，GitHub Actions 会把 `public/` 部署到 GitHub Pages。

## 部署

推送到 `main` 分支后，仓库里的 `Deploy Hexo blog` 工作流会自动构建和发布。

域名配置保持：

```text
blog.66zhang.cn CNAME leoleolanber.github.io
```

`source/CNAME` 已经写入 `blog.66zhang.cn`，Hexo 构建时会复制到 `public/CNAME`。

## 目录

- `_config.yml`: Hexo 站点配置
- `source/_posts/`: Markdown 文章
- `source/assets/`: 背景图和站点图片
- `themes/108140-tech/`: 自定义 Hexo 主题
- `.github/workflows/pages.yml`: GitHub Pages 自动部署
