# blog.66zhang.cn Blog

这是一个为 `blog.66zhang.cn` 准备的信息技术博客。页面结构面向技术内容分享：首屏、文章流、搜索、标签筛选、专题侧栏、归档、RSS、站点地图和 404 页面。

## 本地预览

直接打开 `index.html` 即可预览。也可以在目录里启动一个静态服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://localhost:4173/`。

## 发布到 GitHub Pages

1. 使用当前仓库 `leoleolanber/108140-blog`，或新建一个仓库。
2. 把本目录推到仓库的 `main` 分支。
3. 在仓库的 Settings -> Pages 里选择 GitHub Actions 作为发布方式。
4. 在 Settings -> Pages -> Custom domain 中填写 `blog.66zhang.cn` 并保存。
5. 等待 `Deploy static blog` 工作流完成。
6. GitHub Actions 发布主要依赖 Pages 设置里的 Custom domain。仓库根目录里的 `CNAME` 文件已保留 `blog.66zhang.cn`，方便以后改成分支发布或同步记录。

## 域名 DNS

`blog.66zhang.cn` 是子域名，DNS 里添加一条 CNAME：

```text
blog -> leoleolanber.github.io
```

如果 DNS 面板要求填写完整主机名，就填 `blog.66zhang.cn`；记录值填 `leoleolanber.github.io`。

## 后续编辑

- 首页文章列表在 `index.html`
- 样式在 `assets/styles.css`
- 搜索和标签筛选在 `assets/app.js`
- 文章页在 `posts/`
- 自定义域名在 `CNAME`
- 全站背景图目前使用 `assets/site-background.png`。以后要换整站背景图，可以直接替换这个文件，或在 `assets/styles.css` 里修改 `--site-bg-image`。
